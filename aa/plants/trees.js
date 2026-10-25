// Aboden Assets — plants/trees.js  (v0.3)
// أشجار البيئة السعودية: السدر، الطلح، الأثل — من مولّد الشجرة العام core/tree.js
// الأوراق كلها أوراق صغيرة حقيقية (بدون كتل)، والعمق يأتي من ظل داخلي مخبوز في الألوان.
(function (g) {
  'use strict';
  const AA = g.AA;
  const V = AA.v, hex = AA.hex, mixc = AA.mixc, vary = AA.vary, lerp = AA.lerp;

  function barkFn(dark, light) {
    const d = hex(dark), l = hex(light);
    return (depth, t, k, rng) => vary(mixc(d, l, (k % 2 ? 0.2 : 0.65) + depth * 0.06 + (rng() - 0.5) * 0.2), rng, 0.15);
  }
  // اتجاه عشوائي ضمن مخروط حول d
  function cone(rng, d, spread) {
    const [a, b] = AA.basis(d), az = rng() * 6.283, s = spread * Math.sqrt(rng());
    return V.norm(V.add(V.scale(d, Math.cos(s)), V.scale(V.add(V.scale(a, Math.cos(az)), V.scale(b, Math.sin(az))), Math.sin(s))));
  }

  // أغصان صغيرة بأوراق متبادلة (السدر)
  function leafyTwigs(L, rng, tip, dir, sway, ph, o) {
    for (let t = 0; t < o.twigs; t++) {
      const td = V.norm(V.madd(cone(rng, V.norm(V.add(dir, V.scale(V.norm(V.sub(tip, o.center)), 0.8))), 1.0), AA.DOWN, o.droop));
      const len = o.twigLen * (0.6 + rng() * 0.6);
      for (let k = 0; k < o.leaves; k++) {
        const u = (k + 0.5) / o.leaves, side = k % 2 ? 1 : -1;
        const p = V.madd(V.madd(tip, td, len * u), AA.DOWN, o.droop * len * u * u);
        const [a, b] = AA.basis(td);
        const out = V.norm(V.add(V.scale(td, 0.55), V.scale(a, side * 0.85)));
        const n = V.norm(V.add(V.add(b, [0, 0.9, 0]), V.scale(AA.inSphere(rng), 0.5)));
        const sz = o.leafSize * (0.75 + rng() * 0.5) * (1 - 0.3 * u);
        const c = vary(o.color(p), rng, 0.25);
        AA.leaf(L, p, out, n, sz, sz / o.elong, c, mixc(c, o.tipColor, 0.35), sway + o.swayAdd * u, ph + t, 1, 0.1);
      }
    }
  }

  // ---------------- السدر ----------------
  const QS = {
    high: { twigs: 7, leaves: 10, tips: [0.3, 0.55, 0.8, 1], sides: [12, 7, 5, 3], segs: [6, 5, 4, 3], size: 1 },
    med:  { twigs: 6, leaves: 7,  tips: [0.4, 0.7, 1],       sides: [9, 6, 4, 3],  segs: [5, 4, 3, 2], size: 1.2 },
    low:  { twigs: 4, leaves: 4,  tips: [0.6, 1],            sides: [7, 5, 3, 3],  segs: [4, 3, 2, 2], size: 1.8 }
  };
  function sidr(p, quality) {
    const q = QS[quality] || QS.med, rng = AA.rng(p.seed), S = p.height / 6;
    const W = new AA.Builder(), L = new AA.Builder(), Fr = new AA.Builder();
    const dark = hex('#2a4020'), mid = hex('#435f2b'), light = hex('#627a3a'), tipC = hex('#849a52');
    const nabqA = hex('#d9a23a'), nabqB = hex('#b5562a'), thornC = hex('#e8e0c8');
    const tips = [];
    const lean = rng() * 6.283;
    const opts = {
      trunks: [{ base: [0, 0, 0], dir: [Math.cos(lean) * 0.18, 1, Math.sin(lean) * 0.18] }],
      trunkLength: 1.9 * S, trunkRadius: 0.24 * S,
      levels: 3, children: [5, 4, 3], spread: [0.75 * p.spread, 0.65 * p.spread, 0.6],
      upward: [0.35, 0.2, 0.08], gravity: [0, 0, 0.04, 0.08], floor: 1.2 * S,
      lenRatio: [1.05, 0.6, 0.55], radRatio: 0.58, taper: 0.6,
      childStart: 0.45, gnarl: 0.35, leader: false,
      segs: q.segs, sides: q.sides, swayGain: [0, 0.15, 0.2, 0.25],
      bark: barkFn('#3a312a', '#6e6052'),
      tipPoints: q.tips,
      onTip: (pt, d, sw, depth) => tips.push([pt, d, sw])
    };
    AA.growTree({ wood: W }, rng, opts);
    const cr = AA.bounds(tips.map(t => t[0]));
    cr.radii = cr.radii.map(r => r + 0.35 * S);
    const leaf0 = L.vertexCount;
    for (const [pt, d, sw] of tips) {
      const ph = rng() * 6.28;
      const nT = Math.max(2, Math.round(q.twigs * p.density));
      leafyTwigs(L, rng, pt, d, sw, ph, {
        center: cr.center, twigs: nT, leaves: q.leaves, twigLen: 0.4 * S, leafSize: 0.12 * S * q.size, elong: 1.6,
        droop: 0.12, swayAdd: 0.15, tipColor: tipC,
        color: pp => { const h = AA.clamp((pp[1] - cr.center[1]) / cr.radii[1] * 0.5 + 0.5, 0, 1); return h > 0.5 ? mixc(mid, light, (h - 0.5) * 2) : mixc(dark, mid, h * 2); }
      });
      if (p.fruit && rng() < 0.6) for (let f = 0; f < 3; f++) {
        const fc = V.madd(V.madd(pt, cone(rng, d, 1.2), 0.25 * S), AA.DOWN, 0.05), fr = 0.022;
        const col = vary(mixc(nabqA, nabqB, rng()), rng, 0.12);
        AA.blob(Fr, fc, [fr, 0, 0], [0, fr, 0], [0, 0, fr], () => col, sw + 0.15, ph, 0.1, rng, 0, true);
      }
      if (quality === 'high') for (let s = 0; s < 3; s++) { // أشواك بيضاء صغيرة
        const sp = V.madd(pt, cone(rng, d, 1.3), 0.08 * S), sd = cone(rng, d, 1.4);
        AA.leaf(W, sp, sd, AA.basis(sd)[0], 0.04, 0.006, thornC, thornC, sw, ph, 0, 0);
      }
    }
    AA.crownAO(L, leaf0, cr.center, cr.radii, 0.32, 0.12);
    AA.crownAO(W, 0, cr.center, cr.radii, 0.55, 0);
    return AA.finalize('sidr', {
      wood: { builder: W, material: { kind: 'bark', roughness: 0.95 } },
      leaves: { builder: L, material: { kind: 'leaf', roughness: 0.5, doubleSided: true } },
      fruit: { builder: Fr, material: { kind: 'fruit', roughness: 0.4 } }
    }, { height: p.height, stiffness: 0.008, radius: Math.max(cr.radii[0], cr.radii[2]), collider: { type: 'cylinder', radius: 0.28 * S, height: 1.6 * S } });
  }

  AA.assets.sidr = {
    id: 'sidr', name: 'سدرة', nameEn: 'Sidr (Ziziphus)', category: 'plants',
    schema: [
      { key: 'height', label: 'الارتفاع', min: 3, max: 9, step: 0.5, def: 6, unit: 'م' },
      { key: 'spread', label: 'اتساع التاج', min: 0.7, max: 1.4, step: 0.05, def: 1, pct: true },
      { key: 'density', label: 'كثافة الورق', min: 0.4, max: 1.6, step: 0.1, def: 1, pct: true },
      { key: 'fruit', label: 'النبق', type: 'bool', def: true }
    ],
    presets: { 'سدرة معمّرة': { height: 8, spread: 1.3, density: 1.3 }, 'سدرة صغيرة': { height: 3.5, spread: 0.9, density: 0.9, fruit: false } },
    generate: sidr
  };

  // ---------------- الطلح ----------------
  // ورقة الطلح ريشية مركّبة: عرق قصير وعليه وريقات دقيقة — نرسمها كـ "رشّة" أفقية
  function featherSpray(L, rng, p, dir, size, pairs, color, tipC, sway, ph) {
    const up = V.norm(V.add([0, 1, 0], V.scale(AA.inSphere(rng), 0.25)));
    const side = V.norm(V.cross(dir, up));
    for (let k = 0; k < pairs; k++) {
      const u = (k + 0.6) / pairs;
      const b = V.madd(V.madd(p, dir, size * u), AA.DOWN, size * 0.08 * u * u);
      const pl = size * 0.42 * (1 - 0.45 * u);
      const c = vary(color, rng, 0.18);
      for (const sg of [-1, 1]) {
        const od = V.norm(V.add(V.scale(side, sg), V.scale(dir, 0.55)));
        AA.leaf(L, b, od, up, pl, pl * 0.32, c, mixc(c, tipC, 0.4), sway, ph, 1, 0.02);
      }
    }
  }
  const QT = {
    high: { sprays: 11, pairs: 6, tips: [0.4, 0.75, 1], sides: [9, 6, 4, 3, 3], segs: [5, 4, 4, 3, 2], size: 1 },
    med:  { sprays: 8, pairs: 5, tips: [0.5, 1],       sides: [7, 5, 4, 3, 3], segs: [4, 4, 3, 2, 2], size: 1.2 },
    low:  { sprays: 5, pairs: 3, tips: [1],            sides: [6, 4, 3, 3, 3], segs: [3, 3, 2, 2, 2], size: 1.6 }
  };
  function talh(p, quality) {
    const q = QT[quality] || QT.med, rng = AA.rng(p.seed), S = p.height / 4.5;
    const W = new AA.Builder(), L = new AA.Builder(), Fl = new AA.Builder();
    const leafA = hex('#56693a'), leafB = hex('#76884a'), tipC = hex('#97a464'), flower = hex('#f0c935'), thornC = hex('#efe7d2');
    const trunks = [], n = Math.max(1, Math.round(p.trunks)), az0 = rng() * 6.28;
    for (let i = 0; i < n; i++) {
      const a = az0 + i / n * 6.28 + (rng() - 0.5) * 0.7, k = n > 1 ? 0.45 : 0.15;
      trunks.push({ base: [Math.cos(a) * 0.07 * (n > 1 ? 1 : 0), 0, Math.sin(a) * 0.07 * (n > 1 ? 1 : 0)],
        dir: [Math.cos(a) * k, 1, Math.sin(a) * k], radius: 0.17 * S / Math.sqrt(n) * 1.25, length: 1.7 * S * (0.85 + rng() * 0.3) });
    }
    const tips = [];
    AA.growTree({ wood: W }, rng, {
      trunks, trunkLength: 1.15 * S,
      levels: 4, children: [3, 3, 2, 2], spread: [0.7 * p.spread, 1.0 * p.spread, 1.1, 1.1],
      upward: [0.35, 0.05, -0.1, -0.15], ceiling: p.height * 0.92, flatten: 0.7, flattenFrom: 2, floor: 2.2 * S,
      lenRatio: [1.3, 0.78, 0.62, 0.55], radRatio: 0.6, taper: 0.6, childStart: 0.55, gnarl: 0.6, leader: false,
      segs: q.segs, sides: q.sides, swayGain: [0, 0.1, 0.15, 0.2, 0.25],
      bark: barkFn('#33291f', '#5b4b3c'),
      tipPoints: q.tips,
      onTip: (pt, d, sw) => tips.push([pt, d, sw])
    });
    const cr = AA.bounds(tips.map(t => t[0]));
    cr.radii = [cr.radii[0] + 0.4 * S, Math.max(0.35 * S, cr.radii[1]), cr.radii[2] + 0.4 * S];
    const leaf0 = L.vertexCount;
    for (const [pt, d, sw] of tips) {
      const ph = rng() * 6.28, m = Math.max(1, Math.round(q.sprays * p.density * Math.min(1, 2 / n)));
      const dh = V.norm([d[0], d[1] * 0.2, d[2]]);
      for (let c = 0; c < m; c++) {
        const sd = V.norm(V.add(cone(rng, dh, 1.3), [0, -0.05, 0]));
        const sp = V.madd(V.madd(pt, cone(rng, dh, 1.5), 0.22 * S * rng()), AA.UP, (rng() - 0.3) * 0.12 * S);
        featherSpray(L, rng, sp, sd, 0.32 * S * q.size * (0.8 + rng() * 0.4), q.pairs, mixc(leafA, leafB, rng()), tipC, sw + 0.1, ph + c);
      }
      if (quality !== 'low') for (let s = 0; s < 2; s++) { // أشواك الطلح البيضاء
        const sp = V.madd(pt, d, -0.06 * S * (s + 1)), sd = cone(rng, V.norm([d[2], 0.2, -d[0]]), 0.6);
        AA.leaf(W, sp, sd, [0, 1, 0], 0.05 * S, 0.008, thornC, thornC, sw, ph, 0, 0);
      }
      if (p.flowers && rng() < 0.7) {
        const fc = V.madd(pt, cone(rng, dh, 1.2), 0.1 * S), fr = 0.03;
        AA.blob(Fl, fc, [fr, 0, 0], [0, fr, 0], [0, 0, fr], () => vary(flower, rng, 0.1), sw + 0.1, ph, 0.3, rng, 0.25, true);
      }
    }
    AA.crownAO(L, leaf0, cr.center, cr.radii, 0.5, 0.25);
    return AA.finalize('talh', {
      wood: { builder: W, material: { kind: 'bark', roughness: 0.95 } },
      leaves: { builder: L, material: { kind: 'leaf', roughness: 0.75, doubleSided: true } },
      fruit: { builder: Fl, material: { kind: 'flower', roughness: 0.6 } }
    }, { height: p.height, stiffness: 0.01, radius: Math.max(cr.radii[0], cr.radii[2]), collider: { type: 'cylinder', radius: 0.22 * S, height: 1.2 * S } });
  }

  AA.assets.talh = {
    id: 'talh', name: 'طلحة', nameEn: 'Talh (Acacia)', category: 'plants',
    schema: [
      { key: 'height', label: 'الارتفاع', min: 2.5, max: 7, step: 0.5, def: 4.5, unit: 'م' },
      { key: 'spread', label: 'اتساع المظلة', min: 0.8, max: 1.6, step: 0.05, def: 1.15, pct: true },
      { key: 'trunks', label: 'عدد السيقان', min: 1, max: 4, step: 1, def: 2 },
      { key: 'density', label: 'كثافة الورق', min: 0.4, max: 1.6, step: 0.1, def: 1, pct: true },
      { key: 'flowers', label: 'الزهر الأصفر', type: 'bool', def: false }
    ],
    presets: { 'طلحة الوادي': { height: 5.5, spread: 1.5, trunks: 3 }, 'طلحة يابسة': { height: 4, density: 0.4, trunks: 1 } },
    generate: talh
  };

  // ---------------- الأثل ----------------
  // أغصان الأثل إبرية متدلية: ساق رفيعة منحنية للأسفل وعلى جانبيها إبر دقيقة
  function plume(L, rng, start, dir, len, segs, color, tipC, sway, ph) {
    let p = start, d = dir;
    const sl = len / segs;
    for (let i = 0; i < segs; i++) {
      const u = (i + 1) / segs;
      d = V.norm(V.madd(d, AA.DOWN, 0.42));
      const np = V.madd(p, d, sl);
      const c = mixc(color, tipC, u * 0.7), sw = sway + 0.4 * u, fl = 0.4 + 0.6 * u;
      const [a] = AA.basis(d);
      for (const sg of [-1, 1]) {
        const nd = V.norm(V.add(V.scale(d, 0.75), V.scale(a, sg * 0.6)));
        AA.leaf(L, V.lerp(p, np, 0.3), nd, V.norm(V.cross(nd, a)), sl * 1.15, sl * 0.15, c, mixc(c, tipC, 0.3), sw, ph, fl, 0.03);
      }
      p = np;
    }
  }
  const QA = {
    high: { plumes: 14, segs: 5, tips: [0.4, 0.75, 1], sides: [12, 7, 5, 3], bsegs: [6, 5, 4, 3] },
    med:  { plumes: 14, segs: 4, tips: [0.5, 1],       sides: [9, 6, 4, 3],  bsegs: [5, 4, 3, 2] },
    low:  { plumes: 8,  segs: 3, tips: [1],            sides: [7, 5, 3, 3],  bsegs: [4, 3, 2, 2] }
  };
  function athl(p, quality) {
    const q = QA[quality] || QA.med, rng = AA.rng(p.seed), S = p.height / 7;
    const W = new AA.Builder(), L = new AA.Builder();
    const cA = hex('#5d7466'), cB = hex('#73897a'), tipC = hex('#9fb09e');
    const trunks = [], az0 = rng() * 6.28;
    for (let i = 0; i < 2; i++) {
      const a = az0 + i * 3.0 + (rng() - 0.5) * 0.6;
      trunks.push({ base: [Math.cos(a) * 0.12 * S, 0, Math.sin(a) * 0.12 * S], dir: [Math.cos(a) * 0.3, 1, Math.sin(a) * 0.3],
        radius: (i ? 0.22 : 0.3) * S, length: (i ? 1.5 : 1.9) * S });
    }
    const tips = [];
    AA.growTree({ wood: W }, rng, {
      trunks, levels: 3, children: [3, 3, 3], spread: [0.65, 0.6, 0.55],
      upward: [0.4, 0.3, 0.15], gravity: [0, 0, 0.05, 0.1],
      lenRatio: [1.2, 0.68, 0.62], radRatio: 0.58, taper: 0.55, childStart: 0.45, gnarl: 0.45, leader: true,
      segs: q.bsegs, sides: q.sides, swayGain: [0, 0.12, 0.18, 0.22],
      bark: barkFn('#2f2620', '#56483d'),
      tipPoints: q.tips,
      onTip: (pt, d, sw) => tips.push([pt, d, sw])
    });
    const cr = AA.bounds(tips.map(t => t[0]));
    cr.radii = cr.radii.map(r => r + 0.5 * S);
    const leaf0 = L.vertexCount;
    for (const [pt, d, sw] of tips) {
      const ph = rng() * 6.28, m = Math.max(2, Math.round(q.plumes * p.density));
      const out = V.norm(V.sub(pt, cr.center));
      for (let c = 0; c < m; c++) {
        const dir = V.norm(V.add(V.add(V.scale(cone(rng, V.norm(V.add(d, out)), 1.2), 0.9), [0, 0.35, 0]), [0, 0, 0]));
        const st = V.madd(pt, cone(rng, d, 1.6), 0.35 * S * rng());
        plume(L, rng, st, dir, p.droop * S * (0.45 + rng() * 0.5), q.segs, vary(mixc(cA, cB, rng()), rng, 0.12), tipC, sw, ph + c * 0.5);
      }
    }
    AA.crownAO(L, leaf0, cr.center, cr.radii, 0.35, 0.15);
    AA.crownAO(W, 0, cr.center, cr.radii, 0.6, 0);
    return AA.finalize('athl', {
      wood: { builder: W, material: { kind: 'bark', roughness: 0.97 } },
      leaves: { builder: L, material: { kind: 'leaf', roughness: 0.85, doubleSided: true } }
    }, { height: p.height, stiffness: 0.006, radius: Math.max(cr.radii[0], cr.radii[2]), collider: { type: 'cylinder', radius: 0.4 * S, height: 1.8 * S } });
  }

  AA.assets.athl = {
    id: 'athl', name: 'أثلة', nameEn: 'Athl (Tamarisk)', category: 'plants',
    schema: [
      { key: 'height', label: 'الارتفاع', min: 4, max: 11, step: 0.5, def: 7, unit: 'م' },
      { key: 'droop', label: 'طول الأغصان المتدلية', min: 0.4, max: 1.4, step: 0.05, def: 0.85, unit: 'م' },
      { key: 'density', label: 'الكثافة', min: 0.4, max: 1.6, step: 0.1, def: 1, pct: true }
    ],
    presets: { 'أثلة مصدّات رياح': { height: 9, density: 1.5, droop: 0.7 }, 'أثلة عجوز': { height: 6, density: 0.7, droop: 1.3 } },
    generate: athl
  };
})(typeof window !== 'undefined' ? window : globalThis);
