/**
 * Monitor Manager for Wallpaper Positioner Web.
 * Provides clear display presets (4K, 2K, Full HD, Smartphone, Ultrawide)
 * with explicit resolutions, and custom resolution support.
 */

import { MonitorInfo } from './models.js';

export class MonitorManager {
  constructor() {
    this.monitors = [];
    this.customMonitor = null;
    this.defaultMonitor = null;

    this.initDefaultMonitors();
  }

  initDefaultMonitors() {
    const isMobile = (typeof window !== 'undefined') && (
      /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (window.matchMedia && window.matchMedia('(max-width: 820px)').matches && 'ontouchstart' in window)
    );

    // 1. Full HD
    const fhd = new MonitorInfo({
      id: 'res-fhd',
      name: 'Full HD (1920 × 1080)',
      description: 'Standard 1080p 16:9',
      width: 1920,
      height: 1080,
    });

    // 2. 2K QHD
    const qhd = new MonitorInfo({
      id: 'res-2k',
      name: '2K QHD (2560 × 1440)',
      description: 'WQHD 1440p 16:9',
      width: 2560,
      height: 1440,
    });

    // 3. 4K UHD
    const uhd4k = new MonitorInfo({
      id: 'res-4k',
      name: '4K UHD (3840 × 2160)',
      description: 'Ultra HD 4K 16:9',
      width: 3840,
      height: 2160,
    });

    // 4. Smartphone FHD+
    const phone = new MonitorInfo({
      id: 'res-phone',
      name: 'Smartphone (1080 × 2400)',
      description: 'Handy FHD+ 9:20',
      width: 1080,
      height: 2400,
    });

    // 5. iPhone / OLED
    const iphone = new MonitorInfo({
      id: 'res-iphone',
      name: 'iPhone / OLED (1170 × 2532)',
      description: 'Retina 9:19.5',
      width: 1170,
      height: 2532,
    });

    // 6. Ultrawide 21:9
    const ultrawide = new MonitorInfo({
      id: 'res-ultrawide',
      name: 'Ultrawide (3440 × 1440)',
      description: '21:9 Breitbild',
      width: 3440,
      height: 1440,
    });

    // 7. Benutzerdefiniert (Custom Resolution - KEINE Klammern!)
    this.customMonitor = new MonitorInfo({
      id: '__custom__',
      name: 'Benutzerdefiniert',
      description: 'Eigene Auflösung festlegen',
      width: 1920,
      height: 1080,
      isCustom: true,
    });

    this.monitors = [
      fhd,
      qhd,
      uhd4k,
      phone,
      iphone,
      ultrawide,
      this.customMonitor,
    ];

    // Auf mobilen Geräten standardmäßig Smartphone wählen, sonst Full HD
    this.defaultMonitor = isMobile ? phone : fhd;
  }

  setCustomResolution(width, height) {
    this.customMonitor.width = Math.max(100, Math.round(width));
    this.customMonitor.height = Math.max(100, Math.round(height));
    return this.customMonitor;
  }

  getMonitorById(id) {
    return this.monitors.find(m => m.id === id) || this.defaultMonitor;
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
