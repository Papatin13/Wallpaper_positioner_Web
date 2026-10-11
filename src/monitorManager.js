/**
 * Monitor Manager for Wallpaper Positioner Web.
 * Supports:
 * 1. Eigener Bildschirm (Automatische Erkennung des aktuellen Geräts / Displays)
 * 2. Benutzerdefinierte Auflösung (Custom Resolution mit Eingabe & Presets)
 */

import { MonitorInfo } from './models.js';

/**
 * Ermittelt die echte physische Bildschirmauflösung des aktuellen Geräts.
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

  // CSS Pixel des Displays
  let rawW = window.screen?.width || window.innerWidth || 1920;
  let rawH = window.screen?.height || window.innerHeight || 1080;

  let isPortrait = rawH > rawW;
  if (window.screen?.orientation && window.screen.orientation.type) {
    isPortrait = window.screen.orientation.type.includes('portrait');
  }

  // Echte physische Pixel berechnen
  let physW = Math.round(rawW * (dpr > 1 ? dpr : 1));
  let physH = Math.round(rawH * (dpr > 1 ? dpr : 1));

  physW = Math.max(320, physW);
  physH = Math.max(320, physH);

  const label = isMobile
    ? (isPortrait ? 'Smartphone (Hochformat)' : 'Smartphone (Querformat)')
    : 'Desktop / Monitor';

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
      name: '📐 Benutzerdefiniert',
      description: 'Eigene Auflösung festlegen',
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

    // 1. Eigener Bildschirm (Automatisch erkannt & Standard!)
    this.deviceMonitor = new MonitorInfo({
      id: 'current-device',
      name: detected.isMobile ? '📱 Eigener Bildschirm' : '🖥️ Eigener Bildschirm',
      description: `${detected.label} (${detected.width}×${detected.height})`,
      width: detected.width,
      height: detected.height,
      refreshRate: 60,
      isDetected: true,
    });

    // 2. Benutzerdefiniert (Custom Resolution)
    this.customMonitor = new MonitorInfo({
      id: '__custom__',
      name: '📐 Benutzerdefiniert',
      description: 'Eigene Auflösung festlegen',
      width: 1920,
      height: 1080,
      refreshRate: 60,
      isCustom: true,
    });

    // Nur Eigener Bildschirm und Custom zulassen!
    this.monitors = [
      this.deviceMonitor,
      this.customMonitor,
    ];
  }

  /**
   * Bildschirm neu vermessen (z.B. nach Drehen des Handys oder Fenstergrößenänderung)
   */
  reDetectDeviceScreen() {
    const detected = detectCurrentScreen();
    this.detectedInfo = detected;
    this.deviceMonitor.width = detected.width;
    this.deviceMonitor.height = detected.height;
    this.deviceMonitor.description = `${detected.label} (${detected.width}×${detected.height})`;
    this.deviceMonitor.name = detected.isMobile ? '📱 Eigener Bildschirm' : '🖥️ Eigener Bildschirm';
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
   * Quick Preset resolutions für den Custom Resolution Modus
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
}
