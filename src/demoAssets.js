/**
 * Demo artwork assets and sample project loader for Wallpaper Positioner Web.
 */

import { Layer } from './models.js';
import { ProjectManager } from './projectManager.js';

const baseUrl = import.meta.env.BASE_URL || './';
const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';

export const DEMO_IMAGES = [
  {
    name: 'demo_manga_girl.jpg',
    url: `${cleanBase}demo/demo1.jpg`,
    monitorName: 'HDMI-A-1',
  },
  {
    name: 'demo_manga_duo.jpg',
    url: `${cleanBase}demo/demo2.jpg`,
    monitorName: 'DP-1',
  },
  {
    name: 'demo_manga_portrait.jpg',
    url: `${cleanBase}demo/demo3.jpg`,
    monitorName: 'HDMI-A-1',
  },
  {
    name: 'demo_neon_cyberpunk.jpg',
    url: `${cleanBase}demo/demo4.jpg`,
    monitorName: 'DP-1',
  },
];

export async function createDemoLayers() {
  const layers = [];

  for (const item of DEMO_IMAGES) {
    try {
      const img = await ProjectManager.loadImage(item.url);
      const layer = new Layer({
        name: item.name,
        dataUrl: item.url,
        imageElement: img,
        origWidth: img.naturalWidth || 800,
        origHeight: img.naturalHeight || 600,
        aspectRatio: (img.naturalWidth && img.naturalHeight) ? img.naturalWidth / img.naturalHeight : 1.33,
        width: 450,
        height: Math.round(450 / ((img.naturalWidth && img.naturalHeight) ? img.naturalWidth / img.naturalHeight : 1.33)),
        borderWidth: 8.0,
        borderColor: [255, 255, 255],
        borderRadius: 12.0,
        shadowEnabled: true,
        shadowBlur: 24.0,
        shadowOffsetX: 0.0,
        shadowOffsetY: 15.0,
        shadowOpacity: 0.55,
        shadowColor: [0, 0, 0],
        monitorName: item.monitorName,
      });
      layers.push(layer);
    } catch (e) {
      console.warn('Failed to load demo image:', item.url, e);
    }
  }

  return layers;
}