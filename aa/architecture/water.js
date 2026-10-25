// Aboden Assets — architecture/water.js
// قطع الماء النجدية: الحوض، الساقية (الفلج)، والبئر (القليب) — منقولة من build_water_kit.py في مفاتيح
// ومطوّرة: حجارة بأحجام غير متساوية، ماء بشبكة ضوء متحركة، بئر بمحالة وحبل ودلو، وحوض شرب اختياري.
(function (g) {
  'use strict';
  const AA = g.AA;
  const V = AA.v, lerp = AA.lerp;
  const WATER = { kind: 'water', texture: 'water', roughness: 0.05, opacity: 0.82 };

  function parts() { return { stone: new AA.Builder(), top: new AA.Builder(), water: new AA.Builder(), wood: new AA.Builder(), dark: new AA.Builder(), rope: new AA.Builder(), metal: new AA.Builder() }; }
  function done(id, P, meta, flow) {
    return AA.finalize(id, {
      stone: { builder: P.stone, material: { kind: 'stone', texture: 'sandstone', roughness: 0.9 } },
      top:   { builder: P.top,   material: { kind: 'stone', texture: 'sandstone', roughness: 0.85 } },
      water: { builder: P.water, material: Object.assign({}, WATER, flow ? { flow } : {}) },
      wood:  { builder: P.wood,  material: { kind: 'wood', texture: 'wood', roughness: 0.85 } },
      dark:  { builder: P.dark,  material: { kind: 'dark', roughness: 1, color: [0.035, 0.03, 0.025] } },
      rope:  { builder: P.rope,  material: { kind: 'rope', roughness: 1, color: [0.32, 0.22, 0.12] } },
      metal: { builder: P.metal, material: { kind: 'metal', roughness: 0.6, color: [0.09, 0.08, 0.07] } }
    }, Object.assign({ stiffness: 0 }, meta));
  }

  // حجر مشذّب: كتلة بحواف مدوّرة قليلاً، ولكل حجر إزاحة خامة مختلفة
  function block(P, rng, at, sx, h, sz, rot) {
    AA.mudSolid({ wall: P.stone, top: P.top }, { sx, sz, h, r: Math.min(0.03, sx * 0.2, sz * 0.2), topRound: 0.01, disp: 0.004, step: 0.35,
      tile: 1, seed: Math.floor(rng() * 1e6), at, rot: rot || 0, uvOff: rng() * 7, taperX: 0.006, taperZ: 0.006 });
  }
  // سطح ماء مقسّم (لتموّج خفيف) — uv بالمتر
  function waterRect(P, x0, x1, z0, z1, y, phase) {
    const nx = Math.max(1, Math.round((x1 - x0) / 0.35)), nz = Math.max(1, Math.round((z1 - z0) / 0.35)), ids = [];
    for (let i = 0; i <= nx; i++) { ids.push([]); for (let j = 0; j <= nz; j++) {
      const x = lerp(x0, x1, i / nx), z = lerp(z0, z1, j / nz);
      const edge = Math.min(i, nx - i, j, nz - j) > 0 ? 1 : 0;
      ids[i].push(P.water.v([x, y, z], [1, 1, 1], 0, phase + x * 0.7 + z * 0.5, 0.5 * edge, [x / 0.9, z / 0.9]));
    } }
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { P.water.t(ids[i][j], ids[i][j + 1], ids[i + 1][j + 1]); P.water.t(ids[i][j], ids[i + 1][j + 1], ids[i + 1][j]); }
  }
  // صف حجارة بأطوال غير متساوية بين u0 و u1 على محور
  function course(P, rng, u0, u1, place, avgLen, gap) {
    let u = u0;
    while (u < u1 - 0.05) {
      let len = avgLen * (0.7 + rng() * 0.6);
      if (u1 - (u + len) < avgLen * 0.45) len = u1 - u;
      place(u + len / 2, len - gap);
      u += len;
    }
  }

  // ---------------- الحوض ----------------
  function basin(p, q) {
    const P = parts(), rng = AA.rng(p.seed), S = p.size, w = 0.24, h = p.rimHeight, half = S / 2, gap = 0.015;
    const inlet = 0.36;
    // الجوانب: x ثابت (يمين/يسار) و z ثابت (أمام/خلف)
    for (const sd of [1, -1]) {
      course(P, rng, -half + w, half - w, (u, len) => block(P, rng, [sd * (half - w / 2), 0, u], w, h, len), 0.7, gap);
      if (sd < 0 || !p.inlet) course(P, rng, -half, half, (u, len) => block(P, rng, [u, 0, sd * (half - w / 2)], len, h, w), 0.7, gap);
      else { // الفتحة في الأمام (+Z) تتصل بالساقية
        course(P, rng, -half, -inlet / 2, (u, len) => block(P, rng, [u, 0, half - w / 2], len, h, w), 0.7, gap);
        course(P, rng, inlet / 2, half, (u, len) => block(P, rng, [u, 0, half - w / 2], len, h, w), 0.7, gap);
      }
    }
    block(P, rng, [0, 0, 0], S - 0.06, 0.08, S - 0.06);
    if (p.water) waterRect(P, -half + w, half - w, -half + w, half - w + (p.inlet ? 0.05 : 0), h * 0.72, rng() * 6);
    return done('water_basin', P, { height: h, radius: S / 2, collider: { type: 'box', size: [S, h, S] }, snap: { inlet: p.inlet ? [0, 0, half] : null } }, [0.02, 0.03]);
  }

  // ---------------- الساقية ----------------
  function channel(p, q) {
    const P = parts(), rng = AA.rng(p.seed), L = p.length, inner = p.width, w = 0.2, h = 0.3, gap = 0.015;
    for (const sd of [-1, 1]) course(P, rng, -L / 2, L / 2, (u, len) => block(P, rng, [sd * (inner / 2 + w / 2), 0, u], w, h, len), 0.66, gap);
    block(P, rng, [0, 0, 0], inner + 0.04, 0.07, L);
    if (p.water) waterRect(P, -inner / 2, inner / 2, -L / 2, L / 2, h * 0.6, rng() * 6);
    return done('water_channel', P, { height: h, radius: L / 2, collider: { type: 'box', size: [inner + 2 * w, h, L] }, snap: { length: L, ends: [[0, 0, -L / 2], [0, 0, L / 2]] } }, [0, -p.flow]);
  }

  // ---------------- البئر ----------------
  // حجر منحني بين زاويتين
  function ringStone(B, r0, r1, z0, z1, a0, a1, seg, uo, col) {
    const rows = [];
    for (let k = 0; k <= seg; k++) {
      const a = lerp(a0, a1, k / seg), c = Math.cos(a), s = Math.sin(a);
      rows.push([[r1 * c, z0, r1 * s], [r1 * c, z1, r1 * s], [r0 * c, z1, r0 * s], [r0 * c, z0, r0 * s]]);
    }
    const arc = (r, k) => r * lerp(a0, a1, k / seg) + uo;
    for (let k = 0; k < seg; k++) {
      const A = rows[k], Bq = rows[k + 1];
      AA.quad(B, [A[0], Bq[0], Bq[1], A[1]], [[arc(r1, k), z0], [arc(r1, k + 1), z0], [arc(r1, k + 1), z1], [arc(r1, k), z1]], [col], V.norm([A[0][0], 0, A[0][2]]));
      AA.quad(B, [A[1], Bq[1], Bq[2], A[2]], [[arc(r1, k), r1], [arc(r1, k + 1), r1], [arc(r0, k + 1), r0], [arc(r0, k), r0]], [col], [0, 1, 0]);
      AA.quad(B, [A[2], Bq[2], Bq[3], A[3]], [[arc(r0, k), z1], [arc(r0, k + 1), z1], [arc(r0, k + 1), z0], [arc(r0, k), z0]], [V.scale(col, 0.75)], V.norm([-A[2][0], 0, -A[2][2]]));
    }
    for (const [R, sgn] of [[rows[0], -1], [rows[seg], 1]]) {
      const a = sgn < 0 ? a0 : a1, t = [-Math.sin(a) * sgn, 0, Math.cos(a) * sgn];
      AA.quad(B, R, [[0, z0], [0, z1], [r1 - r0, z1], [r1 - r0, z0]], [V.scale(col, 0.8)], t);
    }
  }
  function well(p, q) {
    const P = parts(), rng = AA.rng(p.seed), r0 = 0.46, r1 = 0.72, ch = 0.26, nC = Math.round(p.courses), seg = q === 'low' ? 2 : q === 'med' ? 3 : 5;
    // مداميك الحجر بأطوال مختلفة ومتراكبة
    for (let c = 0; c < nC; c++) {
      const cap = c === nC - 1, R1 = cap ? r1 + 0.04 : r1, R0 = cap ? r0 - 0.02 : r0;
      let a = rng() * 0.6;
      const end = a + Math.PI * 2;
      while (a < end - 0.05) {
        let da = (cap ? 0.75 : 0.6) * (0.7 + rng() * 0.6);
        if (end - (a + da) < 0.3) da = end - a;
        const col = AA.vary([1, 1, 1], rng, 0.18);
        ringStone(cap ? P.top : P.stone, R0, R1, c * ch + 0.006, (c + 1) * ch - 0.006 + (cap ? 0.03 : 0), a + 0.008, a + da - 0.008, seg, rng() * 5, col);
        a += da;
      }
    }
    // ملاط داكن خلف الفواصل + فوهة عميقة + ماء في القاع
    const Hh = nC * ch, shaft = [];
    for (let k = 0; k <= 24; k++) { const a = k / 24 * Math.PI * 2; shaft.push([Math.cos(a), Math.sin(a)]); }
    for (let k = 0; k < 24; k++) {
      const [c0, s0] = shaft[k], [c1, s1] = shaft[k + 1], rm = (r0 + r1) / 2;
      AA.quad(P.dark, [[rm * c0, 0, rm * s0], [rm * c1, 0, rm * s1], [rm * c1, Hh - 0.01, rm * s1], [rm * c0, Hh - 0.01, rm * s0]], [[0, 0], [1, 0], [1, 1], [0, 1]], [[1, 1, 1]], [c0, 0, s0]);
      const ri = r0 + 0.005;
      AA.quad(P.dark, [[ri * c0, -0.5, ri * s0], [ri * c1, -0.5, ri * s1], [ri * c1, 0.02, ri * s1], [ri * c0, 0.02, ri * s0]], [[0, 0], [1, 0], [1, 1], [0, 1]], [[0.5, 0.5, 0.5]], [-c0, 0, -s0]);
    }
    if (p.water) {
      const ids = [P.water.v([0, -0.45, 0], [0.35, 0.35, 0.35], 0, 0, 0, [0, 0])];
      for (let k = 0; k < 24; k++) ids.push(P.water.v([r0 * shaft[k][0], -0.45, r0 * shaft[k][1]], [0.3, 0.3, 0.3], 0, 0, 0, [shaft[k][0] * 0.5, shaft[k][1] * 0.5]));
      for (let k = 0; k < 24; k++) P.water.t(ids[0], ids[1 + (k + 1) % 24], ids[1 + k]);
    }
    if (p.frame) {
      const px = r0 + 0.2, top = Hh + 1.45, beamY = top - 0.05;
      // قائمتان من جذوع خشنة
      for (const s of [-1, 1]) {
        const pts = [], rad = [];
        for (let k = 0; k <= 5; k++) { const t = k / 5; pts.push([s * px + (rng() - 0.5) * 0.03, t * top, (rng() - 0.5) * 0.03]); rad.push(0.075 - 0.012 * t); }
        AA.tube(P.wood, pts, rad, q === 'low' ? 5 : 7, () => AA.vary([0.95, 0.95, 0.95], rng, 0.1), () => 0, 0, null, true);
        AA.box(P.wood, [s * px, top + 0.02, 0], [0.18, 0.06, 0.18], [0.8, 0.8, 0.8], 0.4, {});
      }
      // العارضة
      const bp = []; for (let k = 0; k <= 6; k++) bp.push([lerp(-px - 0.18, px + 0.18, k / 6), beamY + 0.08 + 0.015 * Math.sin(k * 2.3), 0]);
      AA.tube(P.wood, bp, bp.map(() => 0.07), q === 'low' ? 5 : 8, () => [0.9, 0.9, 0.9], () => 0, 0, null, true);
      // المحالة: بكرة خشب بأضلاع
      const py = beamY - 0.2, pr = 0.16, pw = 0.07;
      const rim = []; for (let k = 0; k <= 16; k++) { const a = k / 16 * Math.PI * 2; rim.push([0, py + Math.sin(a) * pr, Math.cos(a) * pr]); }
      for (const dx of [-pw / 2, pw / 2]) AA.tube(P.wood, rim.map(v => [dx, v[1], v[2]]), rim.map(() => 0.022), 5, () => [0.8, 0.8, 0.8], () => 0, 0, null, false);
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; AA.box(P.wood, [0, py + Math.sin(a) * pr / 2, Math.cos(a) * pr / 2], [pw, 0.025, pr], [0.75, 0.75, 0.75], 0.3, {}, 0); }
      AA.box(P.wood, [0, py, 0], [pw * 1.6, 0.06, 0.06], [0.7, 0.7, 0.7], 0.3, {});
      AA.box(P.wood, [0, (py + beamY + 0.08) / 2, 0], [0.04, beamY + 0.08 - py, 0.04], [0.7, 0.7, 0.7], 0.3, {});
      // الحبل: ينزل إلى الدلو من جهة، ويُربط بالقائمة من الجهة الأخرى
      const bucketY = Hh + 0.55;
      AA.tube(P.rope, [[0, py, pr], [0.02, (py + bucketY + 0.3) / 2, pr], [0, bucketY + 0.3, pr]], [0.012, 0.012, 0.012], 5, () => [1, 1, 1], i => 0.06 * i, 1, null, false);
      AA.tube(P.rope, [[0, py, -pr], [-px * 0.5, (py + Hh + 0.9) / 2, -pr * 1.4], [-px + 0.07, Hh + 0.9, -0.05]], [0.012, 0.012, 0.012], 5, () => [1, 1, 1], () => 0, 1, null, false);
      // الدلو: براميل خشب بأطواق حديد ومقبض
      const bx = 0, bz = pr, br = 0.13, bh = 0.24, staves = q === 'low' ? 8 : 12;
      for (let k = 0; k < staves; k++) {
        const a0 = k / staves * Math.PI * 2, a1 = (k + 1) / staves * Math.PI * 2 - 0.03, col = AA.vary([0.95, 0.95, 0.95], rng, 0.25);
        const pt = (a, y, r) => [bx + Math.cos(a) * r, y, bz + Math.sin(a) * r];
        AA.quad(P.wood, [pt(a0, bucketY - bh, br * 0.88), pt(a1, bucketY - bh, br * 0.88), pt(a1, bucketY, br), pt(a0, bucketY, br)], [[0, 0], [0.12, 0], [0.12, 1], [0, 1]], [col], [Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)]);
        AA.quad(P.dark, [pt(a0, bucketY - bh + 0.03, br * 0.84), pt(a1, bucketY - bh + 0.03, br * 0.84), pt(a1, bucketY - 0.01, br * 0.95), pt(a0, bucketY - 0.01, br * 0.95)], [[0, 0], [1, 0], [1, 1], [0, 1]], [[1, 1, 1]], [-Math.cos((a0 + a1) / 2), 0, -Math.sin((a0 + a1) / 2)]);
      }
      for (const yy of [bucketY - 0.05, bucketY - bh + 0.05]) {
        const ring = []; for (let k = 0; k <= 16; k++) { const a = k / 16 * Math.PI * 2; ring.push([bx + Math.cos(a) * br * 1.01, yy, bz + Math.sin(a) * br * 1.01]); }
        AA.tube(P.metal, ring, ring.map(() => 0.008), 3, () => [1, 1, 1], () => 0.06, 1, null, false);
      }
      const bail = []; for (let k = 0; k <= 8; k++) { const a = k / 8 * Math.PI; bail.push([bx + Math.cos(a) * br, bucketY + Math.sin(a) * 0.2, bz]); }
      AA.tube(P.metal, bail, bail.map(() => 0.007), 3, () => [1, 1, 1], () => 0.06, 1, null, false);
      AA.quad(P.water, [[bx - br * 0.8, bucketY - 0.05, bz - br * 0.8], [bx + br * 0.8, bucketY - 0.05, bz - br * 0.8], [bx + br * 0.8, bucketY - 0.05, bz + br * 0.8], [bx - br * 0.8, bucketY - 0.05, bz + br * 0.8]], [[0, 0], [1, 0], [1, 1], [0, 1]], [[0.7, 0.7, 0.7]], [0, 1, 0]);
    }
    if (p.trough) { // حوض شرب حجري بجانب البئر
      const tx = r1 + 0.75, tl = 1.3, tw = 0.6, th = 0.38;
      block(P, rng, [tx, 0, 0], tw, 0.08, tl);
      for (const s of [-1, 1]) { block(P, rng, [tx + s * (tw / 2 - 0.06), 0, 0], 0.12, th, tl); block(P, rng, [tx, 0, s * (tl / 2 - 0.06)], tw - 0.24, th, 0.12); }
      if (p.water) waterRect(P, tx - tw / 2 + 0.12, tx + tw / 2 - 0.12, -tl / 2 + 0.12, tl / 2 - 0.12, th * 0.75, 1);
    }
    return done('well', P, { height: p.frame ? Hh + 1.6 : Hh, radius: p.trough ? 1.6 : r1, collider: { type: 'cylinder', radius: r1, height: Hh } }, [0.01, 0.015]);
  }

  const A = AA.assets;
  A.water_basin = { id: 'water_basin', name: 'حوض ماء', nameEn: 'Stone basin', category: 'architecture', ref: 'w1',
    schema: [
      { key: 'size', label: 'المقاس', min: 1.4, max: 4, step: 0.1, def: 2.2, unit: 'م' },
      { key: 'rimHeight', label: 'ارتفاع الحافة', min: 0.2, max: 0.6, step: 0.02, def: 0.34, unit: 'م' },
      { key: 'inlet', label: 'فتحة للساقية', type: 'bool', def: true },
      { key: 'water', label: 'فيه ماء', type: 'bool', def: true }
    ], presets: { 'حوض كبير': { size: 3.6, rimHeight: 0.42 } }, generate: basin };
  A.water_channel = { id: 'water_channel', name: 'ساقية', nameEn: 'Water channel (falaj)', category: 'architecture', ref: 'w2',
    schema: [
      { key: 'length', label: 'الطول', min: 1, max: 8, step: 0.5, def: 2, unit: 'م' },
      { key: 'width', label: 'عرض المجرى', min: 0.2, max: 0.8, step: 0.02, def: 0.36, unit: 'م' },
      { key: 'flow', label: 'سرعة الجريان', min: 0, max: 1, step: 0.05, def: 0.35, pct: true },
      { key: 'water', label: 'فيها ماء', type: 'bool', def: true }
    ], presets: { 'ساقية جافة': { water: false } }, generate: channel };
  A.well = { id: 'well', name: 'بئر', nameEn: 'Well (qalib)', category: 'architecture', ref: 'w3',
    schema: [
      { key: 'courses', label: 'مداميك الحجر', min: 2, max: 5, step: 1, def: 3 },
      { key: 'frame', label: 'القوائم والمحالة والدلو', type: 'bool', def: true },
      { key: 'trough', label: 'حوض شرب', type: 'bool', def: false },
      { key: 'water', label: 'فيها ماء', type: 'bool', def: true }
    ], presets: { 'بئر بحوض': { trough: true, courses: 4 }, 'بئر مهجورة': { frame: false, water: false, courses: 2 } }, generate: well };
})(typeof window !== 'undefined' ? window : globalThis);
