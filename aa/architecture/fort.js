// Aboden Assets — architecture/fort.js
// سور البلدة، البوابة (الدروازة) ببرجين، المسجد النجدي بمصلّى مسقوف ورواق وصحن ومحراب، والمئذنة.
// الوجه الخارجي لكل قطعة = +Z (السور والبوابة)، وفي المسجد القبلة باتجاه −Z.
(function (g) {
  'use strict';
  const AA = g.AA;
  const V = AA.v, lerp = AA.lerp, smooth = AA.smooth, vary = AA.vary;
  const STEP = { high: 0.2, med: 0.32, low: 0.55 };

  function kit() { return { wall: new AA.Builder(), top: new AA.Builder(), dark: new AA.Builder(), wood: new AA.Builder(), door: new AA.Builder(), metal: new AA.Builder(), floor: new AA.Builder() }; }
  function done(id, P, p, meta) {
    return AA.finalize(id, {
      wall:  { builder: P.wall,  material: { kind: 'mud', texture: p.worn ? 'mud_wall_worn' : 'mud_wall', roughness: 0.96 } },
      top:   { builder: P.top,   material: { kind: 'mud', texture: 'mud_top', roughness: 0.95 } },
      dark:  { builder: P.dark,  material: { kind: 'dark', roughness: 1, color: [0.07, 0.045, 0.03] } },
      wood:  { builder: P.wood,  material: { kind: 'wood', texture: 'wood', roughness: 0.85 } },
      door:  { builder: P.door,  material: { kind: 'wood', texture: 'najdi_door', roughness: 0.8 } },
      metal: { builder: P.metal, material: { kind: 'metal', roughness: 0.5, metalness: 0.4, color: [0.18, 0.17, 0.16] } },
      floor: { builder: P.floor, material: { kind: 'mud', texture: 'mud_top', roughness: 0.98, color: [0.55, 0.5, 0.46] } }
    }, Object.assign({ stiffness: 0 }, meta));
  }
  const X = (o, p) => AA.xform(p, o);

  // صف شُرَف على حافة جدار (span بالطول عند ارتفاع y، على بُعد z من المنتصف)
  function crenelRow(P, o, L, y, z, d, k, gap) {
    // موزّعة داخل الطول (نصف مسافة عند كل طرف) حتى لا تتطابق شُرفة الطرف مع شُرفة القطعة المجاورة
    const n = Math.max(1, Math.round(L / gap));
    for (let i = 0; i < n; i++) { const x = -L / 2 + (i + 0.5) * L / n; AA.najdiCrenel(P, { at: X(o, [x, y, z]), rot: o.rot || 0 }, d, k); }
  }
  // أوتاد خشب بارزة (سقالات البناء النجدية) على وجه عمودي
  function pegs(P, o, xs, ys, zf, rng) {
    for (const y of ys) for (const x of xs) AA.box(P.wood, [x + (rng() - 0.5) * 0.06, y, zf(y) + 0.12], [0.09, 0.09, 0.3], [0.82, 0.8, 0.78], 0.4, o);
  }

  // ---------- سور ----------
  function sur(p, q) {
    const P = kit(), rng = AA.rng(p.seed), L = p.length, H = p.height, T = p.thickness, st = STEP[q];
    const r = AA.mudPanel(P, { L, H, T, taper: T * 0.22, step: st, seed: p.seed, r: 0.1, disp: 0.04, top: x => H + 0.04 * Math.sin(x * 1.3 + p.seed) });
    const zt = r.faceZ(H);
    // دروة خارجية (ساتر) تحمي الممشى، بشُرَف مدرّجة ومرامي
    const pr = AA.mudPanel(P, { L: L - 0.02, H: 0.9, T: 0.3, taper: 0.02, step: st, seed: p.seed + 3, r: 0.05, disp: 0.015, at: [0, H - 0.02, zt - 0.17], noEnds: false });
    if (p.crenels) crenelRow(P, { at: [0, 0, 0] }, L, H + 0.88, zt - 0.17, 0.22, 1.15, q === 'low' ? 1.6 : 0.85);
    if (p.loopholes) for (let x = -L / 2 + 0.7; x < L / 2 - 0.5; x += 1.4) { // مرامي صغيرة في الساتر
      const y = H + 0.42, z = zt - 0.17 + pr.faceZ(0.42) + 0.006;
      AA.quad(P.dark, [[x - 0.05, y - 0.11, z], [x + 0.05, y - 0.11, z], [x + 0.05, y + 0.11, z], [x - 0.05, y + 0.11, z]], [[0, 0], [1, 0], [1, 1], [0, 1]], [[0.06, 0.04, 0.03]], [0, 0, 1]);
    }
    if (p.buttress) for (const x of [-L / 2 + 0.6, L / 2 - 0.6]) AA.mudSolid(P, { sx: 1.1, sz: T + 0.5, h: H * 0.75, r: 0.25, taperZ: 0.25, topRound: 0.1, disp: 0.03, step: st, seed: p.seed + x * 10, tile: 4, at: [x, 0, 0.1] });
    return done('sur', P, p, { height: H + 1.3, radius: L / 2, collider: { type: 'box', size: [L, H + 0.9, T] }, snap: { length: L }, walkway: { y: H, width: T * 0.6 } });
  }

  // ---------- بوابة (دروازة) ----------
  function bigLeaf(P, o, x0, w, h, rng) { // ضلفة باب كبير: ألواح طولية، عوارض، ومسامير
    const n = Math.max(3, Math.round(w / 0.24));
    for (let k = 0; k < n; k++) AA.box(P.wood, [x0 + (k + 0.5) * w / n, h / 2, 0], [w / n - 0.012, h, 0.08], vary([0.72, 0.6, 0.48], rng, 0.12), 0.8, o);
    for (const y of [0.35, h * 0.5, h - 0.35]) AA.box(P.wood, [x0 + w / 2, y, -0.07], [w - 0.06, 0.16, 0.06], [0.6, 0.5, 0.4], 0.8, o);
    for (const y of [0.35, h * 0.5, h - 0.35]) for (let k = 0; k < 5; k++) AA.box(P.metal, [x0 + 0.12 + k * (w - 0.24) / 4, y, 0.045], [0.035, 0.035, 0.02], [1, 1, 1], 0.2, o);
    AA.box(P.metal, [x0 + (x0 < 0 ? w - 0.12 : 0.12), h * 0.48, 0.07], [0.03, 0.18, 0.03], [1, 1, 1], 0.2, o); // مقبض/حلقة
  }
  function gate(p, q) {
    const P = kit(), rng = AA.rng(p.seed), gw = p.gateWidth, gh = p.gateHeight, H = Math.max(gh + 1.6, p.height), T = 1.0, L = gw + 2.4, st = STEP[q];
    const r = AA.mudPanel(P, { L, H, T, taper: 0.12, step: st, seed: p.seed, r: 0.06, openings: [{ x0: -gw / 2, x1: gw / 2, y0: 0, y1: gh }], top: x => H + 0.03 * Math.sin(x * 2) });
    const zf = r.faceZ(gh);
    // عتبة خشب عريضة فوق المدخل + صف جذوع
    AA.box(P.wood, [0, gh + 0.12, zf - 0.05], [gw + 0.7, 0.2, 0.16], [0.85, 0.82, 0.78], 0.6, {});
    for (let x = -gw / 2 - 0.2; x <= gw / 2 + 0.21; x += 0.32) AA.box(P.wood, [x, gh + 0.34, zf + 0.1], [0.12, 0.12, 0.3], [0.85, 0.85, 0.85], 0.4, {});
    // مثلثات تهوية ومرمى فوق الباب
    for (let k = -2; k <= 2; k++) AA.triVent(P, {}, k * 0.36, gh + 0.75, 0.16, r.faceZ(gh + 0.75));
    // الضلفتان (تفتح للداخل −Z)
    const op = p.open * 1.45;
    for (const s of [-1, 1]) {
      const hx = s * gw / 2, o = { at: [hx, 0, -0.05], rot: s * op };
      bigLeaf(P, o, s < 0 ? 0 : -gw / 2, gw / 2 - 0.02, gh - 0.02, rng);
    }
    // ممشى وشُرَف على الأعلى
    crenelRow(P, { at: [0, 0, 0] }, L, H - 0.02, r.faceZ(H) - 0.12, 0.24, 1.2, 0.85);
    // البرجان
    if (p.towers) for (const s of [-1, 1]) {
      const tw = 3.0, th = H + 2.2, at = [s * (L / 2 + tw / 2 - 0.35), 0, 0.15];
      const horn = (x, z) => 0.7 * smooth(0.5, 0.95, Math.abs(x) / (tw / 2)) * smooth(0.5, 0.95, Math.abs(z) / (tw / 2));
      const sol = AA.mudSolid(P, { sx: tw, sz: tw, h: th, r: 1.1, taperX: 0.42, taperZ: 0.42, topRound: 0.12, horn, disp: 0.035, step: st, seed: p.seed + s * 7, tile: 4, at });
      for (let f = 0; f < 4; f++) {
        const o = { at, rot: f * Math.PI / 2 }, yv = th - 0.75;
        for (let x = -0.6; x <= 0.61; x += 0.3) AA.triVent(P, o, x, yv, 0.14, sol.faceAt(yv) + 0.03);
        for (const yy of [th * 0.55, th * 0.3]) { const z = sol.faceAt(yy) + 0.035; AA.quad(P.dark, [[-0.06, yy - 0.16, z], [0.06, yy - 0.16, z], [0.06, yy + 0.16, z], [-0.06, yy + 0.16, z]].map(pp => X(o, pp)), [[0, 0], [1, 0], [1, 1], [0, 1]], [[0.06, 0.04, 0.03]], AA.xform([0, 0, 1], { rot: o.rot })); }
        pegs(P, o, [-0.55, 0.55], [th * 0.42, th * 0.72], y => sol.faceAt(y), rng);
      }
    }
    return done('gate', P, p, { height: H + 3, radius: L / 2 + (p.towers ? 3 : 0), collider: { type: 'compound' }, door: { x: 0, z: 0, width: gw, height: gh }, snap: { length: L + (p.towers ? 5.3 : 0) } });
  }

  // ---------- المئذنة ----------
  function minaretInto(P, at, H, B0, q, seed, rng) {
    const st = STEP[q], tp = B0 * 0.2;
    const horn = (x, z) => 0.55 * smooth(0.45, 0.95, Math.abs(x) / (B0 / 2 - tp)) * smooth(0.45, 0.95, Math.abs(z) / (B0 / 2 - tp));
    const sol = AA.mudSolid(P, { sx: B0, sz: B0, h: H, r: 0.22, taperX: tp, taperZ: tp, topRound: 0.08, horn, disp: 0.03, step: st, seed, tile: 4, at });
    // حزام بارز تحت القمة (شرفة المؤذن)
    const yb = H - 1.4;
    AA.mudSolid(P, { sx: (sol.faceXAt(yb) + 0.14) * 2, sz: (sol.faceAt(yb) + 0.14) * 2, h: 0.22, r: 0.12, topRound: 0.03, disp: 0.01, step: st, seed: seed + 3, tile: 4, at: V.add(at, [0, 0, 0]), y0: yb });
    for (let f = 0; f < 4; f++) {
      const o = { at, rot: f * Math.PI / 2 };
      const zf = y => sol.faceAt(y) + 0.03;
      // صفوف مثلثات صاعدة وفتحات ضوء صغيرة
      for (let y = 1.8; y < yb - 0.6; y += 1.6) {
        AA.triVent(P, o, 0, y, 0.16, zf(y));
        if (f % 2 === 0) { const yy = y + 0.75, z = zf(yy) + 0.005; AA.quad(P.dark, [[-0.07, yy - 0.18, z], [0.07, yy - 0.18, z], [0.07, yy + 0.18, z], [-0.07, yy + 0.18, z]].map(pp => X(o, pp)), [[0, 0], [1, 0], [1, 1], [0, 1]], [[0.06, 0.04, 0.03]], AA.xform([0, 0, 1], { rot: o.rot })); }
      }
      // نافذة المؤذن الكبيرة في كل وجه فوق الحزام
      { const yy = H - 0.7, z = zf(yy) + 0.005; AA.quad(P.dark, [[-0.16, yy - 0.32, z], [0.16, yy - 0.32, z], [0.16, yy + 0.2, z], [-0.16, yy + 0.2, z]].map(pp => X(o, pp)), [[0, 0], [1, 0], [1, 1], [0, 1]], [[0.06, 0.04, 0.03]], AA.xform([0, 0, 1], { rot: o.rot })); }
      pegs(P, o, [-(sol.faceXAt(H * 0.3) - 0.25), sol.faceXAt(H * 0.3) - 0.25], [H * 0.3, H * 0.55], y => sol.faceAt(y), rng);
    }
    if (q !== 'low') AA.najdiCornerCrenel(P, V.add(at, [0, H + 0.05, 0]), 1.2);
    return sol;
  }
  function minaret(p, q) {
    const P = kit(), rng = AA.rng(p.seed);
    minaretInto(P, [0, 0, 0], p.height, p.base, q, p.seed, rng);
    AA.najdiDoorLeaf(P, {}, -0.4, 0.8, 1.8, p.base / 2 + 0.02);
    return done('minaret', P, p, { height: p.height + 1.2, radius: p.base / 2 + 0.3, collider: { type: 'box', size: [p.base, p.height, p.base] } });
  }

  // ---------- المسجد ----------
  function mosque(p, q) {
    const P = kit(), rng = AA.rng(p.seed), W = p.width, D = p.depth, C = p.court, st = STEP[q];
    const H = 4.4, roofY = 3.7, T = 0.6, Ttot = D + C, zb = -Ttot / 2, zh = zb + D; // zb خلف القبلة، zh واجهة المصلّى على الصحن
    const top = s => x => H + 0.03 * Math.sin(x * 1.7 + s);
    // جدار القبلة (خلف) + الجانبان
    AA.mudPanel(P, { L: W, H, T, taper: 0.04, step: st, seed: p.seed + 1, at: [0, 0, zb + T / 2], rot: Math.PI, top: top(1), backMinY: roofY - 0.05 });
    for (const s of [1, -1]) {
      const wins = []; for (let z = 1.6; z < D - 1.2; z += 2.2) wins.push({ x0: s * (z - D / 2) - 0.25, x1: s * (z - D / 2) + 0.25, y0: 1.2, y1: 1.85, blind: true });
      AA.mudPanel(P, { L: D, H, T, taper: 0.04, step: st, seed: p.seed + 2 + s, at: [s * (W / 2 - T / 2), 0, zb + D / 2], rot: s * Math.PI / 2, top: top(2 + s), openings: wins, backMinY: roofY - 0.05 });
    }
    // الرواق: واجهة على الصحن بفتحات بين أعمدة
    const bays = Math.max(3, Math.round((W - 1.2) / 2.1)), bw = (W - 1.2) / bays, ops = [];
    for (let k = 0; k < bays; k++) { const cx = -W / 2 + 0.6 + (k + 0.5) * bw; ops.push({ x0: cx - bw / 2 + 0.32, x1: cx + bw / 2 - 0.32, y0: 0, y1: 2.75 }); }
    const fr = AA.mudPanel(P, { L: W - T * 1.8, H, T: 0.55, taper: 0.03, step: st, seed: p.seed + 5, at: [0, 0, zh - 0.28], openings: ops, top: top(5), r: 0.05 });
    for (const o2 of ops) AA.box(P.wood, [(o2.x0 + o2.x1) / 2, 2.84, zh - 0.28 + fr.faceZ(2.8) - 0.02], [o2.x1 - o2.x0 + 0.3, 0.14, 0.1], [0.85, 0.82, 0.78], 0.6, {});
    // أعمدة داخلية تحمل السقف (تظهر من فتحات الرواق) وعتمة الداخل
    for (let k = 1; k < bays; k++) { const x = -W / 2 + 0.6 + k * bw; for (const zz of [zb + D * 0.38]) AA.mudSolid(P, { sx: 0.5, sz: 0.5, h: roofY - 0.08, r: 0.06, topRound: 0, disp: 0.008, step: st, seed: k, tile: 4, at: [x, 0, zz], taperX: 0.03, taperZ: 0.03 }); }
    AA.quad(P.floor, [[-W / 2 + T, 0.035, zb + T], [W / 2 - T, 0.035, zb + T], [W / 2 - T, 0.035, zh - 0.3], [-W / 2 + T, 0.035, zh - 0.3]], [[0, 0], [W / 2, 0], [W / 2, D / 2], [0, D / 2]], [[0.75, 0.68, 0.62]], [0, 1, 0]);
    AA.quad(P.dark, [[-W / 2 + T + 0.01, 0.05, zb + T + 0.02], [W / 2 - T - 0.01, 0.05, zb + T + 0.02], [W / 2 - T - 0.01, roofY - 0.05, zb + T + 0.02], [-W / 2 + T + 0.01, roofY - 0.05, zb + T + 0.02]], [[0, 0], [1, 0], [1, 1], [0, 1]], [[0.18, 0.13, 0.1]], [0, 0, 1]);
    // تجويف المحراب داخلياً (قوس داكن) وبروزه خارجاً
    AA.quad(P.dark, [[-0.45, 0.05, zb + T + 0.03], [0.45, 0.05, zb + T + 0.03], [0.45, 2.3, zb + T + 0.03], [-0.45, 2.3, zb + T + 0.03]], [[0, 0], [1, 0], [1, 1], [0, 1]], [[0.05, 0.035, 0.025]], [0, 0, 1]);
    AA.mudSolid(P, { sx: 1.7, sz: 1.3, h: 3.3, r: 0.6, taperX: 0.06, taperZ: 0.05, topRound: 0.18, disp: 0.02, step: st, seed: p.seed + 9, tile: 4, at: [0, 0, zb - 0.35] });
    // السقف والدروة بشُرَف صغيرة ومرازيم
    { const y = roofY, hw = W / 2 - T * 0.6, z0 = zb + T * 0.6, z1 = zh - 0.1; AA.quad(P.top, [[-hw, y, z1], [hw, y, z1], [hw, y, z0], [-hw, y, z0]], [[-hw / 2, z1 / 2], [hw / 2, z1 / 2], [hw / 2, z0 / 2], [-hw / 2, z0 / 2]], [[0.95, 0.95, 0.95]], [0, 1, 0]); }
    if (p.crenels) {
      crenelRow(P, { at: [0, 0, 0] }, W - 1.4, H - 0.02, zh - 0.28, 0.3, 1, q === 'low' ? 1.6 : 0.9);
      if (q !== 'low') {
        for (const s of [1, -1]) crenelRow(P, { at: [s * (W / 2 - T / 2), 0, zb + D / 2], rot: s * Math.PI / 2 }, D - 1.4, H - 0.02, 0, 0.3, 1, 0.9);
        crenelRow(P, { at: [0, 0, zb + T / 2], rot: Math.PI }, W - 1.4, H - 0.02, 0, 0.3, 1, 0.9);
      }
      for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) AA.najdiCornerCrenel(P, [sx * (W / 2 - 0.3), H - 0.03, sz > 0 ? zh - 0.3 : zb + 0.3], 1.45);
    }
    for (let x = -W / 2 + 0.7; x < W / 2 - 0.5; x += 0.65) AA.box(P.wood, [x, roofY - 0.12, zh - 0.28 + fr.faceZ(roofY) + 0.12], [0.12, 0.12, 0.26], [0.85, 0.85, 0.85], 0.4, {});
    // سور الصحن المنخفض ومدخله
    const cw = 2.3, cT = 0.45, zc = zh + C;
    const gwid = 1.6;
    AA.mudPanel(P, { L: W, H: cw, T: cT, taper: 0.03, step: st, seed: p.seed + 11, at: [0, 0, zc - cT / 2], openings: [{ x0: -gwid / 2, x1: gwid / 2, y0: 0, y1: 2.1 }], top: x => cw + 0.03 * Math.sin(x * 2.3) });
    AA.box(P.wood, [0, 2.18, zc - cT / 2 + 0.2], [gwid + 0.5, 0.14, 0.12], [0.88, 0.85, 0.8], 0.6, {});
    for (const s of [1, -1]) AA.mudPanel(P, { L: C, H: cw, T: cT, taper: 0.03, step: st, seed: p.seed + 12 + s, at: [s * (W / 2 - cT / 2), 0, zh + C / 2], rot: s * Math.PI / 2, top: x => cw + 0.03 * Math.sin(x * 2.1 + s) });
    for (const s of [1, -1]) AA.najdiDoorLeaf(P, { at: [s * gwid / 2, 0, zc - cT / 2 + 0.12], rot: s * -1.2 }, s > 0 ? -gwid / 2 + 0.01 : 0.01, gwid / 2 - 0.02, 2.08, 0);
    // المئذنة عند زاوية الصحن الأمامية
    let mz = null;
    if (p.minaret) {
      const mb = 2.6, at = [W / 2 - mb / 2 - 0.05, 0, zc - mb / 2 - 0.05];
      minaretInto(P, at, p.minaretHeight, mb, q, p.seed + 20, rng);
      AA.najdiDoorLeaf(P, { at, rot: -Math.PI / 2 }, -0.4, 0.8, 1.8, mb / 2 + 0.02);
      mz = at;
    }
    return done('mosque', P, p, { height: Math.max(H + 0.5, p.minaret ? p.minaretHeight + 1.2 : 0), radius: Math.max(W, Ttot) / 2 + 0.5, collider: { type: 'compound' },
      door: { x: 0, z: zc, width: gwid }, qibla: [0, 0, -1], minaret: mz, court: { z0: zh, z1: zc, width: W } });
  }

  const A = AA.assets;
  const worn = { key: 'worn', label: 'طوب ظاهر أكثر', type: 'bool', def: false };
  A.sur = { id: 'sur', name: 'سور', nameEn: 'Town wall', category: 'architecture', ref: 'sur',
    schema: [
      { key: 'length', label: 'الطول', min: 2, max: 16, step: 0.5, def: 8, unit: 'م' },
      { key: 'height', label: 'الارتفاع', min: 2.5, max: 7, step: 0.1, def: 4.2, unit: 'م' },
      { key: 'thickness', label: 'السماكة', min: 0.6, max: 1.6, step: 0.05, def: 0.9, unit: 'م' },
      { key: 'crenels', label: 'الشُّرَف', type: 'bool', def: true }, { key: 'loopholes', label: 'مرامي', type: 'bool', def: true }, { key: 'buttress', label: 'دعامات', type: 'bool', def: false }, worn
    ], presets: { 'سور مزرعة': { height: 2.6, thickness: 0.6, crenels: false, loopholes: false }, 'سور قديم': { worn: true, buttress: true } }, generate: sur };
  A.gate = { id: 'gate', name: 'بوابة', nameEn: 'Town gate', category: 'architecture', ref: 'gate',
    schema: [
      { key: 'gateWidth', label: 'عرض المدخل', min: 2, max: 4.5, step: 0.1, def: 3, unit: 'م' },
      { key: 'gateHeight', label: 'ارتفاع المدخل', min: 2.5, max: 4.5, step: 0.1, def: 3.4, unit: 'م' },
      { key: 'height', label: 'ارتفاع الجدار', min: 4, max: 8, step: 0.1, def: 5.4, unit: 'م' },
      { key: 'open', label: 'فتح الباب', min: 0, max: 1, step: 0.05, def: 0.8, pct: true },
      { key: 'towers', label: 'برجان', type: 'bool', def: true }, worn
    ], presets: { 'بوابة مغلقة': { open: 0 }, 'مدخل بلا أبراج': { towers: false, height: 4.6 } }, generate: gate };
  A.mosque = { id: 'mosque', name: 'مسجد', nameEn: 'Najdi mosque', category: 'architecture', ref: 'mosque',
    schema: [
      { key: 'width', label: 'العرض', min: 8, max: 22, step: 0.5, def: 13, unit: 'م' },
      { key: 'depth', label: 'عمق المصلّى', min: 5, max: 14, step: 0.5, def: 8, unit: 'م' },
      { key: 'court', label: 'عمق الصحن', min: 3, max: 12, step: 0.5, def: 6, unit: 'م' },
      { key: 'minaret', label: 'مئذنة', type: 'bool', def: true },
      { key: 'minaretHeight', label: 'ارتفاع المئذنة', min: 7, max: 16, step: 0.5, def: 11, unit: 'م' },
      { key: 'crenels', label: 'الشُّرَف', type: 'bool', def: true }, worn
    ], presets: { 'مسجد صغير': { width: 9, depth: 6, court: 4, minaretHeight: 8.5 }, 'جامع كبير': { width: 20, depth: 12, court: 10, minaretHeight: 14 } }, generate: mosque };
  A.minaret = { id: 'minaret', name: 'مئذنة', nameEn: 'Minaret', category: 'architecture', ref: 'minaret',
    schema: [{ key: 'height', label: 'الارتفاع', min: 6, max: 18, step: 0.5, def: 11, unit: 'م' }, { key: 'base', label: 'عرض القاعدة', min: 1.8, max: 4, step: 0.1, def: 2.6, unit: 'م' }, worn],
    presets: {}, generate: minaret };
})(typeof window !== 'undefined' ? window : globalThis);
