// Aboden Assets — architecture/najdi.js
// طقم العمارة النجدية (طين): منقول من مستودع مفاتيح (build_house.py + build_diriyah_kit.py + مراجع p1–p8)
// وأعيد بناؤه بالكود بالكامل — الخامات أيضاً مولّدة (core/texture.js).
(function (g) {
  'use strict';
  const AA = g.AA;
  const V = AA.v, lerp = AA.lerp, smooth = AA.smooth;
  const STEP = { high: 0.12, med: 0.2, low: 0.4 };

  function kit() { return { wall: new AA.Builder(), top: new AA.Builder(), dark: new AA.Builder(), wood: new AA.Builder(), door: new AA.Builder() }; }
  function done(id, P, p, meta) {
    const white = !!p.white;
    return AA.finalize(id, {
      wall: { builder: P.wall, material: { kind: 'mud', texture: white ? 'gypsum' : (p.worn ? 'mud_wall_worn' : 'mud_wall'), roughness: 0.96 } },
      top:  { builder: P.top,  material: { kind: 'mud', texture: white ? 'gypsum' : 'mud_top', roughness: 0.95 } },
      dark: { builder: P.dark, material: { kind: 'dark', roughness: 1, color: [0.07, 0.045, 0.03] } },
      wood: { builder: P.wood, material: { kind: 'wood', texture: 'wood', roughness: 0.85 } },
      door: { builder: P.door, material: { kind: 'wood', texture: 'najdi_door', roughness: 0.8 } }
    }, Object.assign({ stiffness: 0 }, meta));
  }
  const W1 = [1, 1, 1];

  // ضلفة باب نجدي ملوّن (الخامة تغطي الضلفة كاملة)، تُفتح حول مفصلها الأيسر
  function doorLeaf(P, x0, w, h, z, openAngle, o) {
    const oo = { at: V.add(o.at || [0, 0, 0], [x0, 0, z]), rot: (o.rot || 0) + openAngle };
    const t = 0.06;
    for (const [sz, n] of [[t / 2, 1], [-t / 2, -1]]) {
      const ps = [[0, 0, sz], [w, 0, sz], [w, h, sz], [0, h, sz]];
      const uv = n > 0 ? [[0, 0], [1, 0], [1, 1], [0, 1]] : [[1, 0], [0, 0], [0, 1], [1, 1]];
      AA.quad(P.door, ps.map(p => AA.xform(p, oo)), uv, [W1], rotd(oo, [0, 0, n]));
    }
    AA.box(P.wood, [w / 2, h + 0.03, 0], [w, 0.06, t], [0.8, 0.8, 0.8], 0.5, oo);
    AA.box(P.wood, [0, h / 2, 0], [0.05, h, t + 0.01], [0.8, 0.8, 0.8], 0.5, oo);
    AA.box(P.wood, [w, h / 2, 0], [0.05, h, t + 0.01], [0.8, 0.8, 0.8], 0.5, oo);
  }
  function rotd(o, d) { if (!o.rot) return d; const c = Math.cos(o.rot), s = Math.sin(o.rot); return [d[0] * c + d[2] * s, d[1], -d[0] * s + d[2] * c]; }
  function darkRect(P, o, x0, x1, y0, y1, z) {
    AA.quad(P.dark, [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]].map(p => AA.xform(p, o)), [[0, 0], [1, 0], [1, 1], [0, 1]], [[0.06, 0.04, 0.03]], rotd(o, [0, 0, 1]));
  }
  // رؤوس جذوع السقف (المرازيم) ومزراب الماء
  function roofBeams(P, o, L, y, z, withSpout, rng) {
    const n = Math.max(2, Math.round(L / 0.6));
    for (let k = 0; k < n; k++) {
      const x = -L / 2 + (k + 0.5) * L / n;
      if (withSpout && k === Math.floor(n * 0.65)) {
        AA.box(P.wood, [x, y - 0.05, z + 0.4], [0.2, 0.12, 0.9], [0.9, 0.9, 0.9], 0.5, o, 0);
        continue;
      }
      AA.box(P.wood, [x, y + 0.02 * Math.sin(k * 2.1), z + 0.14], [0.13 + rng() * 0.03, 0.13 + rng() * 0.03, 0.32], [0.85, 0.85, 0.85], 0.4, o);
    }
  }
  const bump = (x, c, w) => Math.exp(-Math.pow((x - c) / w, 2));

  // ---------------- جدار (p1) ----------------
  function wall(p, q) {
    const P = kit(), rng = AA.rng(p.seed);
    const ph = rng() * 6.28;
    const r = AA.mudPanel(P, { L: p.length, H: p.height, T: p.thickness, taper: 0.04, step: STEP[q], seed: p.seed,
      top: x => p.height + 0.035 * Math.sin(x * 2.3 + ph) + 0.02 * Math.sin(x * 5.1 + ph * 2) });
    if (p.beams) roofBeams(P, {}, p.length, p.height - 0.45, r.faceZ(p.height - 0.45), true, rng);
    return done('wall', P, p, { height: p.height, radius: p.length / 2, collider: { type: 'box', size: [p.length, p.height, p.thickness] }, snap: { length: p.length } });
  }

  // ---------------- زاوية (p2) ----------------
  function corner(p, q) {
    const P = kit(), A = p.arm, T = p.thickness, s = STEP[q];
    const top = ph => x => p.height + 0.03 * Math.sin(x * 2.3 + ph);
    AA.mudPanel(P, { L: A, H: p.height, T, taper: 0.04, step: s, seed: p.seed, top: top(1), at: [A / 2 - T / 2, 0, 0] });
    AA.mudPanel(P, { L: A - T / 2, H: p.height, T, taper: 0.04, step: s, seed: p.seed + 5, top: top(2), at: [0, 0, -(A / 2 - T / 2) - T / 4], rot: Math.PI / 2 }); // يبدأ داخل الضلع الأول حتى لا تتطابق الأوجه عند الزاوية
    return done('wall_corner', P, p, { height: p.height, radius: A, collider: { type: 'compound' } });
  }

  // ---------------- جدار بباب (p3) ----------------
  function wallDoor(p, q) {
    const P = kit(), rng = AA.rng(p.seed);
    const w = p.doorWidth, h = p.doorHeight;
    const r = AA.mudPanel(P, { L: p.length, H: p.height, T: p.thickness, taper: 0.04, step: STEP[q], seed: p.seed,
      top: x => p.height + 0.03 * Math.sin(x * 2.1 + 1),
      openings: [{ x0: -w / 2, x1: w / 2, y0: 0, y1: h }] });
    // عتبة خشبية فوق الفتحة
    AA.box(P.wood, [0, h + 0.08, r.faceZ(h) - 0.04], [w + 0.55, 0.15, 0.12], [0.9, 0.9, 0.9], 0.6, {});
    if (p.door !== 'none') doorLeaf(P, -w / 2 + 0.01, w - 0.02, h - 0.01, 0, p.door === 'open' ? -1.35 : 0, {});
    if (p.vents) for (let k = 0; k < 3; k++) AA.triVent(P, {}, (k - 1) * 0.32, h + 0.5, 0.18, r.faceZ(h + 0.5));
    return done('wall_door', P, p, { height: p.height, radius: p.length / 2, collider: { type: 'box', size: [p.length, p.height, p.thickness] },
      door: { hinge: [-w / 2, 0, 0], width: w, height: h }, snap: { length: p.length } });
  }

  // ---------------- واجهة القوس (p4) ----------------
  function facadeGable(p, q) {
    const P = kit(), L = p.length, H = p.height, pk = p.peak, s = L / 6;
    const top = x => H + pk * (0.95 * bump(x, 0, 1.15 * s) + 0.55 * bump(Math.abs(x), 2.75 * s, 0.35 * s) - 0.12 * bump(Math.abs(x), 1.85 * s, 0.4 * s));
    const wy = [[-1.6, 2.15], [0, 2.15], [1.6, 2.15], [-1.0, 1.35], [0.8, 1.35]].map(([x, y]) => [x * s, y * H / 3.3]);
    const ws = 0.3;
    const ops = p.windows ? wy.map(([x, y]) => ({ x0: x - ws / 2, x1: x + ws / 2, y0: y - ws / 2, y1: y + ws / 2, blind: true })) : [];
    const vents = [];
    if (p.vents) {
      for (const cx of [-1.2, -0.6, 0, 0.6, 1.2].map(v => v * s)) for (let y = H + 0.12; y < top(cx) - 0.32; y += 0.24) vents.push([cx, y, 0.1]);
      for (let x = -L / 2 + 0.35; x < L / 2 - 0.3; x += 0.32) vents.push([x, H - 0.2, 0.11]);
    }
    const r = AA.mudPanel(P, { L, H, T: p.thickness, taper: 0.03, step: STEP[q], seed: p.seed, top, openings: ops,
      flat: vents.map(([x, y, sz]) => ({ x, y: y + sz / 2, r: sz })) });
    for (const [x, y, sz] of vents) AA.triVent(P, {}, x, y, sz, r.faceZ(y));
    return done('facade_gable', P, p, { height: H + pk, radius: L / 2, collider: { type: 'box', size: [L, H, p.thickness] }, snap: { length: L } });
  }

  // ---------------- الواجهة المدرّجة (p8) ----------------
  function facadeSteps(p, q) {
    const P = kit(), L = p.length, H = p.height, s = L / 6, e = 0.05;
    const lv = [[-3, 1.0], [-1.6, 0.62], [-0.5, 0.3], [1.1, 0.0], [2.3, 0.45]].map(([x, h]) => [x * s, h * p.rise]);
    const top = x => { let h = lv[0][1]; for (const [x0, hh] of lv) h = lerp(h, hh, smooth(x0 - e, x0 + e, x)); return H + h; };
    const vents = [];
    if (p.vents) {
      const add = (cx, cy) => { for (let r = 0; r < 5; r++) { const cnt = r < 3 ? r + 1 : 5 - r; for (let k = 0; k < cnt; k++) vents.push([cx + (k - (cnt - 1) / 2) * 0.17, cy - r * 0.16, 0.1]); } };
      add(-2.3 * s, H + 0.55 * p.rise + 0.05); add(-0.9 * s, H + 0.25 * p.rise + 0.05);
      for (let x = -L / 2 + 0.3; x < L / 2 - 0.25; x += 0.3) vents.push([x, H - 0.3, 0.1]);
    }
    const ws = 0.3, wy = [[-2.0, 1.95], [-0.3, 1.25], [1.6, 1.95]].map(([x, y]) => [x * s, y * H / 3.6]);
    const ops = p.windows ? wy.map(([x, y]) => ({ x0: x - ws / 2, x1: x + ws / 2, y0: y - ws / 2, y1: y + ws / 2, blind: true })) : [];
    const r = AA.mudPanel(P, { L, H, T: p.thickness, taper: 0.03, step: Math.min(STEP[q], 0.2), seed: p.seed, top, openings: ops,
      flat: vents.map(([x, y, sz]) => ({ x, y: y + sz / 2, r: sz })) });
    for (const [x, y, sz] of vents) AA.triVent(P, {}, x, y, sz, r.faceZ(y));
    return done('facade_steps', P, p, { height: H + p.rise, radius: L / 2, collider: { type: 'box', size: [L, H, p.thickness] }, snap: { length: L } });
  }

  // ---------------- الشرفة المدرّجة (p5) وشرفة الزاوية (p6) ----------------
  function crenelInto(P, o, sc, q, seed, cornerType) {
    const st = STEP[q] * 0.5, t = cornerType ? null : 0.24 * sc;
    const widths = [0.9, 0.66, 0.44].map(v => v * sc), hs = 0.24 * sc;
    let y = 0;
    widths.forEach((w, i) => {
      AA.mudSolid(P, Object.assign({}, o, { sx: w, sz: cornerType ? w : t, h: hs, r: 0.03 * sc, step: st, disp: 0.006, topRound: 0.005, seed: seed + i, y0: y, tile: 4 }));
      y += hs;
    });
    const tw = 0.42 * sc;
    AA.mudTip(P, o, tw, cornerType ? tw : t, 0.34 * sc, y - 0.005, cornerType);
    return y + 0.34 * sc;
  }
  function crenel(p, q) {
    const P = kit(); const h = crenelInto(P, {}, p.size, q, p.seed, false);
    return done('crenel', P, p, { height: h, radius: 0.5 * p.size, collider: { type: 'box', size: [0.9 * p.size, h, 0.24 * p.size] } });
  }
  function crenelCorner(p, q) {
    const P = kit(); const h = crenelInto(P, {}, p.size, q, p.seed, true);
    return done('crenel_corner', P, p, { height: h, radius: 0.5 * p.size, collider: { type: 'box', size: [0.9 * p.size, h, 0.9 * p.size] } });
  }

  // ---------------- العمود (p7) ----------------
  function column(p, q) {
    const P = kit(), H = p.height, st = STEP[q] * 0.6;
    AA.mudSolid(P, { sx: 0.44, sz: 0.44, h: 0.16, r: 0.03, step: st, disp: 0.004, topRound: 0.01, seed: p.seed, tile: 4 });
    AA.mudSolid(P, { sx: 0.3, sz: 0.3, h: H - 0.36, r: 0.03, step: st, disp: 0.006, topRound: 0.0, seed: p.seed + 1, y0: 0.16, tile: 4, taperX: 0.02, taperZ: 0.02 });
    AA.mudSolid(P, { sx: 0.38, sz: 0.38, h: 0.09, r: 0.03, step: st, disp: 0.004, topRound: 0.0, seed: p.seed + 2, y0: H - 0.2, tile: 4 });
    AA.mudSolid(P, { sx: 0.5, sz: 0.5, h: 0.11, r: 0.03, step: st, disp: 0.004, topRound: 0.01, seed: p.seed + 3, y0: H - 0.11, tile: 4 });
    return done('column', P, p, { height: H, radius: 0.3, collider: { type: 'box', size: [0.3, H, 0.3] } });
  }

  // ---------------- البرج النجدي ----------------
  function tower(p, q) {
    const P = kit(), Wd = p.width, H = p.height, tp = p.taper * Wd * 0.18;
    const horn = (x, z) => 0.75 * smooth(0.5, 0.95, Math.abs(x) / (Wd / 2)) * smooth(0.5, 0.95, Math.abs(z) / (Wd / 2));
    const sol = AA.mudSolid(P, { sx: Wd, sz: Wd, h: H, r: 0.3, taperX: tp, taperZ: tp, topRound: 0.12, horn, disp: 0.03, step: STEP[q], seed: p.seed, tile: 4 });
    for (let f = 0; f < 4; f++) {
      const o = { rot: f * Math.PI / 2 };
      const zf = y => sol.faceAt(y) + 0.035;
      const span = y => sol.faceXAt(y) - 0.45;
      // صف مثلثات قرب القمة وصفوف نوافذ صغيرة
      const yv = H - 0.75;
      for (let x = -span(yv); x <= span(yv) + 1e-6; x += 0.34) AA.triVent(P, o, x, yv, 0.15, zf(yv));
      for (const [yy, n] of [[H * 0.62, 2], [H * 0.38, 1]]) for (let k = 0; k < n; k++) {
        const x = n === 1 ? 0 : (k - 0.5) * Wd * 0.38;
        darkRect(P, o, x - 0.15, x + 0.15, yy - 0.2, yy + 0.2, zf(yy));
      }
      if (f === 0) doorLeaf(P, -0.45, 0.9, 1.9, sol.faceAt(1) + 0.04, 0, o);
    }
    return done('tower', P, p, { height: H + 0.75, radius: Wd / 2, collider: { type: 'box', size: [Wd, H, Wd] } });
  }

  // ---------------- الدكّة ----------------
  function dakka(p, q) {
    const P = kit();
    AA.mudSolid(P, { sx: p.length, sz: 0.6, h: 0.42, r: 0.14, taperZ: 0.03, topRound: 0.04, disp: 0.015, step: STEP[q] * 0.6, seed: p.seed, tile: 4 });
    return done('dakka', P, p, { height: 0.46, radius: p.length / 2, collider: { type: 'box', size: [p.length, 0.45, 0.6] } });
  }

  const common = [
    { key: 'worn', label: 'طوب ظاهر أكثر', type: 'bool', def: false }
  ];
  const A = AA.assets;
  A.wall = { id: 'wall', name: 'جدار طين', nameEn: 'Mud wall', category: 'architecture', ref: 'p1',
    schema: [
      { key: 'length', label: 'الطول', min: 1, max: 8, step: 0.5, def: 4, unit: 'م' },
      { key: 'height', label: 'الارتفاع', min: 1.5, max: 5, step: 0.1, def: 2.8, unit: 'م' },
      { key: 'thickness', label: 'السماكة', min: 0.25, max: 0.9, step: 0.05, def: 0.5, unit: 'م' },
      { key: 'beams', label: 'جذوع السقف والمزراب', type: 'bool', def: false }
    ].concat(common),
    presets: { 'جدار بيت بسقف': { height: 3.6, beams: true }, 'سور منخفض': { height: 1.6, thickness: 0.4, worn: true } },
    generate: wall };
  A.wall_corner = { id: 'wall_corner', name: 'زاوية جدار', nameEn: 'Wall corner', category: 'architecture', ref: 'p2',
    schema: [
      { key: 'arm', label: 'طول الضلع', min: 1, max: 5, step: 0.25, def: 2.25, unit: 'م' },
      { key: 'height', label: 'الارتفاع', min: 1.5, max: 5, step: 0.1, def: 2.8, unit: 'م' },
      { key: 'thickness', label: 'السماكة', min: 0.25, max: 0.9, step: 0.05, def: 0.5, unit: 'م' }
    ].concat(common),
    presets: {}, generate: corner };
  A.wall_door = { id: 'wall_door', name: 'جدار بباب', nameEn: 'Wall with door', category: 'architecture', ref: 'p3',
    schema: [
      { key: 'length', label: 'الطول', min: 2.5, max: 8, step: 0.5, def: 4, unit: 'م' },
      { key: 'height', label: 'الارتفاع', min: 2.6, max: 5, step: 0.1, def: 3.2, unit: 'م' },
      { key: 'thickness', label: 'السماكة', min: 0.3, max: 0.9, step: 0.05, def: 0.5, unit: 'م' },
      { key: 'doorWidth', label: 'عرض الباب', min: 0.8, max: 2, step: 0.05, def: 1.15, unit: 'م' },
      { key: 'doorHeight', label: 'ارتفاع الباب', min: 1.7, max: 2.6, step: 0.05, def: 2.1, unit: 'م' },
      { key: 'door', label: 'الباب', type: 'enum', options: [['closed', 'مغلق'], ['open', 'مفتوح'], ['none', 'بدون']], def: 'closed' },
      { key: 'vents', label: 'فتحات فوق الباب', type: 'bool', def: true }
    ].concat(common),
    presets: { 'مدخل بلا باب': { door: 'none', vents: false } }, generate: wallDoor };
  A.facade_gable = { id: 'facade_gable', name: 'واجهة بقوس', nameEn: 'Gable facade', category: 'architecture', ref: 'p4',
    schema: [
      { key: 'length', label: 'الطول', min: 4, max: 9, step: 0.5, def: 6, unit: 'م' },
      { key: 'height', label: 'ارتفاع الجدار', min: 2.6, max: 4.5, step: 0.1, def: 3.3, unit: 'م' },
      { key: 'peak', label: 'ارتفاع القوس', min: 0.6, max: 2.4, step: 0.1, def: 1.5, unit: 'م' },
      { key: 'thickness', label: 'السماكة', min: 0.3, max: 0.8, step: 0.05, def: 0.45, unit: 'م' },
      { key: 'windows', label: 'النوافذ', type: 'bool', def: true },
      { key: 'vents', label: 'فتحات التهوية', type: 'bool', def: true }
    ].concat(common),
    presets: {}, generate: facadeGable };
  A.facade_steps = { id: 'facade_steps', name: 'واجهة مدرّجة', nameEn: 'Stepped facade', category: 'architecture', ref: 'p8',
    schema: [
      { key: 'length', label: 'الطول', min: 4, max: 9, step: 0.5, def: 6, unit: 'م' },
      { key: 'height', label: 'ارتفاع الجدار', min: 2.6, max: 4.5, step: 0.1, def: 3.6, unit: 'م' },
      { key: 'rise', label: 'ارتفاع الدرجات', min: 0.4, max: 2, step: 0.1, def: 1.0, unit: 'م' },
      { key: 'thickness', label: 'السماكة', min: 0.3, max: 0.8, step: 0.05, def: 0.45, unit: 'م' },
      { key: 'windows', label: 'النوافذ', type: 'bool', def: true },
      { key: 'vents', label: 'فتحات التهوية', type: 'bool', def: true }
    ].concat(common),
    presets: {}, generate: facadeSteps };
  A.crenel = { id: 'crenel', name: 'شرفة', nameEn: 'Crenel', category: 'architecture', ref: 'p5',
    schema: [{ key: 'size', label: 'الحجم', min: 0.4, max: 1.6, step: 0.05, def: 1, pct: true }, { key: 'white', label: 'جص أبيض', type: 'bool', def: false }],
    presets: { 'شرفة بيضاء': { white: true } }, generate: crenel };
  A.crenel_corner = { id: 'crenel_corner', name: 'شرفة زاوية', nameEn: 'Corner crenel', category: 'architecture', ref: 'p6',
    schema: [{ key: 'size', label: 'الحجم', min: 0.4, max: 1.6, step: 0.05, def: 1, pct: true }, { key: 'white', label: 'جص أبيض', type: 'bool', def: false }],
    presets: { 'شرفة زاوية بيضاء': { white: true } }, generate: crenelCorner };
  A.column = { id: 'column', name: 'عمود', nameEn: 'Column', category: 'architecture', ref: 'p7',
    schema: [{ key: 'height', label: 'الارتفاع', min: 1.8, max: 4, step: 0.1, def: 2.6, unit: 'م' }, { key: 'white', label: 'جص أبيض', type: 'bool', def: false }],
    presets: { 'عمود أبيض': { white: true } }, generate: column };
  A.tower = { id: 'tower', name: 'برج طين', nameEn: 'Najdi tower', category: 'architecture', ref: 'tower',
    schema: [
      { key: 'height', label: 'الارتفاع', min: 5, max: 14, step: 0.5, def: 8, unit: 'م' },
      { key: 'width', label: 'العرض', min: 2.5, max: 6, step: 0.1, def: 3.8, unit: 'م' },
      { key: 'taper', label: 'الميلان', min: 0, max: 1.5, step: 0.05, def: 1, pct: true }
    ].concat(common),
    presets: { 'برج مراقبة': { height: 11, width: 3.2, taper: 1.3 } }, generate: tower };
  A.dakka = { id: 'dakka', name: 'دكّة', nameEn: 'Mud bench', category: 'architecture', ref: 'bench',
    schema: [{ key: 'length', label: 'الطول', min: 1, max: 4, step: 0.25, def: 2, unit: 'م' }],
    presets: {}, generate: dakka };
})(typeof window !== 'undefined' ? window : globalThis);
