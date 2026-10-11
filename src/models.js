/**
 * Data models and geometry calculations for Wallpaper Positioner Web.
 */

export const HandleType = {
  TOP_LEFT: 'TOP_LEFT',
  TOP_RIGHT: 'TOP_RIGHT',
  BOTTOM_LEFT: 'BOTTOM_LEFT',
  BOTTOM_RIGHT: 'BOTTOM_RIGHT',
  TOP: 'TOP',
  BOTTOM: 'BOTTOM',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  ROTATE: 'ROTATE',
};

export class Handle {
  constructor(type, x, y, size = 10) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.size = size;
  }

  containsPoint(px, py, tolerance = 6) {
    const r = (this.size / 2) + tolerance;
    return (this.x - px) ** 2 + (this.y - py) ** 2 <= r ** 2;
  }
}

export class Layer {
  constructor({
    id = null,
    name = '',
    dataUrl = '',
    imageElement = null,
    x = 0,
    y = 0,
    width = 100,
    height = 100,
    rotation = 0,
    opacity = 1.0,
    visible = true,
    locked = false,
    monitorName = '',
    origWidth = 100,
    origHeight = 100,
    aspectRatio = 1.0,
    borderWidth = 0.0,
    borderColor = [255, 255, 255],
    borderRadius = 0.0,
    shadowEnabled = false,
    shadowBlur = 20.0,
    shadowOffsetX = 0.0,
    shadowOffsetY = 15.0,
    shadowOpacity = 0.5,
    shadowColor = [0, 0, 0],
  } = {}) {
    this.id = id || 'layer_' + Math.random().toString(36).substr(2, 9);
    this.name = name || 'Image';
    this.dataUrl = dataUrl;
    this.imageElement = imageElement;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.rotation = rotation;
    this.opacity = opacity;
    this.visible = visible;
    this.locked = locked;
    this.monitorName = monitorName;

    this.origWidth = origWidth;
    this.origHeight = origHeight;
    this.aspectRatio = aspectRatio || (origHeight > 0 ? origWidth / origHeight : 1.0);

    // Border styling
    this.borderWidth = borderWidth;
    this.borderColor = [...borderColor];
    this.borderRadius = borderRadius;

    // Shadow styling
    this.shadowEnabled = shadowEnabled;
    this.shadowBlur = shadowBlur;
    this.shadowOffsetX = shadowOffsetX;
    this.shadowOffsetY = shadowOffsetY;
    this.shadowOpacity = shadowOpacity;
    this.shadowColor = [...shadowColor];
  }

  /**
   * Convert canvas coordinates (px, py) to unrotated local layer coordinates relative to center.
   */
  toLayerCoords(px, py) {
    const dx = px - this.x;
    const dy = py - this.y;
    const rad = -((this.rotation * Math.PI) / 180.0);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;
    return { lx, ly };
  }

  /**
   * Convert local layer coordinates relative to center to canvas coordinates.
   */
  fromLayerCoords(lx, ly) {
    const rad = (this.rotation * Math.PI) / 180.0;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = lx * cos - ly * sin;
    const dy = lx * sin + ly * cos;
    return { x: this.x + dx, y: this.y + dy };
  }

  /**
   * Test whether point (px, py) lies inside this layer's bounds including border.
   */
  containsPoint(px, py) {
    if (!this.visible) return false;
    const { lx, ly } = this.toLayerCoords(px, py);
    const hw = this.width / 2.0 + this.borderWidth;
    const hh = this.height / 2.0 + this.borderWidth;
    return -hw <= lx && lx <= hw && -hh <= ly && ly <= hh;
  }

  /**
   * Test whether rectangle [rx, ry, rw, rh] intersects this layer.
   */
  intersectsRect(rx, ry, rw, rh) {
    if (!this.visible || rw <= 0 || rh <= 0) return false;

    // 1. Center inside rect
    if (rx <= this.x && this.x <= rx + rw && ry <= this.y && this.y <= ry + rh) {
      return true;
    }

    const hw = this.width / 2.0 + this.borderWidth;
    const hh = this.height / 2.0 + this.borderWidth;
    const corners = [
      this.fromLayerCoords(-hw, -hh),
      this.fromLayerCoords(hw, -hh),
      this.fromLayerCoords(hw, hh),
      this.fromLayerCoords(-hw, hh),
    ];

    // 2. Any corner inside rect
    for (const c of corners) {
      if (rx <= c.x && c.x <= rx + rw && ry <= c.y && c.y <= ry + rh) {
        return true;
      }
    }

    // 3. Any rect corner inside layer
    const rectCorners = [
      { x: rx, y: ry },
      { x: rx + rw, y: ry },
      { x: rx + rw, y: ry + rh },
      { x: rx, y: ry + rh },
    ];
    for (const rc of rectCorners) {
      if (this.containsPoint(rc.x, rc.y)) {
        return true;
      }
    }

    // 4. AABB overlap
    const minX = Math.min(...corners.map(c => c.x));
    const maxX = Math.max(...corners.map(c => c.x));
    const minY = Math.min(...corners.map(c => c.y));
    const maxY = Math.max(...corners.map(c => c.y));
    if (maxX < rx || minX > rx + rw || maxY < ry || minY > ry + rh) {
      return false;
    }

    return true;
  }

  /**
   * Return list of interactive handles in canvas coordinates.
   */
  getHandles(handleSize = 12, zoom = 1.0) {
    const hw = this.width / 2.0 + this.borderWidth;
    const hh = this.height / 2.0 + this.borderWidth;
    const rotOffset = 32.0 / Math.max(0.2, zoom);

    const localDefs = [
      { type: HandleType.TOP_LEFT, lx: -hw, ly: -hh },
      { type: HandleType.TOP_RIGHT, lx: hw, ly: -hh },
      { type: HandleType.BOTTOM_LEFT, lx: -hw, ly: hh },
      { type: HandleType.BOTTOM_RIGHT, lx: hw, ly: hh },
      { type: HandleType.TOP, lx: 0.0, ly: -hh },
      { type: HandleType.BOTTOM, lx: 0.0, ly: hh },
      { type: HandleType.LEFT, lx: -hw, ly: 0.0 },
      { type: HandleType.RIGHT, lx: hw, ly: 0.0 },
      { type: HandleType.ROTATE, lx: 0.0, ly: -hh - rotOffset },
    ];

    return localDefs.map(d => {
      const p = this.fromLayerCoords(d.lx, d.ly);
      return new Handle(d.type, p.x, p.y, handleSize);
    });
  }

  getHandleAt(px, py, tolerance = 8, zoom = 1.0) {
    const handles = this.getHandles(12 / Math.max(0.2, zoom), zoom);
    for (const h of handles) {
      if (h.containsPoint(px, py, tolerance / Math.max(0.2, zoom))) {
        return h;
      }
    }
    return null;
  }

  fitInto(maxW, maxH, cover = false) {
    if (this.origWidth <= 0 || this.origHeight <= 0) return;
    const ratioW = maxW / this.origWidth;
    const ratioH = maxH / this.origHeight;
    const scale = cover ? Math.max(ratioW, ratioH) : Math.min(ratioW, ratioH);
    this.width = this.origWidth * scale;
    this.height = this.origHeight * scale;
  }

  resetRotation() {
    this.rotation = 0.0;
  }
}

export class MonitorInfo {
  constructor({
    id,
    name,
    description = '',
    width = 1920,
    height = 1080,
    refreshRate = 60.0,
    scale = 1.0,
    x = 0,
    y = 0,
    relX = 0,
    relY = 0,
    isSpanned = false,
    isCustom = false,
    isDetected = false,
    subMonitors = [],
  }) {
    this.id = id;
    this.name = name;
    this.description = description || name;
    this.width = width;
    this.height = height;
    this.refreshRate = refreshRate;
    this.scale = scale;
    this.x = x;
    this.y = y;
    this.relX = relX;
    this.relY = relY;
    this.isSpanned = isSpanned;
    this.isCustom = isCustom;
    this.isDetected = isDetected;
    this.subMonitors = subMonitors;
  }

  get displayLabel() {
    if (this.isDetected) {
      return `${this.name} (${this.width}×${this.height}) [Erkannt]`;
    }
    if (this.isSpanned) {
      const names = this.subMonitors.length
        ? this.subMonitors.map(s => s.name).join(' + ')
        : 'Alle Monitore';
      return `Dual Monitor: ${names} (${this.width}×${this.height})`;
    }
    if (this.isCustom) {
      return `Custom (${this.width}×${this.height})`;
    }
    const hz = this.refreshRate > 0 ? ` @ ${Math.round(this.refreshRate)}Hz` : '';
    return `${this.name} (${this.width}×${this.height}${hz})`;
  }

  get shortLabel() {
    if (this.isDetected) return `${this.name} (${this.width}×${this.height})`;
    if (this.isSpanned) return `Dual Monitor (${this.width}×${this.height})`;
    if (this.isCustom) return `Custom (${this.width}×${this.height})`;
    return `${this.name} (${this.width}×${this.height})`;
  }
}
