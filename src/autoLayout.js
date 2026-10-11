/**
 * Dynamic auto-arrangement engine for Wallpaper Positioner Web.
 * Implements:
 * 1. Dynamic Weighted Binary Space Partitioning (BSP) + Hero Candidate Layouts
 * 2. Uniform Aspect-Ratio Grid
 * 3. Proportional Row
 * 4. Proportional Column
 * 5. Multi-Monitor Partitioning
 */

export class AutoLayout {
  static computeLayerWeights(layers) {
    const mags = layers.map(l => {
      const w = l.origWidth > 0 ? l.origWidth : l.width;
      const h = l.origHeight > 0 ? l.origHeight : l.height;
      return Math.sqrt(w * h);
    });
    const avg = mags.reduce((a, b) => a + b, 0) / Math.max(1, mags.length);
    if (avg > 0) {
      return mags.map(m => Math.max(0.2, Math.min(5.0, m / avg)));
    }
    return mags.map(() => 1.0);
  }

  static calculateGridDimensions(n, rw, rh) {
    if (n <= 1) return { cols: 1, rows: 1 };
    if (n === 2) return rw >= rh ? { cols: 2, rows: 1 } : { cols: 1, rows: 2 };
    if (n === 3) return rw >= rh * 1.4 ? { cols: 3, rows: 1 } : { cols: 2, rows: 2 };

    const targetRatio = rw / Math.max(1.0, rh);
    let bestCols = Math.ceil(Math.sqrt(n));
    let bestRows = Math.ceil(n / bestCols);
    let bestScore = Infinity;

    for (let c = 1; c <= n; c++) {
      const r = Math.ceil(n / c);
      if (c * r < n) continue;
      const gridRatio = (c * 16) / (r * 9);
      const score = Math.abs(gridRatio - targetRatio) + (c * r - n) * 0.4;
      if (score < bestScore) {
        bestScore = score;
        bestCols = c;
        bestRows = r;
      }
    }
    return { cols: bestCols, rows: bestRows };
  }

  static layoutAsGrid(rect, layers, gap) {
    const [rx, ry, rw, rh] = rect;
    const n = layers.length;
    if (n === 0) return [];
    const { cols, rows } = this.calculateGridDimensions(n, rw, rh);

    let g = gap;
    if (cols > 1 && (cols - 1) * g >= rw) {
      g = Math.max(0, (rw - 10) / (cols - 1));
    }
    if (rows > 1 && (rows - 1) * g >= rh) {
      g = Math.max(0, (rh - 10) / (rows - 1));
    }

    const cellW = Math.max(10, (rw - (cols - 1) * g) / cols);
    const cellH = Math.max(10, (rh - (rows - 1) * g) / rows);

    const placements = [];
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      const nInRow = Math.min(cols, n - idx);
      if (nInRow <= 0) break;
      const rowW = nInRow * cellW + Math.max(0, (nInRow - 1) * g);
      const rowStartX = rx + (rw - rowW) / 2;
      const rowY = ry + r * (cellH + g);

      for (let c = 0; c < nInRow; c++) {
        const cellRect = [rowStartX + c * (cellW + g), rowY, cellW, cellH];
        placements.push({ layer: layers[idx], rect: cellRect });
        idx++;
      }
    }
    return placements;
  }

  static scoreCandidate(placements) {
    let total = 0.0;
    for (const { layer, rect } of placements) {
      const [, , cw, ch] = rect;
      const cellAr = cw / Math.max(1.0, ch);
      const layerAr = layer.aspectRatio || 1.0;
      const distortion = Math.max(cellAr / layerAr, layerAr / cellAr);
      let pen = 0.0;
      if (cellAr > 3.0) pen += 25.0 * (cellAr - 3.0);
      if (cellAr < 0.33) pen += 25.0 * (0.33 - cellAr);
      total += distortion + pen;
    }
    return total;
  }

  static weightedBspPartition(rect, layers, weights, gap) {
    const [rx, ry, rw, rh] = rect;
    const n = layers.length;
    if (n === 0) return [];
    if (n === 1) return [{ layer: layers[0], rect }];

    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    if (maxWeight <= minWeight * 1.3) {
      return this.layoutAsGrid(rect, layers, gap);
    }

    const totalW = weights.reduce((a, b) => a + b, 0);
    let bestScore = Infinity;
    let bestSplit = null;

    for (let k = 1; k < n; k++) {
      const wA = weights.slice(0, k).reduce((a, b) => a + b, 0);
      const frac = wA / totalW;

      for (const ori of ['V', 'H']) {
        let rA, rB;
        if (ori === 'V') {
          const wLeft = Math.max(10.0, (rw - gap) * frac);
          const wRight = Math.max(10.0, rw - gap - wLeft);
          rA = [rx, ry, wLeft, rh];
          rB = [rx + wLeft + gap, ry, wRight, rh];
        } else {
          const hTop = Math.max(10.0, (rh - gap) * frac);
          const hBot = Math.max(10.0, rh - gap - hTop);
          rA = [rx, ry, rw, hTop];
          rB = [rx, ry + hTop + gap, rw, hBot];
        }

        const arA = rA[2] / Math.max(1.0, rA[3]);
        const arB = rB[2] / Math.max(1.0, rB[3]);
        let pen = 0.0;
        if (arA > 2.8) pen += 40.0 * (arA - 2.8);
        if (arA < 0.35) pen += 40.0 * (0.35 - arA);
        if (arB > 2.8) pen += 40.0 * (arB - 2.8);
        if (arB < 0.35) pen += 40.0 * (0.35 - arB);

        const score = pen + Math.abs(arA - 1.33) + Math.abs(arB - 1.33);
        if (score < bestScore) {
          bestScore = score;
          bestSplit = { k, rA, rB };
        }
      }
    }

    if (!bestSplit) {
      return this.layoutAsGrid(rect, layers, gap);
    }

    const { k, rA, rB } = bestSplit;
    return [
      ...this.weightedBspPartition(rA, layers.slice(0, k), weights.slice(0, k), gap),
      ...this.weightedBspPartition(rB, layers.slice(k), weights.slice(k), gap),
    ];
  }

  static solveDynamicLayout(rect, layers, gap) {
    const [rx, ry, rw, rh] = rect;
    const n = layers.length;
    if (n === 0) return [];
    if (n === 1) return [{ layer: layers[0], rect }];

    const weights = this.computeLayerWeights(layers);
    const paired = layers.map((l, i) => ({ layer: l, weight: weights[i] }))
      .sort((a, b) => b.weight - a.weight);

    const sortedLayers = paired.map(p => p.layer);
    const sortedWeights = paired.map(p => p.weight);

    const candidates = [];

    // Candidate 1: Recursive BSP
    candidates.push(this.weightedBspPartition(rect, sortedLayers, sortedWeights, gap));

    // Candidate 2: Hero Layouts (if 1 dominant item exists and n >= 3)
    if (n >= 3 && sortedWeights[0] > sortedWeights[1] * 1.15) {
      const hero = sortedLayers[0];
      const others = sortedLayers.slice(1);
      const heroW = sortedWeights[0];
      const othersW = sortedWeights.slice(1).reduce((a, b) => a + b, 0);
      const frac = Math.max(0.42, Math.min(0.68, heroW / (heroW + othersW)));

      const wH = Math.max(10.0, (rw - gap) * frac);
      const wSub = Math.max(10.0, rw - gap - wH);
      const hH = Math.max(10.0, (rh - gap) * frac);
      const hSub = Math.max(10.0, rh - gap - hH);

      // Hero Left
      candidates.push([
        { layer: hero, rect: [rx, ry, wH, rh] },
        ...this.layoutAsGrid([rx + wH + gap, ry, wSub, rh], others, gap),
      ]);

      // Hero Right
      candidates.push([
        { layer: hero, rect: [rx + wSub + gap, ry, wH, rh] },
        ...this.layoutAsGrid([rx, ry, wSub, rh], others, gap),
      ]);

      // Hero Top
      candidates.push([
        { layer: hero, rect: [rx, ry, rw, hH] },
        ...this.layoutAsGrid([rx, ry + hH + gap, rw, hSub], others, gap),
      ]);

      // Triptych (Hero Center, 2 others flanking on sides) if n == 3
      if (n === 3) {
        const wHc = Math.max(10.0, (rw - 2.0 * gap) * frac);
        const wSide = Math.max(10.0, (rw - 2.0 * gap - wHc) / 2.0);
        candidates.push([
          { layer: others[0], rect: [rx, ry, wSide, rh] },
          { layer: hero, rect: [rx + wSide + gap, ry, wHc, rh] },
          { layer: others[1], rect: [rx + wSide + gap + wHc + gap, ry, wSide, rh] },
        ]);
      }
    }

    // Pick candidate with best score
    let bestCandidate = candidates[0];
    let bestScore = Infinity;
    for (const c of candidates) {
      const s = this.scoreCandidate(c);
      if (s < bestScore) {
        bestScore = s;
        bestCandidate = c;
      }
    }

    return bestCandidate;
  }

  static layoutRandom(layers, rx, ry, rw, rh, margin, gap, cover = false) {
    const n = layers.length;
    if (n === 0) return;

    const m = Math.max(10.0, Math.min(margin, Math.min(rw, rh) / 3.0));
    const availW = Math.max(40.0, rw - 2.0 * m);
    const availH = Math.max(40.0, rh - 2.0 * m);

    // Shuffle layer order randomly
    const shuffled = [...layers].sort(() => Math.random() - 0.5);

    if (n === 1) {
      const l = shuffled[0];
      l.fitInto(availW * 0.85, availH * 0.85, cover);
      l.rotation = Math.round((Math.random() - 0.5) * 12);
      l.x = rx + rw / 2.0 + (Math.random() - 0.5) * (availW * 0.08);
      l.y = ry + rh / 2.0 + (Math.random() - 0.5) * (availH * 0.08);
      return;
    }

    // Determine grid slots to guarantee good spatial distribution without clustering in one spot
    const { cols, rows } = this.calculateGridDimensions(n, availW, availH);
    const cellW = availW / cols;
    const cellH = availH / rows;

    const slots = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        slots.push({
          cx: rx + m + c * cellW + cellW / 2.0,
          cy: ry + m + r * cellH + cellH / 2.0,
        });
      }
    }

    slots.sort(() => Math.random() - 0.5);

    for (let i = 0; i < n; i++) {
      const layer = shuffled[i];
      const slot = slots[i % slots.length];

      // Random scale variation: 0.85x to 1.25x of the slot size
      const scaleVariation = 0.85 + Math.random() * 0.4;
      const targetW = Math.max(30.0, (cellW - gap) * scaleVariation);
      const targetH = Math.max(30.0, (cellH - gap) * scaleVariation);

      layer.fitInto(targetW, targetH, cover);

      // Random jitter offset within slot
      const jitterX = (Math.random() - 0.5) * (cellW * 0.3);
      const jitterY = (Math.random() - 0.5) * (cellH * 0.3);

      // Random playful rotation between -12° and +12° (polaroid tilt)
      const rot = Math.round((Math.random() - 0.5) * 24);
      layer.rotation = rot;

      // Ensure center keeps image reasonably inside canvas
      layer.x = Math.max(rx + m + layer.width * 0.35, Math.min(rx + rw - m - layer.width * 0.35, slot.cx + jitterX));
      layer.y = Math.max(ry + m + layer.height * 0.35, Math.min(ry + rh - m - layer.height * 0.35, slot.cy + jitterY));
    }
  }

  static layoutSubsetInRect(layers, rx, ry, rw, rh, mode, margin, gap, cover = false) {
    const n = layers.length;
    if (n === 0) return;

    const m = Math.max(0.0, Math.min(margin, Math.min(rw, rh) / 2.0 - 5.0));
    const availW = Math.max(20.0, rw - 2.0 * m);
    const availH = Math.max(20.0, rh - 2.0 * m);
    const g = Math.max(0.0, Math.min(gap, 300.0));

    if (mode === 'random') {
      this.layoutRandom(layers, rx, ry, rw, rh, margin, gap, cover);
    } else if (mode === 'dynamic') {
      const placements = this.solveDynamicLayout([rx + m, ry + m, availW, availH], layers, g);
      for (const { layer, rect } of placements) {
        const [cellX, cellY, cellW, cellH] = rect;
        layer.resetRotation();
        const effCellW = Math.max(10.0, cellW - 2.0 * layer.borderWidth);
        const effCellH = Math.max(10.0, cellH - 2.0 * layer.borderWidth);
        layer.fitInto(effCellW, effCellH, cover);
        layer.x = cellX + cellW / 2.0;
        layer.y = cellY + cellH / 2.0;
      }
    } else if (mode === 'row') {
      const weights = this.computeLayerWeights(layers);
      const totalW = weights.reduce((a, b) => a + b, 0);
      const availItemW = Math.max(10.0, availW - Math.max(0.0, (n - 1) * g));
      let xCursor = rx + m;

      for (let i = 0; i < n; i++) {
        const layer = layers[i];
        const w = weights[i];
        const itemW = Math.max(10.0, availItemW * (w / totalW));
        const cx = xCursor + itemW / 2.0;
        const cy = ry + m + availH / 2.0;

        layer.resetRotation();
        const effW = Math.max(10.0, itemW - 2.0 * layer.borderWidth);
        const effH = Math.max(10.0, availH - 2.0 * layer.borderWidth);
        layer.fitInto(effW, effH, cover);
        layer.x = cx;
        layer.y = cy;
        xCursor += itemW + g;
      }
    } else if (mode === 'col') {
      const weights = this.computeLayerWeights(layers);
      const totalW = weights.reduce((a, b) => a + b, 0);
      const availItemH = Math.max(10.0, availH - Math.max(0.0, (n - 1) * g));
      let yCursor = ry + m;

      for (let i = 0; i < n; i++) {
        const layer = layers[i];
        const w = weights[i];
        const itemH = Math.max(10.0, availItemH * (w / totalW));
        const cx = rx + m + availW / 2.0;
        const cy = yCursor + itemH / 2.0;

        layer.resetRotation();
        const effW = Math.max(10.0, availW - 2.0 * layer.borderWidth);
        const effH = Math.max(10.0, itemH - 2.0 * layer.borderWidth);
        layer.fitInto(effW, effH, cover);
        layer.x = cx;
        layer.y = cy;
        yCursor += itemH + g;
      }
    } else { // 'grid'
      const { cols, rows } = this.calculateGridDimensions(n, availW, availH);
      let adjustedGap = g;
      if (cols > 1 && (cols - 1) * adjustedGap >= availW) {
        adjustedGap = Math.max(0.0, (availW - 20.0) / (cols - 1));
      }
      if (rows > 1 && (rows - 1) * adjustedGap >= availH) {
        adjustedGap = Math.max(0.0, (availH - 20.0) / (rows - 1));
      }

      const cellW = Math.max(10.0, (availW - (cols - 1) * adjustedGap) / cols);
      const cellH = Math.max(10.0, (availH - (rows - 1) * adjustedGap) / rows);

      let idx = 0;
      for (let r = 0; r < rows; r++) {
        const nInRow = Math.min(cols, n - idx);
        if (nInRow <= 0) break;
        const rowW = nInRow * cellW + Math.max(0.0, (nInRow - 1) * adjustedGap);
        const rowStartX = rx + m + (availW - rowW) / 2.0;
        const rowY = ry + m + r * (cellH + adjustedGap);

        for (let c = 0; c < nInRow; c++) {
          const layer = layers[idx];
          const cx = rowStartX + c * (cellW + adjustedGap) + cellW / 2.0;
          const cy = rowY + cellH / 2.0;

          layer.resetRotation();
          const effCellW = Math.max(10.0, cellW - 2.0 * layer.borderWidth);
          const effCellH = Math.max(10.0, cellH - 2.0 * layer.borderWidth);
          layer.fitInto(effCellW, effCellH, cover);
          layer.x = cx;
          layer.y = cy;
          idx++;
        }
      }
    }
  }

  static applyLayout({
    monitor,
    layers,
    mode = 'dynamic',
    margin = 40.0,
    gap = 20.0,
    cover = false,
  }) {
    const activeLayers = layers.filter(l => l.visible);
    if (activeLayers.length === 0) return;

    if (monitor.isSpanned && monitor.subMonitors && monitor.subMonitors.length > 0) {
      if (mode === 'per_monitor') {
        const subs = [...monitor.subMonitors].sort((a, b) => a.relX - b.relX || a.relY - b.relY);
        const numSubs = subs.length;
        const numLayers = activeLayers.length;
        const chunks = Array.from({ length: numSubs }, () => []);

        if (numLayers <= numSubs) {
          for (let i = 0; i < numLayers; i++) {
            chunks[i].push(activeLayers[i]);
          }
        } else {
          const baseCount = Math.floor(numLayers / numSubs);
          const rem = numLayers % numSubs;
          let startI = 0;
          for (let i = 0; i < numSubs; i++) {
            const count = baseCount + (i < rem ? 1 : 0);
            chunks[i] = activeLayers.slice(startI, startI + count);
            startI += count;
          }
        }

        for (let i = 0; i < numSubs; i++) {
          const sub = subs[i];
          const subLayers = chunks[i];
          for (const l of subLayers) {
            l.monitorName = sub.name;
          }
          if (subLayers.length > 0) {
            this.layoutSubsetInRect(
              subLayers,
              0.0,
              0.0,
              sub.width,
              sub.height,
              'dynamic',
              margin,
              gap,
              cover
            );
          }
        }
      } else {
        // Arrange layers within each monitor according to their assigned monitor
        for (const sub of monitor.subMonitors) {
          const subLayers = activeLayers.filter(l => l.monitorName === sub.name);
          if (sub === monitor.subMonitors[0]) {
            const unassigned = activeLayers.filter(
              l => !l.monitorName || !monitor.subMonitors.some(s => s.name === l.monitorName)
            );
            for (const ul of unassigned) {
              ul.monitorName = sub.name;
            }
            subLayers.push(...unassigned);
          }
          if (subLayers.length > 0) {
            this.layoutSubsetInRect(
              subLayers,
              0.0,
              0.0,
              sub.width,
              sub.height,
              mode,
              margin,
              gap,
              cover
            );
          }
        }
      }
    } else {
      // Single monitor or custom canvas
      this.layoutSubsetInRect(
        activeLayers,
        0.0,
        0.0,
        monitor.width,
        monitor.height,
        mode,
        margin,
        gap,
        cover
      );
    }
  }
}
