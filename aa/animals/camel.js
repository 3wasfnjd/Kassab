// Aboden Assets — animals/camel.js  (v2)
// الجمل العربي (ذو السنام الواحد) بالكود، بنسب أقرب للحقيقة:
// جسم عميق الصدر مرفوع البطن من الخلف، سنام مقبّب، رقبة غليظة عند القاعدة، رأس بحاجب بارز وشفة متدلية،
// أرجل طويلة بركب وثفنات ومفاصل، خف عريض بإصبعين، وثفنة الصدر (الكركرة).
// هيكل عظمي (28 عظمة) وثلاث حركات: وقوف، مشي رهوان (رجلا الجنب الواحد معاً)، رعي.
(function (g) {
  'use strict';
  const AA = g.AA;
  const V = AA.v, hex = AA.hex, mixc = AA.mixc, vary = AA.vary, lerp = AA.lerp, smooth = AA.smooth, clamp = AA.clamp;

  const COATS = { // [أساس، ظهر وسنام، بطن، ثفنات وخف]
    majaheem: ['#2c231e', '#241c18', '#3a2f28', '#1a1512'],
    wadh:     ['#e8decd', '#dcd0bb', '#f3ece0', '#a89c8a'],
    shael:    ['#c99c66', '#b98a55', '#dcb886', '#7d6448'],
    humr:     ['#97603e', '#86512f', '#ab7650', '#5a3a26'],
    sufr:     ['#d6b47f', '#c7a26b', '#e6cc9e', '#8c7552']
  };
  const Q = { high: { s: 22, n: 30, l: 6 }, med: { s: 14, n: 20, l: 4 }, low: { s: 8, n: 11, l: 2 } };
  const ra = (rs, t) => { for (let i = 0; i < rs.length - 1; i++) if (t <= rs[i + 1][0]) return lerp(rs[i][1], rs[i + 1][1], smooth(rs[i][0], rs[i + 1][0], t)); return rs[rs.length - 1][1]; };
  const poly = (pts, per) => { const o = []; for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < per; k++) o.push(V.lerp(pts[i], pts[i + 1], k / per)); o.push(pts[pts.length - 1]); return o; };

  // مواضع المفاصل (بالمتر لجمل بالغ، الأمام +Z)
  const J = {
    front: { sh: [0.19, 1.42, 0.56], el: [0.2, 1.12, 0.6], kn: [0.2, 0.62, 0.62], fe: [0.2, 0.2, 0.62], ft: [0.2, 0.05, 0.71] },
    hind:  { hp: [0.21, 1.55, -0.72], st: [0.22, 1.08, -0.52], hk: [0.22, 0.64, -0.84], fe: [0.22, 0.2, -0.82], ft: [0.22, 0.05, -0.74] }
  };

  function skeleton(S) {
    const k = new AA.Skeleton(), P = a => a.map(v => v * S), X = (a, x) => P([a[0] * x, a[1], a[2]]);
    k.add('root', null, P([0, 1.5, 0]), P([0, 1.52, -0.4]));
    k.add('rear', 'root', P([0, 1.52, -0.45]), P([0, 1.42, -0.95]));
    k.add('chest', 'root', P([0, 1.5, 0.35]), P([0, 1.46, 0.8]));
    k.add('neck1', 'chest', P([0, 1.55, 0.78]), P([0, 1.38, 1.15]));
    k.add('neck2', 'neck1', P([0, 1.38, 1.15]), P([0, 1.66, 1.48]));
    k.add('neck3', 'neck2', P([0, 1.66, 1.48]), P([0, 2.12, 1.6]));
    k.add('head', 'neck3', P([0, 2.12, 1.6]), P([0, 2.0, 2.12]));
    k.add('tail', 'rear', P([0, 1.46, -1.0]), P([0, 0.78, -1.1]));
    for (const [sd, x] of [['L', 1], ['R', -1]]) {
      const f = J.front, h = J.hind;
      k.add('upF' + sd, 'chest', X(f.sh, x), X(f.el, x));
      k.add('lowF' + sd, 'upF' + sd, X(f.el, x), X(f.kn, x));
      k.add('canF' + sd, 'lowF' + sd, X(f.kn, x), X(f.fe, x));
      k.add('footF' + sd, 'canF' + sd, X(f.fe, x), X(f.ft, x));
      k.add('thighB' + sd, 'rear', X(h.hp, x), X(h.st, x));
      k.add('shankB' + sd, 'thighB' + sd, X(h.st, x), X(h.hk, x));
      k.add('canB' + sd, 'shankB' + sd, X(h.hk, x), X(h.fe, x));
      k.add('footB' + sd, 'canB' + sd, X(h.fe, x), X(h.ft, x));
    }
    return k;
  }

  function camel(p, quality) {
    const q = Q[quality] || Q.med, S = p.size, rng = AA.rng(p.seed), sk = skeleton(S);
    const C = (COATS[p.coat] || COATS.shael).map(hex);
    const B = new AA.Builder(), D = new AA.Builder(), SD = new AA.Builder(), W = new AA.Builder();
    const P3 = (x, y, z) => [x * S, y * S, z * S];
    const tone = (c, k) => vary(c, rng, k || 0.05);

    // ---------- الجسم ----------
    // المحور: من المؤخرة (z=-0.98) إلى الصدر (z=0.86). المقطع: عرض، ونصف ارتفاع علوي وسفلي منفصلين
    const spine = AA.bezier([P3(0, 1.43, -0.98), P3(0, 1.55, -0.45), P3(0, 1.55, 0.35), P3(0, 1.45, 0.88)], q.n);
    const hump = t => { const u = (t - 0.5) / 0.3; return u * u >= 1 ? 0 : p.hump * Math.pow(1 - u * u, 1.7); };
    const rx = t => ra([[0, 0.12], [0.1, 0.3], [0.28, 0.34], [0.55, 0.36], [0.82, 0.31], [0.94, 0.24], [1, 0.12]], t);
    const rTop = t => ra([[0, 0.14], [0.12, 0.24], [0.5, 0.26], [0.85, 0.22], [1, 0.12]], t);
    const rBot = t => ra([[0, 0.16], [0.12, 0.26], [0.3, 0.3], [0.62, 0.42], [0.85, 0.46], [0.95, 0.38], [1, 0.16]], t); // الصدر أعمق، البطن مرفوع خلفاً
    const bodyR = (t, ang) => {
      const c = Math.cos(ang), h = hump(t), up = c > 0;
      let ry = (up ? rTop(t) + h * Math.pow(c, 0.85) : rBot(t)) * S;
      let w = rx(t) * S * (up ? 1 - 0.32 * (h / (p.hump + 1e-6)) * Math.pow(c, 2.2) : 1 - 0.12 * Math.pow(-c, 3));
      return [w, ry];
    };
    B.skinFn = AA.autoSkin(sk, ['root', 'rear', 'chest', 'neck1', 'upFL', 'upFR', 'thighBL', 'thighBR'], 4);
    AA.loft(B, { path: spine, sides: q.s, radius: bodyR, capStart: true, capEnd: true, uvU: 3, uvV: 2,
      color: (t, ang) => { const c = Math.cos(ang); return tone(c > 0.45 ? mixc(C[0], C[1], (c - 0.45) * 1.8) : c < -0.3 ? mixc(C[0], C[2], (-c - 0.3) * 1.4) : C[0]); } });
    // الكركرة: ثفنة الصدر بين اليدين
    B.setSkin([[sk.id('chest'), 1]]);
    AA.blob(B, P3(0, 1.06, 0.5), [0.1 * S, 0, 0], [0, 0.05 * S, 0], [0, 0, 0.13 * S], () => mixc(C[3], C[0], 0.55), 0, 0, 0, rng, 0.06, quality === 'low');

    // ---------- الرقبة ----------
    const neck = AA.bezier([P3(0, 1.4, 0.56), P3(0, 1.2, 1.2), P3(0, 1.64, 1.5), P3(0, 2.14, 1.58)], q.n);
    B.skinFn = AA.autoSkin(sk, ['chest', 'neck1', 'neck2', 'neck3', 'head'], 5);
    AA.loft(B, { path: neck, sides: q.s, up: () => [0, 1, -1], uvU: 2, uvV: 2,
      radius: (t, ang) => { const r = ra([[0, 0.25], [0.2, 0.2], [0.45, 0.15], [0.8, 0.12], [1, 0.12]], t) * S; return [r * 0.74, r * (Math.cos(ang) < 0 ? 1.08 : 0.92)]; },
      color: (t, ang) => tone(Math.cos(ang) > 0.4 ? C[1] : mixc(C[0], C[2], 0.2)) });

    // ---------- الرأس ----------
    // جمجمة بحاجب بارز ← وجه طويل ← خطم بشفة عليا مشقوقة وشفة سفلى متدلية
    const hp = poly([P3(0, 2.12, 1.5), P3(0, 2.17, 1.66), P3(0, 2.12, 1.86), P3(0, 2.03, 2.04), P3(0, 1.97, 2.13)], q.l);
    B.skinFn = AA.autoSkin(sk, ['neck3', 'head'], 6);
    AA.loft(B, { path: hp, sides: q.s, up: () => [0, 1, 0.25], capStart: true, capEnd: true, uvU: 1, uvV: 2,
      radius: (t, ang) => {
        const c = Math.cos(ang), s = Math.sin(ang);
        let w = ra([[0, 0.1], [0.25, 0.115], [0.42, 0.1], [0.75, 0.075], [1, 0.065]], t);
        let hh = ra([[0, 0.12], [0.25, 0.13], [0.5, 0.11], [0.8, 0.085], [1, 0.07]], t);
        w += 0.022 * Math.exp(-Math.pow((t - 0.26) / 0.08, 2)) * Math.pow(Math.max(0, c * 0.6 + Math.abs(s) * 0.8), 2); // الحاجب فوق العين
        if (c < 0) hh *= 1 + 0.18 * smooth(0.7, 1, t);                                                                        // الشفة السفلى
        return [w * S, hh * S];
      },
      color: t => tone(mixc(C[0], C[2], 0.25 * smooth(0.6, 1, t))) });
    // الشفة السفلى المتدلية
    AA.blob(B, P3(0, 1.93, 2.06), [0.05 * S, 0, 0], [0, 0.03 * S, 0], [0, 0, 0.06 * S], () => tone(mixc(C[0], C[3], 0.3)), 0, 0, 0, rng, 0.04, quality === 'low');
    // آذان صغيرة مدوّرة متجهة للخلف
    B.setSkin([[sk.id('head'), 1]]);
    for (const x of [1, -1]) AA.loft(B, { path: AA.bezier([P3(0.075 * x, 2.23, 1.6), P3(0.1 * x, 2.29, 1.56), P3(0.105 * x, 2.31, 1.5)], 5), sides: 7, capEnd: true, up: () => [0, 0, -1],
      radius: t => [0.012 * S, (0.034 - 0.022 * t * t) * S], color: () => tone(C[1]) });
    // عيون بجفن ثقيل، ومنخران طويلان
    D.setSkin([[sk.id('head'), 1]]);
    for (const x of [1, -1]) {
      AA.blob(D, P3(0.108 * x, 2.18, 1.73), [0.018 * S, 0, 0], [0, 0.022 * S, 0], [0, 0, 0.028 * S], () => [0.06, 0.04, 0.035], 0, 0, 0, null, 0, quality === 'low');
      AA.blob(B, P3(0.112 * x, 2.2, 1.73), [0.022 * S, 0, 0], [0, 0.012 * S, 0], [0, 0, 0.034 * S], () => tone(C[1]), 0, 0, 0, null, 0, quality === 'low');
      AA.blob(D, P3(0.04 * x, 2.02, 2.1), [0.01 * S, 0, 0], [0, 0.024 * S, 0], [0, 0, 0.012 * S], () => [0.14, 0.1, 0.09], 0, 0, 0, null, 0, true);
    }

    // ---------- الأرجل ----------
    const legColor = (t, knee) => tone(Math.abs(t - knee) < 0.05 ? mixc(C[0], C[3], 0.75) : mixc(C[0], C[2], 0.25 * t));
    for (const [sd, x] of [['L', 1], ['R', -1]]) {
      const f = J.front, h = J.hind, X = a => P3(a[0] * x, a[1], a[2]);
      // اليد: العضد داخل الجسم، الساعد، الركبة بثفنة، الوظيف النحيل، الرسغ، الخف
      B.skinFn = AA.autoSkin(sk, ['chest', 'upF' + sd, 'lowF' + sd, 'canF' + sd, 'footF' + sd], 7);
      const fp = poly([X([0.19, 1.38, 0.55]), X(f.el), X(f.kn), X(f.fe), X([0.2, 0.09, 0.67])], q.l);
      AA.loft(B, { path: fp, sides: Math.max(6, q.s - 6), up: () => [0, 0, 1], uvU: 1, uvV: 2,
        radius: t => {
          const r = ra([[0, 0.09], [0.22, 0.1], [0.45, 0.07], [0.5, 0.078], [0.55, 0.062], [0.62, 0.047], [0.74, 0.044], [0.78, 0.056], [0.86, 0.046], [1, 0.05]], t);
          return [r * S * (t > 0.5 ? 0.85 : 0.82), r * S * (t < 0.3 ? 1.2 : 1)];
        }, color: t => legColor(t, 0.5) });
      // الرِّجل: فخذ عريض مسطّح، الرضفة، الساق، العرقوب، الوظيف، الخف
      B.skinFn = AA.autoSkin(sk, ['rear', 'thighB' + sd, 'shankB' + sd, 'canB' + sd, 'footB' + sd], 7);
      const hpth = poly([X([0.17, 1.48, -0.76]), X(h.st), X(h.hk), X(h.fe), X([0.22, 0.09, -0.78])], q.l);
      AA.loft(B, { path: hpth, sides: Math.max(6, q.s - 6), up: () => [0, 0, 1], uvU: 1, uvV: 2,
        radius: t => {
          const r = ra([[0, 0.2], [0.18, 0.15], [0.25, 0.1], [0.4, 0.075], [0.5, 0.065], [0.53, 0.07], [0.58, 0.05], [0.74, 0.044], [0.78, 0.056], [0.86, 0.046], [1, 0.05]], t);
          return [r * S * (t < 0.3 ? 0.55 : 0.85), r * S];
        }, color: t => legColor(t, 0.26) });
      // الخف: وسادة عريضة بإصبعين وظفرين صغيرين
      for (const [ft, bone] of [[[0.2, 0.71], 'footF' + sd], [[0.22, -0.74], 'footB' + sd]]) {
        B.setSkin([[sk.id(bone), 1]]);
        const c0 = P3(ft[0] * x, 0.045, ft[1] - 0.03);
        AA.blob(B, c0, [0.09 * S, 0, 0], [0, 0.045 * S, 0], [0, 0, 0.1 * S], () => tone(C[3]), 0, 0, 0, rng, 0.04, quality === 'low');
        for (const tx of [-1, 1]) {
          AA.blob(B, V.add(c0, P3(0.04 * tx, -0.005, 0.075)), [0.045 * S, 0, 0], [0, 0.038 * S, 0], [0, 0, 0.06 * S], () => tone(C[3]), 0, 0, 0, rng, 0.04, true);
          D.setSkin([[sk.id(bone), 1]]);
          AA.blob(D, V.add(c0, P3(0.04 * tx, 0.012, 0.128)), [0.016 * S, 0, 0], [0, 0.012 * S, 0], [0, 0, 0.012 * S], () => [0.12, 0.1, 0.08], 0, 0, 0, null, 0, true);
        }
      }
    }
    // ---------- الذيل ----------
    B.skinFn = AA.autoSkin(sk, ['rear', 'tail'], 6);
    AA.loft(B, { path: AA.bezier([P3(0, 1.46, -0.96), P3(0, 1.28, -1.1), P3(0, 0.76, -1.08)], 8), sides: 7, capEnd: true,
      radius: t => 0.035 * S * (1 - 0.5 * t) + 0.03 * S * smooth(0.72, 0.92, t) * (1 - smooth(0.96, 1, t)),
      color: t => tone(t > 0.72 ? C[3] : C[1]) });

    // ---------- الشداد والسدو ----------
    if (p.saddle) {
      const at = (t, ang, out) => {
        const f = t * (spine.length - 1), i = Math.min(spine.length - 2, Math.floor(f)), c = V.lerp(spine[i], spine[i + 1], f - i);
        const [w, ry] = bodyR(t, ang);
        return [c[0] - Math.sin(ang) * (w + out), c[1] + Math.cos(ang) * (ry + out), c[2]];
      };
      SD.skinFn = AA.autoSkin(sk, ['root', 'rear', 'chest'], 3);
      const nu = q.s, nv = 7, ids = [];
      for (let j = 0; j <= nv; j++) { ids.push([]); for (let i = 0; i <= nu; i++) {
        const ang = lerp(-2.0, 2.0, i / nu), t = lerp(0.33, 0.65, j / nv);
        ids[j].push(SD.v(at(t, ang, 0.022 * S), [1, 1, 1], 0, 0, 0, [i / nu, j / nv]));
      } }
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { SD.t(ids[j][i], ids[j + 1][i + 1], ids[j][i + 1]); SD.t(ids[j][i], ids[j + 1][i], ids[j + 1][i + 1]); }
      W.skinFn = AA.autoSkin(sk, ['root', 'rear', 'chest'], 3);
      for (const t of [0.37, 0.62]) {
        const top = at(t, 0, 0.18 * S);
        for (const sg of [1, -1]) {
          const foot = at(t, sg * 1.2, 0.04 * S), mid = at(t, sg * 0.55, 0.1 * S), tip = V.add(top, [-sg * 0.12 * S, 0.17 * S, 0]);
          AA.tube(W, [foot, mid, top, tip], [0.03, 0.028, 0.026, 0.022].map(r => r * S), 6, () => [0.9, 0.9, 0.9], () => 0, 0, null, true);
        }
      }
      for (const sg of [1, -1]) AA.tube(W, [at(0.35, sg * 0.8, 0.09 * S), at(0.64, sg * 0.8, 0.09 * S)], [0.022 * S, 0.022 * S], 5, () => [0.85, 0.85, 0.85], () => 0, 0, null, true);
    }

    // ---------- الحركة ----------
    const clips = {};
    clips.idle = AA.clip(sk, 5, 30, true, t => {
      const w = t / 5 * Math.PI * 2;
      return { move: [0, 0.006 * S * Math.sin(w * 2), 0], neck1: [2 * Math.sin(w * 2), 0, 0], neck3: [0, 7 * Math.sin(w), 0],
        head: [3 * Math.sin(w * 7), 3 * Math.sin(w), 0], tail: [0, 0, 16 * Math.sin(w * 3)] };
    });
    // مشي رهوان: اليد والرجل من نفس الجنب تتحركان معاً، والجسم يتمايل جانبياً
    // مشي الجمل: رهوان (الرجلان من نفس الجهة معاً تقريباً)، بقدم مثبّتة وحل عكسي للمفاصل
    clips.walk = AA.gaitClip(sk, { duration: 1.3, speed: 1.25 * S, extra: t => {
      const ph = t / 1.3 * Math.PI * 2;
      return { move: [0, 0.02 * S * Math.cos(ph * 2), 0], rear: [0, 0, 4 * Math.sin(ph)], chest: [0, 0, 4 * Math.sin(ph)], neck1: [5 * Math.sin(ph * 2), 0, 0], neck3: [-3 * Math.sin(ph * 2), 0, 0], head: [-3 * Math.sin(ph * 2), 0, 0], tail: [0, 0, 12 * Math.sin(ph)] };
    }, legs: [['L', 0, 0.94], ['R', 0.5, 0.44]].flatMap(([sd, hp, fp]) => [
      { chain: ['upF' + sd, 'lowF' + sd, 'canF' + sd], foot: 'footF' + sd, phase: fp, duty: 0.62, lift: 0.16 * S, footSwing: 30, limits: [[-40, 40], [-40, 20], [0, 105]], init: [0, 0, 0], pref: [0, 0, 0], swingPref: [-8, -18, 75] },
      { chain: ['thighB' + sd, 'shankB' + sd, 'canB' + sd], foot: 'footB' + sd, phase: hp, duty: 0.62, lift: 0.14 * S, footSwing: 25, limits: [[-40, 35], [-55, 25], [-95, 10]], init: [0, 0, 0], pref: [0, 0, 0], swingPref: [12, -10, -55] }]) });
    clips.graze = AA.clip(sk, 3.4, 30, true, t => {
      const w = t / 3.4 * Math.PI * 2;
      return { neck1: [58, 0, 0], neck2: [30, 0, 0], neck3: [18 + 3 * Math.sin(w * 3), 0, 0], head: [-12 + 4 * Math.sin(w * 6), 5 * Math.sin(w), 0],
        upFL: [-4, 0, 0], upFR: [-4, 0, 0], tail: [0, 0, 10 * Math.sin(w * 2)] };
    });

    return AA.finalize('camel', {
      body:   { builder: B,  material: { kind: 'fur', texture: 'fur', roughness: 0.92 } },
      dark:   { builder: D,  material: { kind: 'dark', roughness: 0.35, color: [1, 1, 1] } },
      saddle: { builder: SD, material: { kind: 'cloth', texture: 'sadu', roughness: 0.9, doubleSided: true } },
      wood:   { builder: W,  material: { kind: 'wood', texture: 'wood', roughness: 0.8 } }
    }, { stiffness: 0, height: 2.35 * S, radius: 1.25 * S, collider: { type: 'capsule', radius: 0.45 * S, height: 2.2 * S, axis: 'z' },
      skeleton: sk.toJSON(), clips, seat: p.saddle ? [0, (1.8 + p.hump) * S, -0.05 * S] : null, walkSpeed: 1.25 * S });
  }

  AA.assets.camel = {
    id: 'camel', name: 'جمل', nameEn: 'Arabian camel', category: 'animals',
    schema: [
      { key: 'coat', label: 'اللون', type: 'enum', options: [['shael', 'شعل'], ['majaheem', 'مجاهيم'], ['wadh', 'وضح'], ['humr', 'حمر'], ['sufr', 'صفر']], def: 'shael' },
      { key: 'size', label: 'الحجم', min: 0.55, max: 1.15, step: 0.05, def: 1, pct: true },
      { key: 'hump', label: 'السنام', min: 0.12, max: 0.55, step: 0.02, def: 0.34, unit: 'م' },
      { key: 'saddle', label: 'شداد وسدو', type: 'bool', def: false }
    ],
    presets: { 'ناقة ركوب': { coat: 'wadh', saddle: true }, 'حوار (صغير)': { size: 0.6, hump: 0.14, coat: 'shael' }, 'فحل مجاهيم': { coat: 'majaheem', size: 1.1, hump: 0.46 } },
    clips: [['idle', 'وقوف'], ['walk', 'مشي'], ['graze', 'رعي']],
    generate: camel
  };
})(typeof window !== 'undefined' ? window : globalThis);
