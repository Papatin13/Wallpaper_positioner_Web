/**
 * Main application entry point for Wallpaper Positioner Web.
 */

import { MonitorManager } from './monitorManager.js';
import { CanvasEngine } from './canvasEngine.js';
import { Layer } from './models.js';
import { ColorEngine, rgbToHex, hexToRgb } from './colorEngine.js';
import { AutoLayout } from './autoLayout.js';
import { ProjectManager } from './projectManager.js';
import { WallpaperExporter } from './exporter.js';

import { tr, getLanguage, setLanguage } from './i18n.js';

class WallpaperApp {
  constructor() {
    this.monitorManager = new MonitorManager();
    this.canvasEngine = new CanvasEngine(
      document.getElementById('viewportCanvas'),
      this.monitorManager
    );

    this.currentLayoutMode = 'dynamic';
    this.layoutMargin = 40.0;
    this.layoutGap = 20.0;
    this.layoutCover = false;
    this.autoAdaptBg = false;

    this.initUI();
    this.bindEvents();
    this.updateLanguageUI();
    this.initSession();
  }

  // -------------------------------------------------------------------------
  // UI Initialization
  // -------------------------------------------------------------------------
  initUI() {
    this.updateMonitorDropdown();
    this.updateMonitorInfo();
    this.refreshPalette();

    // Auto collapse sidebar on mobile devices for unobstructed canvas
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      document.getElementById('sidebar')?.classList.add('collapsed');
    }

    // Connect Canvas callbacks
    this.canvasEngine.onSelectionChanged = (layer, multi) => this.onSelectionChanged(layer, multi);
    this.canvasEngine.onLayersChanged = () => this.onLayersChanged();
    this.canvasEngine.onBgColorChanged = (rgb) => this.onBgColorChanged(rgb);
    this.canvasEngine.onViewportChanged = (vp) => this.updateStatusPill();
  }

  updateLanguageUI() {
    const lang = getLanguage();
    document.documentElement.lang = lang;
    const langBtn = document.getElementById('lblLangCode');
    if (langBtn) langBtn.textContent = lang.toUpperCase();

    // Translate all elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = tr(key);
    });

    this.updateMonitorDropdown();
    this.updateMonitorInfo();
    this.updateStatusPill();
  }

  updateMonitorDropdown() {
    const sel = document.getElementById('selMonitorHeader');
    if (!sel) return;
    sel.innerHTML = '';

    for (const m of this.monitorManager.monitors) {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.shortLabel;
      if (m.id === this.canvasEngine.monitor.id) {
        opt.selected = true;
      }
      sel.appendChild(opt);
    }
  }

  updateMonitorInfo() {
    const lbl = document.getElementById('lblMonitorInfo');
    const mon = this.canvasEngine.monitor;
    if (!lbl) return;

    if (mon.isCustom) {
      lbl.innerHTML = `<strong>${mon.name}</strong><br>Aktive Fläche: ${mon.width} × ${mon.height} px`;
    } else {
      lbl.innerHTML = `<strong>${mon.name}</strong><br>Erkannte Auflösung: ${mon.width} × ${mon.height} px`;
    }

    // Update active state in monitor button group
    document.querySelectorAll('#monitorButtonGroup .btn').forEach(btn => {
      const target = btn.getAttribute('data-mon');
      btn.classList.toggle('active', target === mon.id);
    });
  }

  updateStatusPill() {
    const pill = document.getElementById('statusModePill');
    if (!pill) return;

    const mon = this.canvasEngine.monitor;
    const layerCount = this.canvasEngine.layers.length;
    const countStr = layerCount === 1
      ? tr('images_count', { count: 1 })
      : tr('images_count_plural', { count: layerCount });

    const selCount = this.canvasEngine.selectedLayers.length;
    const selStr = selCount > 0 ? ` • ${tr('selected_count', { count: selCount })}` : '';
    const zoomPct = Math.round(this.canvasEngine.zoom * 100);

    const monStr = mon.isCustom ? `${mon.name} • ${mon.width}×${mon.height} px` : mon.shortLabel;
    pill.textContent = `${monStr} • ${countStr}${selStr} • ${tr('zoom_label')}: ${zoomPct}%`;

    const lblCount = document.getElementById('lblLayerCount');
    if (lblCount) lblCount.textContent = layerCount.toString();
  }

  refreshPalette() {
    const imgs = this.canvasEngine.layers.map(l => l.imageElement).filter(Boolean);
    const dominant = ColorEngine.extractDominantColors(imgs, 8);

    const container = document.getElementById('paletteSwatches');
    if (!container) return;
    container.innerHTML = '';

    for (const rgb of dominant) {
      const hex = rgbToHex(...rgb);
      const chip = document.createElement('div');
      chip.className = 'palette-chip';
      chip.style.backgroundColor = hex;
      chip.title = `${tr('set_color_as_bg', { hex })}`;
      chip.addEventListener('click', () => {
        this.canvasEngine.setBackgroundColor(rgb);
        this.syncBgInputs(hex);
        this.showToast(`${hex} als Hintergrund gesetzt`);
      });
      container.appendChild(chip);
    }

    if (this.autoAdaptBg && imgs.length > 0) {
      const best = ColorEngine.getBestBackgroundColor(dominant);
      this.canvasEngine.setBackgroundColor(best);
      this.syncBgInputs(rgbToHex(...best));
    }
  }

  syncBgInputs(hex) {
    const input = document.getElementById('inputBgColor');
    const lbl = document.getElementById('lblBgHex');
    if (input) input.value = hex;
    if (lbl) lbl.textContent = hex;
  }

  onBgColorChanged(rgb) {
    this.syncBgInputs(rgbToHex(...rgb));
    this.scheduleAutoSave();
  }

  onLayersChanged() {
    this.updateStatusPill();
    this.refreshPalette();
    this.renderLayersList();
    this.scheduleAutoSave();
  }

  onSelectionChanged(layer, multi) {
    this.updateStatusPill();
    this.renderLayersList();

    const box = document.getElementById('selectedLayerBox');
    if (!box) return;

    if (!layer && (!multi || multi.length === 0)) {
      box.style.display = 'none';
      return;
    }

    box.style.display = 'flex';
    const isMulti = multi && multi.length > 1;

    const titleEl = document.getElementById('lblSelectedTitle');
    const nameEl = document.getElementById('lblSelectedName');

    if (isMulti) {
      if (titleEl) titleEl.textContent = tr('section_selected_multi', { count: multi.length });
      if (nameEl) nameEl.textContent = `${multi.length} Bilder ausgewählt`;
    } else {
      if (titleEl) titleEl.textContent = tr('section_selected');
      if (nameEl) nameEl.textContent = layer.name;
    }

    // Update coordinates & dimensions
    const inputX = document.getElementById('inputPosX');
    const inputY = document.getElementById('inputPosY');
    const inputW = document.getElementById('inputSizeW');
    const inputH = document.getElementById('inputSizeH');
    if (inputX) inputX.value = Math.round(layer.x);
    if (inputY) inputY.value = Math.round(layer.y);
    if (inputW) inputW.value = Math.round(layer.width);
    if (inputH) inputH.value = Math.round(layer.height);

    // Rotation & Opacity
    const rangeRot = document.getElementById('rangeRotation');
    const lblRot = document.getElementById('lblRotationValue');
    if (rangeRot) rangeRot.value = Math.round(layer.rotation);
    if (lblRot) lblRot.textContent = `${Math.round(layer.rotation)}°`;

    const rangeOpac = document.getElementById('rangeOpacity');
    const lblOpac = document.getElementById('lblOpacityValue');
    const opacPct = Math.round(layer.opacity * 100);
    if (rangeOpac) rangeOpac.value = opacPct;
    if (lblOpac) lblOpac.textContent = `${opacPct}%`;

    // Border
    const inputBw = document.getElementById('inputBorderWidth');
    const inputBcol = document.getElementById('inputBorderColor');
    const lblBhex = document.getElementById('lblBorderHex');
    const inputBrad = document.getElementById('inputBorderRadius');
    const bwVal = Math.round(layer.borderWidth);
    const radVal = Math.round(layer.borderRadius);
    const bHex = rgbToHex(...layer.borderColor).toLowerCase();

    if (inputBw) inputBw.value = bwVal;
    if (inputBcol) inputBcol.value = bHex;
    if (lblBhex) lblBhex.textContent = bHex;
    if (inputBrad) inputBrad.value = radVal;

    document.querySelectorAll('button[data-bw]').forEach(b => {
      b.classList.toggle('active', Number(b.getAttribute('data-bw')) === bwVal);
    });
    document.querySelectorAll('button[data-rad]').forEach(b => {
      b.classList.toggle('active', Number(b.getAttribute('data-rad')) === radVal);
    });
    document.querySelectorAll('button[data-bcol]').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-bcol')?.toLowerCase() === bHex);
    });

    // Shadow
    const switchShadow = document.getElementById('switchShadow');
    const shadowBox = document.getElementById('shadowControlsBox');
    const rangeSblur = document.getElementById('rangeShadowBlur');
    const lblSblur = document.getElementById('lblShadowBlur');
    const rangeSopac = document.getElementById('rangeShadowOpacity');
    const lblSopac = document.getElementById('lblShadowOpacity');
    const inputSox = document.getElementById('inputShadowOx');
    const inputSoy = document.getElementById('inputShadowOy');
    const inputScol = document.getElementById('inputShadowColor');
    const lblShex = document.getElementById('lblShadowHex');

    if (switchShadow) switchShadow.checked = layer.shadowEnabled;
    if (shadowBox) shadowBox.style.opacity = layer.shadowEnabled ? '1.0' : '0.4';
    if (rangeSblur) rangeSblur.value = Math.round(layer.shadowBlur);
    if (lblSblur) lblSblur.textContent = `${Math.round(layer.shadowBlur)} px`;
    const sOpacPct = Math.round(layer.shadowOpacity * 100);
    if (rangeSopac) rangeSopac.value = sOpacPct;
    if (lblSopac) lblSopac.textContent = `${sOpacPct}%`;
    if (inputSox) inputSox.value = Math.round(layer.shadowOffsetX);
    if (inputSoy) inputSoy.value = Math.round(layer.shadowOffsetY);
    if (inputScol) inputScol.value = rgbToHex(...layer.shadowColor);
    if (lblShex) lblShex.textContent = rgbToHex(...layer.shadowColor);
  }

  renderLayersList() {
    const list = document.getElementById('layersList');
    if (!list) return;
    list.innerHTML = '';

    for (let i = this.canvasEngine.layers.length - 1; i >= 0; i--) {
      const layer = this.canvasEngine.layers[i];
      const item = document.createElement('div');
      item.className = 'layer-item';
      if (this.canvasEngine.selectedLayers.includes(layer)) {
        item.classList.add('selected');
      }

      // Thumbnail
      const img = document.createElement('img');
      img.className = 'layer-thumb';
      img.src = layer.dataUrl || (layer.imageElement ? layer.imageElement.src : '');
      item.appendChild(img);

      // Name
      const name = document.createElement('div');
      name.className = 'layer-item-title';
      name.textContent = layer.name;
      item.appendChild(name);

      // Visibility toggle button
      const actions = document.createElement('div');
      actions.className = 'layer-actions';
      const btnVis = document.createElement('button');
      btnVis.className = 'btn btn-icon';
      btnVis.style.width = '24px';
      btnVis.style.height = '24px';
      btnVis.innerHTML = layer.visible
        ? `<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`
        : `<svg viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27z"/></svg>`;
      btnVis.addEventListener('click', (e) => {
        e.stopPropagation();
        layer.visible = !layer.visible;
        this.canvasEngine.requestRender();
        this.renderLayersList();
      });
      actions.appendChild(btnVis);
      item.appendChild(actions);

      item.addEventListener('click', (e) => {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          this.canvasEngine.toggleLayerSelection(layer);
        } else {
          this.canvasEngine.selectLayer(layer);
        }
      });

      list.appendChild(item);
    }
  }

  // -------------------------------------------------------------------------
  // Event Bindings
  // -------------------------------------------------------------------------
  bindEvents() {
    // Header Actions
    document.getElementById('selMonitorHeader')?.addEventListener('change', (e) => {
      const mon = this.monitorManager.getMonitorById(e.target.value);
      this.canvasEngine.setMonitor(mon);
      this.updateMonitorInfo();
    });

    // Mobile close sidebar button
    document.getElementById('btnCloseSidebarMobile')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.add('collapsed');
      setTimeout(() => this.canvasEngine.resizeCanvas(), 210);
    });

    document.querySelectorAll('#monitorButtonGroup .btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-mon');
        const mon = this.monitorManager.getMonitorById(id);
        if (mon.isCustom) {
          if (inputCustomW) inputCustomW.value = mon.width;
          if (inputCustomH) inputCustomH.value = mon.height;
        }
        this.canvasEngine.setMonitor(mon);
        this.updateMonitorDropdown();
        this.updateMonitorInfo();
      });
    });

    document.getElementById('btnNewProject')?.addEventListener('click', () => {
      if (confirm(tr('confirm_new_project'))) {
        this.canvasEngine.layers = [];
        this.canvasEngine.clearSelection();
        ProjectManager.clearSession();
        const mon = this.monitorManager.defaultMonitor;
        this.canvasEngine.setMonitor(mon);
        this.updateMonitorDropdown();
        this.updateMonitorInfo();
        this.canvasEngine.requestRender();
        this.onLayersChanged();
      }
    });

    document.getElementById('btnOpenProject')?.addEventListener('click', () => {
      document.getElementById('inputOpenFile')?.click();
    });

    document.getElementById('inputOpenFile')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const { layers, bgColor, monitorData } = await ProjectManager.deserialize(data);

        if (monitorData) {
          const isCustom = monitorData.id === '__custom__' || monitorData.is_custom;
          if (isCustom && monitorData.width && monitorData.height) {
            this.monitorManager.setCustomResolution(monitorData.width, monitorData.height);
            this.canvasEngine.setMonitor(this.monitorManager.customMonitor);
          } else {
            this.canvasEngine.setMonitor(this.monitorManager.deviceMonitor);
          }
        }

        this.canvasEngine.layers = layers;
        this.canvasEngine.setBackgroundColor(bgColor);
        this.canvasEngine.selectLayer(layers.length > 0 ? layers[layers.length - 1] : null);
        this.canvasEngine.fitToView();
        this.onLayersChanged();
        this.showToast(tr('toast_project_loaded', { count: layers.length }));
      } catch (err) {
        alert('Fehler beim Laden des Projekts: ' + err.message);
      }
    });

    document.getElementById('btnSaveProject')?.addEventListener('click', () => {
      const data = ProjectManager.serialize({
        monitor: this.canvasEngine.monitor,
        bgColor: this.canvasEngine.bgColor,
        layers: this.canvasEngine.layers,
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      WallpaperExporter.downloadBlob(blob, 'my_wallpaper.wpp');
      this.showToast(tr('toast_project_saved'));
    });

    document.getElementById('btnAddImages')?.addEventListener('click', () => {
      document.getElementById('inputAddImages')?.click();
    });

    document.getElementById('inputAddImages')?.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      this.loadFiles(files);
    });

    document.getElementById('btnPasteClipboard')?.addEventListener('click', () => {
      this.pasteFromClipboard();
    });

    document.getElementById('btnZoomOut')?.addEventListener('click', () => this.canvasEngine.zoomOut());
    document.getElementById('btnZoomFit')?.addEventListener('click', () => this.canvasEngine.fitToView());
    document.getElementById('btnZoomIn')?.addEventListener('click', () => this.canvasEngine.zoomIn());



    document.getElementById('btnToggleLang')?.addEventListener('click', () => {
      const nextLang = getLanguage() === 'de' ? 'en' : 'de';
      setLanguage(nextLang);
      this.updateLanguageUI();
    });

    document.getElementById('btnToggleSidebar')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('collapsed');
      setTimeout(() => this.canvasEngine.resizeCanvas(), 210);
    });

    // Custom Canvas Resolution inputs
    const inputCustomW = document.getElementById('inputCustomW');
    const inputCustomH = document.getElementById('inputCustomH');

    document.getElementById('btnCustomWInc')?.addEventListener('click', () => {
      inputCustomW.value = Math.round(Number(inputCustomW.value) + 50);
    });
    document.getElementById('btnCustomWDec')?.addEventListener('click', () => {
      inputCustomW.value = Math.max(100, Math.round(Number(inputCustomW.value) - 50));
    });
    document.getElementById('btnCustomHInc')?.addEventListener('click', () => {
      inputCustomH.value = Math.round(Number(inputCustomH.value) + 50);
    });
    document.getElementById('btnCustomHDec')?.addEventListener('click', () => {
      inputCustomH.value = Math.max(100, Math.round(Number(inputCustomH.value) - 50));
    });

    document.getElementById('btnSwapDimensions')?.addEventListener('click', () => {
      const tmp = inputCustomW.value;
      inputCustomW.value = inputCustomH.value;
      inputCustomH.value = tmp;
    });

    document.querySelectorAll('button[data-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const [w, h] = btn.getAttribute('data-preset').split('x').map(Number);
        if (inputCustomW) inputCustomW.value = w;
        if (inputCustomH) inputCustomH.value = h;
        btn.parentElement?.querySelectorAll('button[data-preset]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.applyCustomResolution(w, h);
      });
    });

    document.getElementById('btnApplyCustomRes')?.addEventListener('click', () => {
      const w = Number(inputCustomW.value) || 1920;
      const h = Number(inputCustomH.value) || 1080;
      this.applyCustomResolution(w, h);
    });

    // Background color
    document.getElementById('inputBgColor')?.addEventListener('input', (e) => {
      this.canvasEngine.setBackgroundColor(hexToRgb(e.target.value));
    });

    document.getElementById('btnMatchBg')?.addEventListener('click', () => {
      const imgs = this.canvasEngine.layers.map(l => l.imageElement).filter(Boolean);
      const dominant = ColorEngine.extractDominantColors(imgs, 8);
      const best = ColorEngine.getBestBackgroundColor(dominant);
      this.canvasEngine.setBackgroundColor(best);
      this.showToast('Hintergrundfarbe harmonisch angepasst');
    });

    document.getElementById('btnRefreshPalette')?.addEventListener('click', () => {
      this.refreshPalette();
      this.showToast('Farbpalette neu extrahiert');
    });

    document.getElementById('switchAutoAdaptBg')?.addEventListener('change', (e) => {
      this.autoAdaptBg = e.target.checked;
      if (this.autoAdaptBg) this.refreshPalette();
    });

    // Layout Mode Buttons
    document.querySelectorAll('#layoutModeGroup .btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#layoutModeGroup .btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentLayoutMode = btn.getAttribute('data-mode');
        this.applyAutoLayout();
      });
    });

    // Margin & Gap Sliders
    const rangeMargin = document.getElementById('rangeMargin');
    const lblMargin = document.getElementById('lblMarginValue');
    rangeMargin?.addEventListener('input', (e) => {
      this.layoutMargin = Number(e.target.value);
      if (lblMargin) lblMargin.textContent = `${this.layoutMargin} px`;
      this.applyAutoLayout();
    });
    document.querySelectorAll('button[data-margin]').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = Number(btn.getAttribute('data-margin'));
        if (rangeMargin) rangeMargin.value = val;
        this.layoutMargin = val;
        if (lblMargin) lblMargin.textContent = `${val} px`;
        btn.parentElement?.querySelectorAll('button[data-margin]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.applyAutoLayout();
      });
    });

    const rangeGap = document.getElementById('rangeGap');
    const lblGap = document.getElementById('lblGapValue');
    rangeGap?.addEventListener('input', (e) => {
      this.layoutGap = Number(e.target.value);
      if (lblGap) lblGap.textContent = `${this.layoutGap} px`;
      this.applyAutoLayout();
    });
    document.querySelectorAll('button[data-gap]').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = Number(btn.getAttribute('data-gap'));
        if (rangeGap) rangeGap.value = val;
        this.layoutGap = val;
        if (lblGap) lblGap.textContent = `${val} px`;
        btn.parentElement?.querySelectorAll('button[data-gap]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.applyAutoLayout();
      });
    });

    document.getElementById('switchCover')?.addEventListener('change', (e) => {
      this.layoutCover = e.target.checked;
      this.applyAutoLayout();
    });

    document.getElementById('btnArrangeNow')?.addEventListener('click', () => {
      this.applyAutoLayout();
      this.showToast('Bilder neu angeordnet');
    });

    document.getElementById('btnArrangeRandom')?.addEventListener('click', () => {
      AutoLayout.applyLayout({
        monitor: this.canvasEngine.monitor,
        layers: this.canvasEngine.layers,
        mode: 'random',
        margin: this.layoutMargin,
        gap: this.layoutGap,
        cover: this.layoutCover,
      });
      this.canvasEngine.requestRender();
      this.onSelectionChanged(this.canvasEngine.selectedLayer, this.canvasEngine.selectedLayers);
      this.onLayersChanged();
      this.showToast(tr('toast_arranged_random'));
    });

    // Selected Layer properties
    this.bindSelectedLayerControls();

    // Modals
    this.bindModals();

    // Drag and drop files onto window
    this.setupDragAndDrop();

    // Keyboard shortcuts & clipboard paste
    this.setupShortcuts();
  }

  applyCustomResolution(w, h) {
    const custom = this.monitorManager.setCustomResolution(w, h);
    this.canvasEngine.setMonitor(custom);
    this.updateMonitorDropdown();
    this.updateMonitorInfo();
    this.showToast(`Auflösung auf ${w}×${h} px gesetzt`);
  }

  applyAutoLayout() {
    AutoLayout.applyLayout({
      monitor: this.canvasEngine.monitor,
      layers: this.canvasEngine.layers,
      mode: this.currentLayoutMode,
      margin: this.layoutMargin,
      gap: this.layoutGap,
      cover: this.layoutCover,
    });
    this.canvasEngine.requestRender();
    this.onSelectionChanged(this.canvasEngine.selectedLayer, this.canvasEngine.selectedLayers);
  }

  bindSelectedLayerControls() {
    const layer = () => this.canvasEngine.selectedLayer;
    const selected = () => this.canvasEngine.selectedLayers;

    // Position & Size inputs
    const inputX = document.getElementById('inputPosX');
    const inputY = document.getElementById('inputPosY');
    const inputW = document.getElementById('inputSizeW');
    const inputH = document.getElementById('inputSizeH');

    inputX?.addEventListener('change', () => {
      if (layer()) { layer().x = Number(inputX.value); this.canvasEngine.requestRender(); }
    });
    inputY?.addEventListener('change', () => {
      if (layer()) { layer().y = Number(inputY.value); this.canvasEngine.requestRender(); }
    });
    inputW?.addEventListener('change', () => {
      if (layer()) { layer().width = Math.max(10, Number(inputW.value)); this.canvasEngine.requestRender(); }
    });
    inputH?.addEventListener('change', () => {
      if (layer()) { layer().height = Math.max(10, Number(inputH.value)); this.canvasEngine.requestRender(); }
    });

    document.getElementById('btnPosXInc')?.addEventListener('click', () => this.canvasEngine.nudgeSelected(5, 0));
    document.getElementById('btnPosXDec')?.addEventListener('click', () => this.canvasEngine.nudgeSelected(-5, 0));
    document.getElementById('btnPosYInc')?.addEventListener('click', () => this.canvasEngine.nudgeSelected(0, 5));
    document.getElementById('btnPosYDec')?.addEventListener('click', () => this.canvasEngine.nudgeSelected(0, -5));

    document.getElementById('btnSizeWInc')?.addEventListener('click', () => {
      for (const l of selected()) { l.width = Math.round(l.width + 10); l.height = Math.round(l.width / (l.aspectRatio || 1)); }
      this.canvasEngine.requestRender();
      this.onSelectionChanged(layer(), selected());
    });
    document.getElementById('btnSizeWDec')?.addEventListener('click', () => {
      for (const l of selected()) { l.width = Math.max(10, Math.round(l.width - 10)); l.height = Math.round(l.width / (l.aspectRatio || 1)); }
      this.canvasEngine.requestRender();
      this.onSelectionChanged(layer(), selected());
    });

    document.getElementById('btnSizeHInc')?.addEventListener('click', () => {
      for (const l of selected()) { l.height = Math.round(l.height + 10); l.width = Math.round(l.height * (l.aspectRatio || 1)); }
      this.canvasEngine.requestRender();
      this.onSelectionChanged(layer(), selected());
    });
    document.getElementById('btnSizeHDec')?.addEventListener('click', () => {
      for (const l of selected()) { l.height = Math.max(10, Math.round(l.height - 10)); l.width = Math.round(l.height * (l.aspectRatio || 1)); }
      this.canvasEngine.requestRender();
      this.onSelectionChanged(layer(), selected());
    });

    // Rotation
    const rangeRot = document.getElementById('rangeRotation');
    const lblRot = document.getElementById('lblRotationValue');
    rangeRot?.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      if (lblRot) lblRot.textContent = `${val}°`;
      for (const l of selected()) l.rotation = val;
      this.canvasEngine.requestRender();
    });
    document.getElementById('btnResetRotation')?.addEventListener('click', () => {
      for (const l of selected()) l.rotation = 0;
      if (rangeRot) rangeRot.value = 0;
      if (lblRot) lblRot.textContent = '0°';
      this.canvasEngine.requestRender();
    });

    // Opacity
    const rangeOpac = document.getElementById('rangeOpacity');
    const lblOpac = document.getElementById('lblOpacityValue');
    rangeOpac?.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      if (lblOpac) lblOpac.textContent = `${val}%`;
      for (const l of selected()) l.opacity = val / 100.0;
      this.canvasEngine.requestRender();
    });

    // Border Width
    const inputBw = document.getElementById('inputBorderWidth');
    inputBw?.addEventListener('change', () => {
      const bw = Math.max(0, Number(inputBw.value));
      for (const l of selected()) l.borderWidth = bw;
      this.canvasEngine.requestRender();
    });
    document.getElementById('btnBorderWidthInc')?.addEventListener('click', () => {
      inputBw.value = Number(inputBw.value) + 1;
      inputBw.dispatchEvent(new Event('change'));
    });
    document.getElementById('btnBorderWidthDec')?.addEventListener('click', () => {
      inputBw.value = Math.max(0, Number(inputBw.value) - 1);
      inputBw.dispatchEvent(new Event('change'));
    });
    // Border Width Chips (0px, 8px, etc.)
    document.querySelectorAll('button[data-bw]').forEach(btn => {
      btn.addEventListener('click', () => {
        const bw = Number(btn.getAttribute('data-bw'));
        if (inputBw) inputBw.value = bw;
        const targets = selected().length > 0 ? selected() : this.canvasEngine.layers;
        for (const l of targets) l.borderWidth = bw;
        this.canvasEngine.defaultBorderWidth = bw;
        btn.parentElement?.querySelectorAll('button[data-bw]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.canvasEngine.requestRender();
      });
    });

    // Border Color
    const inputBcol = document.getElementById('inputBorderColor');
    const lblBhex = document.getElementById('lblBorderHex');
    inputBcol?.addEventListener('input', (e) => {
      const rgb = hexToRgb(e.target.value);
      if (lblBhex) lblBhex.textContent = e.target.value;
      const targets = selected().length > 0 ? selected() : this.canvasEngine.layers;
      for (const l of targets) l.borderColor = [...rgb];
      this.canvasEngine.defaultBorderColor = [...rgb];
      this.canvasEngine.requestRender();
    });
    document.querySelectorAll('button[data-bcol]').forEach(btn => {
      btn.addEventListener('click', () => {
        const hex = btn.getAttribute('data-bcol');
        if (inputBcol) inputBcol.value = hex;
        if (lblBhex) lblBhex.textContent = hex;
        const rgb = hexToRgb(hex);
        const targets = selected().length > 0 ? selected() : this.canvasEngine.layers;
        for (const l of targets) l.borderColor = [...rgb];
        this.canvasEngine.defaultBorderColor = [...rgb];
        btn.parentElement?.querySelectorAll('button[data-bcol]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.canvasEngine.requestRender();
      });
    });

    // Border Radius
    const inputBrad = document.getElementById('inputBorderRadius');
    inputBrad?.addEventListener('change', () => {
      const rad = Math.max(0, Number(inputBrad.value));
      const targets = selected().length > 0 ? selected() : this.canvasEngine.layers;
      for (const l of targets) l.borderRadius = rad;
      this.canvasEngine.defaultBorderRadius = rad;
      this.canvasEngine.requestRender();
    });
    document.getElementById('btnBorderRadiusInc')?.addEventListener('click', () => {
      inputBrad.value = Number(inputBrad.value) + 2;
      inputBrad.dispatchEvent(new Event('change'));
    });
    document.getElementById('btnBorderRadiusDec')?.addEventListener('click', () => {
      inputBrad.value = Math.max(0, Number(inputBrad.value) - 2);
      inputBrad.dispatchEvent(new Event('change'));
    });
    // Border Radius Chips (0px, 16px, etc.)
    document.querySelectorAll('button[data-rad]').forEach(btn => {
      btn.addEventListener('click', () => {
        const rad = Number(btn.getAttribute('data-rad'));
        if (inputBrad) inputBrad.value = rad;
        const targets = selected().length > 0 ? selected() : this.canvasEngine.layers;
        for (const l of targets) l.borderRadius = rad;
        this.canvasEngine.defaultBorderRadius = rad;
        btn.parentElement?.querySelectorAll('button[data-rad]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.canvasEngine.requestRender();
      });
    });

    // Shadow Controls
    const switchShadow = document.getElementById('switchShadow');
    const shadowBox = document.getElementById('shadowControlsBox');
    switchShadow?.addEventListener('change', (e) => {
      const en = e.target.checked;
      for (const l of selected()) l.shadowEnabled = en;
      if (shadowBox) shadowBox.style.opacity = en ? '1.0' : '0.4';
      this.canvasEngine.requestRender();
    });

    const rangeSblur = document.getElementById('rangeShadowBlur');
    const lblSblur = document.getElementById('lblShadowBlur');
    rangeSblur?.addEventListener('input', (e) => {
      const blur = Number(e.target.value);
      if (lblSblur) lblSblur.textContent = `${blur} px`;
      for (const l of selected()) l.shadowBlur = blur;
      this.canvasEngine.requestRender();
    });

    const rangeSopac = document.getElementById('rangeShadowOpacity');
    const lblSopac = document.getElementById('lblShadowOpacity');
    rangeSopac?.addEventListener('input', (e) => {
      const opac = Number(e.target.value);
      if (lblSopac) lblSopac.textContent = `${opac}%`;
      for (const l of selected()) l.shadowOpacity = opac / 100.0;
      this.canvasEngine.requestRender();
    });

    const inputSox = document.getElementById('inputShadowOx');
    const inputSoy = document.getElementById('inputShadowOy');
    inputSox?.addEventListener('change', () => {
      const val = Number(inputSox.value);
      for (const l of selected()) l.shadowOffsetX = val;
      this.canvasEngine.requestRender();
    });
    inputSoy?.addEventListener('change', () => {
      const val = Number(inputSoy.value);
      for (const l of selected()) l.shadowOffsetY = val;
      this.canvasEngine.requestRender();
    });

    document.getElementById('btnShadowOxInc')?.addEventListener('click', () => {
      inputSox.value = Number(inputSox.value) + 2; inputSox.dispatchEvent(new Event('change'));
    });
    document.getElementById('btnShadowOxDec')?.addEventListener('click', () => {
      inputSox.value = Number(inputSox.value) - 2; inputSox.dispatchEvent(new Event('change'));
    });
    document.getElementById('btnShadowOyInc')?.addEventListener('click', () => {
      inputSoy.value = Number(inputSoy.value) + 2; inputSoy.dispatchEvent(new Event('change'));
    });
    document.getElementById('btnShadowOyDec')?.addEventListener('click', () => {
      inputSoy.value = Number(inputSoy.value) - 2; inputSoy.dispatchEvent(new Event('change'));
    });

    const inputScol = document.getElementById('inputShadowColor');
    const lblShex = document.getElementById('lblShadowHex');
    inputScol?.addEventListener('input', (e) => {
      const rgb = hexToRgb(e.target.value);
      if (lblShex) lblShex.textContent = e.target.value;
      for (const l of selected()) l.shadowColor = [...rgb];
      this.canvasEngine.requestRender();
    });

    // Shadow Presets
    document.querySelectorAll('button[data-shadow-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-shadow-preset');
        let bl = 25, ox = 0, oy = 15, op = 55;
        if (type === 'subtle') { bl = 15; ox = 0; oy = 8; op = 40; }
        else if (type === 'floating') { bl = 45; ox = 0; oy = 25; op = 65; }
        else if (type === 'glow') { bl = 30; ox = 0; oy = 0; op = 70; }

        const targets = selected().length > 0 ? selected() : this.canvasEngine.layers;
        for (const l of targets) {
          l.shadowEnabled = true;
          l.shadowBlur = bl;
          l.shadowOffsetX = ox;
          l.shadowOffsetY = oy;
          l.shadowOpacity = op / 100.0;
        }
        this.canvasEngine.defaultShadowEnabled = true;
        this.canvasEngine.defaultShadowBlur = bl;
        this.canvasEngine.defaultShadowOffsetX = ox;
        this.canvasEngine.defaultShadowOffsetY = oy;
        this.canvasEngine.defaultShadowOpacity = op / 100.0;

        if (switchShadow) switchShadow.checked = true;
        if (rangeSblur) rangeSblur.value = bl;
        if (lblSblur) lblSblur.textContent = `${bl} px`;
        if (rangeSopac) rangeSopac.value = op;
        if (lblSopac) lblSopac.textContent = `${op}%`;
        if (inputSox) inputSox.value = ox;
        if (inputSoy) inputSoy.value = oy;
        if (shadowBox) shadowBox.style.opacity = '1.0';
        btn.parentElement?.querySelectorAll('button[data-shadow-preset]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.canvasEngine.requestRender();
      });
    });

    // Apply style to all images
    document.getElementById('btnApplyStyleAll')?.addEventListener('click', () => {
      if (layer()) {
        this.canvasEngine.applyStyleToAllLayers(layer());
        this.showToast('Stil auf alle Bilder angewendet');
      }
    });

    // Quick Align
    document.getElementById('btnAlignCenter')?.addEventListener('click', () => {
      const mon = this.canvasEngine.monitor;
      for (const l of selected()) {
        if (mon.isSpanned) {
          const sub = this.canvasEngine.getSubMonitorForLayer(l);
          if (sub) { l.x = sub.width / 2; l.y = sub.height / 2; }
        } else {
          l.x = mon.width / 2;
          l.y = mon.height / 2;
        }
      }
      this.canvasEngine.requestRender();
      this.onSelectionChanged(layer(), selected());
    });

    document.getElementById('btnAlignFit')?.addEventListener('click', () => {
      const mon = this.canvasEngine.monitor;
      for (const l of selected()) {
        const mw = mon.isSpanned ? (this.canvasEngine.getSubMonitorForLayer(l)?.width || mon.width) : mon.width;
        const mh = mon.isSpanned ? (this.canvasEngine.getSubMonitorForLayer(l)?.height || mon.height) : mon.height;
        l.fitInto(mw - 60, mh - 60, false);
      }
      this.canvasEngine.requestRender();
      this.onSelectionChanged(layer(), selected());
    });

    document.getElementById('btnAlignFill')?.addEventListener('click', () => {
      const mon = this.canvasEngine.monitor;
      for (const l of selected()) {
        const mw = mon.isSpanned ? (this.canvasEngine.getSubMonitorForLayer(l)?.width || mon.width) : mon.width;
        const mh = mon.isSpanned ? (this.canvasEngine.getSubMonitorForLayer(l)?.height || mon.height) : mon.height;
        l.fitInto(mw, mh, true);
      }
      this.canvasEngine.requestRender();
      this.onSelectionChanged(layer(), selected());
    });

    // Layer Order
    document.getElementById('btnLayerFront')?.addEventListener('click', () => this.canvasEngine.bringSelectedToFront());
    document.getElementById('btnLayerUp')?.addEventListener('click', () => this.canvasEngine.stepSelectedForward());
    document.getElementById('btnLayerDown')?.addEventListener('click', () => this.canvasEngine.stepSelectedBackward());
    document.getElementById('btnLayerBack')?.addEventListener('click', () => this.canvasEngine.sendSelectedToBack());
    document.getElementById('btnLayerDelete')?.addEventListener('click', () => this.canvasEngine.removeSelectedLayers());
  }

  bindModals() {
    const exportModal = document.getElementById('exportModal');
    const wallpaperModal = document.getElementById('wallpaperModal');

    document.getElementById('btnExportModal')?.addEventListener('click', () => {
      exportModal.classList.add('open');
    });

    document.getElementById('btnCloseExportModal')?.addEventListener('click', () => {
      exportModal.classList.remove('open');
    });

    document.getElementById('btnExportFullPng')?.addEventListener('click', async () => {
      exportModal.classList.remove('open');
      this.showToast('Rendering Wallpaper...');
      try {
        await WallpaperExporter.exportFullImage(
          this.canvasEngine.monitor,
          this.canvasEngine.bgColor,
          this.canvasEngine.layers
        );
        this.showToast(tr('toast_wallpaper_exported'));
      } catch (e) {
        alert('Export Fehler: ' + e.message);
      }
    });

    document.getElementById('btnExportSlicesZip')?.addEventListener('click', async () => {
      exportModal.classList.remove('open');
      this.showToast('Erstelle Monitor-Zuschnitte...');
      try {
        await WallpaperExporter.exportSlicesZip(
          this.canvasEngine.monitor,
          this.canvasEngine.bgColor,
          this.canvasEngine.layers
        );
        this.showToast(tr('toast_slices_exported'));
      } catch (e) {
        alert('ZIP Export Fehler: ' + e.message);
      }
    });

    document.getElementById('btnCopyClipboardExport')?.addEventListener('click', async () => {
      exportModal.classList.remove('open');
      try {
        await WallpaperExporter.copyToClipboard(
          this.canvasEngine.monitor,
          this.canvasEngine.bgColor,
          this.canvasEngine.layers
        );
        this.showToast(tr('toast_copied_clipboard'));
      } catch (e) {
        alert('Zwischenablage nicht unterstützt oder blockiert: ' + e.message);
      }
    });

    document.getElementById('btnSetWallpaperModal')?.addEventListener('click', () => {
      wallpaperModal.classList.add('open');
    });

    document.getElementById('btnCloseWallpaperModal')?.addEventListener('click', () => {
      wallpaperModal.classList.remove('open');
    });

    document.getElementById('btnQuickDownloadWallpaper')?.addEventListener('click', async () => {
      wallpaperModal.classList.remove('open');
      await WallpaperExporter.exportFullImage(
        this.canvasEngine.monitor,
        this.canvasEngine.bgColor,
        this.canvasEngine.layers
      );
      this.showToast(tr('toast_wallpaper_exported'));
    });

    // Close on backdrop click
    [exportModal, wallpaperModal].forEach(m => {
      m?.addEventListener('click', (e) => {
        if (e.target === m) m.classList.remove('open');
      });
    });
  }

  // -------------------------------------------------------------------------
  // Drag & Drop and Clipboard
  // -------------------------------------------------------------------------
  setupDragAndDrop() {
    const overlay = document.getElementById('dropOverlay');

    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (overlay) overlay.classList.add('active');
    });

    window.addEventListener('dragleave', (e) => {
      if (e.relatedTarget === null && overlay) {
        overlay.classList.remove('active');
      }
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      if (overlay) overlay.classList.remove('active');
      const files = Array.from(e.dataTransfer?.files || []);
      this.loadFiles(files);
    });
  }

  setupShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      if (cmdKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        document.getElementById('btnSaveProject')?.click();
      } else if (cmdKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        document.getElementById('btnOpenProject')?.click();
      } else if (cmdKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        document.getElementById('btnNewProject')?.click();
      } else if (cmdKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        document.getElementById('btnExportModal')?.click();
      } else if (cmdKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        this.canvasEngine.selectAll();
      } else if (e.key === 'Escape') {
        this.canvasEngine.clearSelection();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        this.canvasEngine.removeSelectedLayers();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.canvasEngine.nudgeSelected(e.shiftKey ? -10 : -1, 0);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.canvasEngine.nudgeSelected(e.shiftKey ? 10 : 1, 0);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.canvasEngine.nudgeSelected(0, e.shiftKey ? -10 : -1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.canvasEngine.nudgeSelected(0, e.shiftKey ? 10 : 1);
      } else if (e.key === '+' || e.key === '=') {
        this.canvasEngine.zoomIn();
      } else if (e.key === '-') {
        this.canvasEngine.zoomOut();
      } else if (e.key === '0') {
        this.canvasEngine.fitToView();
      }
    });

    window.addEventListener('paste', async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            await this.addLayerFromFile(blob, `pasted_${Date.now()}.png`);
            this.showToast('Bild aus Zwischenablage eingefügt');
          }
        }
      }
    });
  }

  async pasteFromClipboard() {
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              await this.addLayerFromFile(blob, `pasted_${Date.now()}.png`);
              this.showToast('Bild aus Zwischenablage eingefügt');
              return;
            }
          }
        }
      }
      alert('Tipp: Drücke Strg+V, um ein Bild direkt aus der Zwischenablage einzufügen.');
    } catch (e) {
      alert('Tipp: Drücke Strg+V, um ein Bild direkt aus der Zwischenablage einzufügen.');
    }
  }

  async loadFiles(files) {
    let loadedCount = 0;
    const wasEmpty = this.canvasEngine.layers.length === 0;

    for (const file of files) {
      if (file.name.endsWith('.wpp') || file.type === 'application/json') {
        // Load project
        const text = await file.text();
        const data = JSON.parse(text);
        const { layers, bgColor, monitorData } = await ProjectManager.deserialize(data);
        if (monitorData) {
          const isCustom = monitorData.id === '__custom__' || monitorData.is_custom;
          if (isCustom && monitorData.width && monitorData.height) {
            this.monitorManager.setCustomResolution(monitorData.width, monitorData.height);
            this.canvasEngine.setMonitor(this.monitorManager.customMonitor);
          } else {
            this.canvasEngine.setMonitor(this.monitorManager.deviceMonitor);
          }
        }
        this.canvasEngine.layers = layers;
        this.canvasEngine.setBackgroundColor(bgColor);
        this.canvasEngine.fitToView();
        this.onLayersChanged();
        this.showToast(tr('toast_project_loaded', { count: layers.length }));
        return;
      }

      if (file.type.startsWith('image/')) {
        await this.addLayerFromFile(file, file.name);
        loadedCount++;
      }
    }

    if (loadedCount > 0) {
      if (wasEmpty) {
        this.applyAutoLayout();
      }
      this.showToast(`${loadedCount} Bild(er) hinzugefügt`);
    }
  }

  async addLayerFromFile(blob, name) {
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onload = async (e) => {
        const dataUrl = e.target.result;
        try {
          const img = await ProjectManager.loadImage(dataUrl);
          const mon = this.canvasEngine.monitor;
          const layer = new Layer({
            name: name || 'Image',
            dataUrl,
            imageElement: img,
            origWidth: img.naturalWidth || 800,
            origHeight: img.naturalHeight || 600,
            aspectRatio: (img.naturalWidth && img.naturalHeight) ? img.naturalWidth / img.naturalHeight : 1.33,
            width: 450,
            height: Math.round(450 / ((img.naturalWidth && img.naturalHeight) ? img.naturalWidth / img.naturalHeight : 1.33)),
            x: mon.isSpanned ? mon.subMonitors[0].width / 2 : mon.width / 2,
            y: mon.isSpanned ? mon.subMonitors[0].height / 2 : mon.height / 2,
            monitorName: mon.isSpanned && mon.subMonitors ? mon.subMonitors[0].name : '',
          });
          this.canvasEngine.addLayer(layer);
          resolve(layer);
        } catch (err) {
          console.warn('Error loading dropped image:', err);
          resolve(null);
        }
      };
      reader.readAsDataURL(blob);
    });
  }

  // -------------------------------------------------------------------------
  // Auto-Save & Session Restore
  // -------------------------------------------------------------------------
  scheduleAutoSave() {
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => {
      const data = ProjectManager.serialize({
        monitor: this.canvasEngine.monitor,
        bgColor: this.canvasEngine.bgColor,
        layers: this.canvasEngine.layers,
      });
      ProjectManager.saveSession(data);
    }, 1000);
  }

  async initSession() {
    let saved = ProjectManager.loadSession();

    // Discard any old demo sessions from previous app runs
    if (saved && saved.layers) {
      const hasLegacyDemo = saved.layers.some(l =>
        (l.name && l.name.toLowerCase().includes('demo')) ||
        (l.data_url && l.data_url.includes('/demo/')) ||
        (l.file_path && l.file_path.includes('demo'))
      );
      if (hasLegacyDemo) {
        ProjectManager.clearSession();
        saved = null;
      }
    }

    if (saved && saved.layers && saved.layers.length > 0) {
      try {
        const { layers, bgColor, monitorData } = await ProjectManager.deserialize(saved);
        if (monitorData) {
          const isCustom = monitorData.id === '__custom__' || monitorData.is_custom;
          if (isCustom && monitorData.width && monitorData.height) {
            this.monitorManager.setCustomResolution(monitorData.width, monitorData.height);
            this.canvasEngine.setMonitor(this.monitorManager.customMonitor);
          } else {
            this.canvasEngine.setMonitor(this.monitorManager.deviceMonitor);
          }
        }
        this.canvasEngine.layers = layers;
        this.canvasEngine.setBackgroundColor(bgColor);
        this.canvasEngine.fitToView();
        this.canvasEngine.selectLayer(layers[layers.length - 1]);
        this.onLayersChanged();
        this.showToast(tr('toast_session_restored', { count: layers.length }));
        return;
      } catch (e) {
        console.warn('Could not restore session:', e);
      }
    }

    // Default: Clean start with preset display resolution!
    const defaultMon = this.monitorManager.defaultMonitor;
    this.canvasEngine.setMonitor(defaultMon);
    this.updateMonitorDropdown();
    this.updateMonitorInfo();
    this.canvasEngine.fitToView();
  }

  showToast(message, duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <span>${message}</span>
      <button class="toast-close">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </button>
    `;

    toast.querySelector('.toast-close')?.addEventListener('click', () => {
      toast.remove();
    });

    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, duration);
  }
}

// Start application on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  new WallpaperApp();
});
