/**
 * Color analysis and dominant palette extraction using HTML5 Canvas.
 */

export function rgbToHex(r, g, b) {
  const toHex = (n) => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgb(hex) {
  let s = hex.replace(/^#/, '');
  if (s.length === 3) {
    s = s.split('').map(c => c + c).join('');
  }
  if (s.length !== 6) {
    return [26, 27, 38]; // fallback dark tone
  }
  return [
    parseInt(s.substring(0, 2), 16),
    parseInt(s.substring(2, 4), 16),
    parseInt(s.substring(4, 6), 16),
  ];
}

export function colorDistance(c1, c2) {
  const dr = c1[0] - c2[0];
  const dg = c1[1] - c2[1];
  const db = c1[2] - c2[2];
  // Weighted Euclidean distance with human eye perceptual weighting
  return Math.sqrt(0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db);
}

export class ColorEngine {
  /**
   * Extract prominent colors from active image elements.
   */
  static extractDominantColors(images, maxColors = 8, minDistance = 28.0) {
    if (!images || images.length === 0) {
      // Default Tokyo Night / Dark slate aesthetic palette
      return [
        [26, 27, 38],    // Dark slate
        [36, 40, 59],    // Navy
        [122, 162, 247], // Sky blue
        [187, 154, 247], // Lavender
        [158, 206, 106], // Green
        [224, 175, 104], // Amber
        [247, 118, 142], // Rose
        [255, 255, 255], // Pure white
      ];
    }

    const sampleCanvas = document.createElement('canvas');
    const ctx = sampleCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [[26, 27, 38]];

    const colorCounts = new Map();

    for (const img of images) {
      if (!img || !img.complete || img.naturalWidth === 0) continue;

      // Downsample to max 100x100 for fast high-accuracy analysis
      const thumbW = 96;
      const thumbH = Math.max(1, Math.round(96 * (img.naturalHeight / img.naturalWidth)));
      sampleCanvas.width = thumbW;
      sampleCanvas.height = thumbH;

      ctx.clearRect(0, 0, thumbW, thumbH);
      ctx.drawImage(img, 0, 0, thumbW, thumbH);

      const imgData = ctx.getImageData(0, 0, thumbW, thumbH).data;

      // Step through pixels and quantize to 5-bit color space (32 levels per channel)
      for (let i = 0; i < imgData.length; i += 16) { // step by 4 pixels (16 bytes)
        const a = imgData[i + 3];
        if (a < 128) continue; // Skip transparent pixels

        const r = Math.round(imgData[i] / 8) * 8;
        const g = Math.round(imgData[i + 1] / 8) * 8;
        const b = Math.round(imgData[i + 2] / 8) * 8;

        const key = `${r},${g},${b}`;
        colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
      }
    }

    if (colorCounts.size === 0) {
      return [[26, 27, 38]];
    }

    // Sort by frequency descending
    const sorted = Array.from(colorCounts.entries())
      .map(([k, count]) => {
        const [r, g, b] = k.split(',').map(Number);
        return { count, rgb: [r, g, b] };
      })
      .sort((a, b) => b.count - a.count);

    // Filter out duplicates and visually indistinguishable colors
    const uniqueColors = [];
    for (const item of sorted) {
      let isDistinct = true;
      for (const existing of uniqueColors) {
        if (colorDistance(item.rgb, existing) < minDistance) {
          isDistinct = false;
          break;
        }
      }
      if (isDistinct) {
        uniqueColors.push(item.rgb);
      }
      if (uniqueColors.length >= maxColors) {
        break;
      }
    }

    return uniqueColors.length > 0 ? uniqueColors : [[26, 27, 38]];
  }

  /**
   * Determine harmonious wallpaper background tone.
   */
  static getBestBackgroundColor(dominantColors, mode = 'harmonious_dark') {
    if (!dominantColors || dominantColors.length === 0) {
      return [26, 27, 38];
    }

    if (mode === 'primary') {
      return dominantColors[0];
    }

    if (mode === 'vibrant') {
      // Find color with highest saturation
      let maxSat = -1;
      let vibrantColor = dominantColors[0];
      for (const [r, g, b] of dominantColors) {
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const sat = max === 0 ? 0 : (max - min) / max;
        if (sat > maxSat) {
          maxSat = sat;
          vibrantColor = [r, g, b];
        }
      }
      return vibrantColor;
    }

    // Default 'harmonious_dark': take top dominant color, deepen it into a sleek dark desk tone
    const [r, g, b] = dominantColors[0];
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    // If image is mostly black/white or monochromatic manga
    if (luminance < 30 || luminance > 220 || Math.abs(r - g) + Math.abs(g - b) < 15) {
      return [255, 255, 255]; // Classic clean manga gallery backdrop #ffffff
    }

    // Otherwise create deep saturated dark background
    const factor = 0.18;
    return [
      Math.max(14, Math.min(45, Math.round(r * factor + 12))),
      Math.max(14, Math.min(48, Math.round(g * factor + 14))),
      Math.max(18, Math.min(60, Math.round(b * factor + 22))),
    ];
  }
}
