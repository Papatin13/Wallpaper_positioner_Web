/**
 * Monitor Manager for Wallpaper Positioner Web.
 * Supports auto-detection of device screen resolution (Mobile / Tablet / PC),
 * presets, custom resolutions, and multi-monitor spanned setups.
 */

import { MonitorInfo } from './models.js';

/**
 * Accurately detect user's current physical screen resolution and device type.
 */
export function detectCurrentScreen() {
  if (typeof window === 'undefined') {
    return {
      width: 1920,
      height: 1080,
      dpr: 1,
      isMobile: false,
      isPortrait: false,
      label: 'Standard Display',
    };
  }

  const dpr = window.devicePixelRatio || 1;
  const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (window.matchMedia && window.matchMedia('(max-width: 820px)').matches && 'ontouchstart' in window);

  // Screen metrics in CSS pixels
  let rawW = window.screen?.width || window.innerWidth || 1920;
  let rawH = window.screen?.height || window.innerHeight || 1080;

  let isPortrait = rawH > rawW;
  if (window.screen?.orientation && window.screen.orientation.type) {
    isPortrait = window.screen.orientation.type.includes('portrait');
  }

  // Calculate actual physical pixels
  let physW = Math.round(rawW * (dpr > 1 ? dpr : 1));
  let physH = Math.round(rawH * (dpr > 1 ? dpr : 1));

  // Sanity lower bound
  physW = Math.max(320, physW);
  physH = Math.max(320, physH);

  const label = isMobile
    ? (isPortrait ? 'Smartphone (Hochformat)' : 'Smartphone (Querformat)')
    : 'Aktueller Bildschirm';

  return {
    width: physW,
    height: physH,
    rawW,
    rawH,
    dpr,
    isMobile,
    isPortrait,
    label,
  };
}

export class MonitorManager {
  constructor() {
    this.monitors = [];
    this.customMonitor = new MonitorInfo({
      id: '__custom__',
      name: 'Custom',
      description: 'Benutzerdefinierte Auflösung',
      width: 1920,
      height: 1080,
      refreshRate: 60,
      isCustom: true,
    });

    this.initDefaultMonitors();
  }

  initDefaultMonitors() {
    const detected = detectCurrentScreen();
    this.detectedInfo = detected;

    // 1. Detected Device Screen (Default!)
    this.deviceMonitor = new MonitorInfo({
      id: 'current-device',
      name: detected.isMobile ? '📱 Dieses Gerät' : '🖥️ Mein Bildschirm',
      description: `${detected.label} (${detected.width}×${detected.height})`,
      width: detected.width,
      height: detected.height,
      refreshRate: 60,
      isDetected: true,
    });

    // 2. Popular display presets
    const pFhd = new MonitorInfo({
      id: 'preset-fhd',
      name: '🖥️ FHD 1920×1080 (16:9)',
      description: 'Standard Full HD (1920×1080)',
      width: 1920,
      height: 1080,
    });

    const pQhd = new MonitorInfo({
      id: 'preset-qhd',
      name: '🖥️ QHD 2560×1440 (16:9)',
      description: '2K WQHD (2560×1440)',
      width: 2560,
      height: 1440,
    });

    const p4k = new MonitorInfo({
      id: 'preset-4k',
      name: '🖥️ 4K 3840×2160 (16:9)',
      description: '4K Ultra HD (3840×2160)',
      width: 3840,
      height: 2160,
    });

    const pPhone = new MonitorInfo({
      id: 'preset-phone',
      name: '📱 Handy FHD+ 1080×2400',
      description: 'Smartphone Wallpaper (1080×2400)',
      width: 1080,
      height: 2400,
    });

    const pPhoneRetina = new MonitorInfo({
      id: 'preset-phone-retina',
      name: '📱 iPhone / OLED 1170×2532',
      description: 'Smartphone Retina / OLED (1170×2532)',
      width: 1170,
      height: 2532,
    });

    const pUltrawide = new MonitorInfo({
      id: 'preset-21-9',
      name: '🖥️ Ultrawide 3440×1440 (21:9)',
      description: '21:9 Ultrawide (3440×1440)',
      width: 3440,
      height: 1440,
    });

    // 3. Multi-Monitor Spanned Setup (PC Dual Display)
    const MONITOR_GAP = 120;
    const sub1 = new MonitorInfo({
      id: 'HDMI-A-1',
      name: 'HDMI-A-1',
      description: 'FHD Display (1920×1080)',
      width: 1920,
      height: 1080,
      relX: 0,
      relY: 360,
    });

    const sub2 = new MonitorInfo({
      id: 'DP-1',
      name: 'DP-1',
      description: 'QHD Gaming Display (2560×1440)',
      width: 2560,
      height: 1440,
      relX: 1920 + MONITOR_GAP,
      relY: 0,
    });

    const spanned = new MonitorInfo({
      id: '__spanned__',
      name: '🖥️ Dual Monitor Setup (PC)',
      description: 'Dual-Monitor Spanned (HDMI-A-1 + DP-1)',
      width: sub2.relX + sub2.width,
      height: Math.max(sub1.relY + sub1.height, sub2.relY + sub2.height),
      isSpanned: true,
      subMonitors: [sub1, sub2],
    });

    // Set available monitors list: Detected device is first and default!
    this.monitors = [
      this.deviceMonitor,
      pFhd,
      pQhd,
      p4k,
      pPhone,
      pPhoneRetina,
      pUltrawide,
      spanned,
      this.customMonitor,
    ];
  }

  /**
   * Re-measure current screen (e.g. after rotation or resize)
   */
  reDetectDeviceScreen() {
    const detected = detectCurrentScreen();
    this.detectedInfo = detected;
    this.deviceMonitor.width = detected.width;
    this.deviceMonitor.height = detected.height;
    this.deviceMonitor.description = `${detected.label} (${detected.width}×${detected.height})`;
    this.deviceMonitor.name = detected.isMobile ? '📱 Dieses Gerät' : '🖥️ Mein Bildschirm';
    return this.deviceMonitor;
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
      { name: 'Handy', width: 1080, height: 2400 },
      { name: 'iPhone', width: 1170, height: 2532 },
      { name: '9:16', width: 1080, height: 1920 },
      { name: '1:1', width: 2000, height: 2000 },
    ];
  }

  /**
   * Set custom multi-monitor configuration
   */
  configureMultiMonitor(displays) {
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
      name: '🖥️ Multi-Monitor Spanned',
      description: 'Multi-Monitor Spanned',
      width: totalW,
      height: totalH,
      isSpanned: true,
      subMonitors: subList,
    });

    this.monitors = [
      this.deviceMonitor,
      spanned,
      ...singleMonitors,
      this.customMonitor,
    ];
    return spanned;
  }
}
