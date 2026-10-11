/**
 * Project file (.wpp) serialization and session restore.
 * Fully compatible with desktop Wallpaper Positioner project files.
 */

import { Layer, MonitorInfo } from './models.js';

export class ProjectManager {
  static SESSION_KEY = 'wp_web_last_session';

  /**
   * Serialize current session to .wpp JSON structure.
   */
  static serialize({
    monitor,
    bgColor,
    layers,
    canvasDefaults = {},
    viewport = {},
  }) {
    const layersData = layers.map(l => ({
      name: l.name,
      file_path: l.name,
      x: l.x,
      y: l.y,
      width: l.width,
      height: l.height,
      rotation: l.rotation,
      opacity: l.opacity,
      visible: l.visible,
      locked: l.locked,
      orig_width: l.origWidth,
      orig_height: l.origHeight,
      aspect_ratio: l.aspectRatio,
      // Border & Frame
      border_width: l.borderWidth,
      border_color: [...l.borderColor],
      border_radius: l.borderRadius,
      monitor_name: l.monitorName || '',
      // Shadow
      shadow_enabled: l.shadowEnabled,
      shadow_blur: l.shadowBlur,
      shadow_offset_x: l.shadowOffsetX,
      shadow_offset_y: l.shadowOffsetY,
      shadow_opacity: l.shadowOpacity,
      shadow_color: [...l.shadowColor],
      // Standalone base64 / dataUrl
      data_url: l.dataUrl,
      embedded_image_base64: l.dataUrl ? l.dataUrl.split(',')[1] : null,
    }));

    return {
      version: '1.0',
      app: 'wallpaper_positioner',
      timestamp: Date.now(),
      monitor: {
        id: monitor.id,
        name: monitor.name,
        description: monitor.description,
        width: monitor.width,
        height: monitor.height,
        is_spanned: monitor.isSpanned,
        is_custom: monitor.isCustom,
        sub_monitors: monitor.subMonitors ? monitor.subMonitors.map(s => ({
          id: s.id,
          name: s.name,
          width: s.width,
          height: s.height,
          rel_x: s.relX,
          rel_y: s.relY,
        })) : [],
      },
      bg_color: [...bgColor],
      canvas_defaults: canvasDefaults,
      viewport: viewport,
      layers: layersData,
    };
  }

  /**
   * Helper to load an image element from dataUrl or URL.
   */
  static loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  }

  /**
   * Deserialize .wpp project data.
   */
  static async deserialize(data) {
    if (!data || !data.layers) {
      throw new Error('Invalid project file format');
    }

    const layers = [];
    for (const ld of data.layers) {
      let dataUrl = ld.data_url;
      if (!dataUrl && ld.embedded_image_base64) {
        dataUrl = `data:image/png;base64,${ld.embedded_image_base64}`;
      }

      let img = null;
      if (dataUrl) {
        try {
          img = await this.loadImage(dataUrl);
        } catch (e) {
          console.warn('Could not load layer image:', ld.name, e);
        }
      }

      const layer = new Layer({
        name: ld.name || 'Image',
        dataUrl: dataUrl || '',
        imageElement: img,
        x: Number(ld.x) || 0,
        y: Number(ld.y) || 0,
        width: Number(ld.width) || (img ? img.naturalWidth : 100),
        height: Number(ld.height) || (img ? img.naturalHeight : 100),
        rotation: Number(ld.rotation) || 0,
        opacity: ld.opacity !== undefined ? Number(ld.opacity) : 1.0,
        visible: ld.visible !== undefined ? Boolean(ld.visible) : true,
        locked: Boolean(ld.locked),
        monitorName: ld.monitor_name || '',
        origWidth: Number(ld.orig_width) || (img ? img.naturalWidth : 100),
        origHeight: Number(ld.orig_height) || (img ? img.naturalHeight : 100),
        aspectRatio: Number(ld.aspect_ratio) || (img && img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 1.0),
        borderWidth: Number(ld.border_width) || 0,
        borderColor: ld.border_color || [255, 255, 255],
        borderRadius: Number(ld.border_radius) || 0,
        shadowEnabled: Boolean(ld.shadow_enabled),
        shadowBlur: Number(ld.shadow_blur) || 20,
        shadowOffsetX: Number(ld.shadow_offset_x) || 0,
        shadowOffsetY: Number(ld.shadow_offset_y) || 15,
        shadowOpacity: ld.shadow_opacity !== undefined ? Number(ld.shadow_opacity) : 0.5,
        shadowColor: ld.shadow_color || [0, 0, 0],
      });

      layers.push(layer);
    }

    return {
      monitorData: data.monitor,
      bgColor: data.bg_color || [26, 27, 38],
      canvasDefaults: data.canvas_defaults || {},
      viewport: data.viewport || {},
      layers,
    };
  }

  /**
   * Save current session to IndexedDB / localStorage.
   */
  static saveSession(projectData) {
    try {
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(projectData));
    } catch (e) {
      console.warn('localStorage save failed (quota exceeded):', e);
    }
  }

  /**
   * Load saved session from localStorage.
   */
  static loadSession() {
    try {
      const saved = localStorage.getItem(this.SESSION_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('localStorage load failed:', e);
    }
    return null;
  }

  /**
   * Clear saved session from localStorage.
   */
  static clearSession() {
    try {
      localStorage.removeItem(this.SESSION_KEY);
    } catch (e) {
      console.warn('localStorage clear failed:', e);
    }
  }
}
