// Aboden Assets — kit/kit-core.js — حزمة الأساسيات (لو-بولي بأوجه ظاهرة)
// حزمة مستقلة بأكثر الأصول استخداماً في الألعاب: طرق ولوحات وإنارة، بيوت ومحطة وقود، أثاث، مركبات وطائرات، طبيعة، قطع بناء وجزر عائمة.
// نفس مبدأ المستودع: كل أصل مولّد بالكود ويرجع بيانات خام محايدة للمحرك (AA.finalize عبر LP.finalize: أوجه مسطحة بلون لكل وجه).
// قواعد الأسلوب (docs/art-styles.md): لوحة ألوان مقفلة K.PAL، مقياس أوجه واحد (أضلاع قليلة ثابتة حسب الجودة)، لا خامات صور، والحجم من الضوء على الأوجه.
// المحاور: الأمام = +Z، يسار الأصل = +X، الأصل على الأرض في منتصفه، الوحدة المتر.
(function (g) {
  'use strict';
  const AA = g.AA, LP = AA.lp, V = AA.v;
  const K = AA.kit = {};

  // ---------- لوحة الألوان المقفلة ----------
  K.PAL = {
    asphalt: '#4a4c52', asphalt2: '#55585e', line: '#f1efe6', lineY: '#f2c23a', curb: '#b9b7ae', curbRed: '#c9453a', walk: '#cfc8b8', walk2: '#bfb8a6',
    concrete: '#c4c0b6', concreteDark: '#9a968d', plaster: '#ece3d2', plaster2: '#e2d3b8', sandstone: '#d9c29a', brick: '#b5563d', roofRed: '#b84a35', roofGrey: '#6b6f75',
    white: '#f4f2ec', offwhite: '#e9e5da', black: '#2a2a2d', dark: '#3a3b3f', grey: '#8d9096', greyLight: '#b9bcc0', metal: '#a9aeb3', steel: '#7f858c', chrome: '#d7dadd',
    glass: '#8fb8cf', glassDark: '#4f6f86', wood: '#9a6a3f', woodLight: '#c09062', woodDark: '#6a4529', fabric: '#5f7ea3', fabric2: '#b8664a', fabric3: '#8a9a5b', cream: '#efe4cf',
    red: '#d23c35', orange: '#ea7b2c', yellow: '#f0c03a', green: '#3f9b55', blue: '#2f6fb3', navy: '#253a5e', teal: '#2e9c94', purple: '#7d5aa6', pink: '#e7849f', brown: '#7b5234',
    grass: '#7fb24a', grass2: '#6a9d3d', grassDark: '#557f33', leaf: '#5f9f3a', leaf2: '#86bf45', leaf3: '#4a8531', pine: '#3f7a4a', pine2: '#2f6340', trunk: '#8a6240', bark: '#6e4f33',
    soil: '#8a6a48', soilDark: '#6d5137', rock: '#9b958b', rock2: '#857f76', rockLight: '#b5afa5', sand: '#e8c590', sand2: '#d9ad72', water: '#3e8fb0', water2: '#5fb3cf', snow: '#f4f6f8',
    rubber: '#232220', skin: '#e0a676', gold: '#d0a443',
    trunk2: '#8d6740', palmGreen: '#5f9f3a', palmGreen2: '#86bf45', date: '#c8641f', date2: '#9a3d16'
  };
  K.c = n => (Array.isArray(n) ? n : AA.hex(K.PAL[n] || n));
  K.COLORS = [['white', 'أبيض'], ['black', 'أسود'], ['grey', 'رمادي'], ['red', 'أحمر'], ['blue', 'أزرق'], ['green', 'أخضر'], ['yellow', 'أصفر'], ['orange', 'برتقالي'], ['navy', 'كحلي'], ['teal', 'فيروزي'], ['brown', 'بني'], ['sandstone', 'بيج']];
  K.sides = (q, n) => Math.max(3, Math.round(n * (q === 'low' ? 0.5 : q === 'high' ? 1.5 : 1)));

  // ---------- تسجيل أصل ----------
  // K.def(id, { name, nameEn, group, schema, presets, clips, generate })
  K.GROUPS = { tools: 'الأشغال اليدوية', fantasy: 'شخصيات خيالية', people: 'الناس', street: 'الشارع', build: 'قطع البناء', buildings: 'المباني', home: 'البيت', vehicles: 'المركبات', nature: 'الطبيعة', props: 'أغراض' };
  K.def = function (id, o) { AA.assets['kit_' + id] = Object.assign({ id: 'kit_' + id, category: 'kit', group: o.group, schema: [], presets: {} }, o, { id: 'kit_' + id }); };
  K.color = (key, label, def, extra) => ({ key, label, type: 'enum', options: (extra || []).concat(K.COLORS), def });

  // ---------- الأجزاء والمواد ----------
  const MATS = {
    paint: () => LP.mat('paint', { roughness: 0.55 }), body: () => LP.mat('paint', { roughness: 0.6 }), plastic: () => LP.mat('plastic', { roughness: 0.7 }),
    metal: () => LP.mat('metal', { metalness: 0.45, roughness: 0.4 }), chrome: () => LP.mat('metal', { metalness: 0.6, roughness: 0.25 }),
    glass: () => LP.mat('glass', { roughness: 0.1, opacity: 0.55, doubleSided: true }), glassSolid: () => LP.mat('glass', { roughness: 0.15, metalness: 0.2 }),
    mirror: () => LP.mat('glass', { roughness: 0.05, metalness: 0.5 }),
    lamp: () => LP.mat('lamp', { emissive: [1, 0.93, 0.78], glow: 1.2 }), lampCool: () => LP.mat('lamp', { emissive: [0.85, 0.92, 1], glow: 1.2 }),
    tail: () => LP.mat('lamp', { emissive: [0.9, 0.05, 0.03], glow: 0.5 }), amber: () => LP.mat('lamp', { emissive: [1, 0.5, 0.05], glow: 0.4 }),
    sigRed: () => LP.mat('lamp', { emissive: [1, 0.08, 0.05], glow: 1.6 }), sigAmber: () => LP.mat('lamp', { emissive: [1, 0.6, 0.05], glow: 1.6 }), sigGreen: () => LP.mat('lamp', { emissive: [0.1, 1, 0.45], glow: 1.6 }),
    screen: () => LP.mat('lamp', { emissive: [0.35, 0.55, 0.9], glow: 0.6 }), neon: () => LP.mat('lamp', { emissive: [1, 1, 1], glow: 0.9 }),
    dark: () => LP.mat('dark'), rubber: () => LP.mat('rubber', { roughness: 0.95 }), wood: () => LP.mat('wood'), cloth: () => LP.mat('cloth'), cloth2: () => LP.mat('cloth', { doubleSided: true }),
    stone: () => LP.mat('stone'), concrete: () => LP.mat('stone', { roughness: 0.95 }), ground: () => LP.mat('ground', { roughness: 1 }), road: () => LP.mat('ground', { roughness: 0.95 }),
    leaves: () => LP.mat('leaves', { roughness: 0.9 }), grass: () => LP.mat('leaves', { roughness: 0.95, doubleSided: true }), flower: () => LP.mat('flower'),
    water: () => LP.mat('water', { roughness: 0.08, metalness: 0.1, opacity: 0.85 }), ceramic: () => LP.mat('plastic', { roughness: 0.25 })
  };
  // P = K.parts(); P('glass') يرجع بنّاء الجزء (ويُنشئه أول مرة). K.done(id, P, meta) ينهي الأصل.
  K.parts = function () {
    const map = {}, extra = {};
    const P = name => map[name] || (map[name] = new AA.Builder());
    P.map = map; P.extra = extra;
    P.custom = (name, material) => { extra[name] = material; return P(name); }; // جزء بمادة خاصة (عجلة تدور، باب، مروحة)
    return P;
  };
  K.done = function (id, P, meta) {
    const parts = {}; let top = 0, rad = 0;
    for (const [name, b] of Object.entries(P.map)) {
      if (!b.idx.length) continue;
      parts[name] = { builder: b, material: P.extra[name] || (MATS[name] ? MATS[name]() : LP.mat(name)) };
      for (let i = 0; i < b.pos.length; i += 3) { top = Math.max(top, b.pos[i + 1]); rad = Math.max(rad, Math.hypot(b.pos[i], b.pos[i + 2])); }
    }
    return LP.finalize('kit_' + id, parts, Object.assign({ stiffness: 0, height: top, radius: rad }, meta || {}));
  };
  K.boxCol = (w, h, d, y) => ({ type: 'box', size: [w, h, d], center: [0, y == null ? h / 2 : y, 0] });

  // ---------- أشكال أساسية (كلها تقبل o = { at:[x,y,z], rot } مثل AA.box) ----------
  const X = (p, o) => o ? AA.xform(p, o) : p;
  const XD = (v, o) => o && o.rot ? AA.xform(v, { rot: o.rot }) : v;
  K.X = X;
  K.box = (B, c, size, col, o, rotZ) => AA.box(B, c, size, K.c(col), 1, o || {}, rotZ);
  K.cyl = (B, a, b, r0, r1, n, col, o, po) => LP.prism(B, X(a, o), X(b, o), r0, r1, n, typeof col === 'function' ? col : K.c(col), po);
  K.tri = (B, a, b, c, col, want, o) => LP.tri(B, X(a, o), X(b, o), X(c, o), K.c(col), want ? XD(want, o) : null);
  K.quad = (B, a, b, c, d, col, want, o) => { K.tri(B, a, b, c, col, want, o); K.tri(B, a, c, d, col, want, o); };
  K.ball = (B, c, r, col, o, detail, keep) => LP.ico(B, X(c, o), r, detail == null ? 0 : detail, typeof col === 'function' ? col : () => K.c(col), keep ? { keep } : {});

  // تثليث مضلع ثنائي الأبعاد (قطع الآذان)
  function earclip(pts) {
    const n = pts.length, idx = pts.map((_, i) => i), out = [], area = pts.reduce((s, p, i) => { const q = pts[(i + 1) % n]; return s + p[0] * q[1] - q[0] * p[1]; }, 0), ccw = area > 0;
    const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const inside = (p, a, b, c) => { const d1 = cross(a, b, p), d2 = cross(b, c, p), d3 = cross(c, a, p); return ccw ? d1 > 1e-9 && d2 > 1e-9 && d3 > 1e-9 : d1 < -1e-9 && d2 < -1e-9 && d3 < -1e-9; };
    let guard = 0;
    while (idx.length > 3 && guard++ < 5000) {
      let cut = false;
      for (let i = 0; i < idx.length; i++) {
        const ia = idx[(i + idx.length - 1) % idx.length], ib = idx[i], ic = idx[(i + 1) % idx.length], a = pts[ia], b = pts[ib], c = pts[ic], cr = cross(a, b, c);
        if (ccw ? cr <= 1e-9 : cr >= -1e-9) continue;
        if (idx.some(j => j !== ia && j !== ib && j !== ic && inside(pts[j], a, b, c))) continue;
        out.push([ia, ib, ic]); idx.splice(i, 1); cut = true; break;
      }
      if (!cut) break;
    }
    if (idx.length === 3) out.push([idx[0], idx[1], idx[2]]);
    return { tris: out, ccw };
  }
  K.earclip = earclip;
  // بثق مقطع (u,v) على محور: axis 'x' → المقطع (z,y) بين x0..x1 ؛ axis 'z' → المقطع (x,y) بين z0..z1 ؛ axis 'y' → المقطع (x,z) بين y0..y1
  // col: لون أو { side, cap } ، o: موضع ودوران
  K.extrude = function (B, prof, axis, a0, a1, col, o) {
    const { tris, ccw } = earclip(prof), n = prof.length, cs = col && col.side ? K.c(col.side) : K.c(col), cc = col && col.cap ? K.c(col.cap) : cs;
    const P3 = (pt, t) => axis === 'x' ? [t, pt[1], pt[0]] : axis === 'z' ? [pt[0], pt[1], t] : [pt[0], t, pt[1]];
    const ax = axis === 'x' ? [1, 0, 0] : axis === 'z' ? [0, 0, 1] : [0, 1, 0];
    if (!(col && col.noCaps)) for (const [t, s] of [[a1, 1], [a0, -1]]) for (const [a, b, c] of tris) K.tri(B, P3(prof[a], t), P3(prof[b], t), P3(prof[c], t), cc, V.scale(ax, s), o);
    for (let i = 0; i < n; i++) {
      const a = prof[i], b = prof[(i + 1) % n], du = b[0] - a[0], dv = b[1] - a[1], m = ccw ? [dv, -du] : [-dv, du];
      const nrm = axis === 'x' ? [0, m[1], m[0]] : axis === 'z' ? [m[0], m[1], 0] : [m[0], 0, m[1]];
      K.quad(B, P3(a, a0), P3(b, a0), P3(b, a1), P3(a, a1), typeof cs === 'function' ? cs(i) : (col && col.edge ? K.c(col.edge(i, nrm)) : cs), nrm, o);
    }
  };
  // مضلع أفقي بارتفاع (أرضية، سقف، لوحة): footprint [[x,z]...]
  K.slab = (B, pts, y0, y1, col, o) => K.extrude(B, pts, 'y', y0, y1, col, o);
  // دائرة كمضلع
  K.circle = (r, n, a0) => { const pts = []; for (let k = 0; k < n; k++) { const a = (a0 || 0) + k / n * Math.PI * 2; pts.push([Math.cos(a) * r, Math.sin(a) * r]); } return pts; };
  K.rrect = (w, d, r, n) => { const pts = []; n = n || 2; for (const [cx, cz, a0] of [[w / 2 - r, d / 2 - r, 0], [-(w / 2 - r), d / 2 - r, Math.PI / 2], [-(w / 2 - r), -(d / 2 - r), Math.PI], [w / 2 - r, -(d / 2 - r), Math.PI * 1.5]]) for (let k = 0; k <= n; k++) { const a = a0 + k / n * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } return pts; };
  // قضيب بين نقطتين (أنبوب، عمود، ساق)
  K.rod = (B, a, b, r, col, o, n) => K.cyl(B, a, b, r, r, n || 6, col, o);

  // ---------- عجلات المركبات ----------
  function wheelInto(T, Rm, c, R, w, sx, q, rimCol) {
    const n = q === 'low' ? 8 : 12, ax = [1, 0, 0], a = V.madd(c, ax, -w / 2), b = V.madd(c, ax, w / 2);
    LP.prism(T, a, b, R, R, n, K.c('rubber'), { rot: Math.PI / n });
    LP.prism(T, V.madd(c, ax, -w / 2 - 0.005), V.madd(c, ax, w / 2 + 0.005), R * 0.74, R * 0.74, n, K.c('#33302d'), { rot: Math.PI / n });
    const out = V.madd(c, ax, sx * (w / 2 + 0.012));
    LP.prism(Rm, V.madd(c, ax, sx * (w / 2 - 0.02)), out, R * 0.55, R * 0.5, n, rimCol, { rot: Math.PI / n });
    LP.prism(Rm, out, V.madd(out, ax, sx * 0.025), R * 0.15, R * 0.11, 6, AA.mixc(rimCol, [0, 0, 0], 0.35));
  }
  K.wheelInto = wheelInto;
  // axles: [{ z, x (نصف المسافة بين العجلتين)، R، w، steer، dual }] — كل محور جزء يدور (والأمامي جزءين يلفّان مع المقود)
  K.wheels = function (P, axles, q, rimCol) {
    rimCol = K.c(rimCol || 'greyLight');
    axles.forEach((A, k) => {
      const sides = A.steer ? [['L', 1], ['R', -1]] : [['', 0]];
      for (const [sd, s] of sides) {
        const spin = A.steer ? { pivot: [s * A.x, A.R, A.z], axis: 'x', radius: A.R, steer: true } : { pivot: [0, A.R, A.z], axis: 'x', radius: A.R };
        const T = P.custom('tire' + k + sd, LP.mat('rubber', { roughness: 0.95, spin })), Rm = P.custom('rim' + k + sd, LP.mat('metal', { metalness: 0.35, roughness: 0.4, spin }));
        for (const sx of (A.steer ? [s] : [1, -1])) {
          wheelInto(T, Rm, [sx * A.x, A.R, A.z], A.R, A.w, sx, q, rimCol);
          if (A.dual) wheelInto(T, Rm, [sx * (A.x - A.w - 0.03), A.R, A.z], A.R, A.w, sx, q, rimCol);
        }
      }
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
