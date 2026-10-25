// Aboden Assets — characters/people.js
// مولّد أشخاص عام: نسب الجسم تتغير بالعمر (رأس أكبر وأرجل أقصر للصغار)، ولبس قابل للتبديل.
// منه: امرأة (عباية وشيلة ونقاب اختياري)، طفل صغير، عامل (أفرول وخوذة)، بنت (جلابية وضفائر)، ولد (ثوب وطاقية أو غترة).
// الأمام = +Z، يسار الشخص = +X، الأصل بين القدمين على الأرض. الوحدة: المتر.
(function (g) {
  'use strict';
  const AA = g.AA;
  const V = AA.v, hex = AA.hex, mixc = AA.mixc, vary = AA.vary, lerp = AA.lerp, smooth = AA.smooth, clamp = AA.clamp;
  const Q = { high: { nu: 36, ny: 30, hu: 32, hv: 22, s: 12 }, med: { nu: 26, ny: 20, hu: 24, hv: 16, s: 9 }, low: { nu: 16, ny: 12, hu: 14, hv: 10, s: 6 } };
  const SKIN = { light: '#d9ad88', mid: '#b98058', tan: '#9d6a45', dark: '#6e4630' };
  const HAIR = { black: '#1c1715', brown: '#4a3020', dark: '#2a1e18' };

  // ---------- أدوات شبكات ----------
  // صفوف من الأعلى للأسفل، والزاوية تزيد مع j → الوجه للخارج
  function grid(B, rows, color, uvf) {
    const ids = rows.map((r, i) => r.map((p, j) => B.v(p, color(i / (rows.length - 1), j / (r.length - 1), p), 0, 0, 0, uvf(j / (r.length - 1), i / (rows.length - 1)))));
    for (let i = 0; i < ids.length - 1; i++) for (let j = 0; j < ids[i].length - 1; j++) {
      const a = ids[i][j], b = ids[i][j + 1], c = ids[i + 1][j + 1], d = ids[i + 1][j];
      B.t(a, c, b); B.t(a, d, c);
    }
  }
  function sphereMesh(B, fn, nu, nv, color, th0, th1) {
    th0 = th0 || 0; th1 = th1 == null ? Math.PI : th1;
    const rows = [];
    for (let i = 0; i <= nv; i++) {
      const row = [];
      for (let j = 0; j <= nu; j++) {
        const ph = j / nu * Math.PI * 2, th = typeof th1 === 'function' ? lerp(th0, th1(ph), i / nv) : lerp(th0, th1, i / nv);
        row.push(fn([Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph)], ph));
      }
      rows.push(row);
    }
    grid(B, rows, (v, u, p) => color(p, v, u), (u, v) => [u * 2, v]);
  }

  // ---------- النسب ----------
  function body(spec) {
    const H = spec.height, k = H / 1.7, hk = Math.pow(k, spec.headPow || 0.45);
    const b = { H, k, hk, kid: spec.kid, female: spec.female };
    b.rx = 0.086 * hk; b.ry = 0.112 * hk; b.rz = 0.098 * hk;
    b.HC = [0, H - b.ry * 1.03, 0.0];
    b.chin = b.HC[1] - b.ry * 0.95;
    b.neckTop = b.chin + 0.025 * hk;
    b.shY = b.chin - (spec.kid ? 0.03 : 0.055) * k;
    b.shX = (spec.female ? 0.168 : 0.19) * k * (spec.kid ? 1.06 : 1);
    b.hipY = (spec.legs || 0.53) * H;
    b.hipX = (spec.female ? 0.092 : 0.085) * k;
    b.ankle = 0.075 * k;
    b.knee = lerp(b.ankle, b.hipY, 0.5);
    b.wrist = b.shY - 0.31 * H * (spec.kid ? 0.97 : 1);
    b.elbow = lerp(b.shY, b.wrist, 0.5);
    b.W = k * (spec.width || 1);
    b.eye = s => [s * 0.034 * hk, b.HC[1] + 0.012 * hk, b.rz * 0.86];
    return b;
  }
  function skeleton(b) {
    const k = new AA.Skeleton(), H = b.H;
    k.add('root', null, [0, 0, 0], [0, 0.1, 0]);
    k.add('hips', 'root', [0, b.hipY + 0.02 * b.k, 0], [0, b.hipY + 0.14 * b.k, 0]);
    k.add('spine', 'hips', [0, b.hipY + 0.14 * b.k, 0], [0, lerp(b.hipY, b.shY, 0.62), 0]);
    k.add('chest', 'spine', [0, lerp(b.hipY, b.shY, 0.62), 0], [0, b.shY + 0.04 * b.k, 0.005]);
    k.add('neck', 'chest', [0, b.shY + 0.04 * b.k, 0.005], [0, b.neckTop, 0.01]);
    k.add('head', 'neck', [0, b.neckTop, 0.01], [0, H, 0.02]);
    for (const [sd, x] of [['L', 1], ['R', -1]]) {
      k.add('clav' + sd, 'chest', [0.03 * x * b.k, b.shY + 0.02 * b.k, 0], [b.shX * 0.9 * x, b.shY + 0.01, -0.005]);
      k.add('upArm' + sd, 'clav' + sd, [b.shX * x, b.shY, -0.01], [(b.shX + 0.04 * b.k) * x, b.elbow, -0.005]);
      k.add('loArm' + sd, 'upArm' + sd, [(b.shX + 0.04 * b.k) * x, b.elbow, -0.005], [(b.shX + 0.06 * b.k) * x, b.wrist, 0.03 * b.k]);
      k.add('hand' + sd, 'loArm' + sd, [(b.shX + 0.06 * b.k) * x, b.wrist, 0.03 * b.k], [(b.shX + 0.065 * b.k) * x, b.wrist - 0.09 * b.k, 0.04 * b.k]);
      k.add('thigh' + sd, 'hips', [b.hipX * x, b.hipY, 0], [b.hipX * 1.08 * x, b.knee, 0.01]);
      k.add('shin' + sd, 'thigh' + sd, [b.hipX * 1.08 * x, b.knee, 0.01], [b.hipX * 1.1 * x, b.ankle, -0.015]);
      k.add('foot' + sd, 'shin' + sd, [b.hipX * 1.1 * x, b.ankle, -0.015], [b.hipX * 1.12 * x, 0.02, 0.14 * b.k]);
    }
    return k;
  }

  // ---------- الرأس والوجه ----------
  function headSurface(b) {
    return d => {
      let p = [d[0] * b.rx, d[1] * b.ry, d[2] * (d[2] > 0 ? b.rz : b.rz * 1.08)];
      if (d[1] < 0) { const jaw = b.kid ? 0.1 : (b.female ? 0.2 : 0.24); p[0] *= 1 - jaw * Math.pow(-d[1], 1.4); p[2] *= 1 - 0.05 * (-d[1]) * smooth(0, 0.6, d[2]); }
      if (b.kid) { p[0] *= 1 + 0.06 * Math.max(0, d[1]); p[2] *= 1 + 0.05 * Math.max(0, d[1]); } // جبهة وقحف أكبر للصغار
      let q = V.add(b.HC, p); const n = V.norm(p);
      for (const s of [1, -1]) {
        const e = b.eye(s);
        q = V.madd(q, n, -0.009 * b.hk * Math.exp(-Math.pow(V.len(V.sub(q, V.add(b.HC, [e[0], e[1] - b.HC[1] + 0.004, e[2] - 0.004]))) / (0.017 * b.hk), 2)));
        q = V.madd(q, n, 0.006 * b.hk * (b.kid ? 1.4 : 1) * Math.exp(-Math.pow(V.len(V.sub(q, V.add(b.HC, [s * 0.046 * b.hk, -0.035 * b.hk, b.rz * 0.78]))) / (0.022 * b.hk), 2))); // الخد
      }
      return q;
    };
  }
  function face(P, b, sk, p, rng, skinC, hairC) {
    const hs = headSurface(b), q = p.__q;
    P.skin.setSkin([[sk.id('head'), 1]]);
    sphereMesh(P.skin, hs, q.hu, q.hv, (pt) => vary(mixc(skinC, hex('#c98d6d'), 0.18 * smooth(0.04, 0.09, pt[2] - b.HC[2]) * smooth(-0.06, -0.01, pt[1] - b.HC[1]) * smooth(0.02, -0.04, pt[1] - b.HC[1])), rng, 0.015));
    const hk = b.hk, C = b.HC;
    // الأنف والفم والأذنان
    AA.blob(P.skin, V.add(C, [0, -0.022 * hk, b.rz * 1.0]), [0.013 * hk, 0, 0], [0, 0.022 * hk * (b.kid ? 0.8 : 1), 0], [0, 0, 0.018 * hk * (b.kid ? 0.75 : 1)], () => mixc(skinC, hex('#c98060'), 0.15), 0, 0, 0, null, 0, false);
    AA.blob(P.lip, V.add(C, [0, -0.058 * hk, b.rz * 0.9]), [0.018 * hk, 0, 0], [0, 0.0045 * hk, 0], [0, 0, 0.006 * hk], () => p.lips || [0.62, 0.32, 0.28], 0, 0, 0, null, 0, true);
    if (!p.__covered) for (const s of [1, -1]) AA.blob(P.skin, V.add(C, [s * b.rx * 0.98, -0.005 * hk, -0.005]), [0.008 * hk, 0, 0], [0, 0.026 * hk, 0], [0, 0, 0.016 * hk], () => mixc(skinC, [0.55, 0.32, 0.26], 0.1), 0, 0, 0, null, 0, true);
    // العينان: بياض + قزحية + جفن
    P.eye.setSkin([[sk.id('head'), 1]]); P.dark.setSkin([[sk.id('head'), 1]]); P.hair.setSkin([[sk.id('head'), 1]]);
    const er = (b.kid ? 0.0125 : 0.0105) * hk;
    for (const s of [1, -1]) {
      const e = V.add(C, [b.eye(s)[0], b.eye(s)[1] - C[1], b.eye(s)[2]]);
      AA.blob(P.eye, e, [er, 0, 0], [0, er * 0.9, 0], [0, 0, er * 0.8], () => [0.93, 0.9, 0.86], 0, 0, 0, null, 0, false);
      AA.blob(P.dark, V.add(e, [0, 0, er * 0.7]), [er * 0.55, 0, 0], [0, er * 0.55, 0], [0, 0, er * 0.25], () => [0.2, 0.11, 0.06], 0, 0, 0, null, 0, true);
      AA.blob(P.skin, V.add(e, [0, er * 0.75, 0.002]), [er * 1.25, 0, 0], [0, er * 0.4, 0], [0, 0, er * 1.0], () => mixc(skinC, [0.4, 0.25, 0.2], 0.12), 0, 0, 0, null, 0, true);
      // الحاجب
      AA.loft(P.hair, { path: AA.bezier([V.add(e, [-s * 0.012 * hk, 0.02 * hk, 0.002]), V.add(e, [s * 0.004 * hk, 0.026 * hk, 0.002]), V.add(e, [s * 0.02 * hk, 0.018 * hk, -0.006])], 5), sides: 5, capStart: true, capEnd: true, up: () => [0, 0, 1],
        radius: t => [0.003 * hk, (0.003 + 0.0025 * Math.sin(Math.PI * t)) * hk], color: () => hairC });
    }
    if (p.mustache) AA.loft(P.hair, { path: AA.bezier([V.add(C, [0.03 * hk, -0.055 * hk, b.rz * 0.84]), V.add(C, [0, -0.043 * hk, b.rz * 0.99]), V.add(C, [-0.03 * hk, -0.055 * hk, b.rz * 0.84])], 7), sides: 5, capStart: true, capEnd: true, up: () => [0, 1, 0],
      radius: t => [0.005 * hk, (0.004 + 0.004 * Math.sin(Math.PI * t)) * hk], color: () => hairC });
    return hs;
  }
  // غطاء على الرأس (شعر قصير، طاقية، خوذة): edge(ph) = زاوية الحافة من القمة
  function cap(B, b, sk, off, edge, color, nu, nv, scaleTop) {
    B.setSkin([[sk.id('head'), 1]]);
    const hs = headSurface(b);
    sphereMesh(B, (d, ph) => { const q = hs(d), n = V.norm(V.sub(q, b.HC)); return V.madd(q, n, off * (1 + (scaleTop || 0) * Math.max(0, d[1]))); }, nu, nv, () => color, 0, edge);
  }

  // ---------- الحجاب والغترة ----------
  // غلاف تنسدل عليه القماشة: الرأس، الرقبة، والكتفان/الجسم
  function envelope(b, torsoR) {
    return (ph, y) => {
      let r = 0;
      const dy = (y - b.HC[1]) / b.ry;
      if (Math.abs(dy) < 1) { const c = Math.sqrt(1 - dy * dy), s = Math.sin(ph), co = Math.cos(ph); r = c / Math.sqrt(Math.pow(s / b.rx, 2) + Math.pow(co / (co > 0 ? b.rz : b.rz * 1.08), 2)); }
      if (y < b.chin + 0.01 && y > b.shY - 0.02) r = Math.max(r, 0.06 * b.k);
      if (y < b.shY + 0.03) r = Math.max(r, torsoR(ph, y) + 0.006);
      return r;
    };
  }
  // قماشة من أعلى (top) إلى أسفل (hem) لكل زاوية، phi من الأمام
  function drape(B, env, ph0, ph1, topFn, hemFn, off, nTh, nY, color, uvk) {
    const rows = [];
    for (let i = 0; i <= nY; i++) {
      const row = [];
      for (let j = 0; j <= nTh; j++) {
        const ph = lerp(ph0, ph1, j / nTh), top = topFn(ph), hem = hemFn(ph), y = lerp(top, hem, Math.pow(i / nY, 0.85));
        const r = env(ph, y) + (typeof off === 'function' ? off(ph, y) : off);
        row.push([Math.sin(ph) * r, y, Math.cos(ph) * r]);
      }
      rows.push(row);
    }
    grid(B, rows, color, (u, v) => [u * (uvk || 5), v * 2]);
    return rows;
  }
  const tbl = (T, x) => { x = Math.abs(x); for (let i = 0; i < T.length - 1; i++) if (x <= T[i + 1][0]) { const t = (x - T[i][0]) / (T[i + 1][0] - T[i][0]); return lerp(T[i][1], T[i + 1][1], 0.5 * t + 0.5 * smooth(0, 1, t)); } return T[T.length - 1][1]; };

  // ---------- اللبس الطويل (ثوب، عباية، جلابية) ----------
  // جدول [y نسبي، نصف عرض، عمق أمامي، عمق خلفي، أس] ثم يُحوّل لمقاس الشخص
  function longGarment(b, kind) {
    const k = b.W, Y = r => r; // anchors بالكسر بين الكاحل والكتف
    const hem = kind === 'abaya' ? 0.015 : kind === 'badawi' ? 0.022 : kind === 'dress' ? 0.06 * b.k : 0.055 * b.k;
    const fl = kind === 'abaya' ? 1.28 : kind === 'badawi' ? 1.34 : kind === 'dress' ? 1.15 : 1;
    const rows = [
      [hem, 0.215 * fl, 0.165 * fl, 0.17 * fl, 2.0],
      [lerp(hem, b.hipY, 0.25), 0.205 * (1 + (fl - 1) * 0.7), 0.152 * (1 + (fl - 1) * 0.7), 0.158 * (1 + (fl - 1) * 0.7), 2.0],
      [lerp(hem, b.hipY, 0.6), 0.195 * (1 + (fl - 1) * 0.4), 0.138 * (1 + (fl - 1) * 0.4), 0.146 * (1 + (fl - 1) * 0.4), 2.0],
      [b.hipY, 0.182 * (b.female ? 1.05 : 1) * (kind === 'abaya' ? 1.06 : 1), 0.118, 0.13, 2.1],
      [lerp(b.hipY, b.shY, 0.3), (b.female && kind !== 'abaya' ? 0.15 : 0.172) * (kind === 'abaya' ? 1.08 : 1), 0.12, 0.12, 2.15],
      [lerp(b.hipY, b.shY, 0.62), 0.186 * (kind === 'abaya' ? 1.05 : 1), 0.128 * (b.female ? 1.04 : 1), 0.118, 2.3],
      [b.shY - 0.06 * b.k, 0.2 * (b.female ? 0.92 : 1), 0.115, 0.105, 2.5],
      [b.shY, 0.198 * (b.female ? 0.9 : 1), 0.098, 0.094, 2.6],
      [b.shY + 0.035 * b.k, 0.16 * (b.female ? 0.9 : 1), 0.082, 0.08, 2.4],
      [b.shY + 0.06 * b.k, 0.1, 0.066, 0.066, 2.2],
      [b.neckTop - 0.035 * b.hk, 0.062, 0.058, 0.056, 2.0]
    ].map(r => [r[0], r[1] * k, r[2] * k, r[3] * k, r[4]]);
    const prof = y => {
      if (y <= rows[0][0]) return rows[0].slice(1);
      for (let i = 0; i < rows.length - 1; i++) if (y <= rows[i + 1][0]) { const t = smooth(rows[i][0], rows[i + 1][0], y); return rows[i].slice(1).map((v, j) => lerp(v, rows[i + 1][j + 1], t)); }
      return rows[rows.length - 1].slice(1);
    };
    const se = (th, a, bf, bb, n) => { const s = Math.sin(th), c = Math.cos(th); return [a * Math.sign(s) * Math.pow(Math.abs(s), 2 / n), (c > 0 ? bf : bb) * Math.sign(c) * Math.pow(Math.abs(c), 2 / n)]; };
    const point = (th, y, folds) => {
      const [a, bf, bb, n] = prof(y), [x, z] = se(th, a, bf, bb, n);
      let p = [x, y, z];
      if (folds) {
        const out = V.norm([x, 0, z]), low = smooth(b.hipY * 0.95, rows[0][0], y);
        p = V.madd(p, out, (0.006 * Math.sin(7 * th + 0.6) + 0.004 * Math.sin(11 * th + 2.1) + 0.0025 * Math.sin(17 * th)) * low * b.k * fl);
        p[1] += 0.005 * Math.sin(3 * th + 0.4) * smooth(rows[0][0] + 0.15, rows[0][0], y);
      }
      return p;
    };
    const R = (th, y) => { const [a, bf, bb, n] = prof(y), [x, z] = se(th, a, bf, bb, n); return Math.hypot(x, z); };
    return { rows, point, R, top: rows[rows.length - 1][0], hem: rows[0][0] };
  }
  function longSkin(b, sk) {
    return pt => {
      const y = pt[1];
      if (y > b.hipY + 0.05 * b.k) return AA.autoSkin(sk, ['hips', 'spine', 'chest', 'neck', 'clavL', 'clavR'], 4)(pt);
      const side = clamp(pt[0] / (0.12 * b.k), -1, 1), wl = smooth(-0.6, 0.6, side), lo = smooth(b.hipY + 0.05 * b.k, b.knee - 0.05, y);
      const leg = y > b.knee ? 'thigh' : 'shin';
      return [[sk.id('hips'), 1 - lo * 0.85], [sk.id(leg + 'L'), lo * 0.85 * wl], [sk.id(leg + 'R'), lo * 0.85 * (1 - wl)]];
    };
  }
  function buildLong(P, B, b, sk, q, G, color, colorFn) {
    B.skinFn = longSkin(b, sk);
    const ys = []; for (let i = 0; i <= q.ny; i++) ys.push(lerp(G.hem, G.top, Math.pow(i / q.ny, 0.92)));
    const rows = ys.slice().reverse().map(y => { const r = []; for (let j = 0; j <= q.nu; j++) r.push(G.point(j / q.nu * Math.PI * 2, y, true)); return r; });
    grid(B, rows, (v, u, p) => colorFn ? colorFn(p, u) : color, (u, v) => [u * 3.4, v * 4.6]);
  }

  // ---------- الأكمام واليدان والقدمان ----------
  function arms(P, B, b, sk, q, rng, skinC, sleeve) {
    for (const [sd, x] of [['L', 1], ['R', -1]]) {
      B.skinFn = AA.autoSkin(sk, ['clav' + sd, 'upArm' + sd, 'loArm' + sd, 'hand' + sd, 'chest'], 6);
      const cuffY = b.wrist + 0.045 * b.k;
      const path = AA.bezier([[b.shX * 0.86 * x, b.shY, -0.01], [(b.shX + 0.04 * b.k) * x, b.elbow, -0.005], [(b.shX + 0.058 * b.k) * x, cuffY, 0.025 * b.k]], q.s + 2);
      AA.loft(B, { path, sides: q.s, up: () => [0, 0, 1], uvU: 1, uvV: 2,
        radius: t => { const r = lerp(sleeve.r0, sleeve.r1, t) * b.W + 0.003 * Math.sin(t * 18); return [r, r * 0.92]; }, color: () => sleeve.color });
      if (sleeve.cuff) { // حاشية الكم
        P.trim.skinFn = B.skinFn;
        const ring = []; for (let k = 0; k <= 14; k++) { const a = k / 14 * Math.PI * 2, r = sleeve.r1 * b.W * 1.03, c = path[path.length - 1]; ring.push([c[0] + Math.sin(a) * r, c[1] + 0.012, c[2] + Math.cos(a) * r * 0.92]); }
        AA.tube(P.trim, ring, ring.map(() => 0.006 * b.k), 4, () => [1, 1, 1], () => 0, 0, null, false);
      }
      // اليد
      const G = sleeve.gloves;
      const HB = G ? P.glove : P.skin;
      HB.skinFn = AA.autoSkin(sk, ['loArm' + sd, 'hand' + sd], 8);
      const w0 = [(b.shX + 0.058 * b.k) * x, cuffY + 0.02 * b.k, 0.026 * b.k];
      const hp = AA.bezier([w0, V.add(w0, [0.008 * x * b.k, -0.07 * b.k, 0.012 * b.k]), V.add(w0, [0.006 * x * b.k, -0.13 * b.k, 0.022 * b.k]), V.add(w0, [0, -0.16 * b.k, 0.035 * b.k])], 7);
      AA.loft(HB, { path: hp, sides: Math.max(6, q.s - 2), up: () => [x, 0, 0], capEnd: true, capStart: true,
        radius: t => [lerp(0.022, 0.014, t) * b.k * (G ? 1.15 : 1), lerp(0.04, 0.032, smooth(0, 0.7, t)) * b.k * (t > 0.85 ? 0.8 : 1) * (G ? 1.1 : 1)], color: () => G ? G : vary(skinC, rng, 0.03) });
      AA.loft(HB, { path: AA.bezier([V.add(w0, [-0.004 * x * b.k, -0.04 * b.k, 0.03 * b.k]), V.add(w0, [-0.006 * x * b.k, -0.07 * b.k, 0.048 * b.k]), V.add(w0, [-0.004 * x * b.k, -0.09 * b.k, 0.05 * b.k])], 4), sides: 6, capEnd: true, radius: () => 0.01 * b.k * (G ? 1.2 : 1), color: () => G ? G : skinC });
    }
  }
  function feet(P, b, sk, rng, skinC, shoe) {
    for (const [sd, x] of [['L', 1], ['R', -1]]) {
      const fx = b.hipX * 1.1 * x, k = b.k;
      if (shoe.kind !== 'boot') {
        P.skin.setSkin([[sk.id('foot' + sd), 1]]);
        AA.loft(P.skin, { path: [[fx, b.ankle, -0.03 * k], [fx, 0.05 * k, 0.04 * k], [fx * 1.03, 0.035 * k, 0.11 * k], [fx * 1.05, 0.028 * k, 0.15 * k]], sides: 8, capStart: true, capEnd: true,
          radius: t => [lerp(0.036, 0.043, t) * k, lerp(0.04, 0.017, t) * k], color: () => vary(skinC, rng, 0.03) });
      }
      const S = P.shoe; S.setSkin([[sk.id('foot' + sd), 1]]);
      if (shoe.kind === 'sandal') {
        AA.box(S, [fx, 0.007, 0.05 * k], [0.1 * k, 0.014, 0.27 * k], shoe.color, 1, {});
        AA.box(S, [fx, 0.045 * k, 0.085 * k], [0.092 * k, 0.02 * k, 0.04 * k], shoe.color, 1, {});
      } else if (shoe.kind === 'shoe') {
        AA.loft(S, { path: [[fx, 0.06 * k, -0.05 * k], [fx, 0.045 * k, 0.04 * k], [fx * 1.03, 0.035 * k, 0.12 * k], [fx * 1.05, 0.03 * k, 0.17 * k]], sides: 10, capStart: true, capEnd: true,
          radius: t => [lerp(0.045, 0.05, t) * k, lerp(0.05, 0.026, t) * k], color: () => shoe.color });
      } else { // بوت عمل
        AA.loft(S, { path: [[fx, 0.2 * k, -0.01 * k], [fx, 0.09 * k, -0.02 * k], [fx, 0.05 * k, 0.05 * k], [fx * 1.03, 0.045 * k, 0.13 * k], [fx * 1.05, 0.04 * k, 0.18 * k]], sides: 10, capStart: true, capEnd: true,
          radius: t => [lerp(0.06, 0.056, t) * k, lerp(0.062, 0.036, smooth(0.3, 1, t)) * k], color: (t) => t > 0.9 ? mixc(shoe.color, [0, 0, 0], 0.3) : shoe.color });
        AA.box(S, [fx, 0.012, 0.07 * k], [0.12 * k, 0.024, 0.28 * k], [0.12, 0.1, 0.09], 1, {});
      }
    }
  }

  // ---------- الحركة ----------
  function clips(sk, spec, p) {
    const c = {}, kid = spec.kid;
    c.idle = AA.clip(sk, 4.4, 30, true, t => {
      const w = t / 4.4 * Math.PI * 2, br = Math.sin(w * 1.5);
      return { chest: [1.2 * br, 0, 0], neck: [0, 4 * Math.sin(w), 0], head: [2 * Math.sin(w * 0.5), 12 * Math.sin(w), kid ? 4 * Math.sin(w * 2) : 0],
        upArmL: [3 + 1.5 * br, 0, 5], upArmR: [3 + 1.5 * br, 0, -5], loArmL: [-10, 0, 0], loArmR: [-10, 0, 0], hips: [0, 0, kid ? 2 * Math.sin(w * 2) : 0], move: [0, 0.003 * br, 0] };
    });
    const dur = spec.walkDur || 1.1, stride = spec.stride || 1, step = spec.female ? 0.85 : 1;
    c.walk = AA.gaitClip(sk, { duration: dur, speed: (spec.walkSpeed || 1.1) * spec.height / 1.7, extra: t => {
      const ph = t / dur * Math.PI * 2, s = Math.sin(ph), pose = { spine: [3, 0, 0], neck: [-3, 0, 0] };
      pose.hips = [0, 6 * s * step, 0]; pose.chest = [0, -5 * s, 0];
      pose.upArmL = [24 * s * stride * (spec.female ? 0.6 : 1), 0, 6]; pose.upArmR = [-24 * s * stride * (spec.female ? 0.6 : 1), 0, -6];
      pose.loArmL = [-14 - 10 * Math.max(0, s), 0, 0]; pose.loArmR = [-14 - 10 * Math.max(0, -s), 0, 0];
      pose.move = [0, 0.012 * Math.cos(ph * 2) * spec.height / 1.7, 0];
      return pose;
    }, legs: [['L', 0.25], ['R', 0.75]].map(([sd, ph]) => ({ chain: ['thigh' + sd, 'shin' + sd], foot: 'foot' + sd, phase: ph, duty: 0.62, lift: Math.max(0.06, 0.09 * spec.height / 1.7), limits: [[-60, 35], [0, 110]], init: [-5, 10], footSwing: 12 })) });
    if (spec.wave) c.wave = AA.clip(sk, 1.6, 30, true, t => {
      const w = t / 1.6 * Math.PI * 2;
      return { upArmR: [-15, 0, -128], loArmR: [-20, 0, -30 + 26 * Math.sin(w * 2)], handR: [0, 0, 10 * Math.sin(w * 2)], upArmL: [4, 0, 6], loArmL: [-10, 0, 0], head: [0, -8, 4], chest: [0, -4, 2] };
    });
    if (spec.work) c.work = AA.clip(sk, 1.1, 30, true, t => {
      const w = t / 1.1 * Math.PI * 2, hit = 0.5 - 0.5 * Math.cos(w), hard = Math.pow(hit, 2);
      return { spine: [12, 0, 0], chest: [10, -10, 0], neck: [10, 0, 0], head: [8, 0, 0],
        upArmR: [-100 + 70 * hard, 0, -10], loArmR: [-60 + 40 * hit, 0, 0], handR: [-20 + 30 * hard, 0, 0],
        upArmL: [-45, 0, 12], loArmL: [-55, 0, 0], thighL: [-12, 0, 0], shinL: [16, 0, 0], footL: [-4, 0, 0], thighR: [8, 0, 0], shinR: [10, 0, 0], footR: [-18, 0, 0], move: [0, -0.012, 0] };
    });
    // جلوس على مقعد بارتفاع الركبة، وجلوس متربّع على الأرض (ينزل الجسم بمقدار طول الساق)
        c.sit = AA.clip(sk, 5, 30, true, t => {
      const w = t / 5 * Math.PI * 2, br = Math.sin(w * 1.5);
      return { thighL: [-86, 0, 4], thighR: [-86, 0, -4], shinL: [84, 0, 0], shinR: [84, 0, 0], spine: [4, 0, 0], chest: [1.2 * br, 0, 0], head: [0, 14 * Math.sin(w), 0],
        upArmL: [-20, 0, 10], loArmL: [-52, 0, 0], upArmR: [-20, 0, -10], loArmR: [-52, 0, 0], move: [0, -spec.sitDrop + 0.003 * br, -0.02] };
    });
    c.sit_floor = AA.clip(sk, 5, 30, true, t => {
      const w = t / 5 * Math.PI * 2, br = Math.sin(w * 1.5);
      return { thighL: [-95, -15, 50], thighR: [-95, 15, -50], shinL: [178, 0, -30], shinR: [178, 0, 30], footL: [-30, 0, 0], footR: [-30, 0, 0], spine: [5, 0, 0], chest: [1.2 * br, 0, 0], head: [-4, 12 * Math.sin(w), 0],
        upArmL: [-18, 0, 18], loArmL: [-50, 0, 0], upArmR: [-18, 0, -18], loArmR: [-50, 0, 0], move: [0, -spec.floorDrop + 0.003 * br, -0.05 * spec.height / 1.7] };
    });
    return c;
  }

  // ---------- المولّد ----------
  function person(spec, p, quality) {
    const q = Q[quality] || Q.med, rng = AA.rng(p.seed), b = body(spec), sk = skeleton(b);
    spec.sitDrop = b.hipY - b.knee - 0.01 * b.k; spec.floorDrop = b.hipY - 0.17 * b.k;
    p.__q = q;
    const P = { cloth: new AA.Builder(), cover: new AA.Builder(), skin: new AA.Builder(), hair: new AA.Builder(), eye: new AA.Builder(), dark: new AA.Builder(), lip: new AA.Builder(),
      trim: new AA.Builder(), shoe: new AA.Builder(), glove: new AA.Builder(), plastic: new AA.Builder(), vest: new AA.Builder(), wood: new AA.Builder() };
    const skinC = hex(SKIN[p.skin] || SKIN.mid), hairC = hex(HAIR[p.hairColor] || HAIR.black);
    let torsoR;
    const out = spec.outfit;
    // الجسم واللبس
    if (out.long) {
      const G = longGarment(b, out.long);
      torsoR = G.R;
      buildLong(P, P.cloth, b, sk, q, G, out.color, out.colorFn);
      // الياقة
      P.cloth.setSkin([[sk.id('neck'), 0.6], [sk.id('chest'), 0.4]]);
      if (!out.noCollar) {
        const y0 = G.top, col = [[y0, 0.062], [y0 + 0.018 * b.hk, 0.061], [y0 + 0.032 * b.hk, 0.059]].map(([y, r]) => { const row = []; for (let j = 0; j <= 20; j++) { const a = j / 20 * Math.PI * 2; row.push([r * b.W * Math.sin(a), y, r * b.W * 0.96 * Math.cos(a) + 0.004]); } return row; });
        grid(P.cloth, col.reverse(), () => mixc(out.color, [1, 1, 1], 0.03), (u, v) => [u * 2, v * 0.3]);
      }
      if (out.buttons) { P.dark.setSkin([[sk.id('chest'), 1]]); for (const f of [0.035, 0.09]) { const c = G.point(0, b.shY + 0.03 * b.k - f * b.k, false); AA.blob(P.dark, V.add(c, [0, 0, 0.004]), [0.006, 0, 0], [0, 0.006, 0], [0, 0, 0.003], () => [0.75, 0.68, 0.55], 0, 0, 0, null, 0, true); } }
      if (out.embroidery) { // تطريز الصدر والذيل (جلابية)
        P.trim.skinFn = AA.autoSkin(sk, ['spine', 'chest', 'neck'], 4);
        const ys = []; for (let i = 0; i <= 10; i++) ys.push(lerp(b.shY + 0.04 * b.k, lerp(b.hipY, b.shY, 0.45), i / 10));
        for (const sg of [1, -1]) AA.tube(P.trim, ys.map(y => { const th = sg * lerp(0.07, 0.3, (y - ys[10]) / (ys[0] - ys[10])), q0 = G.point(th, y, false); return V.madd(q0, V.norm([q0[0], 0, q0[2]]), 0.003); }), ys.map(() => 0.0045 * b.k), 4, () => [1, 1, 1], () => 0, 0, null, false);
        const ring = []; for (let j = 0; j <= 28; j++) ring.push(V.madd(G.point(j / 28 * Math.PI * 2, G.hem + 0.06 * b.k, false), V.norm([Math.sin(j / 28 * Math.PI * 2), 0, Math.cos(j / 28 * Math.PI * 2)]), 0.006));
        P.trim.skinFn = longSkin(b, sk); // حاشية الذيل تتبع الثوب لا الورك
        AA.tube(P.trim, ring, ring.map(() => 0.008 * b.k), 4, () => [1, 1, 1], () => 0, 0, null, false);
      }
      if (out.piping) { // ثوب البدوية: قيطان ذهبي نازل بالمايل من تحت الشيلة على الصدر إلى الخصر
        P.trim.skinFn = AA.autoSkin(sk, ['spine', 'chest', 'neck'], 4);
        const lift = (th, y) => { const q0 = G.point(th, y, false); return V.madd(q0, V.norm([q0[0], 0, q0[2]]), 0.0035); };
        const yE = lerp(b.hipY, b.shY, 0.32), y0 = b.shY - 0.07 * b.k, diag = [];
        for (let i = 0; i <= 14; i++) { const t = i / 14, y = lerp(y0, yE, t); diag.push(lift(0.05 + 0.85 * Math.pow(t, 0.8), y)); }
        AA.tube(P.trim, diag, diag.map(() => 0.0035 * b.k), 4, () => [1, 1, 1], () => 0, 0, null, false);
      }
    } else { // أفرول: جذع + بنطلون
      const k = b.W, col = out.color;
      const tw = t => ra([[0, 0.17], [0.25, 0.16], [0.6, 0.185], [0.86, 0.2], [0.93, 0.16], [1, 0.07]], t) * k, td = t => ra([[0, 0.12], [0.3, 0.115], [0.6, 0.125], [0.86, 0.11], [1, 0.065]], t) * k;
      const y0 = b.hipY - 0.07 * b.k, y1 = b.neckTop - 0.03 * b.hk;
      torsoR = (ph, y) => { const t = clamp((y - y0) / (y1 - y0), 0, 1); const s = Math.sin(ph), c = Math.cos(ph); return 1 / Math.sqrt(Math.pow(s / tw(t), 2) + Math.pow(c / td(t), 2)); };
      P.cloth.skinFn = AA.autoSkin(sk, ['hips', 'spine', 'chest', 'neck', 'clavL', 'clavR', 'thighL', 'thighR'], 4);
      const path = []; for (let i = 0; i <= q.ny; i++) path.push([0, lerp(y0, y1, i / q.ny), 0]);
      AA.loft(P.cloth, { path, sides: q.nu, up: () => [0, 0, 1], capStart: true, uvU: 3, uvV: 3, radius: t => [tw(t), td(t)], color: () => col });
      for (const [sd, x] of [['L', 1], ['R', -1]]) {
        P.cloth.skinFn = AA.autoSkin(sk, ['hips', 'thigh' + sd, 'shin' + sd], 7);
        const lp = AA.bezier([[b.hipX * 0.95 * x, b.hipY + 0.02, 0], [b.hipX * 1.08 * x, b.knee, 0.012], [b.hipX * 1.1 * x, b.ankle + 0.06 * b.k, -0.01]], q.s + 3);
        AA.loft(P.cloth, { path: lp, sides: q.s, up: () => [0, 0, 1], uvU: 1, uvV: 2, radius: t => { const r = lerp(0.098, 0.064, smooth(0, 1, t)) * k; return [r, r]; }, color: () => col });
      }
      if (out.vest) { // سترة عاكسة
        P.vest.skinFn = AA.autoSkin(sk, ['spine', 'chest', 'neck', 'clavL', 'clavR'], 4);
        const vp = []; for (let i = 0; i <= 8; i++) vp.push([0, lerp(b.hipY + 0.06 * b.k, b.shY + 0.02 * b.k, i / 8), 0]);
        AA.loft(P.vest, { path: vp, sides: q.nu, up: () => [0, 0, 1], uvU: 2, uvV: 2, radius: (t, ang) => { const y = vp[0][1] + t * (vp[8][1] - vp[0][1]), r = torsoR(ang, y) + 0.01 * b.k; return [r, r]; },
          color: (t) => (Math.abs(t - 0.25) < 0.05 || Math.abs(t - 0.55) < 0.05) ? [0.82, 0.84, 0.86] : [0.95, 0.85, 0.1] });
      }
    }
    // الأكمام واليدان
    arms(P, P.cloth, b, sk, q, rng, skinC, out.sleeve);
    feet(P, b, sk, rng, skinC, out.shoe);
    // الرقبة (تظهر عند الولد والعامل)
    P.skin.setSkin([[sk.id('neck'), 0.7], [sk.id('head'), 0.3]]);
    AA.loft(P.skin, { path: [[0, b.shY + 0.02 * b.k, -0.008], [0, b.chin + 0.02 * b.hk, 0.0]], sides: 10, radius: () => 0.047 * b.hk, color: () => skinC });
    // الرأس
    p.__covered = !!spec.head.hijab;
    face(P, b, sk, p, rng, skinC, hairC);
    const hd = spec.head, env = envelope(b, torsoR);
    const SH = (rel) => b.HC[1] + rel * b.hk; // ارتفاع نسبي من مركز الرأس
    if (hd.hair === 'short') cap(P.hair, b, sk, 0.004 * b.hk, ph => { const c = Math.cos(ph); return lerp(1.95, 1.05, smooth(-0.4, 0.8, c)) + 0.25 * (1 - Math.abs(c)); }, hairC, q.hu, Math.round(q.hv * 0.7), 0.25);
    if (hd.hair === 'long') {
      cap(P.hair, b, sk, 0.006 * b.hk, ph => { const c = Math.cos(ph); return lerp(2.3, 0.95, smooth(-0.6, 0.85, c)); }, hairC, q.hu, Math.round(q.hv * 0.8), 0.35);
      // ضفيرتان خلف الأذنين تنزلان على الكتفين
      P.hair.skinFn = AA.autoSkin(sk, ['head', 'neck', 'chest'], 5);
      for (const x of [1, -1]) {
        const a0 = V.add(b.HC, [x * b.rx * 0.85, -0.04 * b.hk, -0.04 * b.hk]);
        const pts = AA.bezier([a0, V.add(a0, [x * 0.03 * b.k, -0.12 * b.k, 0.0]), V.add(a0, [x * 0.04 * b.k, -0.26 * b.k, 0.05 * b.k]), V.add(a0, [x * 0.035 * b.k, -0.36 * b.k, 0.075 * b.k])], 14);
        AA.loft(P.hair, { path: pts, sides: 7, capEnd: true, radius: t => 0.02 * b.k * (0.75 + 0.25 * Math.abs(Math.sin(t * Math.PI * 9))) * (1 - 0.35 * t), color: () => hairC });
        P.trim.setSkin([[sk.id('chest'), 1]]);
        const end = pts[pts.length - 2];
        AA.blob(P.trim, end, [0.016 * b.k, 0, 0], [0, 0.012 * b.k, 0], [0, 0, 0.016 * b.k], () => hd.tie || [0.9, 0.2, 0.4], 0, 0, 0, null, 0, true);
      }
    }
    if (hd.taqiyah) { // طاقية بيضاء مخرّمة
      cap(P.cover, b, sk, 0.012 * b.hk, ph => 0.95 + 0.08 * Math.cos(ph), [0.97, 0.96, 0.93], q.hu, 6, 0);
    }
    if (hd.helmet) { // خوذة عمل + حافة أمامية
      P.plastic.setSkin([[sk.id('head'), 1]]);
      cap(P.plastic, b, sk, 0.03 * b.hk, () => 1.2, hd.helmet, q.hu, 7, 0.15);
      const ring = []; for (let j = 0; j <= 24; j++) { const a = j / 24 * Math.PI * 2, r = 1.18, f = smooth(-0.2, 1, Math.cos(a)); ring.push(V.add(b.HC, [Math.sin(a) * b.rx * (r + 0.32 * f), 0.035 * b.hk - 0.01 * f, Math.cos(a) * b.rz * (r + 0.55 * f)])); }
      AA.tube(P.plastic, ring, ring.map(() => 0.008 * b.hk), 5, () => hd.helmet, () => 0, 0, null, false);
      AA.loft(P.plastic, { path: [V.add(b.HC, [0, b.ry * 1.22, -0.06 * b.hk]), V.add(b.HC, [0, b.ry * 1.22, 0.07 * b.hk])], sides: 6, radius: () => [0.012 * b.hk, 0.014 * b.hk], color: () => mixc(hd.helmet, [0, 0, 0], 0.08) });
    }
    if (hd.ghutra) { // غترة/شماغ بنفس طريقة الشايب
      const EDGE = [[0, -0.43], [30, -0.39], [62, -0.32], [88, -0.29], [104, -0.36], [114, -0.5], [122, -0.57], [127, -0.54], [131, -0.21], [134, -0.07], [138, 0.03], [148, 0.08], [166, 0.095], [180, 0.1]];
      const hem = ph => { const degBack = 180 - Math.abs(ph) * 180 / Math.PI, r = tbl(EDGE, degBack); return r > -0.12 ? SH(r) : SH(-0.12) + (r + 0.12) * b.k; };
      P.cover.skinFn = pt => pt[1] > b.chin ? [[sk.id('head'), 1]] : [[sk.id('chest'), smooth(b.chin, b.shY - 0.1, pt[1])], [sk.id('neck'), 1 - smooth(b.chin, b.shY - 0.1, pt[1])]];
      const rows = drape(P.cover, env, -Math.PI * 0.995, Math.PI * 0.995, () => b.HC[1] + b.ry * 1.06, hem, 0.014 * b.hk, q.hu + 8, q.hv + 4, () => [1, 1, 1], 5.5);
      if (hd.agal) {
        P.dark.setSkin([[sk.id('head'), 1]]);
        for (const dy of [-0.011, 0.011]) {
          const ring = []; for (let j = 0; j <= 36; j++) { const a = j / 36 * Math.PI * 2, yy = SH(0.072 + dy + 0.01 * Math.cos(a)) ; ring.push([Math.sin(a) * (env(a, yy) + 0.028 * b.hk), yy, Math.cos(a) * (env(a, yy) + 0.028 * b.hk)]); }
          AA.tube(P.dark, ring, ring.map(() => 0.011 * b.hk), 7, () => [0.11, 0.1, 0.1], () => 0, 0, null, false);
        }
      }
    }
    if (hd.hijab) { // شيلة: غطاء الرأس، ولفة تحت الذقن تنزل على الكتفين
      const off = 0.012 * b.hk;
      P.cover.skinFn = pt => pt[1] > b.chin ? [[sk.id('head'), 1]] : [[sk.id('chest'), smooth(b.chin, b.shY - 0.08, pt[1])], [sk.id('neck'), 1 - smooth(b.chin, b.shY - 0.08, pt[1])]];
      const FACE = [[0, 0.085], [38, 0.08], [55, 0.0], [68, -0.06], [80, -0.09], [95, -0.12]]; // حافة الوجه من الأمام
      const hoodHem = ph => { const deg = Math.abs(ph) * 180 / Math.PI; return deg < 95 ? SH(tbl(FACE, deg)) : lerp(SH(-0.12), b.shY - 0.13 * b.k, smooth(95, 140, deg)); };
      drape(P.cover, env, -Math.PI * 0.995, Math.PI * 0.995, () => b.HC[1] + b.ry * 1.05, hoodHem, off, q.hu + 8, q.hv + 4, () => hd.hijab, 4);
      // لفة الذقن والرقبة
      const wrapTop = ph => { const deg = Math.abs(ph) * 180 / Math.PI; return deg < 75 ? SH(-0.095 + 0.03 * smooth(40, 75, deg)) : SH(-0.06); };
      drape(P.cover, env, -Math.PI * 0.995, Math.PI * 0.995, wrapTop, ph => b.shY - 0.11 * b.k + 0.02 * Math.cos(ph) * b.k, off * 0.8, q.hu + 8, Math.round(q.hv * 0.6), () => hd.hijab, 4);
      if (hd.niqab) { // نقاب: من تحت العينين إلى الصدر من الأمام
        drape(P.cover, env, -1.45, 1.45, ph => SH(-0.008 + 0.01 * (1 - Math.cos(ph))), ph => lerp(b.shY - 0.06 * b.k, SH(-0.1), smooth(0.9, 1.45, Math.abs(ph))), off * 1.35, q.hu, Math.round(q.hv * 0.6), () => hd.hijab, 4);
      }
      if (hd.burqa) { // برقع بدوي: عصابة على الجبهة، وفتحة للعينين يقسمها سيف على الأنف، وغطاء تحت العينين إلى الصدر، وإطار ذهبي حول الفتحة
        const bc = hd.burqa, hk = b.hk, nose = (ph, y) => 0.021 * hk * Math.exp(-Math.pow(ph / 0.24, 2)) * Math.exp(-Math.pow((y - SH(-0.024)) / (0.032 * hk), 2));
        const offB = (ph, y) => 0.008 * hk + 0.01 * hk * smooth(SH(-0.07), SH(-0.11), y) + nose(ph, y);
        const sTop = 0.032, sBot = -0.006, side = 0.62, PH = 1.08; // حدود الفتحة (نسبة من مركز الرأس)
        const slitTop = ph => SH(lerp(sTop, sBot, smooth(side - 0.1, side + 0.06, Math.abs(ph))));
        drape(P.cover, env, -PH, PH, () => SH(0.1), slitTop, offB, q.hu, 5, () => bc, 4); // العصابة
        drape(P.cover, env, -PH, PH, ph => SH(sBot) - 0.0005, ph => lerp(b.shY - 0.07 * b.k, SH(-0.1), smooth(0.8, PH, Math.abs(ph))), offB, q.hu, Math.round(q.hv * 0.6), () => bc, 4); // تحت العينين
        drape(P.cover, env, -0.09, 0.09, () => SH(sTop + 0.002), () => SH(sBot - 0.002), (ph, y) => offB(ph, y) + 0.0006, 2, 4, () => bc, 4); // السيف
        P.trim.setSkin([[sk.id('head'), 1]]);
        const at = (ph, y) => { const r = env(ph, y) + offB(ph, y) + 0.0022; return [Math.sin(ph) * r, y, Math.cos(ph) * r]; }, gold = [];
        for (let j = 0; j <= 30; j++) { const ph = lerp(-side - 0.02, side + 0.02, j / 30); gold.push(at(ph, slitTop(ph))); }
        AA.tube(P.trim, gold, gold.map(() => 0.0024 * b.k), 4, () => [1, 1, 1], () => 0, 0, null, false);
        for (const sg of [1, -1]) { const ln = []; for (let i = 0; i <= 4; i++) ln.push(at(sg * 0.09, lerp(SH(sTop), SH(sBot), i / 4))); AA.tube(P.trim, ln, ln.map(() => 0.002 * b.k), 4, () => [1, 1, 1], () => 0, 0, null, false); }
      }
      if (hd.longShayla) { // شيلة طويلة: تنسدل على الظهر إلى تحت الخصر، وطرف على الكتف الأيمن ينزل على الصدر
        const sc = hd.longShayla, waveH = ph => 0.025 * b.k * Math.sin(ph * 5 + 0.7) + 0.015 * b.k * Math.sin(ph * 9);
        const offS = (ph, y) => 0.019 * b.hk + 0.035 * b.k * smooth(b.shY, b.hipY - 0.1 * b.k, y);
        P.cover.skinFn = AA.autoSkin(sk, ['head', 'neck', 'chest', 'spine'], 4);
        drape(P.cover, env, 2.05, Math.PI * 2 - 2.05, () => b.HC[1] + b.ry * 0.55, ph => b.hipY - 0.01 * b.k - 0.1 * b.k * (1 - smooth(0, Math.PI - 2.05, Math.abs(ph - Math.PI))) + waveH(ph), offS, q.hu, q.hv + 4, () => sc, 4);
        drape(P.cover, env, -1.0, -0.42, () => b.chin - 0.02 * b.k, ph => lerp(b.hipY, b.shY, 0.18) + waveH(ph) * 0.6, (ph, y) => 0.021 * b.hk + 0.006 * b.k * smooth(b.shY, b.hipY, y), 6, q.hv, () => sc, 3);
      }
    }
    // أداة العامل: مطرقة في اليد اليمنى
    if (spec.tool && p.tool) {
      P.wood.setSkin([[sk.id('handR'), 1]]);
      const g0 = [-(b.shX + 0.06 * b.k), b.wrist - 0.075 * b.k, 0.075 * b.k];
      AA.tube(P.wood, [V.add(g0, [0, 0, -0.06]), V.add(g0, [0, 0, 0.26])], [0.014, 0.012], 6, () => [0.85, 0.85, 0.85], () => 0, 0, null, true);
      P.plastic.setSkin([[sk.id('handR'), 1]]);
      AA.box(P.plastic, V.add(g0, [0, 0, 0.27]), [0.035, 0.11, 0.04], [0.25, 0.25, 0.27], 0.2, {});
    }

    const mats = {
      cloth:   { builder: P.cloth,   material: { kind: 'cloth', texture: out.texture || 'cloth', roughness: 0.88 } },
      cover:   { builder: P.cover,   material: { kind: 'cloth', texture: hd.ghutra === 'red' ? 'shemagh' : 'cloth', roughness: 0.86, doubleSided: true } },
      skin:    { builder: P.skin,    material: { kind: 'skin', roughness: 0.6 } },
      hair:    { builder: P.hair,    material: { kind: 'hair', texture: 'fur', roughness: 0.75 } },
      eye:     { builder: P.eye,     material: { kind: 'eye', roughness: 0.25 } },
      dark:    { builder: P.dark,    material: { kind: 'dark', roughness: 0.6 } },
      lip:     { builder: P.lip,     material: { kind: 'skin', roughness: 0.5 } },
      trim:    { builder: P.trim,    material: { kind: 'metal', roughness: 0.35, color: [0.68, 0.45, 0.1] } },
      shoe:    { builder: P.shoe,    material: { kind: 'leather', roughness: 0.65 } },
      glove:   { builder: P.glove,   material: { kind: 'cloth', roughness: 0.9 } },
      plastic: { builder: P.plastic, material: { kind: 'plastic', roughness: 0.4 } },
      vest:    { builder: P.vest,    material: { kind: 'cloth', roughness: 0.6, doubleSided: true } },
      wood:    { builder: P.wood,    material: { kind: 'wood', texture: 'wood', roughness: 0.7 } }
    };
    if (out.trimColor) mats.trim.material.color = out.trimColor;
    return AA.finalize(spec.id, mats, { stiffness: 0, height: b.H, radius: 0.3 * b.k, collider: { type: 'capsule', radius: 0.22 * b.k, height: b.H, axis: 'y' },
      skeleton: sk.toJSON(), clips: clips(sk, spec, p), walkSpeed: (spec.walkSpeed || 1.1) * b.k });
  }
  const ra = (rs, t) => { for (let i = 0; i < rs.length - 1; i++) if (t <= rs[i + 1][0]) return lerp(rs[i][1], rs[i + 1][1], smooth(rs[i][0], rs[i + 1][0], t)); return rs[rs.length - 1][1]; };

  // ---------- الشخصيات ----------
  const skinOpt = { key: 'skin', label: 'لون البشرة', type: 'enum', options: [['mid', 'حنطي'], ['light', 'فاتح'], ['tan', 'أسمر'], ['dark', 'داكن']], def: 'mid' };
  const A = AA.assets;
  const COLORS = { pink: '#d9668f', teal: '#2f8f8a', red: '#b8312f', purple: '#7b4a9e', green: '#4f8a3a' };

  A.woman = { id: 'woman', name: 'امرأة', nameEn: 'Woman', category: 'characters',
    schema: [
      { key: 'height', label: 'الطول', min: 1.5, max: 1.75, step: 0.01, def: 1.62, unit: 'م' },
      { key: 'veil', label: 'الوجه', type: 'enum', options: [['open', 'مكشوف'], ['niqab', 'نقاب']], def: 'open' },
      { key: 'trim', label: 'تطريز الأكمام', type: 'bool', def: true }, skinOpt
    ],
    presets: { 'بنقاب': { veil: 'niqab' }, 'عباية سادة': { trim: false } },
    clips: [['idle', 'وقوف'], ['walk', 'مشي'], ['sit', 'جالسة'], ['sit_floor', 'متربّعة']],
    generate: (p, q) => person({ id: 'woman', height: p.height, female: true, legs: 0.54, walkSpeed: 1.0,
      outfit: { long: 'abaya', color: [0.07, 0.065, 0.07], noCollar: true, sleeve: { r0: 0.07, r1: 0.1, color: [0.07, 0.065, 0.07], cuff: p.trim }, shoe: { kind: 'shoe', color: [0.1, 0.08, 0.08] }, trimColor: [0.55, 0.42, 0.2] },
      head: { hijab: [0.06, 0.055, 0.06], niqab: p.veil === 'niqab' } }, Object.assign({ lips: [0.6, 0.33, 0.3] }, p), q) };

  // بدوية: ثوب واسع طويل بورد صغير وقيطان ذهبي، وشيلة سوداء طويلة، وبرقع بإطار ذهبي
  A.badawiya = { id: 'badawiya', name: 'بدوية', nameEn: 'Bedouin woman', category: 'characters',
    schema: [
      { key: 'height', label: 'الطول', min: 1.5, max: 1.75, step: 0.01, def: 1.63, unit: 'م' },
      { key: 'dress', label: 'الثوب', type: 'enum', options: [['floral', 'أحمر بورد'], ['red', 'أحمر سادة'], ['black', 'أسود']], def: 'floral' },
      { key: 'burqa', label: 'برقع', type: 'bool', def: true },
      { key: 'gold', label: 'قيطان ذهبي', type: 'bool', def: true },
      { key: 'long', label: 'شيلة طويلة', type: 'bool', def: true }, skinOpt
    ],
    presets: { 'بدون برقع': { burqa: false }, 'ثوب أحمر سادة': { dress: 'red' }, 'ثوب أسود': { dress: 'black', gold: false } },
    clips: [['idle', 'وقوف'], ['walk', 'مشي'], ['sit', 'جالسة'], ['sit_floor', 'متربّعة']],
    generate: (p, q) => { const fl = p.dress === 'floral', col = fl ? [1, 1, 1] : p.dress === 'black' ? [0.08, 0.07, 0.075] : hex('#a8232b'), blk = [0.055, 0.05, 0.055];
      return person({ id: 'badawiya', height: p.height, female: true, legs: 0.54, walkSpeed: 0.95,
        outfit: { long: 'badawi', color: col, texture: fl ? 'floral_red' : null, noCollar: true, piping: p.gold, sleeve: { r0: 0.072, r1: 0.084, color: col, cuff: p.gold }, shoe: { kind: 'shoe', color: [0.12, 0.08, 0.07] }, trimColor: [0.8, 0.6, 0.22] },
        head: { hijab: blk, burqa: p.burqa ? [0.035, 0.032, 0.035] : null, longShayla: p.long ? blk : null } }, Object.assign({ lips: [0.6, 0.33, 0.3] }, p), q); } };

  A.child = { id: 'child', name: 'طفل', nameEn: 'Toddler', category: 'characters',
    schema: [
      { key: 'height', label: 'الطول', min: 0.75, max: 1.05, step: 0.01, def: 0.92, unit: 'م' },
      { key: 'outfit', label: 'اللبس', type: 'enum', options: [['thobe', 'ثوب'], ['color', 'ثوب ملوّن']], def: 'thobe' },
      { key: 'taqiyah', label: 'طاقية', type: 'bool', def: false }, skinOpt
    ],
    presets: { 'بطاقية': { taqiyah: true }, 'ثوب أزرق': { outfit: 'color' } },
    clips: [['idle', 'وقوف'], ['walk', 'مشي'], ['wave', 'يلوّح'], ['sit', 'جالس'], ['sit_floor', 'متربّع']],
    generate: (p, q) => { const col = p.outfit === 'color' ? hex('#7fb2d9') : [0.97, 0.97, 0.96];
      return person({ id: 'child', height: p.height, kid: true, headPow: 0.25, legs: 0.4, width: 1.18, walkDur: 0.62, stride: 0.9, wave: true, walkSpeed: 0.85,
        outfit: { long: 'thobe', color: col, buttons: true, sleeve: { r0: 0.072, r1: 0.06, color: col }, shoe: { kind: 'sandal', color: [0.5, 0.3, 0.16] } },
        head: { hair: 'short', taqiyah: p.taqiyah } }, Object.assign({ hairColor: 'dark', lips: [0.75, 0.42, 0.38] }, p), q); } };

  A.worker = { id: 'worker', name: 'عامل', nameEn: 'Worker', category: 'characters',
    schema: [
      { key: 'height', label: 'الطول', min: 1.6, max: 1.85, step: 0.01, def: 1.72, unit: 'م' },
      { key: 'suit', label: 'لون الأفرول', type: 'enum', options: [['blue', 'أزرق'], ['orange', 'برتقالي'], ['khaki', 'خاكي']], def: 'blue' },
      { key: 'helmet', label: 'الخوذة', type: 'enum', options: [['yellow', 'صفراء'], ['white', 'بيضاء'], ['none', 'بدون']], def: 'yellow' },
      { key: 'vest', label: 'سترة عاكسة', type: 'bool', def: true },
      { key: 'gloves', label: 'قفازات', type: 'bool', def: true },
      { key: 'tool', label: 'مطرقة', type: 'bool', def: true },
      { key: 'mustache', label: 'شارب', type: 'bool', def: true }, skinOpt
    ],
    presets: { 'عامل بناء': { suit: 'khaki', helmet: 'white' }, 'عامل صيانة': { suit: 'orange', vest: false, tool: false } },
    clips: [['idle', 'وقوف'], ['walk', 'مشي'], ['work', 'يشتغل'], ['sit', 'جالس'], ['sit_floor', 'متربّع']],
    generate: (p, q) => { const col = hex({ blue: '#2f4f7d', orange: '#d0662a', khaki: '#8f7f5c' }[p.suit] || '#2f4f7d');
      return person({ id: 'worker', height: p.height, legs: 0.52, width: 1.05, work: true, tool: true,
        outfit: { color: col, vest: p.vest, sleeve: { r0: 0.066, r1: 0.054, color: col, gloves: p.gloves ? [0.85, 0.78, 0.55] : null }, shoe: { kind: 'boot', color: [0.34, 0.24, 0.15] } },
        head: { hair: p.helmet === 'none' ? 'short' : 'short', helmet: p.helmet === 'none' ? null : (p.helmet === 'white' ? [0.93, 0.93, 0.9] : [0.95, 0.75, 0.08]) } }, Object.assign({ hairColor: 'black' }, p), q); } };

  A.girl = { id: 'girl', name: 'بنت', nameEn: 'Girl', category: 'characters',
    schema: [
      { key: 'height', label: 'الطول', min: 1.05, max: 1.45, step: 0.01, def: 1.25, unit: 'م' },
      { key: 'dress', label: 'لون الجلابية', type: 'enum', options: [['pink', 'وردي'], ['teal', 'فيروزي'], ['red', 'أحمر'], ['purple', 'بنفسجي'], ['green', 'أخضر'], ['floral', 'أحمر بورد']], def: 'pink' },
      { key: 'scarf', label: 'شيلة', type: 'bool', def: false },
      { key: 'hairColor', label: 'لون الشعر', type: 'enum', options: [['black', 'أسود'], ['brown', 'بني']], def: 'black' }, skinOpt
    ],
    presets: { 'بشيلة': { scarf: true, dress: 'teal' }, 'جلابية حمراء': { dress: 'red' }, 'بنت البادية': { dress: 'floral' } },
    clips: [['idle', 'وقوف'], ['walk', 'مشي'], ['wave', 'تلوّح'], ['sit', 'جالسة'], ['sit_floor', 'متربّعة']],
    generate: (p, q) => { const fl = p.dress === 'floral', col = fl ? [1, 1, 1] : hex(COLORS[p.dress] || COLORS.pink), tone = fl ? hex(COLORS.red) : col;
      return person({ id: 'girl', height: p.height, kid: true, female: true, headPow: 0.32, legs: 0.49, width: 1.02, walkDur: 0.85, wave: true, walkSpeed: 1.0,
        outfit: { long: 'dress', color: col, texture: fl ? 'floral_red' : null, embroidery: !fl, noCollar: true, sleeve: { r0: 0.064, r1: 0.06, color: col, cuff: true }, shoe: { kind: 'shoe', color: mixc(tone, [0.1, 0.05, 0.05], 0.5) }, trimColor: [0.78, 0.58, 0.16] },
        head: p.scarf ? { hijab: fl ? [0.08, 0.07, 0.07] : mixc(col, [1, 1, 1], 0.55) } : { hair: 'long', tie: mixc(col, [1, 1, 1], 0.2) } }, Object.assign({ lips: [0.72, 0.38, 0.38] }, p), q); } };

  A.boy = { id: 'boy', name: 'ولد', nameEn: 'Boy', category: 'characters',
    schema: [
      { key: 'height', label: 'الطول', min: 1.1, max: 1.55, step: 0.01, def: 1.35, unit: 'م' },
      { key: 'headwear', label: 'غطاء الرأس', type: 'enum', options: [['taqiyah', 'طاقية'], ['ghutra', 'غترة بيضاء'], ['shemagh', 'شماغ'], ['none', 'بدون']], def: 'taqiyah' },
      { key: 'agal', label: 'عقال', type: 'bool', def: false }, skinOpt
    ],
    presets: { 'بشماغ وعقال': { headwear: 'shemagh', agal: true }, 'بغترة': { headwear: 'ghutra' } },
    clips: [['idle', 'وقوف'], ['walk', 'مشي'], ['wave', 'يلوّح'], ['sit', 'جالس'], ['sit_floor', 'متربّع']],
    generate: (p, q) => person({ id: 'boy', height: p.height, kid: true, headPow: 0.32, legs: 0.5, width: 1.0, walkDur: 0.9, wave: true,
      outfit: { long: 'thobe', color: [0.97, 0.97, 0.96], buttons: true, sleeve: { r0: 0.068, r1: 0.054, color: [0.97, 0.97, 0.96] }, shoe: { kind: 'sandal', color: [0.32, 0.2, 0.12] } },
      head: { hair: (p.headwear === 'ghutra' || p.headwear === 'shemagh') ? null : 'short', taqiyah: p.headwear === 'taqiyah',
        ghutra: p.headwear === 'shemagh' ? 'red' : p.headwear === 'ghutra' ? 'white' : null, agal: p.agal } }, Object.assign({ hairColor: 'black', lips: [0.7, 0.4, 0.36] }, p), q) };
})(typeof window !== 'undefined' ? window : globalThis);
