// Aboden Assets — kit/kit-nature.js — الطبيعة: شجرة (دائرية/صنوبر/طويلة/خريف/بتولا/ميتة)، شجيرة، عشب، ورد، صخرة، صبار، جذع، فطر، كريستال، بركة
(function (g) {
  'use strict';
  const AA = g.AA, K = AA.kit, V = AA.v, LP = AA.lp;

  K.def('tree', { name: 'شجرة', nameEn: 'Tree', group: 'nature',
    schema: [{ key: 'kind', label: 'النوع', type: 'enum', options: [['round', 'دائرية'], ['pine', 'صنوبر'], ['tall', 'طويلة'], ['autumn', 'خريف'], ['birch', 'بتولا'], ['dead', 'يابسة']], def: 'round' }, { key: 'height', label: 'الارتفاع', min: 2, max: 12, step: 0.5, def: 5, unit: 'م' }],
    presets: { 'صنوبر': { kind: 'pine', height: 7 }, 'خريف': { kind: 'autumn' }, 'يابسة': { kind: 'dead', height: 4 }, 'طويلة': { kind: 'tall', height: 8 } },
    generate: (p, q) => { const P = K.parts(), rng = AA.rng(p.seed), h = p.height;
      if (p.kind === 'dead') { const T = P('wood'), n = K.sides(q, 6); K.cyl(T, [0, 0, 0], [0.1, h * 0.6, 0], h * 0.04, h * 0.025, n, 'bark'); for (let k = 0; k < 4; k++) { const a = k * 1.9 + rng(), y = h * (0.35 + k * 0.1), b = [Math.cos(a) * h * 0.25, y + h * 0.22, Math.sin(a) * h * 0.25]; K.cyl(T, [0.05, y, 0], b, h * 0.018, h * 0.006, 5, 'bark'); K.cyl(T, b, V.add(b, [Math.cos(a + 0.8) * h * 0.1, h * 0.1, Math.sin(a + 0.8) * h * 0.1]), h * 0.006, h * 0.002, 4, 'bark'); } }
      else K.treeInto(P, [0, 0, 0], h, p.kind === 'birch' ? 'round' : p.kind, rng, q);
      if (p.kind === 'birch') for (let k = 0; k < 4; k++) K.box(P('dark'), [0, h * (0.1 + k * 0.1), h * 0.024], [h * 0.03, 0.04, 0.01], 'black');
      return K.done('tree', P, { collider: { type: 'capsule', radius: h * 0.05, height: h * 0.6, axis: 'y' }, canopy: p.kind === 'dead' ? 0 : h * 0.32 }); } });
  // نسخة بتولا: جذع أبيض — يعاد بناء الجذع بلون أبيض بعد treeInto
  const birch = AA.assets.kit_tree.generate;
  AA.assets.kit_tree.generate = (p, q) => { if (p.kind !== 'birch') return birch(p, q); const P = K.parts(), rng = AA.rng(p.seed), h = p.height; K.cyl(P('wood'), [0, 0, 0], [0, h * 0.6, 0], h * 0.022, h * 0.016, K.sides(q, 6), 'offwhite');
    for (let k = 0; k < 5; k++) K.box(P('dark'), [0, h * (0.08 + k * 0.1), 0], [h * 0.046, 0.04, h * 0.046], 'black');
    for (let k = 0; k < 3; k++) LP.clump(P('leaves'), [Math.cos(k * 2.1) * h * 0.1, h * (0.62 + k * 0.1), Math.sin(k * 2.1) * h * 0.1], h * 0.16, ['#8fc04a', '#b7d65a', '#6fa83a'].map(K.c), rng, { jitter: 0.25, sway: 0.06, phase: rng() * 6, detail: 0 });
    return K.done('tree', P, { collider: { type: 'capsule', radius: h * 0.03, height: h * 0.6, axis: 'y' }, canopy: h * 0.2 }); };

  K.def('bush', { name: 'شجيرة', nameEn: 'Bush', group: 'nature', schema: [{ key: 'size', label: 'الحجم', min: 0.4, max: 2.5, step: 0.1, def: 1, unit: 'م' }, { key: 'kind', label: 'النوع', type: 'enum', options: [['round', 'دائرية'], ['flowering', 'مزهرة'], ['desert', 'صحراوية'], ['hedge', 'مقصوصة']], def: 'round' }], presets: { 'مزهرة': { kind: 'flowering' }, 'صحراوية': { kind: 'desert', size: 0.8 }, 'مقصوصة': { kind: 'hedge' } },
    generate: (p, q) => { const P = K.parts(), rng = AA.rng(p.seed), s = p.size, L = P('leaves');
      if (p.kind === 'hedge') K.box(L, [0, s * 0.45, 0], [s * 1.2, s * 0.9, s * 0.8], 'leaf3');
      else { const cols = p.kind === 'desert' ? ['#8a8f55', '#a3a265', '#76784a'] : ['leaf3', 'leaf', 'leaf2'], m = p.kind === 'desert' ? 4 : 3; for (let k = 0; k < m; k++) { const a = k * 2.3 + rng(), r = s * (k ? 0.35 : 0); LP.clump(L, [Math.cos(a) * r, s * (0.4 - k * 0.04), Math.sin(a) * r], [s * (k ? 0.4 : 0.55), s * (k ? 0.36 : 0.45), s * (k ? 0.4 : 0.55)], cols.map(K.c), rng, { jitter: p.kind === 'desert' ? 0.45 : 0.25, sway: 0.03, phase: rng() * 6, detail: 0 }); }
        if (p.kind === 'flowering') for (let k = 0; k < 12; k++) { const d = V.norm([rng() - 0.5, rng() * 0.8, rng() - 0.5]); K.ball(P('flower'), [d[0] * s * 0.55, s * 0.35 + d[1] * s * 0.45, d[2] * s * 0.55], s * 0.06, ['pink', 'white', 'red'][k % 3]); } }
      return K.done('bush', P, { collider: K.boxCol(s, s * 0.9, s) }); } });

  K.def('grass', { name: 'عشب', nameEn: 'Grass patch', group: 'nature', schema: [{ key: 'size', label: 'المساحة', min: 0.5, max: 4, step: 0.5, def: 1.5, unit: 'م' }, { key: 'density', label: 'الكثافة', min: 4, max: 60, step: 1, def: 20 }, { key: 'kind', label: 'النوع', type: 'enum', options: [['green', 'أخضر'], ['dry', 'يابس'], ['tall', 'طويل']], def: 'green' }], presets: { 'يابس': { kind: 'dry' }, 'طويل': { kind: 'tall', density: 30 } },
    generate: (p, q) => { const P = K.parts(), rng = AA.rng(p.seed), G = P('grass'), cols = p.kind === 'dry' ? ['#c9b26a', '#b39a55', '#d8c57f'] : ['grass', 'grass2', 'leaf2'], H = p.kind === 'tall' ? 0.7 : 0.3, n = Math.round(p.density * (q === 'low' ? 0.5 : 1));
      for (let k = 0; k < n; k++) { const x = (rng() - 0.5) * p.size, z = (rng() - 0.5) * p.size; for (let b = 0; b < 3; b++) { const a = rng() * 6.28, h = H * (0.6 + rng() * 0.6), w = 0.04, lean = [Math.cos(a) * h * 0.25, 0, Math.sin(a) * h * 0.25], s = [Math.sin(a) * w, 0, -Math.cos(a) * w], c = AA.vary(K.c(cols[b]), rng, 0.1);
        const i0 = G.v([x + s[0], 0, z + s[2]], c, 0, 0, 0), i1 = G.v([x - s[0], 0, z - s[2]], c, 0, 0, 0), i2 = G.v([x + lean[0], h, z + lean[2]], c, 0.12, rng() * 6, 0); G.t(i0, i1, i2); } }
      return K.done('grass', P, { collider: null }); } });

  K.def('flowers', { name: 'ورد', nameEn: 'Flower bed', group: 'nature', schema: [{ key: 'size', label: 'المساحة', min: 0.5, max: 3, step: 0.5, def: 1.2, unit: 'م' }, { key: 'color', label: 'اللون', type: 'enum', options: [['mix', 'ألوان'], ['red', 'أحمر'], ['yellow', 'أصفر'], ['pink', 'وردي'], ['white', 'أبيض'], ['purple', 'بنفسجي']], def: 'mix' }, { key: 'border', label: 'حوض بحافة', type: 'bool', def: true }], presets: { 'أحمر بدون حوض': { color: 'red', border: false } },
    generate: (p, q) => { const P = K.parts(), rng = AA.rng(p.seed), S = p.size, n = Math.round(S * S * 14 * (q === 'low' ? 0.5 : 1));
      if (p.border) { K.box(P('ground'), [0, 0.1, 0], [S, 0.2, S], 'soilDark'); for (const [x, z, w, d, h] of [[0, S / 2, S + 0.16, 0.08, 0.26], [0, -S / 2, S + 0.16, 0.08, 0.26], [S / 2, 0, 0.08, S - 0.08, 0.25], [-S / 2, 0, 0.08, S - 0.08, 0.25]]) K.box(P('stone'), [x, h / 2, z], [w, h, d], 'concrete'); }
      const y0 = p.border ? 0.2 : 0;
      for (let k = 0; k < n; k++) { const x = (rng() - 0.5) * (S - 0.15), z = (rng() - 0.5) * (S - 0.15), h = 0.15 + rng() * 0.2, c = p.color === 'mix' ? ['red', 'yellow', 'pink', 'white', 'purple'][Math.floor(rng() * 5)] : p.color;
        K.rod(P('grass'), [x, y0, z], [x, y0 + h, z], 0.008, 'leaf3', null, 3); K.ball(P('flower'), [x, y0 + h, z], 0.045, c); if (k % 2) K.tri(P('grass'), [x, y0 + h * 0.4, z], [x + 0.08, y0 + h * 0.55, z + 0.03], [x + 0.02, y0 + h * 0.5, z - 0.03], 'leaf', null); }
      return K.done('flowers', P, { collider: p.border ? K.boxCol(S, 0.26, S) : null }); } });

  K.def('rock', { name: 'صخرة', nameEn: 'Rock', group: 'nature', schema: [{ key: 'size', label: 'الحجم', min: 0.3, max: 6, step: 0.1, def: 1.2, unit: 'م' }, { key: 'kind', label: 'النوع', type: 'enum', options: [['boulder', 'صخرة'], ['cluster', 'مجموعة'], ['cliff', 'جرف'], ['sandstone', 'حجر رملي']], def: 'boulder' }], presets: { 'مجموعة صخور': { kind: 'cluster' }, 'جرف': { kind: 'cliff', size: 4 }, 'حجر رملي': { kind: 'sandstone', size: 2 } },
    generate: (p, q) => { const P = K.parts(), rng = AA.rng(p.seed), s = p.size, S = P('stone'), cols = p.kind === 'sandstone' ? ['sand2', 'sandstone', 'sand'] : null;
      if (p.kind === 'cluster') for (let k = 0; k < 5; k++) { const a = rng() * 6.28, r = k ? s * (0.5 + rng() * 0.3) : 0; K.rockInto(S, [Math.cos(a) * r, 0, Math.sin(a) * r], s * (k ? 0.25 + rng() * 0.2 : 0.55), rng, cols); }
      else if (p.kind === 'cliff') { for (let k = 0; k < 4; k++) { const x = (k - 1.5) * s * 0.45, h = s * (0.8 + rng() * 0.5); K.cyl(S, [x, 0, (rng() - 0.5) * s * 0.3], [x + (rng() - 0.5) * 0.3, h, (rng() - 0.5) * s * 0.3], s * 0.32, s * 0.18, 5, AA.vary(K.c(['rock', 'rock2', 'rockLight'][k % 3]), rng, 0.08), null, { rot: rng() }); } K.slab(P('grass'), [[-s, -0.3 * s], [s, -0.3 * s], [s * 0.9, 0.3 * s], [-s * 0.9, 0.3 * s]], s * 1.05, s * 1.12, 'grass'); }
      else { K.rockInto(S, [0, 0, 0], s * 0.6, rng, cols); if (p.kind === 'sandstone') K.box(S, [0, s * 0.35, 0], [s * 1.05, 0.04, s * 0.9], 'sand2'); }
      return K.done('rock', P, { collider: K.boxCol(s * 1.2, s * (p.kind === 'cliff' ? 1.2 : 0.7), s) }); } });

  K.def('cactus', { name: 'صبار', nameEn: 'Cactus', group: 'nature', schema: [{ key: 'height', label: 'الارتفاع', min: 0.5, max: 5, step: 0.25, def: 2.5, unit: 'م' }, { key: 'arms', label: 'الأذرع', min: 0, max: 3, step: 1, def: 2 }], presets: { 'صغير': { height: 0.8, arms: 0 } },
    generate: (p, q) => { const P = K.parts(), h = p.height, L = P('leaves'), n = K.sides(q, 8), r = h * 0.08;
      K.cyl(L, [0, 0, 0], [0, h, 0], r, r * 0.9, n, 'grassDark'); K.cyl(L, [0, h, 0], [0, h + r * 0.6, 0], r * 0.9, r * 0.3, n, 'grassDark');
      for (let k = 0; k < p.arms; k++) { const s = k % 2 ? 1 : -1, y = h * (0.35 + k * 0.15), a = [s * r, y, 0], b = [s * h * 0.25, y, 0], c = [s * h * 0.25, y + h * 0.3, 0]; K.cyl(L, a, b, r * 0.6, r * 0.6, n, 'grassDark'); K.cyl(L, b, c, r * 0.6, r * 0.55, n, 'grassDark'); K.cyl(L, c, V.add(c, [0, r * 0.4, 0]), r * 0.55, r * 0.15, n, 'grassDark'); }
      K.ball(P('flower'), [0, h + r * 0.55, 0], r * 0.35, 'pink');
      return K.done('cactus', P, { collider: { type: 'capsule', radius: r * 1.5, height: h, axis: 'y' } }); } });

  K.def('log', { name: 'جذع شجرة', nameEn: 'Log / stump', group: 'nature', schema: [{ key: 'kind', label: 'النوع', type: 'enum', options: [['log', 'جذع ملقى'], ['stump', 'كعب شجرة'], ['pile', 'حطب']], def: 'log' }, { key: 'size', label: 'الحجم', min: 0.5, max: 3, step: 0.1, def: 1.5, unit: 'م' }], presets: { 'كعب': { kind: 'stump', size: 0.8 }, 'حطب': { kind: 'pile' } },
    generate: (p, q) => { const P = K.parts(), s = p.size, W = P('wood'), n = K.sides(q, 8), rng = AA.rng(p.seed);
      const logAt = (a, b, r) => { K.cyl(W, a, b, r, r, n, 'bark'); for (const e of [a, b]) K.cyl(W, e, V.add(e, V.scale(V.norm(V.sub(e, a === e ? b : a)), 0.005)), r * 0.85, r * 0.85, n, 'woodLight'); };
      if (p.kind === 'log') logAt([-s / 2, s * 0.12, 0], [s / 2, s * 0.12, 0], s * 0.12);
      else if (p.kind === 'stump') { K.cyl(W, [0, 0, 0], [0, s * 0.45, 0], s * 0.32, s * 0.26, n, 'bark'); K.cyl(W, [0, s * 0.45, 0], [0, s * 0.46, 0], s * 0.24, s * 0.24, n, 'woodLight'); for (let k = 0; k < 4; k++) { const a = k * 1.6; K.cyl(W, [0, s * 0.08, 0], [Math.cos(a) * s * 0.45, 0, Math.sin(a) * s * 0.45], s * 0.1, s * 0.03, 5, 'bark'); } }
      else for (let r = 0; r < 3; r++) for (let k = 0; k < 3 - r; k++) { const z = (k - (2 - r) / 2) * s * 0.22, y = s * 0.1 + r * s * 0.18; logAt([-s / 2, y, z], [s / 2 + (rng() - 0.5) * 0.2, y, z], s * 0.1); }
      return K.done('log', P, { collider: K.boxCol(s, s * 0.4, s * 0.5) }); } });

  K.def('mushroom', { name: 'فطر', nameEn: 'Mushroom', group: 'nature', schema: [{ key: 'size', label: 'الحجم', min: 0.2, max: 3, step: 0.1, def: 0.5, unit: 'م' }, K.color('color', 'لون القبعة', 'red'), { key: 'count', label: 'العدد', min: 1, max: 5, step: 1, def: 3 }], presets: { 'فطر عملاق': { size: 2.5, count: 1 }, 'بني': { color: 'brown' } },
    generate: (p, q) => { const P = K.parts(), rng = AA.rng(p.seed), n = K.sides(q, 10);
      for (let k = 0; k < p.count; k++) { const s = p.size * (k ? 0.5 + rng() * 0.4 : 1), a = rng() * 6.28, r = k ? p.size * 0.6 : 0, x = Math.cos(a) * r, z = Math.sin(a) * r;
        K.cyl(P('ceramic'), [x, 0, z], [x, s * 0.6, z], s * 0.12, s * 0.1, n, 'offwhite'); K.cyl(P('paint'), [x, s * 0.55, z], [x, s * 0.75, z], s * 0.42, s * 0.3, n, p.color); K.cyl(P('paint'), [x, s * 0.75, z], [x, s * 0.88, z], s * 0.3, 0.001, n, p.color);
        if (p.color === 'red') for (let d = 0; d < 5; d++) { const b = d / 5 * 6.28; K.ball(P('ceramic'), [x + Math.cos(b) * s * 0.28, s * 0.76, z + Math.sin(b) * s * 0.28], s * 0.05, 'white'); } }
      return K.done('mushroom', P, { collider: K.boxCol(p.size, p.size * 0.9, p.size) }); } });

  K.def('crystal', { name: 'كريستال', nameEn: 'Crystal cluster', group: 'nature', schema: [{ key: 'size', label: 'الحجم', min: 0.3, max: 3, step: 0.1, def: 1, unit: 'م' }, K.color('color', 'اللون', 'teal', [['purple', 'بنفسجي'], ['pink', 'وردي']]), { key: 'glow', label: 'يتوهج', type: 'bool', def: true }], presets: { 'بنفسجي': { color: 'purple' } },
    generate: (p, q) => { const P = K.parts(), rng = AA.rng(p.seed), s = p.size, B = P.custom('crystal', LP.mat('glass', p.glow ? { emissive: AA.mixc(K.c(p.color), [0, 0, 0], 0.3), glow: 0.8, roughness: 0.2, metalness: 0.2 } : { roughness: 0.2, metalness: 0.3 }));
      K.rockInto(P('stone'), [0, -s * 0.1, 0], s * 0.4, rng);
      for (let k = 0; k < 6; k++) { const a = rng() * 6.28, tilt = k ? 0.3 + rng() * 0.4 : 0, h = s * (k ? 0.5 + rng() * 0.4 : 1.1), d = V.norm([Math.cos(a) * tilt, 1, Math.sin(a) * tilt]), b = [Math.cos(a) * s * 0.15 * (k ? 1 : 0), s * 0.1, Math.sin(a) * s * 0.15 * (k ? 1 : 0)], r = s * (k ? 0.08 : 0.13);
        K.cyl(B, b, V.add(b, V.scale(d, h * 0.75)), r, r, 6, AA.vary(K.c(p.color), rng, 0.1)); K.cyl(B, V.add(b, V.scale(d, h * 0.75)), V.add(b, V.scale(d, h)), r, 0.001, 6, AA.mixc(K.c(p.color), [1, 1, 1], 0.25)); }
      return K.done('crystal', P, { collider: K.boxCol(s * 0.8, s, s * 0.8), light: p.glow ? { at: [0, s * 0.6, 0], color: AA.mixc(K.c(p.color), [1, 1, 1], 0.3), intensity: 1, distance: s * 5 } : null }); } });

  K.def('pond', { name: 'بركة', nameEn: 'Pond', group: 'nature', schema: [{ key: 'radius', label: 'نصف القطر', min: 1, max: 8, step: 0.5, def: 2.5, unit: 'م' }, { key: 'stones', label: 'حجارة حولها', type: 'bool', def: true }, { key: 'lilies', label: 'زنابق', type: 'bool', def: true }], presets: { 'كبيرة': { radius: 6 } },
    generate: (p, q) => { const P = K.parts(), rng = AA.rng(p.seed), R = p.radius, n = K.sides(q, 14), ring = K.circle(R, n).map(([x, z], k) => { const s = 0.88 + rng() * 0.22; return [x * s, z * s]; });
      K.slab(P('ground'), ring.map(([x, z]) => [x * 1.08, z * 1.08]), 0, 0.04, 'soilDark'); K.slab(P('water'), ring, 0.04, 0.06, 'water');
      if (p.stones) ring.forEach(([x, z], k) => { if (k % 2) return; K.rockInto(P('stone'), [x * 1.1, 0, z * 1.1], 0.2 + rng() * 0.2, rng); });
      if (p.lilies) for (let k = 0; k < Math.round(R * 1.5); k++) { const a = rng() * 6.28, r = R * rng() * 0.7; K.slab(P('leaves'), K.circle(0.18, 7), 0.061, 0.07, 'leaf', { at: [Math.cos(a) * r, 0, Math.sin(a) * r] }); if (k % 3 === 0) K.ball(P('flower'), [Math.cos(a) * r, 0.1, Math.sin(a) * r], 0.06, 'pink'); }
      return K.done('pond', P, { collider: null, water: { radius: R, y: 0.06 } }); } });
})(typeof window !== 'undefined' ? window : globalThis);
