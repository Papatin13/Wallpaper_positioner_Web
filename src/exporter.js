/**
 * High-resolution wallpaper rendering, per-monitor slicing, and export engine.
 */

import JSZip from 'jszip';
import { rgbToHex } from './colorEngine.js';

export class WallpaperExporter {
  /**
   * Render composite layer onto target 2D context.
   */
  static renderLayer(ctx, layer, cx, cy) {
    if (!layer.visible || layer.width <= 0 || layer.height <= 0 || !layer.imageElement) {
      return;
    }

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

    // 1. Render Drop Shadow
    if (layer.shadowEnabled && layer.shadowBlur > 0 && layer.shadowOpacity > 0) {
      ctx.save();
      const [sr, sg, sb] = layer.shadowColor;
      const sAlpha = Math.max(0.0, Math.min(1.0, layer.shadowOpacity));
      ctx.shadowColor = `rgba(${sr}, ${sg}, ${sb}, ${sAlpha})`;
      ctx.shadowBlur = layer.shadowBlur;
      ctx.shadowOffsetX = layer.shadowOffsetX;
      ctx.shadowOffsetY = layer.shadowOffsetY;

      // Draw shadow geometry
      ctx.fillStyle = `rgba(${sr}, ${sg}, ${sb}, ${sAlpha})`;
      ctx.beginPath();
      const outerRad = Math.max(0, rad + bw);
      const outerW = w + bw * 2;
      const outerH = h + bw * 2;
      if (outerRad > 0 && ctx.roundRect) {
        ctx.roundRect(-hw - bw, -hh - bw, outerW, outerH, outerRad);
      } else {
        ctx.rect(-hw - bw, -hh - bw, outerW, outerH);
      }
      ctx.fill();
      ctx.restore();
    }

    // 2. Render Border (outer frame)
    if (bw > 0) {
      ctx.save();
      const [br, bg, bb] = layer.borderColor;
      ctx.fillStyle = rgbToHex(br, bg, bb);
      const outerRad = Math.max(0, rad + bw);
      const outerW = w + bw * 2;
      const outerH = h + bw * 2;
      ctx.beginPath();
      if (outerRad > 0 && ctx.roundRect) {
        ctx.roundRect(-hw - bw, -hh - bw, outerW, outerH, outerRad);
      } else {
        ctx.rect(-hw - bw, -hh - bw, outerW, outerH);
      }
      ctx.fill();
      ctx.restore();
    }

    // 3. Render Image with Corner Radius
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

  /**
   * Render the entire canvas at full native resolution.
   */
  static renderFullCanvas(monitor, bgColor, layers) {
    const canvas = document.createElement('canvas');
    canvas.width = monitor.width;
    canvas.height = monitor.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create canvas context');

    // Fill background color
    const [r, g, b] = bgColor;
    ctx.fillStyle = rgbToHex(r, g, b);
    ctx.fillRect(0, 0, monitor.width, monitor.height);

    if (monitor.isSpanned && monitor.subMonitors && monitor.subMonitors.length > 0) {
      // For each sub-monitor, clip to its area and render its layers
      for (const sub of monitor.subMonitors) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(sub.relX, sub.relY, sub.width, sub.height);
        ctx.clip();

        for (const layer of layers) {
          const isForSub = !layer.monitorName || layer.monitorName === sub.name ||
            (sub === monitor.subMonitors[0] && !monitor.subMonitors.some(s => s.name === layer.monitorName));
          if (!isForSub) continue;

          const cx = sub.relX + layer.x;
          const cy = sub.relY + layer.y;
          this.renderLayer(ctx, layer, cx, cy);
        }
        ctx.restore();
      }
    } else {
      // Single monitor or custom canvas
      for (const layer of layers) {
        this.renderLayer(ctx, layer, layer.x, layer.y);
      }
    }

    return canvas;
  }

  /**
   * Render individual pixel-perfect slice for a single physical monitor.
   */
  static renderMonitorSlice(subMonitor, bgColor, layers) {
    const canvas = document.createElement('canvas');
    canvas.width = subMonitor.width;
    canvas.height = subMonitor.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create canvas context');

    // Fill background
    const [r, g, b] = bgColor;
    ctx.fillStyle = rgbToHex(r, g, b);
    ctx.fillRect(0, 0, subMonitor.width, subMonitor.height);

    // Render layers located on this monitor
    for (const layer of layers) {
      if (layer.monitorName && layer.monitorName !== subMonitor.name) continue;
      this.renderLayer(ctx, layer, layer.x, layer.y);
    }

    return canvas;
  }

  /**
   * Convert canvas to blob.
   */
  static canvasToBlob(canvas, mimeType = 'image/png', quality = 0.95) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas to Blob failed'));
      }, mimeType, quality);
    });
  }

  /**
   * Helper to trigger browser download.
   */
  static downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }

  /**
   * Export full wallpaper as PNG.
   */
  static async exportFullImage(monitor, bgColor, layers, filename = 'wallpaper.png') {
    const canvas = this.renderFullCanvas(monitor, bgColor, layers);
    const blob = await this.canvasToBlob(canvas, 'image/png');
    this.downloadBlob(blob, filename);
  }

  /**
   * Export all monitor slices into a ZIP archive.
   */
  static async exportSlicesZip(monitor, bgColor, layers) {
    if (!monitor.isSpanned || !monitor.subMonitors || monitor.subMonitors.length === 0) {
      await this.exportFullImage(monitor, bgColor, layers);
      return;
    }

    const zip = new JSZip();
    const folder = zip.folder('wallpapers');

    for (const sub of monitor.subMonitors) {
      const sliceCanvas = this.renderMonitorSlice(sub, bgColor, layers);
      const blob = await this.canvasToBlob(sliceCanvas, 'image/png');
      const safeName = sub.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      folder.file(`wallpaper_${safeName}_${sub.width}x${sub.height}.png`, blob);
    }

    // Also include the spanned composite wallpaper in the zip
    const fullCanvas = this.renderFullCanvas(monitor, bgColor, layers);
    const fullBlob = await this.canvasToBlob(fullCanvas, 'image/png');
    folder.file(`wallpaper_spanned_${monitor.width}x${monitor.height}.png`, fullBlob);

    const zipContent = await zip.generateAsync({ type: 'blob' });
    this.downloadBlob(zipContent, 'wallpaper_positioner_slices.zip');
  }

  /**
   * Copy high-res wallpaper image directly to system clipboard.
   */
  static async copyToClipboard(monitor, bgColor, layers) {
    if (!navigator.clipboard || !window.ClipboardItem) {
      throw new Error('Clipboard API not supported in this browser');
    }
    const canvas = this.renderFullCanvas(monitor, bgColor, layers);
    const blob = await this.canvasToBlob(canvas, 'image/png');
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
  }
}
