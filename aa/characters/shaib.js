// Aboden Assets — characters/shaib.js
// «الشايب»: شيخ نجدي نحيل بلحية بيضاء، شماغ أحمر وعقال مزدوج، ثوب أبيض بطيّات، نعال، وعصا محنية.
// منقول من build_shaib.py في مفاتيح (شكل الوجه، اللحية، الثوب، الشماغ، العقال، العصا) ومعاد بناؤه
// بمقاس إنسان حقيقي (1.70 م) بدل مقاس المجسّم المصغّر، مع بشت اختياري.
// الأمام = +Z، يسار الشخصية = +X، الأصل بين القدمين على الأرض.
(function (g) {
  'use strict';
  const AA = g.AA;
  const V = AA.v, hex = AA.hex, mixc = AA.mixc, vary = AA.vary, lerp = AA.lerp, smooth = AA.smooth, clamp = AA.clamp;
  const gauss = (d, s) => Math.exp(-(d * d) / (2 * s * s));
  const prof = (table, y) => {
    if (y <= table[0][0]) return table[0].slice(1);
    for (let i = 0; i < table.length - 1; i++) if (y <= table[i + 1][0]) { const t = smooth(table[i][0], table[i + 1][0], y); return table[i].slice(1).map((v, k) => lerp(v, table[i + 1][k + 1], t)); }
    return table[table.length - 1].slice(1);
  };
  const Q = { high: { nu: 40, ny: 34, hu: 36, hv: 26, s: 12 }, med: { nu: 28, ny: 22, hu: 26, hv: 18, s: 9 }, low: { nu: 16, ny: 13, hu: 16, hv: 11, s: 6 } };

  // ---------- الرأس (منقول من head_surface / nose_point) ----------
  const HC = [0, 1.63, 0];                         // مركز الجمجمة
  const EYE = s => [s * 0.039, 1.647, 0.087];
  function headSurface(d) { // d = اتجاه وحدة من المركز
    const rx = 0.099, rz = d[2] > 0 ? 0.103 : 0.112, ry = d[1] > 0 ? 0.121 : 0.116;
    let p = [d[0] * rx, d[1] * ry, d[2] * rz];
    if (d[1] < 0) { p[0] *= 1 - 0.22 * Math.pow(-d[1], 1.4); p[2] *= 1 - 0.06 * (-d[1]) * smooth(0, 0.6, d[2]); }
    let q = V.add(HC, p); const n = V.norm(p);
    for (const s of [1, -1]) {
      const e = EYE(s);
      q = V.madd(q, n, -0.0105 * gauss(V.len(V.sub(q, V.add(e, [0, 0, -0.006]))), 0.016));   // محجر العين
      q = V.madd(q, n, 0.0055 * gauss(V.len(V.sub(q, [s * 0.04, 1.673, 0.1])), 0.016));        // الحاجب
      q = V.madd(q, n, 0.0075 * gauss(V.len(V.sub(q, [s * 0.052, 1.602, 0.092])), 0.02));       // الوجنة
    }
    return q;
  }
  function nosePoint(d) {
    const c = [0, 1.616, 0.11];
    const p = [d[0] * 0.0185, d[1] * 0.03, d[2] * 0.02], up = smooth(-0.2, 0.9, d[1]);
    p[0] *= 1 - 0.38 * up; p[2] *= 1 - 0.25 * up;
    p[2] -= 0.011 * gauss(d[1] + 0.35, 0.35) * smooth(-0.2, 0.8, d[2]);
    p[1] -= 0.004 * (1 - d[1] * d[1]);
    return V.add(c, p);
  }
  // شبكة كروية مشوّهة: fn(d) -> نقطة
  function sphereMesh(B, fn, nu, nv, color, uvf) {
    const rows = [];
    for (let i = 0; i <= nv; i++) {
      const th = i / nv * Math.PI, row = [];
      for (let j = 0; j <= nu; j++) {
        const ph = j / nu * Math.PI * 2, d = [Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph)];
        const p = fn(d); row.push(B.v(p, color(d, p), 0, 0, 0, uvf ? uvf(j / nu, i / nv) : [j / nu, i / nv]));
      }
      rows.push(row);
    }
    for (let i = 0; i < nv; i++) for (let j = 0; j < nu; j++) { const a = rows[i][j], b = rows[i][j + 1], c = rows[i + 1][j + 1], d = rows[i + 1][j]; B.t(a, c, b); B.t(a, d, c); }
  }
  // شبكة سطح من صفوف نقاط (مفتوحة أو مغلقة)
  function grid(B, rows, color, uvf, flip) {
    const ids = rows.map((r, i) => r.map((p, j) => B.v(p, color(i / (rows.length - 1), j / (r.length - 1), p), 0, 0, 0, uvf(j / (r.length - 1), i / (rows.length - 1)))));
    for (let i = 0; i < ids.length - 1; i++) for (let j = 0; j < ids[i].length - 1; j++) {
      const a = ids[i][j], b = ids[i][j + 1], c = ids[i + 1][j + 1], d = ids[i + 1][j];
      if (flip) { B.t(a, b, c); B.t(a, c, d); } else { B.t(a, c, b); B.t(a, d, c); }
    }
  }

  // ---------- الثوب ----------
  // [y, نصف العرض, عمق أمامي, عمق خلفي, أس القطع الناقص]
  const THOBE = [
    [0.06, 0.215, 0.165, 0.17, 2.0], [0.2, 0.205, 0.152, 0.158, 2.0], [0.45, 0.195, 0.138, 0.146, 2.0], [0.7, 0.188, 0.126, 0.136, 2.05],
    [0.93, 0.182, 0.118, 0.13, 2.1], [1.05, 0.172, 0.12, 0.12, 2.15], [1.2, 0.188, 0.128, 0.118, 2.3], [1.32, 0.205, 0.118, 0.108, 2.5],
    [1.385, 0.207, 0.1, 0.096, 2.6], [1.43, 0.172, 0.084, 0.082, 2.4], [1.46, 0.11, 0.068, 0.068, 2.2], [1.485, 0.064, 0.062, 0.06, 2.0]
  ];
  function superellipse(th, a, bf, bb, n) { // th: 0 = أمام
    const s = Math.sin(th), c = Math.cos(th);
    return [a * Math.sign(s) * Math.pow(Math.abs(s), 2 / n), (c > 0 ? bf : bb) * Math.sign(c) * Math.pow(Math.abs(c), 2 / n)];
  }
  function thobePoint(th, y, folds) {
    const [a, bf, bb, n] = prof(THOBE, y), [x, z] = superellipse(th, a, bf, bb, n);
    let p = [x, y, z];
    if (folds) {
      const out = V.norm([x, 0, z]), low = smooth(0.85, 0.08, y);
      let f = (0.006 * Math.sin(7 * th + 0.6) + 0.004 * Math.sin(11 * th + 2.1) + 0.0025 * Math.sin(17 * th)) * low;
      f += 0.0035 * Math.sin(5 * th + 1.3) * smooth(1.37, 1.05, y) * smooth(0.85, 1.05, y);
      p = V.madd(p, out, f); p[1] += 0.006 * Math.sin(3 * th + 0.4) * smooth(0.23, 0.09, y);
    }
    return p;
  }
  const thobeR = (th, y) => { const [a, bf, bb, n] = prof(THOBE, y), [x, z] = superellipse(th, a, bf, bb, n); return Math.hypot(x, z); };

  function skeleton() {
    const k = new AA.Skeleton();
    k.add('root', null, [0, 0, 0], [0, 0.1, 0]);
    k.add('hips', 'root', [0, 0.95, 0], [0, 1.08, 0]);
    k.add('spine', 'hips', [0, 1.08, 0], [0, 1.25, 0]);
    k.add('chest', 'spine', [0, 1.25, 0], [0, 1.45, 0.005]);
    k.add('neck', 'chest', [0, 1.45, 0.005], [0, 1.53, 0.012]);
    k.add('head', 'neck', [0, 1.53, 0.012], [0, 1.78, 0.02]);
    for (const [sd, x] of [['L', 1], ['R', -1]]) {
      k.add('clav' + sd, 'chest', [0.03 * x, 1.42, 0], [0.17 * x, 1.42, -0.005]);
      k.add('upArm' + sd, 'clav' + sd, [0.19 * x, 1.4, -0.01], [0.235 * x, 1.12, -0.005]);
      k.add('loArm' + sd, 'upArm' + sd, [0.235 * x, 1.12, -0.005], [0.255 * x, 0.87, 0.04]);
      k.add('hand' + sd, 'loArm' + sd, [0.255 * x, 0.87, 0.04], [0.26 * x, 0.77, 0.05]);
      k.add('thigh' + sd, 'hips', [0.09 * x, 0.93, 0], [0.1 * x, 0.5, 0.01]);
      k.add('shin' + sd, 'thigh' + sd, [0.1 * x, 0.5, 0.01], [0.1 * x, 0.085, -0.015]);
      k.add('foot' + sd, 'shin' + sd, [0.1 * x, 0.085, -0.015], [0.105 * x, 0.02, 0.15]);
    }
    return k;
  }

  function shaib(p, quality) {
    const q = Q[quality] || Q.med, rng = AA.rng(p.seed), sk = skeleton();
    const P = { thobe: new AA.Builder(), skin: new AA.Builder(), hair: new AA.Builder(), shemagh: new AA.Builder(), dark: new AA.Builder(), wood: new AA.Builder(), bisht: new AA.Builder(), trim: new AA.Builder(), eye: new AA.Builder() };
    const skinC = hex(p.skin === 'dark' ? '#7e5236' : p.skin === 'light' ? '#c79a74' : '#a5704a');
    const hairC = mixc(hex('#f2efe9'), hex('#8d8a84'), p.grey);

    // الثوب: الجزء السفلي يتبع الساقين أثناء المشي
    P.thobe.skinFn = pt => {
      const y = pt[1];
      if (y > 1.0) return AA.autoSkin(sk, ['hips', 'spine', 'chest', 'neck', 'clavL', 'clavR'], 4)(pt);
      const side = clamp(pt[0] / 0.12, -1, 1), wl = smooth(-0.6, 0.6, side), lo = smooth(0.95, 0.4, y);
      const leg = y > 0.5 ? 'thigh' : 'shin';
      return [[sk.id('hips'), 1 - lo * 0.85], [sk.id(leg + 'L'), lo * 0.85 * wl], [sk.id(leg + 'R'), lo * 0.85 * (1 - wl)]];
    };
    const ys = []; for (let i = 0; i <= q.ny; i++) ys.push(lerp(0.06, 1.485, Math.pow(i / q.ny, 0.92)));
    const rows = ys.slice().reverse().map(y => { const r = []; for (let j = 0; j <= q.nu; j++) r.push(thobePoint(j / q.nu * Math.PI * 2, y, true)); return r; });
    grid(P.thobe, rows, () => [1, 1, 1], (u, v) => [u * 3.4, v * 4.6], false);
    // الياقة والأزرار
    P.thobe.setSkin([[sk.id('neck'), 0.6], [sk.id('chest'), 0.4]]);
    const col = [[1.485, 0.064], [1.505, 0.063], [1.52, 0.061]].map(([y, r]) => { const row = []; for (let j = 0; j <= 24; j++) { const a = j / 24 * Math.PI * 2; row.push([r * Math.sin(a), y, r * 0.96 * Math.cos(a) + 0.004]); } return row; });
    grid(P.thobe, col.reverse(), () => [0.97, 0.97, 0.97], (u, v) => [u * 2, v * 0.3], false);
    P.dark.setSkin([[sk.id('chest'), 1]]);
    for (const y of [1.44, 1.38]) { const c = thobePoint(0, y, false); AA.blob(P.dark, V.add(c, [0, 0, 0.004]), [0.006, 0, 0], [0, 0.006, 0], [0, 0, 0.003], () => [0.75, 0.68, 0.55], 0, 0, 0, null, 0, true); }

    // الأكمام
    for (const [sd, x] of [['L', 1], ['R', -1]]) {
      P.thobe.skinFn = AA.autoSkin(sk, ['clav' + sd, 'upArm' + sd, 'loArm' + sd, 'hand' + sd, 'chest'], 6);
      const right = x < 0, path = AA.bezier([[0.16 * x, 1.4, -0.01], [0.235 * x, 1.12, -0.005], [0.25 * x, 0.92, 0.03]], q.s + 2);
      AA.loft(P.thobe, { path, sides: q.s, up: () => [0, 0, 1], capEnd: false, uvU: 1, uvV: 2,
        radius: t => { const r = lerp(0.068, 0.052, t) + 0.004 * Math.sin(t * 18); return [r, r * 0.92]; }, color: () => [0.98, 0.98, 0.98] });
      // اليد: كف وأصابع منحنية (اليمنى قابضة على العصا)
      P.skin.skinFn = AA.autoSkin(sk, ['loArm' + sd, 'hand' + sd], 8);
      const hp = right ? AA.bezier([[0.25 * x, 0.915, 0.035], [0.262 * x, 0.84, 0.05], [0.258 * x, 0.8, 0.09], [0.25 * x, 0.82, 0.11]], 7)
        : AA.bezier([[0.25 * x, 0.915, 0.035], [0.26 * x, 0.83, 0.05], [0.262 * x, 0.77, 0.055], [0.258 * x, 0.735, 0.07]], 7);
      AA.loft(P.skin, { path: hp, sides: Math.max(6, q.s - 2), up: () => [x, 0, 0], capEnd: true, capStart: true,
        radius: t => [lerp(0.024, 0.016, t) * (right ? 1.15 : 1), lerp(0.045, 0.036, smooth(0, 0.7, t)) * (t > 0.85 ? 0.8 : 1)], color: () => vary(skinC, rng, 0.04) });
      AA.loft(P.skin, { path: AA.bezier([[0.245 * x, 0.88, 0.06], [0.24 * x, 0.85, 0.09], [0.245 * x, 0.83, 0.1]], 4), sides: 6, capEnd: true, radius: () => 0.011, color: () => skinC });
    }

    // القدمان والنعال
    for (const [sd, x] of [['L', 1], ['R', -1]]) {
      P.skin.setSkin([[sk.id('foot' + sd), 1]]);
      AA.loft(P.skin, { path: [[0.1 * x, 0.075, -0.03], [0.1 * x, 0.05, 0.04], [0.103 * x, 0.035, 0.11], [0.105 * x, 0.028, 0.15]], sides: q.s, capStart: true, capEnd: true,
        radius: t => [lerp(0.038, 0.045, t), lerp(0.04, 0.018, t)], color: () => vary(skinC, rng, 0.04) });
      P.dark.setSkin([[sk.id('foot' + sd), 1]]);
      AA.box(P.dark, [0.102 * x, 0.007, 0.05], [0.1, 0.014, 0.27], [0.32, 0.2, 0.12], 1, {});
      AA.box(P.dark, [0.102 * x, 0.045, 0.085], [0.092, 0.02, 0.04], [0.36, 0.22, 0.13], 1, {});
    }

    // الرأس والوجه
    P.skin.setSkin([[sk.id('head'), 1]]);
    sphereMesh(P.skin, headSurface, q.hu, q.hv, d => vary(mixc(skinC, hex('#c08a64'), 0.25 * Math.max(0, d[2]) * smooth(-0.2, 0.3, d[1])), rng, 0.02));
    sphereMesh(P.skin, nosePoint, 12, 9, () => mixc(skinC, hex('#b0715a'), 0.3));
    // العينان والجفنان
    P.eye.setSkin([[sk.id('head'), 1]]); P.dark.setSkin([[sk.id('head'), 1]]);
    for (const s of [1, -1]) {
      const e = EYE(s);
      AA.blob(P.eye, e, [0.0115, 0, 0], [0, 0.0115, 0], [0, 0, 0.0115], () => [0.93, 0.9, 0.85], 0, 0, 0, null, 0, false);
      AA.blob(P.dark, V.add(e, [0, 0, 0.0095]), [0.0055, 0, 0], [0, 0.0055, 0], [0, 0, 0.0025], () => [0.22, 0.12, 0.06], 0, 0, 0, null, 0, true);
      P.skin.setSkin([[sk.id('head'), 1]]);
      AA.blob(P.skin, V.add(e, [0, 0.008, 0.002]), [0.014, 0, 0], [0, 0.006, 0], [0, 0, 0.012], () => mixc(skinC, [0.4, 0.25, 0.18], 0.2), 0, 0, 0, null, 0, false);
    }
    // الحاجبان: أبيضان كثيفان
    P.hair.setSkin([[sk.id('head'), 1]]);
    for (const s of [1, -1]) AA.loft(P.hair, { path: AA.bezier([[s * 0.017, 1.672, 0.104], [s * 0.04, 1.682, 0.103], [s * 0.066, 1.672, 0.088]], 6), sides: 6, capStart: true, capEnd: true, up: () => [0, 0, 1],
      radius: t => [0.0045 + 0.004 * Math.sin(Math.PI * t), 0.007], color: () => hairC });
    // اللحية والشارب (منقول من beard_section)
    const BEARD = [[0.084, 0.953], [0.1, 0.948], [0.111, 0.93], [0.113, 0.905], [0.104, 0.876], [0.084, 0.851], [0.058, 0.838], [0.04, 0.845], [0.034, 0.868], [0.036, 0.9], [0.04, 0.93]];
    const toY = z => z - 1.03 + HC[1];
    const beardSkin = (phi, y) => { const dz = clamp((y - HC[1]) / 0.116, -0.95, 0.95), c = Math.sqrt(1 - dz * dz); const pp = headSurface([Math.sin(phi) * c, dz, Math.cos(phi) * c]); return Math.hypot(pp[0], pp[2]); };
    const nb = q.hu, beardRows = [];
    const L = p.beard;
    for (let j = 0; j < nb; j++) {
      const phi = lerp(-102, 102, j / (nb - 1)) * Math.PI / 180, f = Math.abs(phi) / (100 * Math.PI / 180);
      const a = 0.098, b = 0.112, scale = (a * b / Math.hypot(b * Math.sin(phi), a * Math.cos(phi))) / b;
      const zTop = lerp(0.953, 1.04, Math.pow(smooth(0.15, 1, f), 0.9));
      let zTip = lerp(0.953 - (0.953 - 0.838) * L, 0.95, Math.pow(smooth(0, 1, f), 1.3)); zTip += 0.005 * Math.cos(phi * 10) * (1 - f);
      const col2 = BEARD.map(([sr, z], k) => {
        const t = (z - 0.953) / (0.838 - 0.953), zz = lerp(zTop, zTip, t);
        let r = sr * scale * lerp(1, 0.94, f) * (k > 0 && k < 7 ? lerp(1, 1.12, smooth(0, 1, L - 0.6)) : 1);
        if (k === 0) r = beardSkin(phi, toY(zz)) - 0.003;
        const g2 = 0.0035 * (Math.abs(Math.sin(phi * 12 + k * 0.3)) - 0.55) * smooth(1, 3, k) * smooth(10, 7, k);
        return [Math.sin(phi) * (r + g2), toY(zz), Math.cos(phi) * (r + g2)];
      });
      beardRows.push(col2);
    }
    const bRows = beardRows[0].map((_, i) => beardRows.map(c => c[i]));
    grid(P.hair, bRows, (v, u) => mixc(hairC, hex('#d9d4cc'), 0.25 * v), (u, v) => [u * 3, v], false);
    AA.loft(P.hair, { path: AA.bezier([[0.05, 1.588, 0.1], [0.022, 1.597, 0.116], [0, 1.596, 0.118], [-0.022, 1.597, 0.116], [-0.05, 1.588, 0.1]], 9), sides: 6, capStart: true, capEnd: true, up: () => [0, 1, 0],
      radius: t => [0.008 + 0.006 * Math.sin(Math.PI * t), 0.009 + 0.005 * Math.sin(Math.PI * t)], color: () => hairC });

    // الشماغ: ينسدل على الرأس والكتفين، والطرفان الأماميان على الصدر
    const EDGE = [[0, 1.2], [30, 1.24], [62, 1.31], [88, 1.34], [104, 1.27], [114, 1.13], [122, 1.06], [127, 1.09], [131, 1.42], [134, 1.56], [138, 1.66], [148, 1.71], [166, 1.725], [180, 1.73]];
    const edge = deg => { deg = Math.abs(deg); for (let i = 0; i < EDGE.length - 1; i++) if (deg <= EDGE[i + 1][0]) { const t = (deg - EDGE[i][0]) / (EDGE[i + 1][0] - EDGE[i][0]); return lerp(EDGE[i][1], EDGE[i + 1][1], 0.5 * t + 0.5 * smooth(0, 1, t)); } return 1.73; };
    const env = (thBack, y) => { // نصف قطر الغلاف من المحور (thBack: من الخلف)
      const phi = thBack - Math.PI, dx = Math.sin(phi), dz = Math.cos(phi);
      let r = 0;
      const dyn = (y - HC[1]) / 0.121;
      if (Math.abs(dyn) < 1) { const c = Math.sqrt(1 - dyn * dyn), pp = headSurface([dx * c, dyn, dz * c]); r = Math.max(r, Math.hypot(pp[0], pp[2] - 0.0)); }
      if (Math.abs(phi) < 1.9 && y < 1.6 && y > 1.47) r = Math.max(r, 0.115 + 0.012 * L);
      if (y > 1.43 && y < 1.62) r = Math.max(r, 0.075);
      if (y < 1.5) r = Math.max(r, thobeR(phi, y) + (y < 1.47 ? 0.008 : 0));
      return r;
    };
    P.shemagh.skinFn = pt => pt[1] > 1.52 ? [[sk.id('head'), 1]] : [[sk.id('chest'), smooth(1.52, 1.35, pt[1])], [sk.id('neck'), 1 - smooth(1.52, 1.35, pt[1])]];
    const nTh = q.hu + 8, nY = q.hv + 6, off = 0.016, shRows = [];
    for (let i = 0; i <= nY; i++) {
      const row = [];
      for (let j = 0; j <= nTh; j++) {
        const deg = lerp(-178, 178, j / nTh), th = deg * Math.PI / 180, hem = edge(deg), top = 1.765;
        const y = lerp(top, hem, Math.pow(i / nY, 0.85));
        const r = (i === 0 ? 0 : env(th, y) + off + 0.006 * Math.sin(deg * 0.25 + i) * smooth(1.55, 1.2, y));
        const phi = th - Math.PI;
        row.push([Math.sin(phi) * r, y + (i === 0 ? 0 : 0), Math.cos(phi) * r]);
      }
      shRows.push(row);
    }
    // تاج مدوّر للشماغ فوق الرأس
    for (let j = 0; j <= nTh; j++) { const p1 = shRows[1][j]; shRows[0][j] = [p1[0] * 0.35, 1.775, p1[2] * 0.35]; }
    grid(P.shemagh, shRows, () => [1, 1, 1], (u, v) => [u * 5.5, v * 2.4], false);
    // العقال: حلقتان سوداوان فوق الشماغ، أعلى قليلاً من الأمام
    P.dark.setSkin([[sk.id('head'), 1]]);
    for (const dy of [-0.0125, 0.0125]) {
      const ring = [];
      for (let j = 0; j <= 40; j++) {
        const a = j / 40 * Math.PI * 2, yy = 1.715 + dy + 0.012 * Math.cos(a), thB = a + Math.PI;
        const r = env(thB, yy) + off + 0.016; ring.push([Math.sin(a) * r, yy, Math.cos(a) * r]);
      }
      AA.tube(P.dark, ring, ring.map(() => 0.013), 8, () => [0.11, 0.1, 0.1], () => 0, 0, null, false);
    }

    // البشت: عباءة مفتوحة من الأمام بحاشية مذهبة
    if (p.bisht !== 'none') {
      const bc = hex(p.bisht === 'black' ? '#1b1716' : p.bisht === 'cream' ? '#d9c9a8' : '#5a3d26');
      const bishtBody = pt => {
        const y = pt[1];
        if (y > 1.0) return AA.autoSkin(sk, ['hips', 'spine', 'chest', 'clavL', 'clavR', 'upArmL', 'upArmR'], 4)(pt);
        const side = clamp(pt[0] / 0.14, -1, 1), wl = smooth(-0.6, 0.6, side), lo = smooth(1.0, 0.4, y) * 0.7, leg = y > 0.5 ? 'thigh' : 'shin';
        return [[sk.id('hips'), 1 - lo], [sk.id(leg + 'L'), lo * wl], [sk.id(leg + 'R'), lo * (1 - wl)]];
      };
      P.bisht.skinFn = bishtBody;
      const nT = q.nu, nYb = Math.round(q.ny * 0.95), open = 0.3, bRowsB = [];
      for (let i = 0; i <= nYb; i++) {
        const y = lerp(1.475, 0.1, Math.pow(i / nYb, 0.9)), row = [];
        for (let j = 0; j <= nT; j++) {
          const th = lerp(open, Math.PI * 2 - open, j / nT);
          const r = thobeR(th, y) + 0.02 + 0.035 * smooth(1.25, 0.5, y) + 0.012 * smooth(0.5, 0.1, y) + 0.006 * Math.sin(th * 9 + y * 4) * smooth(1.1, 0.5, y);
          row.push([Math.sin(th) * r, y, Math.cos(th) * r]);
        }
        bRowsB.push(row);
      }
      grid(P.bisht, bRowsB, () => bc, (u, v) => [u * 4, v * 3], false);
      // أكمام البشت الواسعة حتى ما بعد المرفق
      for (const [sd, x] of [['L', 1], ['R', -1]]) {
        P.bisht.skinFn = AA.autoSkin(sk, ['clav' + sd, 'upArm' + sd, 'loArm' + sd, 'chest'], 6);
        AA.loft(P.bisht, { path: AA.bezier([[0.15 * x, 1.43, -0.01], [0.235 * x, 1.12, -0.005], [0.252 * x, 0.9, 0.035]], q.s + 2), sides: q.s + 2, up: () => [0, 0, 1],
          radius: t => { const r = lerp(0.09, 0.115, smooth(0, 1, t)); return [r, r * 0.95]; }, color: () => bc });
        // حاشية ذهبية على طرف الكم
        { const c = [0.252 * x, 0.9, 0.035], ring = []; for (let k = 0; k <= 16; k++) { const a = k / 16 * Math.PI * 2; ring.push([c[0] + Math.sin(a) * 0.116, c[1] + 0.01, c[2] + Math.cos(a) * 0.11]); } P.trim.skinFn = P.bisht.skinFn; AA.tube(P.trim, ring, ring.map(() => 0.008), 4, () => [1, 1, 1], () => 0, 0, null, false); }
      }
      // الحاشية الذهبية على الطرفين الأماميين
      P.trim.skinFn = bishtBody;
      for (const j of [0, nT]) {
        const pts = bRowsB.map(r => V.add(r[j], [0, 0, 0.004]));
        AA.tube(P.trim, pts, pts.map(() => 0.012), 5, () => [1, 1, 1], () => 0, 0, null, false);
      }
    }

    // العصا المحنية في اليد اليمنى
    {
      const grip = [-0.258, 0.82, 0.1];
      P.wood.setSkin([[sk.id('handR'), 1]]);
      const pts = [];
      for (let i = 0; i < 10; i++) pts.push(V.lerp([grip[0], 0.01, grip[2] + 0.02], [grip[0], grip[1] + 0.02, grip[2]], i / 9));
      const c = [grip[0], grip[1] + 0.03, grip[2] + 0.045];
      for (let i = 1; i <= 12; i++) { const a = Math.PI * i / 12; pts.push(V.add(c, [0, 0.045 * Math.sin(a) * 1.1, -0.045 * Math.cos(a)])); }
      pts.push(V.add(pts[pts.length - 1], [0, -0.02, 0.004]));
      AA.tube(P.wood, pts, pts.map((_, i) => i < 10 ? lerp(0.012, 0.0145, i / 9) : 0.0135), 7, () => [0.85, 0.85, 0.85], () => 0, 0, null, true);
    }

    // ---------- الحركة ----------
    const st = p.stoop, clips = {};
    const stoopPose = (k) => ({ spine: [6 * st * k, 0, 0], chest: [7 * st * k, 0, 0], neck: [-6 * st * k, 0, 0], head: [-5 * st * k, 0, 0] });
    clips.idle = AA.clip(sk, 4.8, 30, true, t => {
      const w = t / 4.8 * Math.PI * 2, b = Math.sin(w * 1.5), pose = stoopPose(1);
      pose.chest = [pose.chest[0] + 1.2 * b, 0, 0]; pose.head = [pose.head[0], 10 * Math.sin(w), 0]; pose.neck = [pose.neck[0], 4 * Math.sin(w), 0];
      pose.upArmL = [2 + 1.5 * b, 0, 6]; pose.upArmR = [-14, 0, -4]; pose.loArmR = [-26, 0, 0]; pose.loArmL = [-8, 0, 0];
      pose.move = [0, 0.004 * b, 0];
      return pose;
    });
    // مشي بالعصا: العصا تتقدم مع الرجل اليسرى، والذراع اليسرى تتأرجح
    clips.walk = AA.gaitClip(sk, { duration: 1.3, speed: 0.8, extra: t => {
      const ph = t / 1.3 * Math.PI * 2, s = Math.sin(ph), pose = stoopPose(1.15);
      pose.hips = [0, 5 * s, 0]; pose.spine[1] = -3 * s;
      pose.upArmL = [20 * s, 0, 6]; pose.loArmL = [-12 - 8 * Math.max(0, s), 0, 0];
      pose.upArmR = [-12 - 7 * s, 0, -4]; pose.loArmR = [-22 + 4 * s, 0, 0];
      pose.move = [0, 0.012 * Math.cos(ph * 2) - 0.01, 0];
      return pose;
    }, legs: [['L', 0], ['R', 0.5]].map(([sd, ph]) => ({ chain: ['thigh' + sd, 'shin' + sd], foot: 'foot' + sd, phase: ph, duty: 0.62, lift: 0.1, limits: [[-60, 35], [0, 110]], init: [-5, 10], footSwing: 12 })) });
    // جلوس على دكّة (ارتفاع الركبة) وجلوس متربّع على الأرض
    clips.sit = AA.clip(sk, 5, 30, true, t => {
      const w = t / 5 * Math.PI * 2, b = Math.sin(w * 1.5), pose = stoopPose(0.8);
      pose.thighL = [-86, 0, 4]; pose.thighR = [-86, 0, -4]; pose.shinL = [84, 0, 0]; pose.shinR = [84, 0, 0]; pose.footL = [2, 0, 0]; pose.footR = [2, 0, 0];
      pose.chest = [pose.chest[0] + 1.2 * b, 0, 0]; pose.head = [pose.head[0], 14 * Math.sin(w), 0];
      pose.upArmL = [-20, 0, 10]; pose.loArmL = [-52, 0, 0]; pose.upArmR = [-26, 0, -8]; pose.loArmR = [-34, 0, 0]; pose.handR = [9, 0, 0];
      pose.move = [0, -0.405 + 0.003 * b, -0.02];
      return pose;
    });
    clips.sit_floor = AA.clip(sk, 5, 30, true, t => {
      const w = t / 5 * Math.PI * 2, b = Math.sin(w * 1.5), pose = stoopPose(0.9);
      pose.thighL = [-95, -15, 50]; pose.thighR = [-95, 15, -50]; pose.shinL = [178, 0, -30]; pose.shinR = [178, 0, 30]; pose.footL = [-30, 0, 0]; pose.footR = [-30, 0, 0];
      pose.chest = [pose.chest[0] + 1.2 * b, 0, 0]; pose.head = [pose.head[0] - 4, 12 * Math.sin(w), 0];
      pose.upArmL = [-18, 0, 18]; pose.loArmL = [-50, 0, 0]; pose.upArmR = [-34, 0, -14]; pose.loArmR = [-36, 0, 0];
      pose.move = [0, -0.75 + 0.003 * b, -0.05];
      return pose;
    });

    return AA.finalize('shaib', {
      thobe:   { builder: P.thobe,   material: { kind: 'cloth', texture: 'cloth', roughness: 0.85 } },
      skin:    { builder: P.skin,    material: { kind: 'skin', roughness: 0.6 } },
      hair:    { builder: P.hair,    material: { kind: 'hair', texture: 'fur', roughness: 0.9 } },
      shemagh: { builder: P.shemagh, material: { kind: 'cloth', texture: 'shemagh', roughness: 0.85, doubleSided: true } },
      eye:     { builder: P.eye,     material: { kind: 'eye', roughness: 0.25 } },
      dark:    { builder: P.dark,    material: { kind: 'dark', roughness: 0.7 } },
      wood:    { builder: P.wood,    material: { kind: 'wood', texture: 'wood', roughness: 0.6 } },
      bisht:   { builder: P.bisht,   material: { kind: 'cloth', texture: 'fur', roughness: 0.9, doubleSided: true } },
      trim:    { builder: P.trim,    material: { kind: 'metal', roughness: 0.35, color: [0.62, 0.38, 0.07] } }
    }, { stiffness: 0, height: 1.78, radius: 0.35, collider: { type: 'capsule', radius: 0.24, height: 1.78, axis: 'y' }, skeleton: sk.toJSON(), clips, walkSpeed: 0.8 });
  }

  AA.assets.shaib = {
    id: 'shaib', name: 'الشايب', nameEn: 'Elderly Najdi man', category: 'characters',
    schema: [
      { key: 'bisht', label: 'البشت', type: 'enum', options: [['none', 'بدون'], ['brown', 'بني'], ['black', 'أسود'], ['cream', 'فاتح']], def: 'none' },
      { key: 'beard', label: 'طول اللحية', min: 0.3, max: 1.4, step: 0.05, def: 1, pct: true },
      { key: 'grey', label: 'شيب اللحية', min: 0, max: 0.8, step: 0.05, def: 0.05, pct: true },
      { key: 'stoop', label: 'انحناء الظهر', min: 0, max: 2, step: 0.1, def: 1, pct: true },
      { key: 'skin', label: 'لون البشرة', type: 'enum', options: [['mid', 'حنطي'], ['dark', 'أسمر'], ['light', 'فاتح']], def: 'mid' }
    ],
    presets: { 'شايب ببشت': { bisht: 'brown' }, 'شيخ القبيلة': { bisht: 'black', stoop: 0.4, beard: 0.8 }, 'شايب كبير': { stoop: 1.8, beard: 1.3 } },
    clips: [['idle', 'وقوف'], ['walk', 'مشي بالعصا'], ['sit', 'جالس'], ['sit_floor', 'متربّع']],
    generate: shaib
  };
})(typeof window !== 'undefined' ? window : globalThis);
