/**
 * Monitor Manager for Wallpaper Positioner Web.
 * Supports Spanned Multi-Monitor setups, Individual physical screens, and Custom Canvas dimensions.
 */

import { MonitorInfo } from './models.js';

export class MonitorManager {
  constructor() {
    this.monitors = [];
    this.customMonitor = new MonitorInfo({
      id: '__custom__',
      name: 'Custom',
      description: 'Custom Canvas Resolution',
      width: 1920,
      height: 1080,
      refreshRate: 60,
      isCustom: true,
    });

    this.initDefaultMonitors();
  }

  initDefaultMonitors() {
    // Detect user's current physical screen resolution
    const screenW = (typeof window !== 'undefined' && window.screen?.width) ? window.screen.width : 1920;
    const screenH = (typeof window !== 'undefined' && window.screen?.height) ? window.screen.height : 1080;
    const detectedDpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
    const physicalW = Math.round(screenW * (detectedDpr > 1 ? detectedDpr : 1));
    const physicalH = Math.round(screenH * (detectedDpr > 1 ? detectedDpr : 1));

    // Monitor 1: HDMI-A-1 (1920x1080)
    const m1 = new MonitorInfo({
      id: 'HDMI-A-1',
      name: 'HDMI-A-1',
      description: 'FHD Display (1920×1080)',
      width: 1920,
      height: 1080,
      refreshRate: 75.0,
      scale: 1.0,
      x: 0,
      y: 360,
    });

    // Monitor 2: DP-1 (2560x1440)
    const m2 = new MonitorInfo({
      id: 'DP-1',
      name: 'DP-1',
      description: 'QHD Gaming Display (2560×1440)',
      width: 2560,
      height: 1440,
      refreshRate: 144.0,
      scale: 1.0,
      x: 1920,
      y: 0,
    });

    // Spanned Monitor with gap separation (matches original app: 120px gap)
    const MONITOR_GAP = 120;
    const sub1 = new MonitorInfo({
      ...m1,
      relX: 0,
      relY: 360,
      isSpanned: false,
    });
    const sub2 = new MonitorInfo({
      ...m2,
      relX: 1920 + MONITOR_GAP, // 2040px
      relY: 0,
      isSpanned: false,
    });

    const totalSpannedW = sub2.relX + sub2.width; // 2040 + 2560 = 4600px
    const totalSpannedH = Math.max(sub1.relY + sub1.height, sub2.relY + sub2.height); // 1440px

    const spanned = new MonitorInfo({
      id: '__spanned__',
      name: 'Spanned',
      description: 'Dual-Monitor Spanned (HDMI-A-1 + DP-1)',
      width: totalSpannedW,
      height: totalSpannedH,
      refreshRate: 0,
      isSpanned: true,
      subMonitors: [sub1, sub2],
    });

    this.monitors = [spanned, m1, m2, this.customMonitor];
  }

  setCustomResolution(width, height) {
    this.customMonitor.width = Math.max(100, Math.round(width));
    this.customMonitor.height = Math.max(100, Math.round(height));
    return this.customMonitor;
  }

  getMonitorById(id) {
    return this.monitors.find(m => m.id === id) || this.monitors[0];
  }

  /**
   * Quick Preset resolutions
   */
  static get PRESETS() {
    return [
      { name: 'FHD', width: 1920, height: 1080 },
      { name: '2K', width: 2560, height: 1440 },
      { name: '4K', width: 3840, height: 2160 },
      { name: '21:9', width: 3440, height: 1440 },
      { name: '9:16', width: 1080, height: 1920 },
      { name: '1:1', width: 2000, height: 2000 },
    ];
  }

  /**
   * Set custom multi-monitor configuration
   */
  configureMultiMonitor(displays) {
    // displays is an array of { id, name, width, height, refreshRate, yOffset }
    const MONITOR_GAP = 120;
    let currentRelX = 0;
    const subList = [];
    const singleMonitors = [];

    const minY = Math.min(...displays.map(d => d.yOffset || 0));

    for (const d of displays) {
      const relY = Math.max(0, (d.yOffset || 0) - minY);
      const sub = new MonitorInfo({
        id: d.id || d.name,
        name: d.name,
        description: `${d.name} (${d.width}×${d.height})`,
        width: d.width,
        height: d.height,
        refreshRate: d.refreshRate || 60,
        relX: currentRelX,
        relY: relY,
        isSpanned: false,
      });
      subList.push(sub);

      singleMonitors.push(new MonitorInfo({
        id: d.id || d.name,
        name: d.name,
        description: `${d.name} (${d.width}×${d.height})`,
        width: d.width,
        height: d.height,
        refreshRate: d.refreshRate || 60,
      }));

      currentRelX += d.width + MONITOR_GAP;
    }

    const totalW = currentRelX - MONITOR_GAP;
    const totalH = Math.max(...subList.map(s => s.relY + s.height));

    const spanned = new MonitorInfo({
      id: '__spanned__',
      name: 'Spanned',
      description: 'Multi-Monitor Spanned',
      width: totalW,
      height: totalH,
      isSpanned: true,
      subMonitors: subList,
    });

    this.monitors = [spanned, ...singleMonitors, this.customMonitor];
    return spanned;
  }
}
