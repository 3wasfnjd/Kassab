// Aboden Assets — majlis/majlis.js
// المجلس والقهوة: دلة، طقم قهوة بصينية وفناجيل، مبخرة، زولية، جلسة أرضية بمساند، وجار (نار حطب)،
// فانوس، زير ماء على مركاز، فخار (جرار وبرمة)، وحزمة حطب.
// المضيء (الجمر، اللهب، الفانوس) مادته emissive، ويعطي في meta.light مكان الضوء ولونه ليضيفه المحرك ليلاً.
(function (g) {
  'use strict';
  const AA = g.AA;
  const V = AA.v, hex = AA.hex, mixc = AA.mixc, vary = AA.vary, lerp = AA.lerp, smooth = AA.smooth, clamp = AA.clamp;
  const LOW = q => q === 'low';
  const SIDES = { high: 28, med: 18, low: 10 };

  const FINISH = { brass: { c: [0.8, 0.6, 0.27], m: 0.55, r: 0.32 }, copper: { c: [0.74, 0.42, 0.26], m: 0.5, r: 0.35 }, silver: { c: [0.82, 0.82, 0.8], m: 0.6, r: 0.28 } };
  function kit() {
    const k = {};
    for (const n of ['metal', 'metal2', 'porcelain', 'wood', 'woodDark', 'sadu', 'rug', 'cloth', 'clay', 'flame', 'ember', 'glass', 'smoke', 'stone', 'dark', 'rope', 'goods', 'ash']) k[n] = new AA.Builder();
    return k;
  }
  function done(id, P, meta, o) {
    o = o || {};
    if (meta.lift) { for (const k in P) { const B = P[k]; for (let i = 1; i < B.pos.length; i += 3) B.pos[i] += meta.lift; } meta.height += meta.lift; delete meta.lift; } // فوق سطح الأرض بقليل
    const F = FINISH[o.finish || 'brass'] || FINISH.brass;
    return AA.finalize(id, {
      metal:     { builder: P.metal,     material: { kind: 'metal', roughness: F.r, metalness: F.m, color: F.c } },
      metal2:    { builder: P.metal2,    material: { kind: 'metal', roughness: 0.4, metalness: 0.45, color: [0.3, 0.29, 0.27] } },
      porcelain: { builder: P.porcelain, material: { kind: 'porcelain', roughness: 0.25 } },
      wood:      { builder: P.wood,      material: { kind: 'wood', texture: 'wood', roughness: 0.75 } },
      woodDark:  { builder: P.woodDark,  material: { kind: 'wood', texture: 'wood', roughness: 0.9, color: [0.42, 0.36, 0.32] } },
      sadu:      { builder: P.sadu,      material: { kind: 'cloth', texture: 'sadu', roughness: 0.95 } },
      rug:       { builder: P.rug,       material: { kind: 'cloth', texture: 'rug', roughness: 0.97 } },
      cloth:     { builder: P.cloth,     material: { kind: 'cloth', texture: 'cloth', roughness: 0.9 } },
      clay:      { builder: P.clay,      material: { kind: 'clay', texture: 'clay', roughness: 0.92 } },
      stone:     { builder: P.stone,     material: { kind: 'stone', texture: 'sandstone', roughness: 0.95 } },
      dark:      { builder: P.dark,      material: { kind: 'dark', roughness: 0.9, color: [0.08, 0.07, 0.06] } },
      ash:       { builder: P.ash,       material: { kind: 'ash', roughness: 1 } },
      rope:      { builder: P.rope,      material: { kind: 'rope', roughness: 1, color: [0.6, 0.48, 0.3] } },
      goods:     { builder: P.goods,     material: { kind: 'fruit', roughness: 0.55 } },
      ember:     { builder: P.ember,     material: { kind: 'flame', roughness: 0.9, emissive: [1, 0.32, 0.06], glow: 1.4 } },
      flame:     { builder: P.flame,     material: { kind: 'flame', roughness: 1, emissive: [1, 0.45, 0.1], glow: 1.5, doubleSided: true } },
      glass:     { builder: P.glass,     material: { kind: 'glass', roughness: 0.1, opacity: 0.32, doubleSided: true, color: [1, 0.95, 0.85] } },
      smoke:     { builder: P.smoke,     material: { kind: 'smoke', roughness: 1, opacity: 0.18, doubleSided: true, color: [0.9, 0.9, 0.92] } }
    }, Object.assign({ stiffness: 0 }, meta));
  }

  // ---------- دلة سعودية ----------
  // مقطع دلة نجدية (حساوية): قاعدة، بطن منتفخ، خصر، كتف عريض، رقبة، غطاء قبّة، ورمّانة مدبّبة
  const DALLAH = [[0, 0.0], [0.0005, 0.052], [0.008, 0.058], [0.016, 0.052], [0.03, 0.058], [0.055, 0.066], [0.08, 0.066], [0.1, 0.058], [0.12, 0.042], [0.138, 0.032], [0.152, 0.034],
    [0.166, 0.046], [0.176, 0.054], [0.184, 0.05], [0.192, 0.038], [0.2, 0.032], [0.206, 0.034], [0.214, 0.036], [0.222, 0.033], [0.236, 0.026], [0.248, 0.016], [0.256, 0.01], [0.262, 0.012],
    [0.27, 0.014], [0.278, 0.01], [0.29, 0.006], [0.305, 0.009], [0.315, 0.004], [0.34, 0.0]];
  function dallahInto(P, at, s, rot, q, B) {
    B = B || P.metal;
    const sides = SIDES[q], X = p => AA.xform(V.scale(p, s), { at, rot });
    const n0 = B.vertexCount;
    AA.lathe(B, DALLAH, { sides, color: (y) => (Math.abs(y - 0.176) < 0.006 || Math.abs(y - 0.008) < 0.004 || Math.abs(y - 0.214) < 0.004) ? [0.88, 0.8, 0.62] : [1, 1, 1], uvU: 2 });
    // المنقار: يخرج من أسفل البطن ويصعد هلالاً إلى ما فوق الكتف
    const sp = AA.bezier([[0, 0.06, 0.055], [0, 0.11, 0.11], [0, 0.2, 0.1], [0, 0.25, 0.15], [0, 0.262, 0.185]], LOW(q) ? 6 : 12);
    AA.loft(B, { path: sp, sides: LOW(q) ? 5 : 8, up: () => [1, 0, 0], capEnd: true, radius: t => { const r = lerp(0.02, 0.006, Math.pow(t, 0.8)); return [r * (t > 0.7 ? 0.65 : 1), r]; }, color: () => [1, 1, 1] });
    // المقبض خلفاً
    const hp = AA.bezier([[0, 0.182, -0.048], [0, 0.2, -0.11], [0, 0.12, -0.12], [0, 0.07, -0.07]], LOW(q) ? 6 : 12);
    AA.loft(B, { path: hp, sides: 5, up: () => [0, 0, -1], radius: () => [0.009, 0.0045], color: () => [0.95, 0.95, 0.95] });
    // حلقة تثبيت الغطاء
    AA.loft(B, { path: [[0, 0.24, -0.03], [0, 0.25, -0.055], [0, 0.23, -0.08]], sides: 4, radius: () => 0.003, color: () => [1, 1, 1] });
    for (let i = n0; i < B.vertexCount; i++) { const p = X([B.pos[i * 3], B.pos[i * 3 + 1], B.pos[i * 3 + 2]]); B.pos[i * 3] = p[0]; B.pos[i * 3 + 1] = p[1]; B.pos[i * 3 + 2] = p[2]; }
  }
  function dallah(p, q) {
    const P = kit();
    dallahInto(P, [0, 0, 0], p.size, 0, q);
    return done('dallah', P, { lift: 0.022, height: 0.34 * p.size, radius: 0.15 * p.size, collider: { type: 'cylinder', radius: 0.07 * p.size, height: 0.34 * p.size }, physics: { mass: 1.2 * p.size, friction: 0.4 }, spout: [0, 0.262 * p.size, 0.185 * p.size] }, { finish: p.finish });
  }

  // فنجال: يصعد من الخارج وينزل من الداخل، بحاشية ذهبية
  function finjanInto(P, at, q, gold) {
    const pr = [[0, 0.0], [0.0004, 0.017], [0.004, 0.021], [0.02, 0.025], [0.036, 0.029], [0.038, 0.0285], [0.036, 0.026], [0.012, 0.019], [0.008, 0.0]];
    AA.lathe(P.porcelain, pr, { at, sides: LOW(q) ? 8 : 14, color: (y, a, i) => (i >= 4 && i <= 5) || (gold && Math.abs(y - 0.02) < 0.003) ? [0.86, 0.66, 0.24] : [0.96, 0.95, 0.92] });
  }
  function trayInto(P, at, R, q) {
    AA.lathe(P.metal, [[0, 0], [0.001, R * 0.9], [0.004, R * 0.97], [0.018, R], [0.022, R * 1.02], [0.02, R * 0.97], [0.007, R * 0.92], [0.006, 0]], { at, sides: SIDES[q] + 6, color: (y, a, i) => i === 4 ? [0.9, 0.82, 0.64] : [0.92, 0.92, 0.92] });
  }
  function datesBowl(P, at, R, q, rng) {
    AA.lathe(P.porcelain, [[0, 0], [0.001, R * 0.5], [0.03, R * 0.85], [0.045, R], [0.047, R * 0.98], [0.04, R * 0.9], [0.012, R * 0.4], [0.01, 0]], { at, sides: LOW(q) ? 8 : 16, color: (y, a, i) => i >= 3 && i <= 4 ? [0.2, 0.36, 0.5] : [0.94, 0.93, 0.9] });
    const n = LOW(q) ? 6 : 16;
    for (let k = 0; k < n; k++) {
      const a = rng() * 6.283, d = Math.sqrt(rng()) * R * 0.7, c = [at[0] + Math.cos(a) * d, at[1] + 0.04 + 0.02 * (1 - d / R) + rng() * 0.01, at[2] + Math.sin(a) * d];
      const b1 = rng() * Math.PI, an = V.norm([Math.cos(b1), (rng() - 0.5) * 0.5, Math.sin(b1)]), [u, w] = AA.basis(an), col = vary(hex('#4a2410'), rng, 0.2);
      AA.blob(P.goods, c, V.scale(u, 0.011), V.scale(an, 0.02), V.scale(w, 0.011), () => col, 0, 0, 0, rng, 0.06, LOW(q));
    }
  }
  function coffeeSet(p, q) {
    const P = kit(), rng = AA.rng(p.seed), R = 0.24;
    trayInto(P, [0, 0, 0], R, q);
    dallahInto(P, [-0.08, 0.006, -0.06], 1, 0.6, q);
    if (p.dallahs > 1) dallahInto(P, [0.1, 0.006, -0.1], 0.78, -0.3, q);
    if (p.dallahs > 2) dallahInto(P, [-0.02, 0.006, -0.16], 0.65, 0.2, q);
    const nc = Math.round(p.cups);
    // فناجيل: مكدّسة فوق بعض (صفّ) قرب حافة الصينية + واحد مقلوب
    for (let k = 0; k < nc; k++) {
      const stack = k % 2, base = Math.floor(k / 2);
      const at = [0.12 - base * 0.07, 0.006 + stack * 0.014, 0.1 + (base % 2) * 0.03];
      finjanInto(P, at, q, true);
    }
    if (p.dates) datesBowl(P, [-0.42, 0, 0.12], 0.11, q, rng);
    return done('coffee_set', P, { lift: 0.024, height: 0.34, radius: 0.5, collider: { type: 'cylinder', radius: 0.26, height: 0.1 } }, { finish: p.finish });
  }

  // ---------- مبخرة ----------
  function mabkhara(p, q) {
    const P = kit(), s = p.size, rng = AA.rng(p.seed);
    // مقطع مربع واحد متصل: قاعدة عريضة، عنق، ثم وعاء الجمر
    const W = P.woodDark, st = W.vertexCount;
    const prof = [[0, 0], [0.0005, 0.075], [0.012, 0.075], [0.03, 0.06], [0.032, 0.05], [0.1, 0.034], [0.13, 0.062], [0.132, 0.066], [0.165, 0.07], [0.17, 0.064], [0.168, 0.058], [0.15, 0]];
    AA.lathe(W, prof.map(([y, w]) => [y * s, w * s * Math.SQRT2]), { sides: 4, color: (y, a, i) => i === 1 || i === 9 ? [0.6, 0.55, 0.5] : [1, 1, 1], uvU: 1, uvV: 3 });
    for (let i = st; i < W.vertexCount; i++) { const x = W.pos[i * 3], z = W.pos[i * 3 + 2], c = Math.SQRT1_2; W.pos[i * 3] = x * c - z * c; W.pos[i * 3 + 2] = x * c + z * c; }
    // زخارف معدنية ومرايا صغيرة على الأوجه
    for (let f = 0; f < 4; f++) {
      const a = f * Math.PI / 2, n = [Math.sin(a), 0, Math.cos(a)];
      for (const [y, w] of [[0.02, 0.07], [0.148, 0.071]]) AA.box(P.metal, V.add(V.scale(n, w * s), [0, y * s, 0]), [Math.abs(n[2]) > 0.5 ? 0.09 * s : 0.006 * s, 0.01 * s, Math.abs(n[0]) > 0.5 ? 0.09 * s : 0.006 * s], [1, 1, 1], 0.2, {});
      AA.box(P.metal, V.add(V.scale(n, 0.047 * s), [0, 0.065 * s, 0]), [Math.abs(n[2]) > 0.5 ? 0.03 * s : 0.004 * s, 0.03 * s, Math.abs(n[0]) > 0.5 ? 0.03 * s : 0.004 * s], [1, 1, 1], 0.2, {});
    }
    // الجمر والبخور
    AA.blob(P.ash, [0, 0.168 * s, 0], [0.05 * s, 0, 0], [0, 0.012 * s, 0], [0, 0, 0.05 * s], () => [0.35, 0.33, 0.31], 0, 0, 0, rng, 0.2, LOW(q));
    for (let k = 0; k < (LOW(q) ? 2 : 5); k++) AA.blob(P.ember, [(rng() - 0.5) * 0.05 * s, 0.178 * s, (rng() - 0.5) * 0.05 * s], [0.012 * s, 0, 0], [0, 0.009 * s, 0], [0, 0, 0.012 * s], () => [1, 0.45, 0.15], 0, 0, 0, rng, 0.3, true);
    // دخان رقيق يتلوّى
    if (p.smoke) for (let k = 0; k < 3; k++) {
      const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([Math.sin(t * 5 + k * 2) * 0.03 * t * s, (0.19 + t * 0.45) * s, Math.cos(t * 4 + k) * 0.03 * t * s]); }
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], w = (0.006 + 0.02 * i / 8) * s;
        const ids = [a, b].map((pp, j) => [P.smoke.v(V.add(pp, [-w, 0, 0]), [1, 1, 1], 0.05 * (i + j), k, 0.8), P.smoke.v(V.add(pp, [w, 0, 0]), [1, 1, 1], 0.05 * (i + j), k, 0.8)]);
        P.smoke.t(ids[0][0], ids[0][1], ids[1][1]); P.smoke.t(ids[0][0], ids[1][1], ids[1][0]);
      }
    }
    return done('mabkhara', P, { lift: 0.022, height: 0.2 * s + (p.smoke ? 0.45 * s : 0), radius: 0.08 * s, collider: { type: 'box', size: [0.15 * s, 0.17 * s, 0.15 * s] }, light: { at: [0, 0.19 * s, 0], color: [1, 0.45, 0.15], intensity: 0.25, distance: 1.5 } });
  }

  // ---------- زولية (سجادة) ----------
  function rugInto(P, o, L, W, q, rng, fringe) {
    const nu = LOW(q) ? 6 : 16, nv = LOW(q) ? 4 : 10, y0 = 0.032, th = 0.012, ids = [];
    const hgt = (x, z) => y0 + th + 0.004 * Math.sin(x * 3.1 + 1) * Math.sin(z * 2.3) + 0.003 * AA.noise3(x * 2, 0, z * 2, 5);
    for (let i = 0; i <= nu; i++) { ids.push([]); for (let j = 0; j <= nv; j++) { const x = lerp(-L / 2, L / 2, i / nu), z = lerp(-W / 2, W / 2, j / nv); ids[i].push(P.rug.v(AA.xform([x, hgt(x, z), z], o), [1, 1, 1], 0, 0, 0, [i / nu, j / nv])); } }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { P.rug.t(ids[i][j], ids[i][j + 1], ids[i + 1][j + 1]); P.rug.t(ids[i][j], ids[i + 1][j + 1], ids[i + 1][j]); }
    // الحافة: شريط سماكة حول السجادة
    const edge = [];
    for (let i = 0; i <= nu; i++) edge.push([lerp(-L / 2, L / 2, i / nu), -W / 2]);
    for (let j = 1; j <= nv; j++) edge.push([L / 2, lerp(-W / 2, W / 2, j / nv)]);
    for (let i = nu - 1; i >= 0; i--) edge.push([lerp(-L / 2, L / 2, i / nu), W / 2]);
    for (let j = nv - 1; j >= 0; j--) edge.push([-L / 2, lerp(-W / 2, W / 2, j / nv)]);
    for (let k = 0; k < edge.length - 1; k++) {
      const [x0, z0] = edge[k], [x1, z1] = edge[k + 1];
      AA.quad(P.rug, [[x0, y0, z0], [x1, y0, z1], [x1, hgt(x1, z1), z1], [x0, hgt(x0, z0), z0]].map(p => AA.xform(p, o)), [[0.01, 0.01], [0.02, 0.01], [0.02, 0.02], [0.01, 0.02]], [[0.5, 0.5, 0.5]],
        AA.v.norm(AA.xform([((x0 + x1) / 2) / L, 0, ((z0 + z1) / 2) / W], { rot: o.rot || 0 })));
    }
    if (fringe) for (const s of [1, -1]) for (let k = 0; k < (LOW(q) ? 6 : 22); k++) {
      const z = lerp(-W / 2 + 0.04, W / 2 - 0.04, k / (LOW(q) ? 5 : 21)), base = AA.xform([s * L / 2, y0 + th * 0.5, z], o), dir = AA.xform([s, -0.08, (rng() - 0.5) * 0.2], { rot: o.rot || 0 });
      AA.ribbon(P.cloth, base, V.norm(dir), 0.06 + rng() * 0.02, 0.018, 1, 0.2, [0.92, 0.88, 0.8], [0.86, 0.8, 0.7], 0, 0, 0, rng, { taper: false });
    }
  }
  function carpet(p, q) {
    const P = kit(), rng = AA.rng(p.seed);
    rugInto(P, {}, p.length, p.width, q, rng, true);
    return done('carpet', P, { height: 0.06, radius: Math.hypot(p.length, p.width) / 2, collider: { type: 'none' }, seats: { length: p.length, width: p.width } });
  }

  // ---------- جلسة أرضية: فرشة + مساند + تكايات ----------
  const saduCol = (q2, n) => n[1] < -0.5 ? [0.45, 0.4, 0.38] : [1, 1, 1];
  function seatRun(P, o, L, q, rng, cushions) {
    const seg = LOW(q) ? 1 : 3;
    AA.roundBox(P.sadu, [0, 0.11, 0], [L, 0.13, 0.72], 0.05, { seg, at: o.at, rot: o.rot, bulge: 0.012, tile: 1.4, color: saduCol }); // الفرشة
    const n = Math.max(1, Math.round(L / 0.75));
    for (let k = 0; k < n; k++) { // المساند خلفاً مائلة قليلاً
      const x = -L / 2 + (k + 0.5) * L / n, w = L / n - 0.04;
      const st = P.sadu.vertexCount;
      AA.roundBox(P.sadu, [0, 0, 0], [w, 0.48, 0.16], 0.06, { seg, bulge: 0.02, tile: 1.4, color: saduCol });
      for (let i = st; i < P.sadu.vertexCount; i++) { // ميلان للخلف ثم نقل
        const y = P.sadu.pos[i * 3 + 1], z = P.sadu.pos[i * 3 + 2], a = -0.22, y2 = y * Math.cos(a) - z * Math.sin(a), z2 = y * Math.sin(a) + z * Math.cos(a);
        const pp = AA.xform([P.sadu.pos[i * 3] + x, y2 + 0.42, z2 - 0.27], o); P.sadu.pos[i * 3] = pp[0]; P.sadu.pos[i * 3 + 1] = pp[1]; P.sadu.pos[i * 3 + 2] = pp[2];
      }
    }
    if (cushions) for (let k = 0; k <= n; k++) { // تكاية (مسند ذراع) أسطوانية بين المساند
      if (k % 2 && k !== n) continue;
      const x = -L / 2 + k * L / n + (k === 0 ? 0.15 : k === n ? -0.15 : 0);
      const c = AA.xform([x, 0.27, -0.05], o), d = AA.xform([0, 0, 1], { rot: o.rot || 0 });
      AA.loft(P.cloth, { path: [V.madd(c, d, -0.26), V.madd(c, d, -0.2), V.madd(c, d, 0.18), V.madd(c, d, 0.24)], sides: LOW(q) ? 6 : 12, capStart: true, capEnd: true, uvU: 2, uvV: 2,
        radius: t => 0.09 * (t < 0.1 || t > 0.9 ? 0.75 : 1), color: () => vary(hex('#8a2a24'), rng, 0.1) });
    }
  }
  function majlisSeat(p, q) {
    const P = kit(), rng = AA.rng(p.seed), L = p.length, layout = p.layout;
    const runs = [];
    if (layout === 'line') runs.push({ L, at: [0, 0, 0], rot: 0 });
    else {
      const D = p.depth;
      runs.push({ L, at: [0, 0, -D / 2], rot: 0 });
      runs.push({ L: D - 0.8, at: [-L / 2 + 0.36, 0, 0.36], rot: Math.PI / 2 });
      if (layout === 'u') runs.push({ L: D - 0.8, at: [L / 2 - 0.36, 0, 0.36], rot: -Math.PI / 2 });
    }
    for (const r of runs) seatRun(P, { at: r.at, rot: r.rot }, r.L, q, rng, true);
    if (p.rug && layout !== 'line') rugInto(P, { at: [0, 0, 0.4] }, L - 1.6, p.depth - 1.5, q, rng, true);
    const seats = []; // أماكن الجلوس (للمحرك): نقطة + اتجاه الوجه
    for (const r of runs) { const n = Math.max(1, Math.floor(r.L / 0.8)); for (let k = 0; k < n; k++) seats.push({ at: AA.xform([-r.L / 2 + (k + 0.5) * r.L / n, 0.17, -0.02], { at: r.at, rot: r.rot }), rot: r.rot }); }
    return done('majlis_seat', P, { height: 0.7, radius: Math.max(L, p.depth || 1) / 2 + 0.4, collider: { type: 'compound' }, seats });
  }

  // ---------- وجار: نار حطب داخل حلقة حجارة ----------
  function flameInto(P, c, h, rng, q, n) {
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2 + rng(), r = 0.04 + rng() * 0.05, base = [c[0] + Math.cos(a) * r, c[1], c[2] + Math.sin(a) * r], hh = h * (0.6 + rng() * 0.6);
      const segs = LOW(q) ? 2 : 4, side = V.norm([Math.sin(a), 0, -Math.cos(a)]), ph = rng() * 6, ids = [];
      for (let i = 0; i <= segs; i++) {
        const t = i / segs, w = 0.05 * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.05)) * (1 - 0.6 * t) * (h / 0.5);
        const pc = [base[0] - Math.cos(a) * r * t * 0.8, base[1] + hh * t, base[2] - Math.sin(a) * r * t * 0.8];
        const col = mixc([1, 0.92, 0.55], [0.95, 0.3, 0.05], t);
        ids.push([P.flame.v(V.madd(pc, side, w), col, 0.05 * t, ph, 2.5 * t), P.flame.v(V.madd(pc, side, -w), col, 0.05 * t, ph, 2.5 * t)]);
      }
      for (let i = 0; i < segs; i++) { P.flame.t(ids[i][0], ids[i][1], ids[i + 1][1]); P.flame.t(ids[i][0], ids[i + 1][1], ids[i + 1][0]); }
    }
  }
  function firePit(p, q) {
    const P = kit(), rng = AA.rng(p.seed), R = p.radius;
    // حلقة حجارة
    const ns = Math.round(R * 2 * Math.PI / 0.2);
    for (let k = 0; k < ns; k++) {
      const a = k / ns * Math.PI * 2 + (rng() - 0.5) * 0.15, s = 0.09 + rng() * 0.05, c = [Math.cos(a) * R, 0.03 + s * 0.4, Math.sin(a) * R];
      AA.blob(P.stone, c, [s * 1.1, 0, 0], [0, s * 0.7, 0], [0, 0, s], () => vary([0.78, 0.72, 0.66], rng, 0.25), 0, 0, 0, rng, 0.35, LOW(q));
    }
    // رماد وجمر
    AA.blob(P.ash, [0, 0.03, 0], [R * 0.85, 0, 0], [0, 0.03, 0], [0, 0, R * 0.85], () => [0.32, 0.3, 0.28], 0, 0, 0, rng, 0.2, LOW(q));
    if (p.lit) for (let k = 0; k < (LOW(q) ? 5 : 14); k++) { const a = rng() * 6.28, d = Math.sqrt(rng()) * R * 0.6; AA.blob(P.ember, [Math.cos(a) * d, 0.055, Math.sin(a) * d], [0.025, 0, 0], [0, 0.015, 0], [0, 0, 0.025], () => [1, 0.5, 0.2], 0, 0, 0, rng, 0.4, true); }
    // حطب سمر متصالب
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * Math.PI * 2 + rng() * 0.3, l = R * 1.3, c0 = [Math.cos(a) * l * 0.7, 0.05, Math.sin(a) * l * 0.7], c1 = [Math.cos(a) * 0.04, 0.16 + rng() * 0.04, Math.sin(a) * 0.04];
      const pts = [c0, V.lerp(c0, c1, 0.5), c1];
      AA.tube(P.woodDark, pts.map((pp, i) => V.add(pp, [0, 0, (rng() - 0.5) * 0.02])), [0.032, 0.03, 0.022], LOW(q) ? 5 : 7, (i) => i === 2 && p.lit ? [0.15, 0.12, 0.1] : vary([0.75, 0.68, 0.6], rng, 0.1), () => 0, 0, null, true);
    }
    if (p.lit) flameInto(P, [0, 0.07, 0], 0.5 * p.flame, rng, q, LOW(q) ? 4 : 9);
    // دلال بجانب النار
    if (p.dallahs) { dallahInto(P, [R + 0.18, 0, 0.12], 1, -1.2, q); dallahInto(P, [R + 0.12, 0, -0.18], 0.8, -1.9, q); }
    return done('fire_pit', P, { height: p.lit ? 0.6 * p.flame : 0.25, radius: R + 0.35, collider: { type: 'cylinder', radius: R, height: 0.2 },
      light: p.lit ? { at: [0, 0.35, 0], color: [1, 0.55, 0.2], intensity: 2.4 * p.flame, distance: 9, flicker: true } : null }, { finish: 'brass' });
  }

  // ---------- فانوس ----------
  function lanternInto(P, o, s, q, rng, lit) {
    const S6 = 6, R = 0.07 * s, X = pp => AA.xform(pp, o);
    const n0 = { metal2: P.metal2.vertexCount, glass: P.glass.vertexCount, flame: P.flame.vertexCount };
    AA.lathe(P.metal2, [[0, 0], [0.001, R * 1.05], [0.02 * s, R * 1.1], [0.024 * s, R * 0.95], [0.025 * s, 0]], { sides: S6, color: () => [1, 1, 1] }); // القاعدة
    AA.lathe(P.metal2, [[0.2 * s, 0], [0.2 * s + 0.001, R * 1.12], [0.21 * s, R * 1.14], [0.27 * s, R * 0.4], [0.3 * s, R * 0.25], [0.305 * s, 0]], { sides: S6, color: () => [1, 1, 1] }); // السقف
    for (let k = 0; k < S6; k++) { const a = k / S6 * Math.PI * 2; AA.tube(P.metal2, [[Math.sin(a) * R, 0.02 * s, Math.cos(a) * R], [Math.sin(a) * R, 0.205 * s, Math.cos(a) * R]], [0.004 * s, 0.004 * s], 4, () => [1, 1, 1], () => 0, 0, null, false); }
    AA.lathe(P.glass, [[0.024 * s, R * 0.97], [0.2 * s, R * 0.97]], { sides: S6, color: () => [1, 1, 1] }); // زجاج
    const ring = []; for (let k = 0; k <= 12; k++) { const a = k / 12 * Math.PI * 2; ring.push([Math.sin(a) * 0.03 * s, 0.335 * s + Math.cos(a) * 0.03 * s, 0]); }
    AA.tube(P.metal2, ring, ring.map(() => 0.004 * s), 4, () => [1, 1, 1], () => 0, 0, null, false); // الحلقة
    // الفتيلة واللهب
    AA.lathe(P.metal2, [[0.025 * s, 0.018 * s], [0.06 * s, 0.016 * s], [0.065 * s, 0.006 * s]], { sides: 6, color: () => [0.8, 0.8, 0.8] });
    if (lit) AA.lathe(P.flame, [[0.065 * s, 0], [0.07 * s, 0.008 * s], [0.085 * s, 0.011 * s], [0.105 * s, 0.006 * s], [0.12 * s, 0]], { sides: 6, color: (y) => mixc([1, 0.95, 0.7], [1, 0.55, 0.15], (y / s - 0.065) / 0.055) });
    for (const [k, v] of Object.entries(n0)) { const B = P[k]; for (let i = v; i < B.vertexCount; i++) { const pp = X([B.pos[i * 3], B.pos[i * 3 + 1], B.pos[i * 3 + 2]]); B.pos[i * 3] = pp[0]; B.pos[i * 3 + 1] = pp[1]; B.pos[i * 3 + 2] = pp[2]; } }
  }
  function lantern(p, q) {
    const P = kit(), rng = AA.rng(p.seed), s = p.size;
    let y = 0, light;
    if (p.mount === 'wall') { // ذراع خشب مثبت في الجدار (الجدار خلفه عند z=0) والفانوس معلّق منه
      y = 2.1; const arm = 0.42;
      AA.box(P.wood, [0, 2.62, 0.02], [0.12, 0.16, 0.06], [0.8, 0.75, 0.7], 0.5, {});
      AA.box(P.wood, [0, 2.66, arm / 2], [0.06, 0.06, arm], [0.85, 0.8, 0.75], 0.5, {});
      AA.box(P.wood, [0, 2.53, 0.12], [0.04, 0.22, 0.04], [0.8, 0.75, 0.7], 0.5, {}, 0);
      const ch = []; for (let k = 0; k <= 6; k++) ch.push([0, lerp(2.63, y + 0.335 * s + 0.03 * s, k / 6), arm - 0.03]);
      AA.tube(P.metal2, ch, ch.map(() => 0.004), 4, () => [1, 1, 1], () => 0, 0, null, false);
      lanternInto(P, { at: [0, y, arm - 0.03] }, s, q, rng, p.lit);
      light = [0, y + 0.1 * s, arm - 0.03];
    } else if (p.mount === 'pole') {
      y = 1.9; AA.tube(P.wood, [[0, 0, 0], [0, 2.3, 0]], [0.05, 0.04], 7, () => [0.8, 0.75, 0.7], () => 0, 0, null, true);
      AA.box(P.wood, [0.2, 2.25, 0], [0.45, 0.05, 0.05], [0.85, 0.8, 0.75], 0.5, {});
      AA.tube(P.metal2, [[0.38, 2.25, 0], [0.38, y + 0.36 * s, 0]], [0.004, 0.004], 4, () => [1, 1, 1], () => 0, 0, null, false);
      lanternInto(P, { at: [0.38, y, 0] }, s, q, rng, p.lit); light = [0.38, y + 0.1 * s, 0];
    } else { lanternInto(P, { at: [0, 0.03, 0] }, s, q, rng, p.lit); light = [0, 0.13 * s, 0]; }
    return done('lantern', P, { height: p.mount === 'floor' ? 0.37 * s : 2.7, radius: 0.5, collider: { type: 'box', size: [0.16 * s, 0.34 * s, 0.16 * s] },
      light: p.lit ? { at: light, color: [1, 0.7, 0.35], intensity: 1.4, distance: 7, flicker: true } : null });
  }

  // ---------- زير ماء على مركاز ----------
  function zir(p, q) {
    const P = kit(), rng = AA.rng(p.seed), H = p.height, R = H * 0.34, legH = 0.42;
    const prof = [[0, 0], [0.001, R * 0.25], [0.06 * H, R * 0.55], [0.3 * H, R * 0.95], [0.5 * H, R], [0.72 * H, R * 0.82], [0.88 * H, R * 0.5], [0.94 * H, R * 0.42], [0.97 * H, R * 0.47], [1.0 * H, R * 0.46], [0.98 * H, R * 0.4], [0.9 * H, R * 0.38]];
    AA.lathe(P.clay, prof, { at: [0, legH - 0.02, 0], sides: SIDES[q], uvU: 2, uvV: 1.5, color: (y) => { const t = y / H; const wet = smooth(0.5, 0.1, t); return mixc([0.78, 0.5, 0.33], [0.55, 0.34, 0.22], wet * 0.6); } });
    // المركاز: ثلاث أرجل خشب وحلقة
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; AA.tube(P.wood, [[Math.sin(a) * R * 0.95, 0, Math.cos(a) * R * 0.95], [Math.sin(a) * R * 0.6, legH + 0.08, Math.cos(a) * R * 0.6]], [0.03, 0.025], 6, () => vary([0.82, 0.76, 0.7], rng, 0.1), () => 0, 0, null, true); }
    const ring = []; for (let k = 0; k <= 16; k++) { const a = k / 16 * Math.PI * 2; ring.push([Math.sin(a) * R * 0.7, legH + 0.03, Math.cos(a) * R * 0.7]); }
    AA.tube(P.wood, ring, ring.map(() => 0.02), 5, () => [0.85, 0.8, 0.75], () => 0, 0, null, false);
    // صحن تحت الزير يجمع القطرات + غطاء خشب وطاسة
    AA.lathe(P.clay, [[0, 0], [0.001, R * 0.45], [0.05, R * 0.55], [0.052, R * 0.52], [0.012, R * 0.42], [0.01, 0]], { at: [0, 0.0, 0], sides: SIDES[q], color: () => [0.7, 0.45, 0.3] });
    const topY = legH - 0.02 + H;
    AA.lathe(P.wood, [[0, 0], [0.001, R * 0.56], [0.025, R * 0.56], [0.026, 0]], { at: [0, topY, 0], sides: SIDES[q], color: () => [0.9, 0.85, 0.8] });
    AA.tube(P.wood, [[0, topY + 0.025, 0], [0, topY + 0.06, 0]], [0.015, 0.02], 6, () => [0.85, 0.8, 0.75], () => 0, 0, null, true);
    AA.lathe(P.metal, [[0, 0], [0.001, 0.05], [0.04, 0.065], [0.042, 0.063], [0.006, 0.045], [0.005, 0]], { at: [R * 0.25, topY + 0.026, 0.02], sides: 12, color: () => [0.92, 0.92, 0.92] });
    return done('zir', P, { lift: 0.022, height: topY + 0.08, radius: R + 0.1, collider: { type: 'cylinder', radius: R, height: topY }, physics: { mass: 40, friction: 0.7 } }, { finish: 'copper' });
  }

  // ---------- فخار: جرة بأذنين، برمة طبخ، إبريق ----------
  function jarInto(P, at, kind, s, q, rng, tint) {
    const S = SIDES[q], col = y => vary(mixc(tint, [0.5, 0.3, 0.2], 0.15 * (1 - y)), rng, 0.02);
    if (kind === 'jarra') {
      const pr = [[0, 0], [0.001, 0.07], [0.03, 0.1], [0.12, 0.14], [0.22, 0.13], [0.3, 0.085], [0.34, 0.06], [0.37, 0.062], [0.39, 0.075], [0.392, 0.07], [0.37, 0.054], [0.33, 0.05]].map(([y, r]) => [y * s, r * s]);
      AA.lathe(P.clay, pr, { at, sides: S, uvU: 2, color: col });
      for (const sd of [1, -1]) AA.loft(P.clay, { path: AA.bezier([[at[0] + sd * 0.07 * s, at[1] + 0.35 * s, at[2]], [at[0] + sd * 0.16 * s, at[1] + 0.34 * s, at[2]], [at[0] + sd * 0.14 * s, at[1] + 0.24 * s, at[2]], [at[0] + sd * 0.11 * s, at[1] + 0.22 * s, at[2]]], 7), sides: 5, radius: () => [0.012 * s, 0.008 * s], color: () => col(0.5) });
    } else if (kind === 'burma') { // برمة: قدر واسع قصير بحافة
      const pr = [[0, 0], [0.001, 0.08], [0.04, 0.14], [0.1, 0.16], [0.15, 0.14], [0.17, 0.12], [0.18, 0.13], [0.185, 0.125], [0.17, 0.11], [0.06, 0.1]].map(([y, r]) => [y * s, r * s]);
      AA.lathe(P.clay, pr, { at, sides: S, uvU: 3, color: y => mixc(col(y), [0.22, 0.17, 0.14], 0.5 * smooth(0.08 * s, 0, y)) });
    } else { // إبريق ماء صغير بمنقار
      const pr = [[0, 0], [0.001, 0.05], [0.02, 0.065], [0.08, 0.075], [0.14, 0.05], [0.18, 0.03], [0.21, 0.032], [0.215, 0.03], [0.2, 0.025]].map(([y, r]) => [y * s, r * s]);
      AA.lathe(P.clay, pr, { at, sides: S, color: col });
      AA.loft(P.clay, { path: [[at[0], at[1] + 0.1 * s, at[2] + 0.06 * s], [at[0], at[1] + 0.14 * s, at[2] + 0.1 * s], [at[0], at[1] + 0.17 * s, at[2] + 0.13 * s]], sides: 6, capEnd: true, radius: t => lerp(0.014, 0.007, t) * s, color: () => col(0.5) });
      AA.loft(P.clay, { path: AA.bezier([[at[0], at[1] + 0.19 * s, at[2] - 0.03 * s], [at[0], at[1] + 0.2 * s, at[2] - 0.11 * s], [at[0], at[1] + 0.08 * s, at[2] - 0.1 * s], [at[0], at[1] + 0.07 * s, at[2] - 0.06 * s]], 7), sides: 5, radius: () => [0.009 * s, 0.006 * s], color: () => col(0.5) });
    }
  }
  function pottery(p, q) {
    const P = kit(), rng = AA.rng(p.seed), n = Math.round(p.count), kinds = ['jarra', 'burma', 'ibriq'];
    const tints = [[0.8, 0.52, 0.34], [0.74, 0.46, 0.3], [0.86, 0.62, 0.42], [0.66, 0.4, 0.27]];
    const spots = [];
    for (let k = 0; k < n; k++) {
      let x, z, g = 0; const kind = p.kind === 'mix' ? kinds[k % 3] : p.kind, s = (kind === 'jarra' ? 1.4 : kind === 'burma' ? 1.3 : 1.2) * (0.75 + rng() * 0.5) * p.size, r = (kind === 'burma' ? 0.17 : 0.14) * s;
      do { x = (rng() - 0.5) * p.spread; z = (rng() - 0.5) * p.spread * 0.6; g++; } while (g < 40 && spots.some(sp => Math.hypot(sp[0] - x, sp[1] - z) < sp[2] + r + 0.02));
      spots.push([x, z, r]);
      jarInto(P, [x, 0.02, z], kind, s, q, rng, tints[k % 4]);
    }
    return done('pottery', P, { height: 0.6 * p.size, radius: p.spread / 2 + 0.2, collider: { type: 'compound' } });
  }

  // ---------- حزمة حطب ----------
  function firewood(p, q) {
    const P = kit(), rng = AA.rng(p.seed), L = p.length, rows = Math.round(p.rows);
    let y = 0.05;
    for (let r = 0; r < rows; r++) {
      const n = rows - r + 2;
      for (let k = 0; k < n; k++) {
        const x = (k - (n - 1) / 2) * 0.11 + (rng() - 0.5) * 0.03, rr = 0.04 + rng() * 0.015, bend = (rng() - 0.5) * 0.08;
        const pts = []; for (let i = 0; i <= 4; i++) { const t = i / 4; pts.push([x + bend * Math.sin(Math.PI * t) + (rng() - 0.5) * 0.01, y + rr + (rng() - 0.5) * 0.01, -L / 2 + L * t + (rng() - 0.5) * 0.05]); }
        AA.tube(P.woodDark, pts, pts.map((_, i) => rr * (1 - 0.15 * Math.abs(i - 2) / 2)), LOW(q) ? 5 : 7, () => vary([0.82, 0.72, 0.6], rng, 0.18), () => 0, 0, null, true);
        AA.blob(P.wood, pts[0], [rr * 0.95, 0, 0], [0, rr * 0.95, 0], [0, 0, 0.01], () => [1.0, 0.92, 0.75], 0, 0, 0, null, 0, true); // مقطع الجذع الفاتح
      }
      y += 0.085;
    }
    if (p.tied) for (const z of [-L * 0.28, L * 0.28]) { const ring = []; for (let k = 0; k <= 14; k++) { const a = k / 14 * Math.PI * 2; ring.push([Math.cos(a) * (rows * 0.07 + 0.1), y / 2 + Math.sin(a) * y * 0.55, z]); } AA.tube(P.rope, ring, ring.map(() => 0.01), 4, () => [1, 1, 1], () => 0, 0, null, false); }
    return done('firewood', P, { height: y + 0.05, radius: L / 2 + 0.1, collider: { type: 'box', size: [rows * 0.15 + 0.3, y, L] }, physics: { mass: 20 * rows, friction: 0.8 } });
  }

  const A = AA.assets;
  const finishOpt = { key: 'finish', label: 'المعدن', type: 'enum', options: [['brass', 'نحاس أصفر'], ['copper', 'نحاس أحمر'], ['silver', 'فضي']], def: 'brass' };
  A.dallah = { id: 'dallah', name: 'دلة', nameEn: 'Dallah coffee pot', category: 'majlis',
    schema: [{ key: 'size', label: 'الحجم', min: 0.6, max: 1.6, step: 0.05, def: 1, pct: true }, finishOpt],
    presets: { 'دلة كبيرة': { size: 1.4 }, 'دلة فضية': { finish: 'silver' } }, generate: dallah };
  A.coffee_set = { id: 'coffee_set', name: 'طقم قهوة', nameEn: 'Coffee tray', category: 'majlis',
    schema: [{ key: 'dallahs', label: 'عدد الدلال', min: 1, max: 3, step: 1, def: 2 }, { key: 'cups', label: 'الفناجيل', min: 0, max: 8, step: 1, def: 6 }, { key: 'dates', label: 'صحن تمر', type: 'bool', def: true }, finishOpt],
    presets: { 'قهوة ضيف': { dallahs: 1, cups: 2 } }, generate: coffeeSet };
  A.mabkhara = { id: 'mabkhara', name: 'مبخرة', nameEn: 'Incense burner', category: 'majlis',
    schema: [{ key: 'size', label: 'الحجم', min: 0.6, max: 1.8, step: 0.05, def: 1, pct: true }, { key: 'smoke', label: 'دخان', type: 'bool', def: true }],
    presets: {}, generate: mabkhara };
  A.carpet = { id: 'carpet', name: 'زولية', nameEn: 'Carpet', category: 'majlis',
    schema: [{ key: 'length', label: 'الطول', min: 1, max: 6, step: 0.1, def: 3, unit: 'م' }, { key: 'width', label: 'العرض', min: 0.6, max: 4, step: 0.1, def: 2, unit: 'م' }],
    presets: { 'سجادة صلاة': { length: 1.2, width: 0.7 } }, generate: carpet };
  A.majlis_seat = { id: 'majlis_seat', name: 'جلسة أرضية', nameEn: 'Floor seating', category: 'majlis',
    schema: [{ key: 'layout', label: 'الترتيب', type: 'enum', options: [['line', 'صف'], ['l', 'زاوية'], ['u', 'حرف U']], def: 'u' },
      { key: 'length', label: 'الطول', min: 1.5, max: 8, step: 0.25, def: 4, unit: 'م' }, { key: 'depth', label: 'العمق', min: 2.5, max: 6, step: 0.25, def: 3.5, unit: 'م' },
      { key: 'rug', label: 'زولية بالوسط', type: 'bool', def: true }],
    presets: { 'مساند صف': { layout: 'line', length: 3 } }, generate: majlisSeat };
  A.fire_pit = { id: 'fire_pit', name: 'وجار', nameEn: 'Fire pit', category: 'majlis',
    schema: [{ key: 'radius', label: 'نصف القطر', min: 0.25, max: 0.7, step: 0.05, def: 0.38, unit: 'م' }, { key: 'lit', label: 'مشتعل', type: 'bool', def: true },
      { key: 'flame', label: 'قوة النار', min: 0.4, max: 1.6, step: 0.05, def: 1, pct: true }, { key: 'dallahs', label: 'دلال بجانبه', type: 'bool', def: true }],
    presets: { 'نار مطفأة': { lit: false } }, generate: firePit };
  A.lantern = { id: 'lantern', name: 'فانوس', nameEn: 'Lantern', category: 'majlis',
    schema: [{ key: 'mount', label: 'التثبيت', type: 'enum', options: [['floor', 'على الأرض'], ['wall', 'على جدار'], ['pole', 'على عمود']], def: 'wall' },
      { key: 'size', label: 'الحجم', min: 0.7, max: 1.6, step: 0.05, def: 1, pct: true }, { key: 'lit', label: 'مضاء', type: 'bool', def: true }],
    presets: { 'فانوس أرضي': { mount: 'floor', size: 1.3 } }, generate: lantern };
  A.zir = { id: 'zir', name: 'زير ماء', nameEn: 'Water jar', category: 'majlis',
    schema: [{ key: 'height', label: 'الارتفاع', min: 0.5, max: 1.1, step: 0.05, def: 0.8, unit: 'م' }],
    presets: {}, generate: zir };
  A.pottery = { id: 'pottery', name: 'فخار', nameEn: 'Pottery', category: 'majlis',
    schema: [{ key: 'kind', label: 'النوع', type: 'enum', options: [['mix', 'منوّع'], ['jarra', 'جرار'], ['burma', 'برم'], ['ibriq', 'أباريق']], def: 'mix' },
      { key: 'count', label: 'العدد', min: 1, max: 12, step: 1, def: 6 }, { key: 'size', label: 'الحجم', min: 0.6, max: 1.6, step: 0.05, def: 1, pct: true }, { key: 'spread', label: 'مساحة الرص', min: 0.5, max: 3, step: 0.1, def: 1.4, unit: 'م' }],
    presets: { 'جرار كبيرة': { kind: 'jarra', count: 4, size: 1.5 } }, generate: pottery };
  A.firewood = { id: 'firewood', name: 'حطب', nameEn: 'Firewood', category: 'majlis',
    schema: [{ key: 'length', label: 'طول الحطب', min: 0.5, max: 1.6, step: 0.05, def: 1, unit: 'م' }, { key: 'rows', label: 'الطبقات', min: 1, max: 5, step: 1, def: 3 }, { key: 'tied', label: 'مربوط', type: 'bool', def: true }],
    presets: {}, generate: firewood };

  AA.majlis = { dallahInto, finjanInto, trayInto, rugInto, seatRun, lanternInto, jarInto, flameInto };
})(typeof window !== 'undefined' ? window : globalThis);
