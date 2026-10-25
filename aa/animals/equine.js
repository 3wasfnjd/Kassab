// Aboden Assets — animals/equine.js
// الخيل العربي والحمار من مولّد واحد: جسم، رقبة مقوّسة، رأس، أذنان، معرفة، ذيل، أرجل بحوافر.
// عُدّة جرّ اختيارية (طوق، قربوس، حزام، لجام) للعربة. حركات: وقوف، مشي رباعي، رعي.
(function (g) {
  'use strict';
  const AA = g.AA;
  const V = AA.v, hex = AA.hex, mixc = AA.mixc, vary = AA.vary, lerp = AA.lerp, smooth = AA.smooth;
  const Q = { high: { s: 18, n: 24, l: 5 }, med: { s: 12, n: 16, l: 4 }, low: { s: 7, n: 9, l: 2 } };
  const ra = (rs, t) => { for (let i = 0; i < rs.length - 1; i++) if (t <= rs[i + 1][0]) return lerp(rs[i][1], rs[i + 1][1], smooth(rs[i][0], rs[i + 1][0], t)); return rs[rs.length - 1][1]; };
  const poly = (pts, per) => { const o = []; for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < per; k++) o.push(V.lerp(pts[i], pts[i + 1], k / per)); o.push(pts[pts.length - 1]); return o; };

  // [جسم، ظهر، بطن، معرفة وذيل، أرجل سفلية، خطم]
  const COATS = {
    bay:      ['#7a4424', '#6a3a1e', '#8a5432', '#1c1614', '#1e1816', '#3a2418'],  // أحمر بأطراف سود
    chestnut: ['#9a5a2e', '#8a4e26', '#ab6a3c', '#b8743e', '#8a5028', '#5a3420'],  // أشقر
    grey:     ['#d8d4ce', '#c8c4be', '#e6e2dc', '#e8e6e2', '#bab6b0', '#6e6a66'],  // أشهب
    black:    ['#1e1a19', '#181514', '#2a2523', '#121010', '#141110', '#221c1a'],  // أدهم
    donkey:   ['#8c8680', '#7e7872', '#d6d0c6', '#3a3430', '#77716b', '#e2ddd4']   // حمار رمادي ببطن وخطم أبيض
  };

  function skeleton(S, D) {
    const k = new AA.Skeleton(), P = a => a.map(v => v * S), X = (a, x) => P([a[0] * x, a[1], a[2]]);
    k.add('root', null, P([0, 1.42, 0]), P([0, 1.44, -0.35]));
    k.add('rear', 'root', P([0, 1.44, -0.35]), P([0, 1.4, -0.78]));
    k.add('chest', 'root', P([0, 1.42, 0.3]), P([0, 1.42, 0.62]));
    k.add('neck1', 'chest', P([0, 1.5, 0.58]), P([0, 1.72, 0.82]));
    k.add('neck2', 'neck1', P([0, 1.72, 0.82]), P([0, 1.95, 1.0]));
    k.add('head', 'neck2', P([0, 1.95, 1.0]), P([0, 1.55, 1.42]));
    k.add('tail', 'rear', P([0, 1.42, -0.8]), P([0, 0.8, -0.92]));
    for (const [sd, x] of [['L', 1], ['R', -1]]) {
      k.add('upF' + sd, 'chest', X([0.16, 1.32, 0.52], x), X([0.17, 1.02, 0.48], x));
      k.add('lowF' + sd, 'upF' + sd, X([0.17, 1.02, 0.48], x), X([0.17, 0.52, 0.5], x));
      k.add('canF' + sd, 'lowF' + sd, X([0.17, 0.52, 0.5], x), X([0.17, 0.14, 0.52], x));
      k.add('hoofF' + sd, 'canF' + sd, X([0.17, 0.14, 0.52], x), X([0.17, 0.02, 0.58], x));
      k.add('thighB' + sd, 'rear', X([0.17, 1.42, -0.6], x), X([0.18, 1.0, -0.42], x));
      k.add('shankB' + sd, 'thighB' + sd, X([0.18, 1.0, -0.42], x), X([0.17, 0.58, -0.72], x));
      k.add('canB' + sd, 'shankB' + sd, X([0.17, 0.58, -0.72], x), X([0.17, 0.14, -0.68], x));
      k.add('hoofB' + sd, 'canB' + sd, X([0.17, 0.14, -0.68], x), X([0.17, 0.02, -0.63], x));
    }
    return k;
  }

  function equine(p, quality, donkey) {
    const q = Q[quality] || Q.med, rng = AA.rng(p.seed), S = p.size, sk = skeleton(S, donkey);
    const C = (COATS[donkey ? 'donkey' : p.coat] || COATS.bay).map(hex);
    const B = new AA.Builder(), D = new AA.Builder(), M = new AA.Builder(), Hf = new AA.Builder(), L = new AA.Builder(), Mt = new AA.Builder();
    const P3 = (x, y, z) => [x * S, y * S, z * S];
    const tone = c => vary(c, rng, 0.04);
    const HK = donkey ? 1.22 : 1; // رأس الحمار أكبر نسبياً

    // الجسم
    const spine = AA.bezier([P3(0, 1.36, -0.8), P3(0, 1.48, -0.35), P3(0, 1.4, 0.2), P3(0, 1.42, 0.68)], q.n);
    const bodyR = (t, ang) => {
      const c = Math.cos(ang), up = c > 0;
      const w = ra([[0, 0.15], [0.1, 0.29], [0.3, 0.31], [0.6, 0.3], [0.85, 0.27], [1, 0.14]], t) * (donkey ? 1.1 : 1);
      let ry = up ? ra([[0, 0.15], [0.1, 0.2], [0.5, 0.17], [0.85, 0.2], [1, 0.15]], t) : ra([[0, 0.18], [0.12, 0.36], [0.5, 0.46], [0.85, 0.44], [1, 0.22]], t) * (donkey ? 1.08 : 1);
      if (up) ry += 0.04 * Math.exp(-Math.pow((t - 0.86) / 0.07, 2)) * Math.pow(c, 3); // الحارك
      return [w * S, ry * S];
    };
    B.skinFn = AA.autoSkin(sk, ['root', 'rear', 'chest', 'neck1', 'upFL', 'upFR', 'thighBL', 'thighBR'], 4);
    AA.loft(B, { path: spine, sides: q.s, radius: bodyR, capStart: true, capEnd: true, uvU: 3, uvV: 2,
      color: (t, ang) => { const c = Math.cos(ang); let col = c > 0.5 ? C[1] : c < -0.35 ? mixc(C[0], C[2], smooth(-0.35, -0.8, c)) : C[0];
        if (donkey && c > 0.93) col = mixc(col, C[3], 0.6); // الخط الظهري للحمار
        return tone(col); } });
    // الرقبة المقوّسة
    const neck = AA.bezier([P3(0, 1.42, 0.5), P3(0, 1.62, 0.78), P3(0, 1.86, 0.92), P3(0, 1.98, 1.02)], q.n);
    B.skinFn = AA.autoSkin(sk, ['chest', 'neck1', 'neck2', 'head'], 5);
    AA.loft(B, { path: neck, sides: q.s, up: () => [0, 1, -0.5], uvU: 2, uvV: 2,
      radius: (t, ang) => { const r = ra([[0, 0.32], [0.3, 0.22], [0.75, 0.15], [1, 0.13]], t) * S * (donkey ? 1.08 : 1); return [r * 0.6, r * (Math.cos(ang) < 0 ? 1.15 : 0.9)]; },
      color: (t, ang) => tone(Math.cos(ang) < -0.5 ? mixc(C[0], C[2], 0.3) : C[0]) });
    // الرأس: من مؤخرة الرأس إلى الخطم
    const hp = poly([P3(0, 1.97, 0.97), P3(0, 1.93, 1.07), P3(0, 1.8, 1.21), P3(0, 1.65, 1.34), P3(0, 1.59, 1.39)].map((pt, i) => i === 0 ? pt : V.add(P3(0, 1.98, 0.98), V.scale(V.sub(pt, P3(0, 1.98, 0.98)), HK))), q.l);
    B.skinFn = AA.autoSkin(sk, ['neck2', 'head'], 6);
    AA.loft(B, { path: hp, sides: q.s, up: () => [0, 0.6, 0.8], capStart: true, capEnd: true, uvU: 1, uvV: 2,
      radius: (t, ang) => { const c = Math.cos(ang); const w = ra([[0, 0.09], [0.25, 0.105], [0.6, 0.078], [0.85, 0.07], [1, 0.072]], t) * S * HK; let h = ra([[0, 0.12], [0.22, 0.14], [0.6, 0.09], [1, 0.08]], t) * S * HK; if (c < 0) h *= 1 + 0.25 * Math.exp(-Math.pow((t - 0.18) / 0.12, 2)); return [w, h]; },
      color: t => tone(t > 0.7 ? mixc(C[0], C[5], smooth(0.7, 0.95, t)) : C[0]) });
    const hpt = t => { const f = t * (hp.length - 1), i = Math.min(hp.length - 2, Math.floor(f)); return V.lerp(hp[i], hp[i + 1], f - i); };
    // الأذنان
    B.setSkin([[sk.id('head'), 1]]);
    const earL = donkey ? 0.26 : 0.13;
    for (const x of [1, -1]) {
      const e0 = V.add(hpt(0.08), P3(0.05 * x * HK, 0.07 * HK, 0)), e1 = V.add(e0, P3(0.04 * x, earL, -0.02 - (donkey ? 0.04 : 0)));
      AA.loft(B, { path: AA.bezier([e0, V.lerp(e0, e1, 0.5), e1], 5), sides: 6, capEnd: true, up: () => [0, 0, 1], radius: t => [0.02 * S * (1 - 0.6 * t) * HK, 0.035 * S * Math.sin(Math.PI * Math.min(1, 0.25 + t * 0.9)) * (donkey ? 1.2 : 1)],
        color: t => tone(donkey && t > 0.75 ? C[3] : C[0]) });
    }
    // العيون والمنخران
    D.setSkin([[sk.id('head'), 1]]);
    for (const x of [1, -1]) {
      const e = V.add(hpt(0.22), P3(0.088 * x * HK, 0.025 * HK, 0));
      AA.blob(D, e, [0.012 * S, 0, 0], [0, 0.017 * S, 0], [0, 0, 0.022 * S], () => [0.05, 0.035, 0.03], 0, 0, 0, null, 0, quality === 'low');
      const nz = V.add(hpt(0.96), P3(0.035 * x * HK, 0.02 * HK, 0.02));
      AA.blob(D, nz, [0.01 * S, 0, 0], [0, 0.018 * S, 0], [0, 0, 0.01 * S], () => [0.08, 0.06, 0.05], 0, 0, 0, null, 0, true);
    }
    // المعرفة (الحمار: قصيرة واقفة، الخيل: منسدلة على جنب)
    M.skinFn = AA.autoSkin(sk, ['chest', 'neck1', 'neck2', 'head'], 5);
    const crest = t => { const f = t * (neck.length - 1), i = Math.min(neck.length - 2, Math.floor(f)), c = V.lerp(neck[i], neck[i + 1], f - i); const r = ra([[0, 0.32], [0.3, 0.22], [0.75, 0.15], [1, 0.13]], t) * S * 0.9; return [c, r]; };
    const nm = quality === 'low' ? 8 : (donkey ? 36 : 22);
    for (let k = 0; k <= nm; k++) {
      const t = 0.12 + 0.86 * k / nm, [c, r] = crest(t), top = V.add(c, [0, r * 0.88, -r * 0.3]);
      const dir = donkey ? V.norm([0, 1, -0.25]) : V.norm([0.85, -0.35, -0.2]);
      AA.ribbon(M, top, dir, (donkey ? 0.06 : 0.17 + 0.05 * Math.sin(k)) * S, (donkey ? 0.045 : 0.07) * S, 2, donkey ? 0 : 0.7, tone(C[3]), mixc(C[3], [0, 0, 0], 0.2), 0, rng() * 6, 0.3, rng, { taper: false, twist: 0.4 });
    }
    // الناصية على الجبهة
    if (!donkey) AA.ribbon(M, V.add(hpt(0.05), P3(0, 0.1, 0)), V.norm([0, -0.2, 1]), 0.14 * S, 0.06 * S, 2, 0.6, tone(C[3]), C[3], 0, 0, 0.3, rng, { taper: true });
    // الذيل
    M.skinFn = AA.autoSkin(sk, ['rear', 'tail'], 6);
    if (donkey) {
      AA.loft(M, { path: AA.bezier([P3(0, 1.36, -0.8), P3(0, 1.15, -0.88), P3(0, 0.82, -0.88)], 7), sides: 6, capEnd: true, radius: t => 0.025 * S * (1 - 0.4 * t) + 0.035 * S * smooth(0.75, 0.95, t), color: t => tone(t > 0.75 ? C[3] : C[0]) });
    } else {
      const strands = quality === 'low' ? 4 : 10;
      for (let k = 0; k < strands; k++) {
        const a = (k / strands - 0.5) * 0.9, base = P3(Math.sin(a) * 0.03, 1.4, -0.82);
        const pts = AA.bezier([base, P3(Math.sin(a) * 0.08, 1.38, -0.98), P3(Math.sin(a) * 0.12, 0.95, -0.98), P3(Math.sin(a) * 0.14, 0.62 - 0.05 * rng(), -0.92)], 7);
        AA.tube(M, pts, pts.map((_, i) => (0.035 - 0.022 * i / 6) * S), 5, () => tone(C[3]), () => 0, 0, null, true);
      }
    }
    // الأرجل
    for (const [sd, x] of [['L', 1], ['R', -1]]) {
      const X = (a) => P3(a[0] * x, a[1], a[2]);
      B.skinFn = AA.autoSkin(sk, ['chest', 'upF' + sd, 'lowF' + sd, 'canF' + sd, 'hoofF' + sd], 7);
      AA.loft(B, { path: poly([X([0.15, 1.3, 0.52]), X([0.17, 1.02, 0.48]), X([0.17, 0.52, 0.5]), X([0.17, 0.14, 0.52]), X([0.17, 0.08, 0.55])], q.l), sides: Math.max(6, q.s - 5), up: () => [0, 0, 1],
        radius: t => { const r = ra([[0, 0.11], [0.25, 0.085], [0.45, 0.06], [0.5, 0.065], [0.58, 0.042], [0.85, 0.04], [0.9, 0.05], [1, 0.045]], t) * S; return [r * 0.85, r * (t < 0.3 ? 1.3 : 1)]; },
        color: t => tone(t > 0.55 ? C[4] : C[0]) });
      B.skinFn = AA.autoSkin(sk, ['rear', 'thighB' + sd, 'shankB' + sd, 'canB' + sd, 'hoofB' + sd], 7);
      AA.loft(B, { path: poly([X([0.13, 1.4, -0.58]), X([0.18, 1.0, -0.42]), X([0.17, 0.58, -0.72]), X([0.17, 0.14, -0.68]), X([0.17, 0.08, -0.64])], q.l), sides: Math.max(6, q.s - 5), up: () => [0, 0, 1],
        radius: t => { const r = ra([[0, 0.19], [0.2, 0.12], [0.35, 0.075], [0.5, 0.06], [0.56, 0.045], [0.85, 0.04], [0.9, 0.05], [1, 0.045]], t) * S; return [r * (t < 0.3 ? 0.6 : 0.85), r]; },
        color: t => tone(t > 0.55 ? C[4] : C[0]) });
      // الحوافر
      for (const [z, bone] of [[0.56, 'hoofF' + sd], [-0.645, 'hoofB' + sd]]) {
        Hf.setSkin([[sk.id(bone), 1]]);
        AA.loft(Hf, { path: [P3(0.17 * x, 0.085, z - 0.01), P3(0.17 * x, 0.002, z + 0.015)], sides: 8, up: () => [0, 0, 1], capStart: true, capEnd: true, radius: t => [lerp(0.045, 0.058, t) * S, lerp(0.045, 0.065, t) * S], color: () => [0.16, 0.13, 0.11] });
      }
    }

    // العُدّة: لجام + طوق + قربوس + حزام (للجر)
    if (p.harness) {
      L.skinFn = AA.autoSkin(sk, ['neck1', 'chest'], 4);
      const collar = []; for (let k = 0; k <= 20; k++) { const a = k / 20 * Math.PI * 2, [c, r] = crest(0.08); collar.push(V.add(c, [Math.sin(a) * r * 0.68, Math.cos(a) * r * 1.05, -Math.cos(a) * r * 0.25])); }
      AA.tube(L, collar, collar.map(() => 0.04 * S), 7, () => [0.42, 0.24, 0.14], () => 0, 0, null, false);
      Mt.skinFn = L.skinFn; // عودا الطوق المعدنيان على الجانبين
      for (const [i0, i1] of [[3, 8], [13, 18]]) { const seg = collar.slice(i0, i1).map(q0 => V.add(q0, [Math.sign(q0[0]) * 0.03 * S, 0, 0.01])); AA.tube(Mt, seg, seg.map(() => 0.012 * S), 4, () => [1, 1, 1], () => 0, 0, null, true); }
      L.skinFn = AA.autoSkin(sk, ['root', 'chest'], 4);
      const pad = []; for (let k = 0; k <= 16; k++) { const a = lerp(-1.9, 1.9, k / 16), f = 0.6 * spine.length; const c = spine[Math.round(f)], [w, ry] = bodyR(0.62, a); pad.push(V.add(c, [-Math.sin(a) * (w + 0.015 * S), Math.cos(a) * (ry + 0.015 * S), 0])); }
      AA.tube(L, pad, pad.map((_, k) => (k > 5 && k < 11 ? 0.05 : 0.03) * S), 6, () => [0.5, 0.15, 0.12], () => 0, 0, null, false);
      const band = []; for (let k = 0; k <= 20; k++) { const a = k / 20 * Math.PI * 2, c = spine[Math.round(0.6 * spine.length)], [w, ry] = bodyR(0.62, a); band.push(V.add(c, [-Math.sin(a) * (w + 0.008 * S), Math.cos(a) * (ry + 0.008 * S), 0])); }
      AA.tube(L, band, band.map(() => 0.018 * S), 4, () => [0.36, 0.22, 0.13], () => 0, 0, null, false);
      L.setSkin([[sk.id('head'), 1]]);
      for (const t of [0.35, 0.82]) { const c = hpt(t), ring = []; for (let k = 0; k <= 16; k++) { const a = k / 16 * Math.PI * 2; ring.push(V.add(c, [Math.sin(a) * 0.1 * S * HK * (t > 0.5 ? 0.78 : 1), Math.cos(a) * 0.12 * S * HK * (t > 0.5 ? 0.72 : 1), -Math.cos(a) * 0.04 * S])); } AA.tube(L, ring, ring.map(() => 0.01 * S), 4, () => [0.3, 0.18, 0.1], () => 0, 0, null, false); }
    }

    // الحركة
    const clips = {};
    clips.idle = AA.clip(sk, 4.6, 30, true, t => {
      const w = t / 4.6 * Math.PI * 2;
      return { move: [0, 0.004 * S * Math.sin(w * 2), 0], neck1: [2 * Math.sin(w), 0, 0], neck2: [0, 6 * Math.sin(w), 0], head: [3 * Math.sin(w * 3), 0, 0], tail: [0, 0, 14 * Math.sin(w * 2)],
        hoofBL: [-14 * Math.max(0, Math.sin(w * 0.5 + 1)), 0, 0], canBL: [10 * Math.max(0, Math.sin(w * 0.5 + 1)), 0, 0] };
    });
    // مشي رباعي: خلفي يسار، أمامي يسار، خلفي يمين، أمامي يمين
    const wd = donkey ? 0.85 : 1.05;
    clips.walk = AA.gaitClip(sk, { duration: wd, speed: (donkey ? 0.95 : 1.4) * S, extra: t => {
      const ph = t / wd * Math.PI * 2;
      return { move: [0, 0.012 * S * Math.cos(ph * 4), 0], neck1: [4 * Math.sin(ph * 2), 0, 0], head: [-3 * Math.sin(ph * 2), 0, 0], tail: [0, 0, 10 * Math.sin(ph)] };
    }, legs: [['L', 0, 0.75], ['R', 0.5, 0.25]].flatMap(([sd, hp, fp]) => [
      { chain: ['upF' + sd, 'lowF' + sd, 'canF' + sd], foot: 'hoofF' + sd, phase: fp, duty: 0.64, lift: 0.13 * S, footSwing: 35, limits: [[-40, 40], [-40, 20], [0, 105]], init: [0, 0, 0], pref: [0, 0, 0], swingPref: [-8, -18, 75] },
      { chain: ['thighB' + sd, 'shankB' + sd, 'canB' + sd], foot: 'hoofB' + sd, phase: hp, duty: 0.64, lift: 0.12 * S, footSwing: 25, limits: [[-40, 35], [-55, 25], [-95, 10]], init: [0, 0, 0], pref: [0, 0, 0], swingPref: [12, -10, -55] }]) });
    clips.graze = AA.clip(sk, 3.2, 30, true, t => {
      const w = t / 3.2 * Math.PI * 2;
      return { neck1: [55, 0, 0], neck2: [22, 4 * Math.sin(w), 0], head: [10 + 6 * Math.sin(w * 6), 0, 0], upFL: [-6, 0, 0], tail: [0, 0, 12 * Math.sin(w * 2)] };
    });

    return AA.finalize(donkey ? 'donkey' : 'horse', {
      body:  { builder: B,  material: { kind: 'fur', texture: 'fur', roughness: 0.75 } },
      mane:  { builder: M,  material: { kind: 'hair', texture: 'fur', roughness: 0.7, doubleSided: true } },
      dark:  { builder: D,  material: { kind: 'dark', roughness: 0.3, color: [1, 1, 1] } },
      hoof:  { builder: Hf, material: { kind: 'horn', roughness: 0.5 } },
      tack:  { builder: L,  material: { kind: 'leather', roughness: 0.6 } },
      metal: { builder: Mt, material: { kind: 'metal', roughness: 0.35, color: [0.75, 0.6, 0.3] } }
    }, { stiffness: 0, height: 2.0 * S, radius: 1.1 * S, collider: { type: 'capsule', radius: 0.32 * S, height: 1.9 * S, axis: 'z' }, skeleton: sk.toJSON(), clips,
      walkSpeed: (donkey ? 0.95 : 1.4) * S, seat: [0, 1.62 * S, -0.05 * S], hitch: { shaftY: 1.02 * S, halfWidth: 0.27 * S * (donkey ? 1.06 : 1), rump: -0.85 * S, shoulder: 0.5 * S } });
  }

  const A = AA.assets;
  A.horse = { id: 'horse', name: 'حصان', nameEn: 'Arabian horse', category: 'animals',
    schema: [
      { key: 'coat', label: 'اللون', type: 'enum', options: [['bay', 'أحمر'], ['chestnut', 'أشقر'], ['grey', 'أشهب'], ['black', 'أدهم']], def: 'bay' },
      { key: 'size', label: 'الحجم', min: 0.7, max: 1.1, step: 0.05, def: 1, pct: true },
      { key: 'harness', label: 'عُدّة الجر', type: 'bool', def: false }
    ], presets: { 'أشهب': { coat: 'grey' }, 'حصان جر': { coat: 'chestnut', harness: true } },
    clips: [['idle', 'وقوف'], ['walk', 'مشي'], ['graze', 'رعي']], generate: (p, q) => equine(p, q, false) };
  A.donkey = { id: 'donkey', name: 'حمار', nameEn: 'Donkey', category: 'animals',
    schema: [
      { key: 'size', label: 'الحجم', min: 0.55, max: 0.85, step: 0.05, def: 0.72, pct: true },
      { key: 'harness', label: 'عُدّة الجر', type: 'bool', def: false }
    ], presets: { 'حمار جر': { harness: true } },
    clips: [['idle', 'وقوف'], ['walk', 'مشي'], ['graze', 'رعي']], generate: (p, q) => equine(p, q, true) };
})(typeof window !== 'undefined' ? window : globalThis);
