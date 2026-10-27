// Aboden Assets — lowpoly/lp-characters.js — شخصيات تشيبي لو-بولي (رأس كبير وجسم قصير)
// مولّد واحد للشخصيات: هيكل واحد بمقاس الشايب (1.25 م) ثم يُكبَّر/يُصغَّر حسب الطول،
// مع خيارات اللبس (ثوب، عباية، جلابية، أفرهول)، وغطاء الرأس (شماغ، غترة، شيلة، طاقية، خوذة، شعر)، والإكسسوارات.
(function (g) {
  'use strict';
  const AA = g.AA, LP = AA.lp, V = AA.v, lerp = AA.lerp, smooth = AA.smooth, clamp = AA.clamp, mixc = AA.mixc;

  // نسب التشيبي بمقاس 1.25 م: الرأس ثلث الطول تقريباً
  const B = { hip: 0.36, knee: 0.2, ankle: 0.06, chest: 0.55, sh: 0.67, neck: 0.74, head: [0, 0.98, 0.01], hr: 0.23, shX: 0.16, hipX: 0.075 };
  const SEAT = 0.47; // ارتفاع الجلوس (سطح الدكة/الكرسي) بالمتر الحقيقي، مثل الحزمة الواقعية
  function skeleton() {
    const k = new AA.Skeleton();
    k.add('root', null, [0, 0, 0], [0, 0.1, 0]);
    k.add('hips', 'root', [0, B.hip, 0], [0, B.hip + 0.08, 0]);
    k.add('spine', 'hips', [0, B.hip + 0.08, 0], [0, B.chest, 0]);
    k.add('chest', 'spine', [0, B.chest, 0], [0, B.neck, 0]);
    k.add('neck', 'chest', [0, B.neck, 0], [0, B.neck + 0.06, 0]);
    k.add('head', 'neck', [0, B.neck + 0.06, 0], [0, 1.22, 0.01]);
    for (const [sd, x] of [['L', 1], ['R', -1]]) {
      k.add('clav' + sd, 'chest', [0.03 * x, B.sh, 0], [B.shX * x, B.sh, 0]);
      k.add('upArm' + sd, 'clav' + sd, [B.shX * x, B.sh, 0], [0.2 * x, 0.52, 0]);
      k.add('loArm' + sd, 'upArm' + sd, [0.2 * x, 0.52, 0], [0.22 * x, 0.39, 0.02]);
      k.add('hand' + sd, 'loArm' + sd, [0.22 * x, 0.39, 0.02], [0.225 * x, 0.32, 0.03]);
      k.add('thigh' + sd, 'hips', [B.hipX * x, B.hip, 0], [B.hipX * x, B.knee, 0.01]);
      k.add('shin' + sd, 'thigh' + sd, [B.hipX * x, B.knee, 0.01], [B.hipX * x, B.ankle, 0]);
      k.add('foot' + sd, 'shin' + sd, [B.hipX * x, B.ankle, 0], [B.hipX * x, 0.01, 0.09]);
    }
    return k;
  }
  const SKIN = { mid: 'skin', light: '#efc19a', tan: '#c98d5e', dark: '#a8714a' };

  const scaleOut = LP.scaleOut;

  // غطاء رأس من قماش (شماغ، غترة، شيلة): قطعة واحدة متصلة تغطي الرأس وتنفتح حول الوجه وتنسدل على الكتفين
  // o = { pattern: bool (نقشة الشماغ)، color، open (نصف فتحة الوجه)، fold (ثنية الجبهة)، tip (ذيل الظهر)، front (طول الطرفين)، stripes (حاشية بخط أحمر) }
  function headCloth(Pat, Pln, id, q, o) {
    const c0 = [0, 1.0, -0.005], R = B.hr + 0.032, nC = q === 'low' ? 14 : 20, phiEnd = 1.72, yTop = c0[1] + R * Math.cos(phiEnd), TILE = 0.55;
    const PH = q === 'low' ? [0.08, 0.6, 1.2, 1.24, 1.5, phiEnd] : [0.08, 0.34, 0.62, 0.92, 1.2, 1.24, 1.48, phiEnd], OPEN = o.open || 0.82;
    const OP = PH.map(f => f > 1.22 ? OPEN : 0), iEdge = PH.indexOf(1.2), crown = PH.length - 1;
    const DS = [0, 0.3, 0.58, 0.84, 0.895, 0.935, 1], drape = DS.length - 1, nR = crown + drape, CF = [0, 0.035, 0.055, 0.09];
    const colF = k => { const m = CF.length - 1; if (k <= m) return CF[k] * 0.5; if (k >= nC - m) return 1 - CF[nC - k] * 0.5; return lerp(CF[m] * 0.5, 1 - CF[m] * 0.5, (k - m) / (nC - 2 * m)); };
    const grid = [];
    for (let i = 0; i <= nR; i++) {
      const j = i - crown, inCrown = i <= crown, phi = inCrown ? PH[i] : phiEnd, sD = inCrown ? 0 : DS[j], row = [];
      const open = inCrown ? OP[i] : OPEN + 0.1 * sD;
      for (let k = 0; k <= nC; k++) {
        const a = lerp(open, Math.PI * 2 - open, colF(k)), sa = Math.sin(a), ca = Math.cos(a);
        let pt, rr;
        if (inCrown) {
          const puff = 1 + (o.tight ? 0.02 : 0.06) * Math.sin(Math.PI * Math.min(1, phi / 1.2)) + (o.fold ? 0.1 : 0) * Math.max(0, ca) ** 4 * smooth(0.25, 0.7, phi) * (1 - smooth(0.7, 1.0, phi));
          rr = R * Math.sin(phi) * puff; pt = [c0[0] + rr * sa, c0[1] + R * Math.cos(phi) * (1 + (o.fold ? 0.04 : 0) * Math.max(0, ca) ** 4), c0[2] + rr * ca];
        } else {
          const back = smooth(0.2, -0.9, ca), front = smooth(0.3, 0.68, ca), tip = (o.tip == null ? 1 : o.tip) * Math.max(0, 1 - Math.abs(a - Math.PI) / 1.25);
          rr = lerp(R * Math.sin(phiEnd), (o.tight ? 0.255 : 0.275) - 0.025 * back, Math.pow(sD, 0.6));
          const y = lerp(yTop, 0.63 - 0.16 * tip - (o.long || 0) * back - (o.front == null ? 0.2 : o.front) * front, sD);
          pt = [sa * rr * (1 - 0.2 * front * sD), y, ca * rr * (1 + 0.08 * back * sD) + 0.06 * front * sD + c0[2]];
        }
        row.push({ p: pt, uv: [a * 0.25 / TILE, (1.26 - pt[1]) / TILE] });
      }
      grid.push(row);
    }
    const skinF = pt => { const w = smooth(0.84, 0.64, pt[1]); return [[id('head'), 1 - w * 0.85], [id('chest'), w * 0.85]]; };
    Pat.skinFn = Pln.skinFn = skinF;
    const base = o.pattern ? LP.c('white') : o.color, R1 = LP.c('red'), m = CF.length - 1;
    const quad = (Bq, P, col) => { const ids = P.map(g => Bq.v(g.p, col, g.p[1] < 0.9 ? 0.01 : 0, 0.4, 0, g.uv)); Bq.t(ids[0], ids[2], ids[1]); Bq.t(ids[0], ids[3], ids[2]); };
    const body = o.pattern ? Pat : Pln;
    for (let i = 0; i < nR; i++) for (let k = 0; k < nC; k++) {
      const j = i - crown, P = [grid[i][k], grid[i][k + 1], grid[i + 1][k + 1], grid[i + 1][k]];
      const hemRow = j >= drape - 3 ? j - (drape - 3) : -1, edge = k < m ? k : k >= nC - m ? nC - 1 - k : -1, border = hemRow >= 0 || (edge >= 0 && j >= 0);
      if (border && o.stripes) quad(Pln, P, (hemRow === 1 && edge !== 0) || (edge === 1 && hemRow !== 0 && hemRow !== 2) ? R1 : LP.c('white'));
      else if (border && o.pattern) quad(Pln, P, LP.c('white'));
      else quad(body, P, base);
    }
    if (o.fold) { // ثنية الجبهة الملفوفة المتموّجة
      const edgePts = [];
      for (let k = 0; k <= nC; k++) { const gq = grid[iEdge][k], a = Math.atan2(gq.p[0], gq.p[2] - c0[2]); if (Math.abs(a) < OPEN + 0.04) edgePts.push(Object.assign({ a }, gq)); }
      edgePts.sort((x, y) => x.a - y.a);
      for (let e = 0; e < edgePts.length - 1; e++) {
        const A = edgePts[e], Bq = edgePts[e + 1], out = gq => { const d = V.norm(V.sub(gq.p, c0)), w = 0.024 + 0.014 * Math.abs(Math.sin(gq.a * 5.5)); return { p: V.add(gq.p, V.add(V.scale(d, w), [0, -0.012, 0])), uv: [gq.uv[0], gq.uv[1] + 0.08] }; };
        quad(body, [A, Bq, out(Bq), out(A)], base);
      }
    }
  }
  // العقال: حلقتان (طارة مغلقة) سوداوان
  function agal(Dk, q) {
    for (const dy of [0, 0.042]) {
      const N = q === 'low' ? 16 : 22, M = 5, tube = 0.023, ring = [];
      for (let k = 0; k < N; k++) { const a = k / N * Math.PI * 2, y = 1.14 + dy + 0.015 * (1 - Math.cos(a)), rr = Math.sqrt(Math.max(0, (B.hr + 0.034) ** 2 - (y - 1.0) ** 2)) + 0.024; ring.push([Math.sin(a) * rr, y, Math.cos(a) * rr - 0.005]); }
      const ids = ring.map((c, k) => { const t = V.norm(V.sub(ring[(k + 1) % N], ring[(k + N - 1) % N])), out = V.norm([c[0], 0, c[2] + 0.005]), up = V.norm(V.cross(t, out));
        const r = []; for (let m = 0; m < M; m++) { const b = m / M * Math.PI * 2; r.push(Dk.v(V.add(c, V.add(V.scale(out, Math.cos(b) * tube), V.scale(up, Math.sin(b) * tube))), LP.c('black'), 0, 0, 0)); } return r; });
      for (let k = 0; k < N; k++) for (let m = 0; m < M; m++) { const k2 = (k + 1) % N, m2 = (m + 1) % M; Dk.t(ids[k][m], ids[k2][m2], ids[k2][m]); Dk.t(ids[k][m], ids[k][m2], ids[k2][m2]); }
    }
  }

  // ---------- المولّد العام ----------
  // S = { id, k (المقياس)، skin، garment: { type: thobe|abaya|dress|coverall, color, trim }، bisht، head: { type: shemagh|ghutra|shayla|scarf|taqiyah|helmet|hair|girlHair, agal, niqab, color, hairColor }،
  //       beard، grey، mustache، brows، lashes، cane، tool، gloves، vest، boots، stoop }
  function person(p, q, S) {
    const sk = skeleton(), rng = AA.rng(p.seed), id = n => sk.id(n), low = q === 'low';
    const Cl = new AA.Builder(), Fl = new AA.Builder(), Sk = new AA.Builder(), Sh = new AA.Builder(), Pl = new AA.Builder(), Dk = new AA.Builder(), Hr = new AA.Builder(), Wd = new AA.Builder();
    const skin = LP.c(SKIN[S.skin] || 'skin'), white = LP.c('white'), Gm = S.garment, gcol = LP.c(Gm.color || 'white'), trimC = LP.c(Gm.trimColor || '#c9a24a');
    // ---- اللبس ----
    if (Gm.type === 'coverall' || Gm.type === 'casual') {
      // أفرهول (أو لبس عصري: قميص/تيشيرت وبنطلون): جذع + بنطلون لكل رجل + حزام
      const pantsC = LP.c(Gm.pants || Gm.color || 'white');
      Cl.skinFn = AA.autoSkin(sk, ['hips', 'spine', 'chest', 'neck', 'clavL', 'clavR'], 4);
      const prof = [[0.3, 0.165, 0.13], [0.4, 0.17, 0.135], [0.52, 0.18, 0.14], [0.66, 0.185, 0.135], [0.72, 0.12, 0.1], [0.76, 0.07, 0.07]];
      AA.loft(Cl, { path: prof.map(r => [0, r[0], 0]), sides: 8, up: () => [0, 0, 1], capStart: true, radius: t => { const r = prof[Math.round(t * (prof.length - 1))]; return [r[1], r[2]]; }, color: () => gcol });
      if (Gm.belt !== false) AA.loft(Cl, { path: [[0, 0.34, 0], [0, 0.37, 0]], sides: 8, up: () => [0, 0, 1], radius: () => [0.18, 0.146], color: () => LP.c('#3a2e27') });
      if (Gm.type === 'casual') { Cl.setSkin([[id('hips'), 1]]); AA.loft(Cl, { path: [[0, 0.3, 0], [0, 0.345, 0]], sides: 8, up: () => [0, 0, 1], radius: () => [0.176, 0.142], color: () => pantsC }); }
      for (const [sd, x] of [['L', 1], ['R', -1]]) {
        Cl.setSkin([[id('thigh' + sd), 1]]); LP.prism(Cl, [B.hipX * x, B.hip + 0.02, 0], [B.hipX * x, B.knee, 0.01], 0.075, 0.062, 6, pantsC);
        Cl.setSkin([[id('shin' + sd), 1]]); LP.prism(Cl, [B.hipX * x, B.knee + 0.01, 0.01], [B.hipX * x, B.ankle + 0.02, 0], 0.062, 0.056, 6, pantsC);
        if (Gm.stripe) { Cl.setSkin([[id('thigh' + sd), 1]]); AA.box(Cl, [B.hipX * x + x * 0.07, (B.hip + B.knee) / 2, 0], [0.01, B.hip - B.knee, 0.025], LP.c(Gm.stripe), 1, {}); Cl.setSkin([[id('shin' + sd), 1]]); AA.box(Cl, [B.hipX * x + x * 0.058, (B.knee + B.ankle) / 2 + 0.01, 0], [0.01, B.knee - B.ankle, 0.025], LP.c(Gm.stripe), 1, {}); }
        Cl.skinFn = AA.autoSkin(sk, ['hips', 'spine', 'chest', 'neck', 'clavL', 'clavR'], 4);
      }
      Cl.skinFn = null;
      if (Gm.tie) { // بدلة: قميص أبيض بفتحة V وربطة عنق
        Cl.skinFn = AA.autoSkin(sk, ['spine', 'chest'], 4);
        LP.tri(Cl, [-0.055, 0.7, 0.115], [0.055, 0.7, 0.115], [0, 0.5, 0.152], white, [0, 0.2, 1]);
        LP.tri(Cl, [-0.016, 0.69, 0.126], [0.016, 0.69, 0.126], [0, 0.53, 0.158], LP.c(Gm.tie), [0, 0.2, 1]);
        Cl.skinFn = null;
      }
      if (Gm.print) { Cl.skinFn = AA.autoSkin(sk, ['spine', 'chest'], 4); AA.box(Cl, [0, 0.57, 0.142], [0.11, 0.08, 0.01], LP.c(Gm.print), 1, {}); Cl.skinFn = null; }
      if (S.vest) { // سترة عاكسة صفراء بشريطين فضيين
        Cl.skinFn = AA.autoSkin(sk, ['spine', 'chest'], 4);
        const vp = [[0.38, 0.182, 0.147], [0.5, 0.192, 0.152], [0.6, 0.198, 0.15], [0.67, 0.19, 0.142]];
        AA.loft(Cl, { path: vp.map(r => [0, r[0], 0]), sides: 8, up: () => [0, 0, 1], radius: t => { const r = vp[Math.round(t * (vp.length - 1))]; return [r[1], r[2]]; }, color: (t) => LP.c(Math.abs(t - 0.33) < 0.1 || Math.abs(t - 0.7) < 0.08 ? '#d8dcdc' : '#e9d531') });
        Cl.skinFn = null;
      }
    } else {
      // ثوب/عباية/جلابية: منشور مثمّن متدرّج، أسفله يتبع الساقين
      Cl.skinFn = pt => {
        const y = pt[1];
        if (y > B.hip + 0.04) return AA.autoSkin(sk, ['hips', 'spine', 'chest', 'neck', 'clavL', 'clavR'], 4)(pt);
        const wl = smooth(-0.6, 0.6, clamp(pt[0] / 0.1, -1, 1)), lo = smooth(B.hip + 0.04, B.knee - 0.04, y), leg = y > B.knee ? 'thigh' : 'shin';
        return [[id('hips'), 1 - lo * 0.85], [id(leg + 'L'), lo * 0.85 * wl], [id(leg + 'R'), lo * 0.85 * (1 - wl)]];
      };
      const GB = Gm.texture ? Fl : Cl; GB.skinFn = Cl.skinFn;
      const prof = Gm.type === 'badawi' ? [[0.04, 0.24, 0.205], [0.2, 0.215, 0.185], [0.36, 0.19, 0.16], [0.5, 0.178, 0.145], [0.64, 0.186, 0.14], [0.72, 0.13, 0.11], [0.76, 0.07, 0.07]]
        : Gm.type === 'dress' ? [[0.09, 0.215, 0.185], [0.2, 0.2, 0.17], [0.34, 0.175, 0.148], [0.5, 0.17, 0.138], [0.64, 0.182, 0.138], [0.72, 0.13, 0.11], [0.76, 0.07, 0.07]]
        : Gm.type === 'abaya' ? [[0.07, 0.21, 0.18], [0.2, 0.195, 0.165], [0.36, 0.178, 0.152], [0.52, 0.185, 0.15], [0.66, 0.19, 0.14], [0.72, 0.13, 0.11], [0.76, 0.07, 0.07]]
        : [[0.075, 0.198, 0.168], [0.2, 0.185, 0.155], [0.36, 0.175, 0.15], [0.52, 0.185, 0.15], [0.66, 0.19, 0.14], [0.72, 0.13, 0.11], [0.76, 0.07, 0.07]];
      const band = (t) => (Gm.trim && t < 0.05) || (Gm.type === 'dress' && (t < 0.05 || Math.abs(t - 0.62) < 0.05));
      AA.loft(GB, { path: prof.map(r => [0, r[0], 0.0]), sides: 8, uvU: 2.4, uvV: 2, up: () => [0, 0, 1], capStart: true, radius: (t) => { const i = Math.round(t * (prof.length - 1)); return [prof[i][1], prof[i][2]]; },
        color: (t) => Gm.texture ? white : band(t) ? trimC : Gm.type === 'thobe' && !Gm.color ? mixc(white, [0.8, 0.78, 0.74], 0.2 * (1 - t)) : gcol });
      Cl.skinFn = Fl.skinFn = null;
      if (Gm.piping) { // قيطان ذهبي بالمايل على الصدر
        Cl.skinFn = AA.autoSkin(sk, ['spine', 'chest'], 4);
        for (let i = 0; i < 6; i++) { const t = i / 5, x = lerp(0.02, 0.13, t), y = lerp(0.655, 0.48, t), z = 0.142 * Math.sqrt(Math.max(0, 1 - Math.pow(x / 0.185, 2))) + 0.004; AA.box(Cl, [x, y, z], [0.012, 0.042, 0.008], trimC, 1, {}, 0.55); }
        Cl.skinFn = null;
      }
    }
    const bisht = S.bisht && S.bisht !== 'none' ? LP.c({ brown: '#7a5232', black: '#2a2422', cream: '#d9c7a0' }[S.bisht] || '#7a5232') : null;
    if (bisht) { // البشت: غلاف أوسع مفتوح من الأمام بحاشية ذهبية
      Cl.skinFn = AA.autoSkin(sk, ['hips', 'spine', 'chest', 'clavL', 'clavR'], 4);
      const rows = [[0.7, 0.2, 0.155], [0.5, 0.205, 0.17], [0.3, 0.21, 0.18], [0.1, 0.225, 0.19]], n = 8, open = 0.45, ids = [];
      for (const [y, rx, rz] of rows) { const r = []; for (let k = 0; k <= n; k++) { const a = lerp(open, Math.PI * 2 - open, k / n); r.push(Cl.v([Math.sin(a) * rx, y, Math.cos(a) * rz], k === 0 || k === n ? LP.c('#c9a24a') : bisht, 0, 0, 0)); } ids.push(r); }
      for (let i = 0; i < rows.length - 1; i++) for (let k = 0; k < n; k++) { Cl.t(ids[i][k], ids[i + 1][k], ids[i + 1][k + 1]); Cl.t(ids[i][k], ids[i + 1][k + 1], ids[i][k + 1]); Cl.t(ids[i][k], ids[i + 1][k + 1], ids[i + 1][k]); Cl.t(ids[i][k], ids[i][k + 1], ids[i + 1][k + 1]); }
      Cl.skinFn = null;
    }
    // الأكمام واليدان والقدمان
    const sleeve = bisht || (Gm.type === 'coverall' ? gcol : Gm.type === 'thobe' && !Gm.color ? white : gcol);
    const hand = S.gloves ? LP.c('#e0b13a') : skin;
    for (const [sd, x] of [['L', 1], ['R', -1]]) {
      const SB = Gm.texture ? Fl : Cl;
      SB.skinFn = AA.autoSkin(sk, ['clav' + sd, 'upArm' + sd, 'loArm' + sd, 'hand' + sd, 'chest'], 6);
      AA.loft(SB, { path: [[0.13 * x, 0.68, 0], [0.2 * x, 0.52, 0], [0.22 * x, 0.4, 0.02]], sides: 6, uvU: 0.9, uvV: 0.8, up: () => [0, 0, 1], capStart: true, capEnd: true, radius: t => lerp(0.07, Gm.type === 'badawi' ? 0.066 : 0.058, t), color: (t) => Gm.texture ? white : Gm.short && t > 0.42 ? skin : Gm.trim && t > 0.85 ? trimC : sleeve });
      if (Gm.texture && Gm.trim) { Cl.skinFn = SB.skinFn; LP.prism(Cl, [0.2178 * x, 0.416, 0.017], [0.2204 * x, 0.396, 0.0206], 0.07, 0.07, 6, trimC); }
      SB.skinFn = Cl.skinFn = null;
      Sk.setSkin([[id('hand' + sd), 1]]);
      LP.ico(Sk, [0.225 * x, 0.35, 0.03], [0.045, 0.055, 0.045], 0, () => hand);
      Sk.setSkin([[id('foot' + sd), 1]]); Dk.setSkin([[id('foot' + sd), 1]]);
      if (S.shoes) { LP.ico(Dk, [B.hipX * x, 0.04, 0.045], [0.052, 0.042, 0.085], 0, d => d[1] < -0.35 ? LP.c('#f2f0ea') : LP.c(S.shoes)); }
      else if (S.boots) LP.ico(Dk, [B.hipX * x, 0.045, 0.045], [0.055, 0.05, 0.085], 0, d => LP.c(d[1] < -0.3 ? '#2b2726' : '#5e3b22'));
      else { LP.ico(Sk, [B.hipX * x, 0.04, 0.05], [0.045, 0.035, 0.07], 0, () => skin); AA.box(Dk, [B.hipX * x, 0.008, 0.05], [0.09, 0.016, 0.17], LP.c('woodDark'), 1, {}); }
      if (Gm.type === 'dress' || S.legs) { Sk.setSkin([[id('shin' + sd), 1]]); LP.prism(Sk, [B.hipX * x, 0.12, 0.005], [B.hipX * x, B.ankle, 0], 0.04, 0.036, 5, Gm.type === 'dress' ? LP.c(Gm.pants || '#f4efe6') : skin); }
    }
    // ---- الرأس والوجه ----
    Sk.setSkin([[id('head'), 1]]);
    LP.ico(Sk, B.head, [B.hr, B.hr * 0.96, B.hr * 0.95], 1, d => mixc(skin, LP.c('skinShade'), d[1] < -0.3 ? 0.4 : 0));
    const burqa = !!(S.head && S.head.burqa);
    if (!burqa) LP.ico(Sk, [0, 0.95, 0.225], 0.035, 0, () => mixc(skin, LP.c('skinShade'), 0.5));
    Dk.setSkin([[id('head'), 1]]); Hr.setSkin([[id('head'), 1]]);
    const browC = S.brows || LP.c('#2b2420');
    for (const s of [1, -1]) {
      AA.box(Dk, [s * 0.075, 1.0, 0.2], [0.04, S.lashes ? 0.06 : 0.065, 0.02], LP.c('black'), 1, {});
      AA.box(Hr, [s * 0.067, 1.015, 0.212], [0.012, 0.014, 0.01], white, 1, {});
      if (S.lashes) AA.box(Dk, [s * 0.088, 1.035, 0.205], [0.05, 0.012, 0.02], LP.c('black'), 1, {}, s * 0.25);
      else if (!S.niqabBrows) AA.box(Hr, [s * 0.08, 1.065, 0.2], [0.075, 0.022, 0.03], browC, 1, {}, s * 0.15);
    }
    if (S.beard) { // اللحية الكبيرة والشارب
      const bc = mixc(white, LP.c('#8c8780'), S.grey || 0);
      LP.ico(Hr, [0, 0.86, 0.1], [0.19 * S.beard + 0.02, 0.14 * S.beard + 0.02, 0.13], 1, () => bc, { keep: d => d[1] < 0.35 && d[2] > -0.15 });
      AA.box(Hr, [0, 0.92, 0.225], [0.14, 0.035, 0.04], bc, 1, {});
    } else {
      if (!burqa) AA.box(Dk, [0, 0.885, 0.21], [0.05, 0.012, 0.02], LP.c('#7a3a2a'), 1, {}); // فم صغير
      if (S.mustache) AA.box(Hr, [0, 0.915, 0.222], [0.1, 0.022, 0.03], LP.c('#2b2420'), 1, {});
    }
    // ---- غطاء الرأس ----
    const H = S.head || { type: 'hair' }, hairC = LP.c(H.hairColor === 'brown' ? '#5a3a22' : '#2b2420');
    const face = d => d[2] > 0.25 && d[1] < 0.36 && Math.abs(d[0]) < 0.8; // لا يغطي الشعر الوجه
    const hairCap = (r, keep) => LP.ico(Hr, [0, 1.0, -0.005], [r, r * 0.98, r], 1, () => hairC, { keep: d => keep(d) && !face(d) });
    if (H.type === 'shemagh') headCloth(Sh, Pl, id, q, { pattern: true, fold: true, stripes: true });
    else if (H.type === 'ghutra') headCloth(Sh, Pl, id, q, { color: LP.c('#f7f4ee'), fold: true });
    else if (H.type === 'shayla' || H.type === 'scarf') headCloth(Sh, Pl, id, q, { color: LP.c(H.color || '#26211f'), open: 0.74, tip: 0, front: H.long ? 0.2 : 0.1, long: H.long ? 0.27 : 0, tight: true });
    else if (H.type === 'taqiyah') { hairCap(B.hr + 0.008, d => d[1] > 0.05 || d[2] < -0.3); Pl.setSkin([[id('head'), 1]]); LP.ico(Pl, [0, 1.0, -0.005], [B.hr + 0.022, B.hr + 0.02, B.hr + 0.022], 1, d => AA.vary(white, rng, 0.03), { keep: d => d[1] > 0.42 }); }
    else if (H.type === 'helmet') {
      hairCap(B.hr + 0.008, d => d[1] > 0.0 || d[2] < -0.3);
      Pl.setSkin([[id('head'), 1]]); const hc = LP.c({ yellow: '#f0bf3a', white: '#f4f2ee' }[H.color] || '#f0bf3a');
      LP.ico(Pl, [0, 1.02, -0.005], [B.hr + 0.04, B.hr + 0.03, B.hr + 0.045], 1, () => hc, { keep: d => d[1] > 0.12 });
      LP.prism(Pl, [0, 1.065, 0.0], [0, 1.085, 0.0], B.hr + 0.075, B.hr + 0.06, 10, hc, { sx: 1, rot: 0.3 });
      LP.prism(Pl, [0, 1.24, -0.2], [0, 1.27, 0.15], 0.03, 0.03, 4, mixc(hc, [0, 0, 0], 0.12));
    } else if (H.type === 'girlHair') {
      hairCap(B.hr + 0.014, d => d[1] > -0.05 || (d[2] < -0.1 && d[1] > -0.6));
      AA.box(Hr, [0, 1.1, 0.215], [0.3, 0.06, 0.05], hairC, 1, {}); // غُرّة
      for (const s of [1, -1]) { LP.ico(Hr, [s * 0.2, 0.93, -0.08], [0.07, 0.11, 0.07], 0, () => hairC); LP.ico(Hr, [s * 0.215, 1.03, -0.07], 0.035, 0, () => LP.c('#d43b35')); }
    } else if (H.type === 'cap') { // كاب: شعر قصير + طاقية مستديرة ومقدمة بارزة
      hairCap(B.hr + 0.01, d => d[1] > 0.0 || (d[2] < -0.25 && d[1] > -0.45)); Pl.setSkin([[id('head'), 1]]); const cc = LP.c(H.color || '#c23b33');
      LP.ico(Pl, [0, 1.0, -0.005], [B.hr + 0.03, B.hr + 0.02, B.hr + 0.03], 1, () => cc, { keep: d => d[1] > 0.3 });
      LP.prism(Pl, [0, 1.11, 0.12], [0, 1.115, 0.34], 0.13, 0.11, 6, cc, { sx: 1.25 });
    } else if (H.type === 'hair') hairCap(B.hr + 0.012, d => d[1] > 0.12 || (d[2] < -0.25 && d[1] > -0.45));
    if (H.agal) agal(Dk, q);
    if (H.niqab) { Pl.setSkin([[id('head'), 1]]); LP.ico(Pl, B.head, [B.hr + 0.012, B.hr * 0.96 + 0.012, B.hr * 0.95 + 0.014], 1, () => LP.c(H.color || '#26211f'), { keep: d => d[2] > 0.15 && d[1] < -0.12 }); }
    if (H.burqa) { // برقع: عصابة الجبهة وغطاء تحت العينين وسيف على الأنف، بإطار ذهبي حول فتحة العينين
      const bc = LP.c(H.color || '#26211f'), gold = trimC, C = B.head, ex = B.hr + 0.014, ey = B.hr * 0.96 + 0.014, ez = B.hr * 0.95 + 0.016;
      const zAt = (x, y, e) => C[2] + (ez + (e || 0)) * Math.sqrt(Math.max(0, 1 - Math.pow(x / (ex + (e || 0)), 2) - Math.pow((y - C[1]) / (ey + (e || 0)), 2)));
      Pl.setSkin([[id('head'), 1]]); Dk.setSkin([[id('head'), 1]]);
      LP.ico(Pl, C, [ex, ey, ez], 1, () => bc, { keep: d => d[2] > -0.1 && (d[1] < -0.05 || d[1] > 0.2 || Math.abs(d[0]) > 0.56) });
      LP.prism(Pl, [0, 0.975, 0.235], [0, 0.93, 0.25], 0.03, 0.036, 4, bc); // بروز الأنف تحت البرقع
      AA.box(Pl, [0, 1.0, zAt(0, 1.0) - 0.004], [0.034, 0.075, 0.02], bc, 1, {});
      for (let i = 0; i < 7; i++) { const x = lerp(-0.13, 0.13, i / 6), y = 1.033 + 0.01 * Math.cos(x * 9); AA.box(Pl, [x, y, zAt(x, y, 0.004)], [0.041, 0.011, 0.012], gold, 1, {}); }
    }
    // ---- الإكسسوارات ----
    if (S.cane) { Wd.setSkin([[id('handR'), 1]]); const g0 = [-0.225, 0.35, 0.06]; LP.chain(Wd, [[g0[0], 0.01, g0[2] + 0.02], [g0[0], g0[1] + 0.05, g0[2]], [g0[0], g0[1] + 0.1, g0[2] + 0.04], [g0[0], g0[1] + 0.08, g0[2] + 0.09]], [0.016, 0.016, 0.016, 0.014], 5, () => LP.c('wood')); }
    if (S.tool) { Wd.setSkin([[id('handR'), 1]]); LP.prism(Wd, [-0.225, 0.37, 0.05], [-0.225, 0.2, 0.08], 0.014, 0.014, 5, LP.c('#9aa0a4')); AA.box(Wd, [-0.225, 0.19, 0.08], [0.03, 0.05, 0.07], LP.c('#7d8387'), 1, {}); }

    // ---- الحركة ----
    const st = S.stoop || 0, clips = {};
    clips.idle = AA.clip(sk, 4, 30, true, t => { const w = t / 4 * Math.PI * 2, b = Math.sin(w * 1.5); return { spine: [5 * st, 0, 0], chest: [1.5 * b + 4 * st, 0, 0], head: [3 * Math.sin(w * 0.5) - 7 * st, 14 * Math.sin(w), 3 * Math.sin(w * 2)], upArmL: [4, 0, 8 + 2 * b], upArmR: S.cane ? [-14, 0, -6] : [4, 0, -8 - 2 * b], loArmR: S.cane ? [-24, 0, 0] : [-10, 0, 0], loArmL: [-10, 0, 0], move: [0, 0.004 * b, 0] }; });
    clips.walk = AA.gaitClip(sk, { duration: 0.8, speed: 0.55, extra: t => {
      const ph = t / 0.8 * Math.PI * 2, s = Math.sin(ph);
      return { hips: [0, 8 * s, 4 * Math.sin(ph)], spine: [4 * st, 0, 0], chest: [4 * st, -6 * s, 0], head: [-3 - 6 * st, 0, -3 * Math.sin(ph)], upArmL: [26 * s, 0, 8], loArmL: [-16, 0, 0], upArmR: S.cane ? [-10 - 6 * s, 0, -6] : [-26 * s, 0, -8], loArmR: S.cane ? [-22, 0, 0] : [-16, 0, 0], move: [0, 0.012 * Math.cos(ph * 2), 0] };
    }, legs: [['L', 0], ['R', 0.5]].map(([sd, ph]) => ({ chain: ['thigh' + sd, 'shin' + sd], foot: 'foot' + sd, phase: ph, duty: 0.6, lift: 0.085, limits: [[-70, 40], [0, 120]], init: [-5, 10], footSwing: 0 })) });
    clips.wave = AA.clip(sk, 1.4, 30, true, t => { const w = t / 1.4 * Math.PI * 2; return { upArmL: [-10, 0, 140], loArmL: [-20, 0, 30 + 25 * Math.sin(w * 2)], head: [0, 10, -6], chest: [0, 6, -3], upArmR: [-14, 0, -6], loArmR: S.cane ? [-24, 0, 0] : [-14, 0, 0] }; });
    // جالس على دكة/كرسي: الورك على ارتفاع SEAT الحقيقي والساقان متدليتان
    const seatY = (SEAT + (Gm.type === 'coverall' || Gm.type === 'casual' ? 0.05 : 0)) / S.k - B.hip;
    clips.sit = AA.clip(sk, 4, 30, true, t => { const w = t / 4 * Math.PI * 2, b = Math.sin(w * 1.5); return { thighL: [-88, 0, 4], thighR: [-88, 0, -4], shinL: [80 + 6 * Math.sin(w), 0, 0], shinR: [80 - 6 * Math.sin(w), 0, 0], footL: [10, 0, 0], footR: [10, 0, 0], spine: [4 * st, 0, 0], chest: [2 * b + 3 * st, 0, 0], head: [-4 * st, 12 * Math.sin(w), 0], upArmL: [-24, 0, 10], loArmL: [-50, 0, 0], upArmR: [-24, 0, -10], loArmR: [-50, 0, 0], handR: S.cane ? [40, 0, 0] : [0, 0, 0], move: [0, seatY, -0.02] }; });
    clips.sit_floor = AA.clip(sk, 4, 30, true, t => { const w = t / 4 * Math.PI * 2, b = Math.sin(w * 1.5); return { thighL: [-90, -10, 55], thighR: [-90, 10, -55], shinL: [170, 0, -30], shinR: [170, 0, 30], footL: [-30, 0, 0], footR: [-30, 0, 0], chest: [2 * b + 3 * st, 0, 0], head: [-3 * st, 12 * Math.sin(w), 0], upArmL: [-20, 0, 20], loArmL: [-45, 0, 0], upArmR: [-20, 0, -20], loArmR: [-45, 0, 0], handR: S.cane ? [85, 0, 0] : [0, 0, 0], move: [0, -B.hip + 0.17, -0.03] }; });
    if (S.work) clips.work = AA.clip(sk, 1.2, 30, true, t => { const w = t / 1.2 * Math.PI * 2, s = Math.sin(w); return { spine: [12, 0, 0], chest: [8 + 3 * s, -10, 0], head: [10, -8, 0], thighL: [-14, 0, 4], shinL: [24, 0, 0], thighR: [-6, 0, -4], shinR: [14, 0, 0], upArmR: [-80 + 45 * s, 0, -12], loArmR: [-40 - 25 * s, 0, 0], upArmL: [-40, 0, 14], loArmL: [-50, 0, 0], move: [0, 0, 0] }; });

    const out = LP.finalize(S.id, {
      cloth: { builder: Cl, material: LP.mat('cloth') },
      skin:  { builder: Sk, material: LP.mat('skin') },
      hair:  { builder: Hr, material: LP.mat('hair') },
      floral: { builder: Fl, material: LP.mat('cloth', { texture: Gm.texture || 'cloth' }) },
      shem:  { builder: Sh, material: LP.mat('cloth', { doubleSided: true, texture: 'shemagh_light' }) },
      head:  { builder: Pl, material: LP.mat('cloth', { doubleSided: true }) },
      dark:  { builder: Dk, material: LP.mat('dark') },
      wood:  { builder: Wd, material: LP.mat('wood') }
    }, { stiffness: 0, height: 1.25, radius: 0.3, collider: { type: 'capsule', radius: 0.22, height: 1.25, axis: 'y' }, skeleton: sk.toJSON(), clips, walkSpeed: 0.55 });
    return scaleOut(out, S.k);
  }
  const kOf = H => clamp((0.42 + 0.48 * H) / 1.25, 0.5, 1.05);

  // ---------- الشخصيات ----------
  LP.def('shaib', (p, q) => person(p, q, { id: 'lp_shaib', k: 1, skin: p.skin, garment: { type: 'thobe' }, bisht: p.bisht, head: { type: 'shemagh', agal: true }, beard: p.beard, grey: p.grey, brows: LP.c('white'), cane: true, stoop: p.stoop * 0.8 }));
  AA.assets.lp_shaib.clips = AA.assets.lp_shaib.clips.concat([['wave', 'يلوّح']]);
  LP.def('woman', (p, q) => person(p, q, { id: 'lp_woman', k: kOf(p.height), skin: p.skin, garment: { type: 'abaya', color: '#1f1b1a', trim: p.trim, trimColor: '#b48a3c' }, head: { type: 'shayla', color: '#1f1b1a', niqab: p.veil === 'niqab' }, lashes: true, niqabBrows: true }));
  LP.def('badawiya', (p, q) => person(p, q, { id: 'lp_badawiya', k: kOf(p.height), skin: p.skin, garment: { type: 'badawi', color: p.dress === 'black' ? '#1f1b1a' : '#a8232b', texture: p.dress === 'floral' ? 'floral_red' : null, trim: p.gold, piping: p.gold, trimColor: '#d0a443' },
    head: { type: 'shayla', color: '#1f1b1a', long: p.long, burqa: p.burqa, niqab: false }, lashes: true, niqabBrows: true }));
  LP.def('child', (p, q) => person(p, q, { id: 'lp_child', k: kOf(p.height), skin: p.skin, garment: { type: 'thobe', color: p.outfit === 'color' ? '#6f9fd0' : null }, head: { type: p.taqiyah ? 'taqiyah' : 'hair' } }));
  LP.def('worker', (p, q) => person(p, q, { id: 'lp_worker', k: kOf(p.height), skin: p.skin, garment: { type: 'coverall', color: { blue: '#35609c', orange: '#e0782f', khaki: '#b39a6a' }[p.suit] || '#35609c' }, head: { type: p.helmet === 'none' ? 'hair' : 'helmet', color: p.helmet }, vest: p.vest, gloves: p.gloves, tool: p.tool, mustache: p.mustache, boots: true, work: true }));
  LP.def('girl', (p, q) => person(p, q, { id: 'lp_girl', k: kOf(p.height), skin: p.skin, garment: { type: 'dress', color: { pink: '#e88aa8', teal: '#3aa59b', red: '#d4453c', purple: '#9469b8', green: '#5aa457', floral: '#c23a36' }[p.dress] || '#e88aa8', texture: p.dress === 'floral' ? 'floral_red' : null, trimColor: '#f0c94a' }, head: p.scarf ? { type: 'scarf', color: '#f4efe6' } : { type: 'girlHair', hairColor: p.hairColor }, lashes: true }));
  LP.def('boy', (p, q) => person(p, q, { id: 'lp_boy', k: kOf(p.height), skin: p.skin, garment: { type: 'thobe' }, head: { type: p.headwear === 'none' ? 'hair' : p.headwear, agal: p.agal && (p.headwear === 'shemagh' || p.headwear === 'ghutra') } }));
  LP.chibiScale = kOf;
  LP.person = person; // يستخدمه kit/kit-people.js للشخصيات العصرية
})(typeof window !== 'undefined' ? window : globalThis);
