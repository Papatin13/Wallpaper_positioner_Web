/**
 * Interactive Canvas Engine for Wallpaper Positioner Web.
 * Full pan, zoom, transform gizmos, rubberband multi-selection, and monitor chassis rendering.
 */

import { HandleType, Handle, Layer } from './models.js';
import { rgbToHex } from './colorEngine.js';
import { tr } from './i18n.js';

export class CanvasEngine {
  constructor(canvasElement, monitorManager) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.monitorManager = monitorManager;
    this.monitor = monitorManager.defaultMonitor || monitorManager.monitors[0];

    this.layers = [];
    this.selectedLayers = [];
    this.bgColor = [26, 27, 38];

    // Default style inheritance for new layers
    this.defaultBorderWidth = 0.0;
    this.defaultBorderColor = [255, 255, 255];
    this.defaultBorderRadius = 0.0;
    this.defaultShadowEnabled = false;
    this.defaultShadowBlur = 20.0;
    this.defaultShadowOffsetX = 0.0;
    this.defaultShadowOffsetY = 15.0;
    this.defaultShadowOpacity = 0.5;
    this.defaultShadowColor = [0, 0, 0];

    // Viewport transform
    this.zoom = 1.0;
    this.panX = 0.0;
    this.panY = 0.0;
    this.userPannedOrZoomed = false;

    // Interaction states
    this.activeHandle = null;
    this.isDraggingLayer = false;
    this.isPanning = false;
    this.isRubberband = false;
    this.rubberbandStart = { x: 0, y: 0 };
    this.rubberbandCurrent = { x: 0, y: 0 };
    this.rubberbandBaseSelection = [];

    this.dragStartMouse = { x: 0, y: 0 };
    this.dragStartPan = { x: 0, y: 0 };
    this.dragStartMultiPositions = new Map();
    this.dragStartLayerProps = null;

    this.isSpacePressed = false;

    // Callbacks
    this.onSelectionChanged = null;
    this.onLayersChanged = null;
    this.onBgColorChanged = null;
    this.onViewportChanged = null;

    this.setupEventListeners();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  get selectedLayer() {
    return this.selectedLayers.length > 0 ? this.selectedLayers[this.selectedLayers.length - 1] : null;
  }

  setMonitor(monitor) {
    if (!monitor) {
      monitor = (this.monitorManager && (this.monitorManager.defaultMonitor || this.monitorManager.monitors[0]));
    }
    this.monitor = monitor;
    if (this.monitor) {
      this.fitToView();
      this.requestRender();
    }
  }

  setBackgroundColor(rgb) {
    this.bgColor = [...rgb];
    if (this.onBgColorChanged) this.onBgColorChanged(this.bgColor);
    this.requestRender();
  }

  resizeCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    if (!this.userPannedOrZoomed) {
      this.fitToView();
    }
    this.requestRender();
  }

  fitToView() {
    if (!this.monitor || !this.monitor.width || !this.monitor.height) {
      if (this.monitorManager) {
        this.monitor = this.monitorManager.defaultMonitor || this.monitorManager.monitors[0];
      }
      if (!this.monitor) return;
    }
    const rect = this.canvas.parentElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const padding = 60;
    const availW = rect.width - padding * 2;
    const availH = rect.height - padding * 2;

    const scaleW = availW / this.monitor.width;
    const scaleH = availH / this.monitor.height;
    this.zoom = Math.min(scaleW, scaleH, 1.2);

    const renderedW = this.monitor.width * this.zoom;
    const renderedH = this.monitor.height * this.zoom;

    this.panX = (rect.width - renderedW) / 2;
    this.panY = (rect.height - renderedH) / 2;

    if (this.onViewportChanged) {
      this.onViewportChanged({ zoom: this.zoom, panX: this.panX, panY: this.panY });
    }
    this.requestRender();
  }

  zoomIn() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.zoomAt(1.15, rect.width / 2, rect.height / 2);
  }

  zoomOut() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.zoomAt(1 / 1.15, rect.width / 2, rect.height / 2);
  }

  zoomAt(factor, wx, wy) {
    const newZoom = Math.max(0.05, Math.min(6.0, this.zoom * factor));
    if (Math.abs(newZoom - this.zoom) < 1e-4) return;

    // Zoom centered around widget coordinate (wx, wy)
    const { cx, cy } = this.widgetToCanvas(wx, wy);
    this.zoom = newZoom;
    this.panX = wx - cx * this.zoom;
    this.panY = wy - cy * this.zoom;
    this.userPannedOrZoomed = true;

    if (this.onViewportChanged) {
      this.onViewportChanged({ zoom: this.zoom, panX: this.panX, panY: this.panY });
    }
    this.requestRender();
  }

  widgetToCanvas(wx, wy) {
    const cx = (wx - this.panX) / this.zoom;
    const cy = (wy - this.panY) / this.zoom;
    return { cx, cy };
  }

  canvasToWidget(cx, cy) {
    const wx = cx * this.zoom + this.panX;
    const wy = cy * this.zoom + this.panY;
    return { wx, wy };
  }

  getSubMonitorForLayer(layer) {
    if (!this.monitor.isSpanned || !this.monitor.subMonitors || this.monitor.subMonitors.length === 0) {
      return null;
    }
    for (const sub of this.monitor.subMonitors) {
      if (sub.name === layer.monitorName) return sub;
    }
    return this.monitor.subMonitors[0];
  }

  getLayerCanvasPos(layer) {
    if (this.monitor.isSpanned) {
      const sub = this.getSubMonitorForLayer(layer);
      if (sub) {
        return { cx: sub.relX + layer.x, cy: sub.relY + layer.y };
      }
    }
    return { cx: layer.x, cy: layer.y };
  }

  // -------------------------------------------------------------------------
  // Layer Management
  // -------------------------------------------------------------------------
  addLayer(layer) {
    // Inherit defaults
    layer.borderWidth = this.defaultBorderWidth;
    layer.borderColor = [...this.defaultBorderColor];
    layer.borderRadius = this.defaultBorderRadius;
    layer.shadowEnabled = this.defaultShadowEnabled;
    layer.shadowBlur = this.defaultShadowBlur;
    layer.shadowOffsetX = this.defaultShadowOffsetX;
    layer.shadowOffsetY = this.defaultShadowOffsetY;
    layer.shadowOpacity = this.defaultShadowOpacity;
    layer.shadowColor = [...this.defaultShadowColor];

    // Assign monitor if not set
    if (this.monitor.isSpanned && this.monitor.subMonitors && this.monitor.subMonitors.length > 0 && !layer.monitorName) {
      layer.monitorName = this.monitor.subMonitors[0].name;
    }

    this.layers.push(layer);
    this.selectLayer(layer);
    this.notifyLayersChanged();
    this.requestRender();
    return layer;
  }

  removeSelectedLayers() {
    if (this.selectedLayers.length === 0) return;
    this.layers = this.layers.filter(l => !this.selectedLayers.includes(l));
    const nextSelect = this.layers.length > 0 ? this.layers[this.layers.length - 1] : null;
    this.selectedLayers = nextSelect ? [nextSelect] : [];
    this.notifySelectionChanged();
    this.notifyLayersChanged();
    this.requestRender();
  }

  selectLayer(layer) {
    this.selectedLayers = layer ? [layer] : [];
    this.notifySelectionChanged();
    this.requestRender();
  }

  toggleLayerSelection(layer) {
    if (this.selectedLayers.includes(layer)) {
      this.selectedLayers = this.selectedLayers.filter(l => l !== layer);
    } else {
      this.selectedLayers.push(layer);
    }
    this.notifySelectionChanged();
    this.requestRender();
  }

  selectAll() {
    this.selectedLayers = [...this.layers];
    this.notifySelectionChanged();
    this.requestRender();
  }

  clearSelection() {
    this.selectedLayers = [];
    this.notifySelectionChanged();
    this.requestRender();
  }

  bringSelectedToFront() {
    if (this.selectedLayers.length === 0) return;
    const selected = new Set(this.selectedLayers);
    const unselected = this.layers.filter(l => !selected.has(l));
    const sel = this.layers.filter(l => selected.has(l));
    this.layers = [...unselected, ...sel];
    this.notifyLayersChanged();
    this.requestRender();
  }

  sendSelectedToBack() {
    if (this.selectedLayers.length === 0) return;
    const selected = new Set(this.selectedLayers);
    const unselected = this.layers.filter(l => !selected.has(l));
    const sel = this.layers.filter(l => selected.has(l));
    this.layers = [...sel, ...unselected];
    this.notifyLayersChanged();
    this.requestRender();
  }

  stepSelectedForward() {
    if (this.selectedLayers.length === 0) return;
    for (let i = this.layers.length - 2; i >= 0; i--) {
      if (this.selectedLayers.includes(this.layers[i]) && !this.selectedLayers.includes(this.layers[i + 1])) {
        const tmp = this.layers[i];
        this.layers[i] = this.layers[i + 1];
        this.layers[i + 1] = tmp;
      }
    }
    this.notifyLayersChanged();
    this.requestRender();
  }

  stepSelectedBackward() {
    if (this.selectedLayers.length === 0) return;
    for (let i = 1; i < this.layers.length; i++) {
      if (this.selectedLayers.includes(this.layers[i]) && !this.selectedLayers.includes(this.layers[i - 1])) {
        const tmp = this.layers[i];
        this.layers[i] = this.layers[i - 1];
        this.layers[i - 1] = tmp;
      }
    }
    this.notifyLayersChanged();
    this.requestRender();
  }

  nudgeSelected(dx, dy) {
    if (this.selectedLayers.length === 0) return;
    for (const l of this.selectedLayers) {
      if (!l.locked) {
        l.x += dx;
        l.y += dy;
      }
    }
    this.notifySelectionChanged();
    this.requestRender();
  }

  setDefaultStyleFromLayer(layer) {
    this.defaultBorderWidth = layer.borderWidth;
    this.defaultBorderColor = [...layer.borderColor];
    this.defaultBorderRadius = layer.borderRadius;
    this.defaultShadowEnabled = layer.shadowEnabled;
    this.defaultShadowBlur = layer.shadowBlur;
    this.defaultShadowOffsetX = layer.shadowOffsetX;
    this.defaultShadowOffsetY = layer.shadowOffsetY;
    this.defaultShadowOpacity = layer.shadowOpacity;
    this.defaultShadowColor = [...layer.shadowColor];
  }

  applyStyleToAllLayers(sourceLayer) {
    for (const l of this.layers) {
      l.borderWidth = sourceLayer.borderWidth;
      l.borderColor = [...sourceLayer.borderColor];
      l.borderRadius = sourceLayer.borderRadius;
      l.shadowEnabled = sourceLayer.shadowEnabled;
      l.shadowBlur = sourceLayer.shadowBlur;
      l.shadowOffsetX = sourceLayer.shadowOffsetX;
      l.shadowOffsetY = sourceLayer.shadowOffsetY;
      l.shadowOpacity = sourceLayer.shadowOpacity;
      l.shadowColor = [...sourceLayer.shadowColor];
    }
    this.setDefaultStyleFromLayer(sourceLayer);
    this.notifyLayersChanged();
    this.requestRender();
  }

  notifySelectionChanged() {
    if (this.onSelectionChanged) {
      this.onSelectionChanged(this.selectedLayer, this.selectedLayers);
    }
  }

  notifyLayersChanged() {
    if (this.onLayersChanged) this.onLayersChanged();
  }

  // -------------------------------------------------------------------------
  // Event Listeners
  // -------------------------------------------------------------------------
  setupEventListeners() {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.setupTouchEvents();

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !this.isSpacePressed && e.target.tagName !== 'INPUT') {
        this.isSpacePressed = true;
        this.canvas.style.cursor = 'grab';
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.isSpacePressed = false;
        this.canvas.style.cursor = 'default';
      }
    });
  }

  setupTouchEvents() {
    let initialPinchDist = null;
    let initialZoom = 1.0;
    let initialMidpoint = null;

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const rect = this.canvas.getBoundingClientRect();
        initialPinchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        initialZoom = this.zoom;
        initialMidpoint = {
          wx: (t1.clientX + t2.clientX) / 2 - rect.left,
          wy: (t1.clientY + t2.clientY) / 2 - rect.top,
        };
        this.isDraggingLayer = false;
        this.activeHandle = null;
        this.isRubberband = false;
      } else if (e.touches.length === 1) {
        const t = e.touches[0];
        this.onMouseDown({
          button: 0,
          clientX: t.clientX,
          clientY: t.clientY,
          shiftKey: false,
          ctrlKey: false,
          metaKey: false,
        });
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && initialPinchDist && initialMidpoint) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const rect = this.canvas.getBoundingClientRect();
        const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const scale = currentDist / initialPinchDist;
        const currentMidpoint = {
          wx: (t1.clientX + t2.clientX) / 2 - rect.left,
          wy: (t1.clientY + t2.clientY) / 2 - rect.top,
        };

        const targetZoom = Math.max(0.05, Math.min(6.0, initialZoom * scale));
        const { cx, cy } = this.widgetToCanvas(initialMidpoint.wx, initialMidpoint.wy);
        this.zoom = targetZoom;
        this.panX = currentMidpoint.wx - cx * this.zoom;
        this.panY = currentMidpoint.wy - cy * this.zoom;
        this.userPannedOrZoomed = true;
        if (this.onViewportChanged) {
          this.onViewportChanged({ zoom: this.zoom, panX: this.panX, panY: this.panY });
        }
        this.requestRender();
      } else if (e.touches.length === 1) {
        const t = e.touches[0];
        this.onMouseMove({
          clientX: t.clientX,
          clientY: t.clientY,
          preventDefault: () => e.preventDefault(),
        });
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) {
        initialPinchDist = null;
        initialMidpoint = null;
      }
      if (e.touches.length === 0) {
        this.onMouseUp(e);
      }
    });

    this.canvas.addEventListener('touchcancel', () => {
      initialPinchDist = null;
      initialMidpoint = null;
      this.onMouseUp({});
    });
  }

  getPointerPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const wx = e.clientX - rect.left;
    const wy = e.clientY - rect.top;
    const { cx, cy } = this.widgetToCanvas(wx, wy);
    return { wx, wy, cx, cy };
  }

  onMouseDown(e) {
    const { wx, wy, cx, cy } = this.getPointerPos(e);
    this.dragStartMouse = { x: wx, y: wy };

    // Middle click or Space + Click -> Pan
    if (e.button === 1 || (e.button === 0 && this.isSpacePressed)) {
      this.isPanning = true;
      this.dragStartPan = { x: this.panX, y: this.panY };
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    if (e.button !== 0) return; // Only primary button for selection and transforms

    // 1. Check if clicked on a handle of the selected layer
    if (this.selectedLayers.length === 1 && this.selectedLayer) {
      const { cx: lcx, cy: lcy } = this.getLayerCanvasPos(this.selectedLayer);
      // Local layer coordinates for handle hit test
      const handle = this.selectedLayer.getHandleAt(cx - lcx + this.selectedLayer.x, cy - lcy + this.selectedLayer.y, 10, this.zoom);
      if (handle) {
        this.activeHandle = handle;
        this.dragStartLayerProps = {
          x: this.selectedLayer.x,
          y: this.selectedLayer.y,
          width: this.selectedLayer.width,
          height: this.selectedLayer.height,
          rotation: this.selectedLayer.rotation,
          cx: lcx,
          cy: lcy,
        };
        return;
      }
    }

    // If no layers on canvas and clicked inside monitor, trigger upload
    if (this.layers.length === 0) {
      const monList = (this.monitor.isSpanned && this.monitor.subMonitors) ? this.monitor.subMonitors : [this.monitor];
      for (const sub of monList) {
        const rx = this.monitor.isSpanned ? sub.relX : 0.0;
        const ry = this.monitor.isSpanned ? sub.relY : 0.0;
        if (cx >= rx && cx <= rx + sub.width && cy >= ry && cy <= ry + sub.height) {
          document.getElementById('fileInputImages')?.click();
          return;
        }
      }
    }

    // 2. Hit test layers (from top to bottom)
    let hitLayer = null;
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (!layer.visible) continue;
      const { cx: lcx, cy: lcy } = this.getLayerCanvasPos(layer);
      if (layer.containsPoint(cx - lcx + layer.x, cy - lcy + layer.y)) {
        hitLayer = layer;
        break;
      }
    }

    if (hitLayer) {
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        this.toggleLayerSelection(hitLayer);
      } else if (!this.selectedLayers.includes(hitLayer)) {
        this.selectLayer(hitLayer);
      }

      this.isDraggingLayer = true;
      this.dragStartMultiPositions.clear();
      for (const l of this.selectedLayers) {
        this.dragStartMultiPositions.set(l, { x: l.x, y: l.y });
      }
    } else {
      // Clicked on empty space
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        this.clearSelection();
      }
      // Start rubberband selection
      this.isRubberband = true;
      this.rubberbandStart = { x: cx, y: cy };
      this.rubberbandCurrent = { x: cx, y: cy };
      this.rubberbandBaseSelection = [...this.selectedLayers];
    }
  }

  onMouseMove(e) {
    const { wx, wy, cx, cy } = this.getPointerPos(e);

    // 1. Panning
    if (this.isPanning) {
      this.panX = this.dragStartPan.x + (wx - this.dragStartMouse.x);
      this.panY = this.dragStartPan.y + (wy - this.dragStartMouse.y);
      this.userPannedOrZoomed = true;
      if (this.onViewportChanged) {
        this.onViewportChanged({ zoom: this.zoom, panX: this.panX, panY: this.panY });
      }
      this.requestRender();
      return;
    }

    // 2. Transforming handle
    if (this.activeHandle && this.selectedLayer && this.dragStartLayerProps) {
      const initial = this.dragStartLayerProps;
      const layer = this.selectedLayer;

      if (this.activeHandle.type === HandleType.ROTATE) {
        // Calculate angle from layer center to current mouse pointer
        const dx = cx - initial.cx;
        const dy = cy - initial.cy;
        let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
        if (deg < 0) deg += 360;
        if (e.shiftKey) deg = Math.round(deg / 15) * 15; // 15° snapping
        layer.rotation = Math.round(deg);
      } else {
        // Resize handle
        const dx = cx - (this.dragStartMouse.x - this.panX) / this.zoom;
        const dy = cy - (this.dragStartMouse.y - this.panY) / this.zoom;

        // Convert delta into layer's unrotated local coordinate frame
        const rad = -((initial.rotation * Math.PI) / 180.0);
        const ldx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const ldy = dx * Math.sin(rad) + dy * Math.cos(rad);

        let newW = initial.width;
        let newH = initial.height;

        switch (this.activeHandle.type) {
          case HandleType.RIGHT:
            newW = Math.max(20, initial.width + ldx * 2);
            break;
          case HandleType.LEFT:
            newW = Math.max(20, initial.width - ldx * 2);
            break;
          case HandleType.BOTTOM:
            newH = Math.max(20, initial.height + ldy * 2);
            break;
          case HandleType.TOP:
            newH = Math.max(20, initial.height - ldy * 2);
            break;
          case HandleType.BOTTOM_RIGHT:
          case HandleType.TOP_LEFT:
          case HandleType.TOP_RIGHT:
          case HandleType.BOTTOM_LEFT: {
            const scale = 1 + (Math.abs(ldx) > Math.abs(ldy) ? ldx / initial.width : ldy / initial.height);
            newW = Math.max(20, initial.width * scale);
            newH = Math.max(20, newW / (layer.aspectRatio || 1));
            break;
          }
        }

        layer.width = Math.round(newW);
        layer.height = Math.round(newH);
      }

      this.notifySelectionChanged();
      this.requestRender();
      return;
    }

    // 3. Dragging layer(s)
    if (this.isDraggingLayer) {
      const deltaX = cx - (this.dragStartMouse.x - this.panX) / this.zoom;
      const deltaY = cy - (this.dragStartMouse.y - this.panY) / this.zoom;

      for (const [layer, pos] of this.dragStartMultiPositions.entries()) {
        if (!layer.locked) {
          layer.x = Math.round(pos.x + deltaX);
          layer.y = Math.round(pos.y + deltaY);
        }
      }

      this.notifySelectionChanged();
      this.requestRender();
      return;
    }

    // 4. Rubberband selection
    if (this.isRubberband) {
      this.rubberbandCurrent = { x: cx, y: cy };
      const rx = Math.min(this.rubberbandStart.x, this.rubberbandCurrent.x);
      const ry = Math.min(this.rubberbandStart.y, this.rubberbandCurrent.y);
      const rw = Math.abs(this.rubberbandCurrent.x - this.rubberbandStart.x);
      const rh = Math.abs(this.rubberbandCurrent.y - this.rubberbandStart.y);

      const touched = this.layers.filter(layer => {
        const { cx: lcx, cy: lcy } = this.getLayerCanvasPos(layer);
        return layer.intersectsRect(rx - lcx + layer.x, ry - lcy + layer.y, rw, rh);
      });

      const combined = new Set([...this.rubberbandBaseSelection, ...touched]);
      this.selectedLayers = Array.from(combined);
      this.notifySelectionChanged();
      this.requestRender();
      return;
    }

    // Update cursor style
    this.updateHoverCursor(cx, cy);
  }

  onMouseUp(e) {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = this.isSpacePressed ? 'grab' : 'default';
    }
    if (this.activeHandle) {
      this.activeHandle = null;
      this.dragStartLayerProps = null;
      this.notifyLayersChanged();
    }
    if (this.isDraggingLayer) {
      this.isDraggingLayer = false;
      this.dragStartMultiPositions.clear();
      this.notifyLayersChanged();
    }
    if (this.isRubberband) {
      this.isRubberband = false;
      this.rubberbandBaseSelection = [];
      this.requestRender();
    }
  }

  onWheel(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const wx = e.clientX - rect.left;
    const wy = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    this.zoomAt(factor, wx, wy);
  }

  updateHoverCursor(cx, cy) {
    if (this.isSpacePressed) {
      this.canvas.style.cursor = 'grab';
      return;
    }

    // Check handles of selected layer
    if (this.selectedLayers.length === 1 && this.selectedLayer) {
      const { cx: lcx, cy: lcy } = this.getLayerCanvasPos(this.selectedLayer);
      const handle = this.selectedLayer.getHandleAt(cx - lcx + this.selectedLayer.x, cy - lcy + this.selectedLayer.y, 8, this.zoom);
      if (handle) {
        if (handle.type === HandleType.ROTATE) {
          this.canvas.style.cursor = 'crosshair';
        } else if (handle.type === HandleType.TOP_LEFT || handle.type === HandleType.BOTTOM_RIGHT) {
          this.canvas.style.cursor = 'nwse-resize';
        } else if (handle.type === HandleType.TOP_RIGHT || handle.type === HandleType.BOTTOM_LEFT) {
          this.canvas.style.cursor = 'nesw-resize';
        } else if (handle.type === HandleType.TOP || handle.type === HandleType.BOTTOM) {
          this.canvas.style.cursor = 'ns-resize';
        } else {
          this.canvas.style.cursor = 'ew-resize';
        }
        return;
      }
    }

    // Check layer bounds
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (!layer.visible) continue;
      const { cx: lcx, cy: lcy } = this.getLayerCanvasPos(layer);
      if (layer.containsPoint(cx - lcx + layer.x, cy - lcy + layer.y)) {
        this.canvas.style.cursor = 'move';
        return;
      }
    }

    this.canvas.style.cursor = 'default';
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  requestRender() {
    if (!this.renderRequested) {
      this.renderRequested = true;
      requestAnimationFrame(() => {
        this.renderRequested = false;
        this.draw();
      });
    }
  }

  draw() {
    const dpr = window.devicePixelRatio || 1;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // 1. Dark desk workspace (#11111b)
    ctx.fillStyle = '#11111b';
    ctx.fillRect(0, 0, w, h);

    // Dot grid pattern on workspace desk
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    const dotSpacing = 30 * dpr;
    for (let x = 0; x < w; x += dotSpacing) {
      for (let y = 0; y < h; y += dotSpacing) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    // 2. Viewport Transform
    ctx.scale(dpr, dpr);
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    const monList = (this.monitor.isSpanned && this.monitor.subMonitors && this.monitor.subMonitors.length > 0)
      ? this.monitor.subMonitors
      : [this.monitor];

    const [bgR, bgG, bgB] = this.bgColor;
    const bgColorHex = rgbToHex(bgR, bgG, bgB);

    // 3. Render each physical monitor housing & screen
    const bezel = 18.0 / Math.max(0.2, this.zoom);
    const rOuter = 16.0 / Math.max(0.2, this.zoom);

    for (const sub of monList) {
      const rx = this.monitor.isSpanned ? sub.relX : 0.0;
      const ry = this.monitor.isSpanned ? sub.relY : 0.0;

      // Outer soft shadow behind bezel
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 30 / Math.max(0.2, this.zoom);
      ctx.shadowOffsetY = 12 / Math.max(0.2, this.zoom);
      ctx.fillStyle = '#1e1e2e';
      this.drawRoundedRect(ctx, rx - bezel, ry - bezel, sub.width + bezel * 2, sub.height + bezel * 2, rOuter);
      ctx.fill();
      ctx.restore();

      // Chassis Bezel body (#1e1e2e)
      ctx.fillStyle = '#1e1e2e';
      this.drawRoundedRect(ctx, rx - bezel, ry - bezel, sub.width + bezel * 2, sub.height + bezel * 2, rOuter);
      ctx.fill();

      // Bezel highlight outline
      ctx.strokeStyle = 'rgba(90, 107, 166, 0.8)';
      ctx.lineWidth = 2.0 / this.zoom;
      ctx.stroke();

      // Screen fill with user selected canvas background color
      ctx.fillStyle = bgColorHex;
      ctx.fillRect(rx, ry, sub.width, sub.height);

      // Inner subtle screen border
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = 1.0 / this.zoom;
      ctx.strokeRect(rx, ry, sub.width, sub.height);

      // Top-left Monitor Badge
      this.drawMonitorBadge(ctx, sub, rx + 18.0 / this.zoom, ry + 18.0 / this.zoom);
    }

    // Render subtle Empty State guide when no layers exist
    if (this.layers.length === 0) {
      for (const sub of monList) {
        const rx = this.monitor.isSpanned ? sub.relX : 0.0;
        const ry = this.monitor.isSpanned ? sub.relY : 0.0;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2.0 / this.zoom;
        ctx.setLineDash([12 / this.zoom, 8 / this.zoom]);
        const pad = Math.min(sub.width, sub.height) * 0.08;
        this.drawRoundedRect(ctx, rx + pad, ry + pad, sub.width - pad * 2, sub.height - pad * 2, 20 / this.zoom);
        ctx.stroke();
        ctx.setLineDash([]);

        const centerX = rx + sub.width / 2;
        const centerY = ry + sub.height / 2;
        const fontSize = Math.max(16, Math.min(42, sub.width * 0.038));

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Title
        ctx.font = `600 ${fontSize}px 'Inter', sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText(tr('empty_title'), centerX, centerY - fontSize * 0.8);

        // Subtitle
        ctx.font = `400 ${fontSize * 0.6}px 'Inter', sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText(tr('empty_hint'), centerX, centerY + fontSize * 0.4);

        // Resolution badge
        ctx.font = `600 ${fontSize * 0.55}px 'Inter', sans-serif`;
        ctx.fillStyle = '#89b4fa';
        ctx.fillText(`${sub.width} × ${sub.height} px`, centerX, centerY + fontSize * 1.5);

        ctx.restore();
      }
    }

    // 4. Render Layers (clipped to respective monitor screens if spanned)
    for (const sub of monList) {
      const rx = this.monitor.isSpanned ? sub.relX : 0.0;
      const ry = this.monitor.isSpanned ? sub.relY : 0.0;

      ctx.save();
      ctx.beginPath();
      ctx.rect(rx, ry, sub.width, sub.height);
      ctx.clip();

      for (const layer of this.layers) {
        if (!layer.visible || layer.width <= 0 || layer.height <= 0 || !layer.imageElement) {
          continue;
        }

        if (this.monitor.isSpanned) {
          const subForLayer = this.getSubMonitorForLayer(layer);
          if (subForLayer !== sub) continue;
        }

        const { cx, cy } = this.getLayerCanvasPos(layer);
        this.drawSingleLayer(ctx, layer, cx, cy);
      }

      ctx.restore();
    }

    // 5. Draw Selection Highlights and Handles
    if (this.selectedLayers.length === 1 && this.selectedLayer && this.selectedLayer.visible) {
      this.drawSelectionOverlay(ctx, this.selectedLayer);
    } else if (this.selectedLayers.length > 1) {
      for (const layer of this.selectedLayers) {
        if (layer.visible) {
          this.drawMultiSelectionOverlay(ctx, layer);
        }
      }
    }

    // 6. Draw Rubberband Selection Rectangle
    if (this.isRubberband) {
      const rx = Math.min(this.rubberbandStart.x, this.rubberbandCurrent.x);
      const ry = Math.min(this.rubberbandStart.y, this.rubberbandCurrent.y);
      const rw = Math.abs(this.rubberbandCurrent.x - this.rubberbandStart.x);
      const rh = Math.abs(this.rubberbandCurrent.y - this.rubberbandStart.y);

      ctx.save();
      ctx.fillStyle = 'rgba(0, 210, 255, 0.15)';
      ctx.fillRect(rx, ry, rw, rh);

      ctx.strokeStyle = '#00d2ff';
      ctx.lineWidth = 1.5 / this.zoom;
      ctx.setLineDash([6.0 / this.zoom, 4.0 / this.zoom]);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.restore();
    }

    ctx.restore();
  }

  drawRoundedRect(ctx, x, y, w, h, r) {
    const rad = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, rad);
    } else {
      ctx.rect(x, y, w, h);
    }
  }

  drawMonitorBadge(ctx, sub, bx, by) {
    const text = sub.isCustom
      ? `Canvas: ${sub.width} × ${sub.height} px`
      : `Monitor: ${sub.name} • ${sub.width} × ${sub.height} px`;

    ctx.save();
    const fontSize = 12 / Math.max(0.4, this.zoom);
    ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
    const textMetrics = ctx.measureText(text);
    const padX = 12 / Math.max(0.4, this.zoom);
    const padY = 6 / Math.max(0.4, this.zoom);
    const badgeW = textMetrics.width + padX * 2;
    const badgeH = fontSize + padY * 2;

    ctx.fillStyle = 'rgba(16, 20, 32, 0.85)';
    this.drawRoundedRect(ctx, bx, by, badgeW, badgeH, 6 / Math.max(0.4, this.zoom));
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1 / this.zoom;
    ctx.stroke();

    ctx.fillStyle = '#cdd6f4';
    ctx.fillText(text, bx + padX, by + padY + fontSize * 0.82);
    ctx.restore();
  }

  drawSingleLayer(ctx, layer, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.globalAlpha = Math.max(0.0, Math.min(1.0, layer.opacity));

    const w = layer.width;
    const h = layer.height;
    const hw = w / 2.0;
    const hh = h / 2.0;
    const bw = layer.borderWidth;
    const rad = layer.borderRadius;

    // 1. Drop Shadow
    if (layer.shadowEnabled && layer.shadowBlur > 0 && layer.shadowOpacity > 0) {
      ctx.save();
      const [sr, sg, sb] = layer.shadowColor;
      const sAlpha = Math.max(0.0, Math.min(1.0, layer.shadowOpacity));
      ctx.shadowColor = `rgba(${sr}, ${sg}, ${sb}, ${sAlpha})`;
      ctx.shadowBlur = layer.shadowBlur;
      ctx.shadowOffsetX = layer.shadowOffsetX;
      ctx.shadowOffsetY = layer.shadowOffsetY;

      ctx.fillStyle = `rgba(${sr}, ${sg}, ${sb}, ${sAlpha})`;
      this.drawRoundedRect(ctx, -hw - bw, -hh - bw, w + bw * 2, h + bw * 2, Math.max(0, rad + bw));
      ctx.fill();
      ctx.restore();
    }

    // 2. Border
    if (bw > 0) {
      ctx.save();
      const [br, bg, bb] = layer.borderColor;
      ctx.fillStyle = rgbToHex(br, bg, bb);
      this.drawRoundedRect(ctx, -hw - bw, -hh - bw, w + bw * 2, h + bw * 2, Math.max(0, rad + bw));
      ctx.fill();
      ctx.restore();
    }

    // 3. Image with corner radius clip
    ctx.save();
    ctx.beginPath();
    if (rad > 0 && ctx.roundRect) {
      ctx.roundRect(-hw, -hh, w, h, rad);
      ctx.clip();
    }
    ctx.drawImage(layer.imageElement, -hw, -hh, w, h);
    ctx.restore();

    ctx.restore();
  }

  drawSelectionOverlay(ctx, layer) {
    const { cx, cy } = this.getLayerCanvasPos(layer);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((layer.rotation * Math.PI) / 180);

    const hw = layer.width / 2.0 + layer.borderWidth;
    const hh = layer.height / 2.0 + layer.borderWidth;
    const rotOffset = 32.0 / Math.max(0.2, this.zoom);

    // Glowing cyan bounding box
    ctx.strokeStyle = '#00d2ff';
    ctx.lineWidth = 1.8 / this.zoom;
    ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);

    // Vertical stalk line connecting top handle to rotation handle
    ctx.strokeStyle = '#00d2ff';
    ctx.lineWidth = 1.5 / this.zoom;
    ctx.beginPath();
    ctx.moveTo(0, -hh);
    ctx.lineTo(0, -hh - rotOffset);
    ctx.stroke();

    // Rotation circular knob
    const knobRadius = 7.0 / Math.max(0.2, this.zoom);
    ctx.fillStyle = '#00d2ff';
    ctx.beginPath();
    ctx.arc(0, -hh - rotOffset, knobRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5 / this.zoom;
    ctx.stroke();

    // 8 resize handles
    const handleSize = 9.0 / Math.max(0.2, this.zoom);
    const hs = handleSize / 2;
    const points = [
      [-hw, -hh],
      [hw, -hh],
      [-hw, hh],
      [hw, hh],
      [0, -hh],
      [0, hh],
      [-hw, 0],
      [hw, 0],
    ];

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0099ff';
    ctx.lineWidth = 1.5 / this.zoom;

    for (const [px, py] of points) {
      ctx.fillRect(px - hs, py - hs, handleSize, handleSize);
      ctx.strokeRect(px - hs, py - hs, handleSize, handleSize);
    }

    ctx.restore();
  }

  drawMultiSelectionOverlay(ctx, layer) {
    const { cx, cy } = this.getLayerCanvasPos(layer);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((layer.rotation * Math.PI) / 180);

    const hw = layer.width / 2.0 + layer.borderWidth;
    const hh = layer.height / 2.0 + layer.borderWidth;

    // Cyan outline with dash
    ctx.strokeStyle = '#00d2ff';
    ctx.lineWidth = 2.0 / this.zoom;
    ctx.setLineDash([6.0 / this.zoom, 4.0 / this.zoom]);
    ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);
    ctx.restore();
  }
}
