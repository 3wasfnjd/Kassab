// Aboden Assets — animals/sheep.js
// الغنم بالكود: نجدية (سوداء، أذن طويلة متدلية، أنف محدّب، ذيل طويل)، نعيمية (بيضاء برأس بني وإلية)،
// وعنز عارضية (سوداء بشعر طويل وقرون ولحية). هيكل عظمي وثلاث حركات: وقوف، رعي، مشي.
(function (g) {
  'use strict';
  const AA = g.AA;
  const V = AA.v, hex = AA.hex, mixc = AA.mixc, vary = AA.vary, lerp = AA.lerp, smooth = AA.smooth;

  const BREEDS = {
    najdi: { body: '#1d1a19', head: '#1d1a19', face: '#efe9df', legs: '#211d1b', blaze: true, ears: 0.2, tail: 'long', wool: true, hair: 0 },
    naimi: { body: '#ece5d6', head: '#7a4a2c', face: '#7a4a2c', legs: '#7a4a2c', blaze: false, ears: 0.12, tail: 'fat', wool: true, hair: 0 },
    goat:  { body: '#181514', head: '#181514', face: '#181514', legs: '#181514', blaze: false, ears: 0.17, tail: 'goat', wool: false, hair: 1, horns: true, beard: true }
  };
  const Q = { high: { s: 14, n: 16, l: 4 }, med: { s: 10, n: 11, l: 3 }, low: { s: 7, n: 7, l: 2 } };
  const polyline = (pts, per) => { const o = []; for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < per; k++) o.push(V.lerp(pts[i], pts[i + 1], k / per)); o.push(pts[pts.length - 1]); return o; };
  const ra = (rs, t) => { for (let i = 0; i < rs.length - 1; i++) if (t <= rs[i + 1][0]) return lerp(rs[i][1], rs[i + 1][1], smooth(rs[i][0], rs[i + 1][0], t)); return rs[rs.length - 1][1]; };

  function sheep(p, quality) {
    const q = Q[quality] || Q.med, S = p.size, rng = AA.rng(p.seed), br = BREEDS[p.breed] || BREEDS.najdi;
    const P3 = (x, y, z) => [x * S, y * S, z * S];
    const sk = new AA.Skeleton();
    sk.add('root', null, P3(0, 0.62, 0), P3(0, 0.63, -0.25));
    sk.add('rear', 'root', P3(0, 0.63, -0.25), P3(0, 0.62, -0.5));
    sk.add('chest', 'root', P3(0, 0.63, 0.25), P3(0, 0.62, 0.45));
    sk.add('neck', 'chest', P3(0, 0.68, 0.42), P3(0, 0.86, 0.6));
    sk.add('head', 'neck', P3(0, 0.86, 0.6), P3(0, 0.74, 0.86));
    sk.add('tail', 'rear', P3(0, 0.66, -0.5), P3(0, 0.35, -0.56));
    for (const [sd, x] of [['L', 1], ['R', -1]]) {
      const fx = 0.1 * x, hx = 0.11 * x;
      sk.add('upF' + sd, 'chest', P3(fx, 0.55, 0.36), P3(fx, 0.32, 0.38));
      sk.add('lowF' + sd, 'upF' + sd, P3(fx, 0.32, 0.38), P3(fx, 0.02, 0.39));
      sk.add('thighB' + sd, 'rear', P3(hx, 0.6, -0.36), P3(hx, 0.38, -0.3));
      sk.add('shankB' + sd, 'thighB' + sd, P3(hx, 0.38, -0.3), P3(hx, 0.22, -0.42));
      sk.add('cannonB' + sd, 'shankB' + sd, P3(hx, 0.22, -0.42), P3(hx, 0.02, -0.4));
    }
    const B = new AA.Builder(), F = new AA.Builder(), D = new AA.Builder(), Hn = new AA.Builder();
    const cBody = hex(br.body), cHead = hex(br.head), cFace = hex(br.face);
    const c = (base) => vary(base, rng, 0.08);

    // الجسم (صوف متكتل أو شعر طويل يتدلى)
    const spine = AA.bezier([P3(0, 0.6, -0.46), P3(0, 0.66, -0.15), P3(0, 0.66, 0.2), P3(0, 0.62, 0.44)], q.n);
    const lump = (t, a) => br.wool ? 1 + 0.07 * (AA.noise3(t * 9, Math.cos(a) * 2, Math.sin(a) * 2, p.seed) - 0.5) : 1;
    B.skinFn = AA.autoSkin(sk, ['root', 'rear', 'chest', 'neck', 'upFL', 'upFR', 'thighBL', 'thighBR'], 4);
    AA.loft(B, { path: spine, sides: q.s, capStart: true, capEnd: true, uvU: 2, uvV: 2,
      radius: (t, a) => {
        let rx = ra([[0, 0.12], [0.15, 0.2], [0.55, 0.22], [0.9, 0.18], [1, 0.11]], t) * S, ry = ra([[0, 0.13], [0.15, 0.21], [0.55, 0.23], [0.9, 0.2], [1, 0.12]], t) * S;
        if (br.hair && Math.cos(a) < 0) ry *= 1 + 0.35 * br.hair * Math.pow(-Math.cos(a), 2); // شعر الماعز يتدلى تحت البطن
        const k = lump(t, a); return [rx * k, ry * k];
      },
      color: () => c(cBody) });
    // الرقبة
    B.skinFn = AA.autoSkin(sk, ['chest', 'neck', 'head'], 5);
    AA.loft(B, { path: AA.bezier([P3(0, 0.66, 0.36), P3(0, 0.74, 0.52), P3(0, 0.86, 0.6)], q.l + 3), sides: q.s, up: () => [0, 1, -1],
      radius: (t, a) => { const r = ra([[0, 0.15], [1, 0.08]], t) * S; return [r * 0.8, r * (br.hair && Math.cos(a) < 0 ? 1.3 : 1)]; },
      color: t => c(mixc(cBody, cHead, smooth(0.4, 1, t))) });
    // الرأس: أنف محدّب للنجدية
    const hp = polyline([P3(0, 0.88, 0.56), P3(0, 0.9, 0.66), P3(0, 0.82, 0.8), P3(0, 0.74, 0.88)], q.l);
    B.skinFn = AA.autoSkin(sk, ['neck', 'head'], 6);
    AA.loft(B, { path: hp, sides: q.s, capStart: true, capEnd: true, uvU: 1, uvV: 2,
      radius: (t, a) => { const r = ra([[0, 0.075], [0.3, 0.08], [0.7, 0.06], [1, 0.042]], t) * S; return [r * 0.82, r * (p.breed === 'najdi' && Math.cos(a) > 0.6 && t > 0.4 ? 1.12 : 1)]; },
      color: (t, a) => c(br.blaze && Math.cos(a) > -0.2 && t > 0.15 ? cFace : (t > 0.55 ? mixc(cHead, cFace, 0.5) : cHead)) });
    // الآذان: طويلة متدلية
    B.setSkin([[sk.id('head'), 1]]);
    for (const x of [1, -1]) {
      // الأذن: تخرج جانباً ثم تتدلى بمحاذاة الخد (عريضة باتجاه الأمام، رقيقة جانبياً)
      const e0 = P3(0.06 * x, 0.9, 0.62), up = p.breed === 'goat' ? 0.4 : 0;
      const e1 = P3((0.1 + 0.05 * up) * x, 0.9 - br.ears * (0.9 - up), 0.66);
      AA.loft(B, { path: AA.bezier([e0, P3(0.105 * x, 0.9, 0.625), e1], 6), sides: 6, capEnd: true, up: () => [0, 0, 1],
        radius: t => [0.009 * S, 0.032 * S * (1 - 0.35 * t) * (0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, t * 1.3 + 0.15)))], color: () => c(br.blaze ? cFace : cHead) });
    }
    // عيون، أنف، حوافر
    D.setSkin([[sk.id('head'), 1]]);
    for (const x of [1, -1]) {
      AA.blob(D, P3(0.058 * x, 0.88, 0.68), [0.012 * S, 0, 0], [0, 0.014 * S, 0], [0, 0, 0.016 * S], () => [0.05, 0.04, 0.03], 0, 0, 0, null, 0, quality === 'low');
      AA.blob(D, P3(0.02 * x, 0.75, 0.885), [0.008 * S, 0, 0], [0, 0.01 * S, 0], [0, 0, 0.006 * S], () => [0.12, 0.08, 0.08], 0, 0, 0, null, 0, true);
    }
    // الأرجل
    for (const [sd, x] of [['L', 1], ['R', -1]]) {
      const fx = 0.1 * x, hx = 0.11 * x, lc = hex(br.legs);
      B.skinFn = AA.autoSkin(sk, ['chest', 'upF' + sd, 'lowF' + sd], 6);
      AA.loft(B, { path: polyline([P3(fx, 0.58, 0.36), P3(fx, 0.32, 0.38), P3(fx, 0.04, 0.39)], q.l), sides: Math.max(5, q.s - 4), up: () => [0, 0, 1],
        radius: t => ra([[0, 0.065], [0.35, 0.035], [0.5, 0.03], [0.9, 0.022], [1, 0.024]], t) * S, color: t => c(t < 0.25 ? cBody : lc) });
      B.skinFn = AA.autoSkin(sk, ['rear', 'thighB' + sd, 'shankB' + sd, 'cannonB' + sd], 6);
      AA.loft(B, { path: polyline([P3(hx, 0.62, -0.38), P3(hx, 0.38, -0.3), P3(hx, 0.22, -0.42), P3(hx, 0.04, -0.4)], q.l), sides: Math.max(5, q.s - 4), up: () => [0, 0, 1],
        radius: t => ra([[0, 0.085], [0.3, 0.05], [0.5, 0.03], [0.9, 0.022], [1, 0.024]], t) * S, color: t => c(t < 0.3 ? cBody : lc) });
      for (const [z, bone, xx] of [[0.395, 'lowF' + sd, fx], [-0.4, 'cannonB' + sd, hx]]) {
        D.setSkin([[sk.id(bone), 1]]);
        AA.blob(D, P3(xx, 0.022, z + 0.01), [0.026 * S, 0, 0], [0, 0.024 * S, 0], [0, 0, 0.032 * S], () => [0.08, 0.07, 0.06], 0, 0, 0, null, 0, true);
      }
    }
    // الذيل
    B.skinFn = AA.autoSkin(sk, ['rear', 'tail'], 6);
    if (br.tail === 'fat') { // إلية النعيمي العريضة
      B.setSkin([[sk.id('rear'), 0.5], [sk.id('tail'), 0.5]]);
      AA.blob(B, P3(0, 0.5, -0.53), [0.15 * S, 0, 0], [0, 0.14 * S, 0], [0, 0, 0.07 * S], () => c(cBody), 0, 0, 0, rng, 0.05, quality === 'low');
    } else if (br.tail === 'goat') {
      AA.loft(B, { path: [P3(0, 0.68, -0.5), P3(0, 0.78, -0.56)], sides: 5, capEnd: true, radius: t => 0.025 * S * (1 - 0.5 * t), color: () => c(cBody) });
    } else {
      AA.loft(B, { path: AA.bezier([P3(0, 0.64, -0.5), P3(0, 0.5, -0.58), P3(0, 0.3, -0.56)], 6), sides: 6, capEnd: true, radius: t => 0.04 * S * (1 - 0.5 * t), color: () => c(cBody) });
    }
    // قرون ولحية الماعز
    if (br.horns) {
      Hn.setSkin([[sk.id('head'), 1]]);
      for (const x of [1, -1]) AA.tube(Hn, AA.bezier([P3(0.035 * x, 0.94, 0.62), P3(0.06 * x, 1.04, 0.58), P3(0.09 * x, 1.06, 0.48)], 6), [0.02, 0.017, 0.013, 0.01, 0.007, 0.003].map(r => r * S), 5, () => [0.32, 0.28, 0.22], () => 0, 0, null, true);
    }
    if (br.beard) { B.setSkin([[sk.id('head'), 1]]); AA.loft(B, { path: [P3(0, 0.72, 0.8), P3(0, 0.62, 0.78)], sides: 5, capEnd: true, radius: t => 0.022 * S * (1 - 0.6 * t), color: () => c(cHead) }); }

    const clips = {};
    clips.idle = AA.clip(sk, 4, 30, true, t => { const w = t / 4 * Math.PI * 2; return { move: [0, 0.004 * S * Math.sin(w * 2), 0], neck: [3 * Math.sin(w), 8 * Math.sin(w * 0.5), 0], head: [2 * Math.sin(w * 7), 0, 0], tail: [0, 0, 10 * Math.sin(w * 4)] }; });
    clips.graze = AA.clip(sk, 3, 30, true, t => { const w = t / 3 * Math.PI * 2; return { neck: [58, 6 * Math.sin(w), 0], head: [10 + 5 * Math.sin(w * 8), 0, 0], chest: [8, 0, 0], tail: [0, 0, 8 * Math.sin(w * 3)] }; });
    // مشي رباعي: يسار أمامي، يمين خلفي، يمين أمامي، يسار خلفي
    clips.walk = AA.gaitClip(sk, { duration: 0.9, speed: 0.8 * S, extra: t => {
      const ph = t / 0.9 * Math.PI * 2;
      return { move: [0, 0.008 * S * Math.cos(ph * 4), 0], neck: [4 * Math.sin(ph * 2), 0, 0], tail: [0, 0, 8 * Math.sin(ph)] };
    }, legs: [['L', 0, 0.75], ['R', 0.5, 0.25]].flatMap(([sd, hp, fp]) => [
      { chain: ['upF' + sd, 'lowF' + sd], foot: null, phase: fp, duty: 0.64, lift: 0.1 * S, limits: [[-40, 40], [0, 100]], init: [0, 0], pref: [0, 0], swingPref: [-10, 60] },
      { chain: ['thighB' + sd, 'shankB' + sd, 'cannonB' + sd], foot: null, phase: hp, duty: 0.64, lift: 0.09 * S, limits: [[-40, 35], [-55, 25], [-95, 10]], init: [0, 0, 0], pref: [0, 0, 0], swingPref: [12, -10, -50] }]) });

    return AA.finalize('sheep', {
      body:  { builder: B, material: { kind: 'fur', texture: br.wool ? 'wool' : 'fur', roughness: 0.95 } },
      dark:  { builder: D, material: { kind: 'dark', roughness: 0.4, color: [1, 1, 1] } },
      horns: { builder: Hn, material: { kind: 'horn', roughness: 0.6, color: [1, 1, 1] } }
    }, { stiffness: 0, height: 0.95 * S, radius: 0.55 * S, collider: { type: 'capsule', radius: 0.22 * S, height: 1.0 * S, axis: 'z' }, skeleton: sk.toJSON(), clips, walkSpeed: 0.8 * S });
  }

  AA.assets.sheep = {
    id: 'sheep', name: 'غنم', nameEn: 'Sheep & goat', category: 'animals',
    schema: [
      { key: 'breed', label: 'السلالة', type: 'enum', options: [['najdi', 'نجدية'], ['naimi', 'نعيمية'], ['goat', 'عنز']], def: 'najdi' },
      { key: 'size', label: 'الحجم', min: 0.5, max: 1.2, step: 0.05, def: 1, pct: true }
    ],
    presets: { 'نعيمية': { breed: 'naimi' }, 'عنز عارضية': { breed: 'goat', size: 0.9 }, 'طلي (صغير)': { size: 0.6 } },
    clips: [['idle', 'وقوف'], ['graze', 'رعي'], ['walk', 'مشي']],
    generate: sheep
  };
})(typeof window !== 'undefined' ? window : globalThis);
