// Aboden Assets — badia/badia.js
// البادية: بيت الشعر (سقف شعر ماعز على صفوف أعمدة، ستارة خلفية وجوانب، أطناب وأوتاد، قاطع سدو يفصل المجلس عن المحرم، وفرش)،
// وخيمة قماش بيضاء (مدوّرة بعمود وسطي أو مستطيلة بسقف جملوني) ببطانة سدو من الداخل.
(function (g) {
  'use strict';
  const AA = g.AA;
  const V = AA.v, lerp = AA.lerp, smooth = AA.smooth, vary = AA.vary, mixc = AA.mixc, hex = AA.hex, clamp = AA.clamp;
  const LOW = q => q === 'low';

  function kit() { const k = {}; for (const n of ['hair', 'wood', 'rope', 'sadu', 'rug', 'cloth', 'canvas', 'lining', 'metal', 'flame', 'ember', 'stone', 'ash', 'woodDark', 'porcelain', 'goods', 'clay', 'metal2', 'glass', 'smoke'] ) k[n] = new AA.Builder(); return k; }
  function done(id, P, meta, o) {
    o = o || {};
    return AA.finalize(id, {
      hair:     { builder: P.hair,     material: { kind: 'cloth', texture: 'hair_tent', roughness: 1, doubleSided: true } },
      canvas:   { builder: P.canvas,   material: { kind: 'cloth', texture: 'canvas', roughness: 0.95 } },
      lining:   { builder: P.lining,   material: { kind: 'cloth', texture: 'sadu', roughness: 0.95 } },
      wood:     { builder: P.wood,     material: { kind: 'wood', texture: 'wood', roughness: 0.85 } },
      woodDark: { builder: P.woodDark, material: { kind: 'wood', texture: 'wood', roughness: 0.9, color: [0.42, 0.36, 0.32] } },
      rope:     { builder: P.rope,     material: { kind: 'rope', roughness: 1, color: [0.55, 0.45, 0.32] } },
      sadu:     { builder: P.sadu,     material: { kind: 'cloth', texture: 'sadu', roughness: 0.95, doubleSided: true } },
      rug:      { builder: P.rug,      material: { kind: 'cloth', texture: 'rug', roughness: 0.97 } },
      cloth:    { builder: P.cloth,    material: { kind: 'cloth', texture: 'cloth', roughness: 0.9 } },
      metal:    { builder: P.metal,    material: { kind: 'metal', roughness: 0.32, metalness: 0.55, color: [0.8, 0.6, 0.27] } },
      metal2:   { builder: P.metal2,   material: { kind: 'metal', roughness: 0.4, metalness: 0.45, color: [0.3, 0.29, 0.27] } },
      porcelain:{ builder: P.porcelain,material: { kind: 'porcelain', roughness: 0.25 } },
      goods:    { builder: P.goods,    material: { kind: 'fruit', roughness: 0.55 } },
      clay:     { builder: P.clay,     material: { kind: 'clay', texture: 'clay', roughness: 0.92 } },
      stone:    { builder: P.stone,    material: { kind: 'stone', texture: 'sandstone', roughness: 0.95 } },
      ash:      { builder: P.ash,      material: { kind: 'ash', roughness: 1 } },
      ember:    { builder: P.ember,    material: { kind: 'flame', roughness: 0.9, emissive: [1, 0.32, 0.06], glow: 1.4 } },
      flame:    { builder: P.flame,    material: { kind: 'flame', roughness: 1, emissive: [1, 0.45, 0.1], glow: 1.5, doubleSided: true } },
      glass:    { builder: P.glass,    material: { kind: 'glass', roughness: 0.1, opacity: 0.32, doubleSided: true, color: [1, 0.95, 0.85] } },
      smoke:    { builder: P.smoke,    material: { kind: 'smoke', roughness: 1, opacity: 0.18, doubleSided: true, color: [0.9, 0.9, 0.92] } }
    }, Object.assign({ stiffness: 0 }, meta));
  }
  // شبكة سطح: f(i, j) → [نقطة, uv]، والوجه يُوجَّه باتجاه want(نقطة)
  function sheet(B, nu, nv, f, col, want, sw) {
    const ids = [];
    for (let i = 0; i <= nu; i++) { ids.push([]); for (let j = 0; j <= nv; j++) { const [p, uv] = f(i, j); ids[i].push(B.v(p, col(p, i, j), sw ? sw(p, i, j) : 0, (i + j) * 0.3, sw ? sw(p, i, j) * 0.5 : 0, uv)); } }
    const P = id => [B.pos[id * 3], B.pos[id * 3 + 1], B.pos[id * 3 + 2]];
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const a = ids[i][j], b = ids[i + 1][j], c = ids[i + 1][j + 1], d = ids[i][j + 1], pa = P(a), n = V.cross(V.sub(P(b), pa), V.sub(P(c), pa));
      if (V.dot(n, want(pa)) >= 0) { B.t(a, b, c); B.t(a, c, d); } else { B.t(a, c, b); B.t(a, d, c); }
    }
    return ids;
  }
  // حبل متدلٍّ قليلاً بين نقطتين + وتد في الأرض
  function guy(P, a, b, rng) {
    const pts = []; for (let k = 0; k <= 5; k++) { const t = k / 5; pts.push(V.add(V.lerp(a, b, t), [0, -0.06 * Math.sin(Math.PI * t), 0])); }
    AA.tube(P.rope, pts, pts.map(() => 0.011), 4, () => [1, 1, 1], () => 0, 0, null, false);
    AA.tube(P.woodDark, [V.add(b, [0, -0.05, 0]), V.add(b, [(a[0] - b[0]) * 0.02, 0.22, (a[2] - b[2]) * 0.02])], [0.022, 0.018], 5, () => vary([0.8, 0.75, 0.7], rng, 0.1), () => 0, 0, null, true);
  }

  // ---------- بيت الشعر ----------
  function baitShaar(p, q) {
    const P = kit(), rng = AA.rng(p.seed), L = p.length, D = p.depth, hc = p.height, hf = hc * 0.78, hb = hc * 0.62, nPole = Math.max(2, Math.round(L / 2.6)), sp = L / nPole;
    const poleX = []; for (let k = 0; k <= nPole; k++) poleX.push(-L / 2 + k * sp);
    const tint = p.color === 'brown' ? [1.25, 1.05, 0.9] : [1, 1, 1];
    const base = z => { const t = (z + D / 2) / D; return t < 0.5 ? lerp(hb, hc, smooth(0, 1, t * 2) * 0.7 + t * 2 * 0.3) : lerp(hc, hf, smooth(0, 1, (t - 0.5) * 2) * 0.7 + (t - 0.5) * 2 * 0.3); };
    const roofH = (x, z) => {
      let dx = Infinity; for (const px of poleX) dx = Math.min(dx, Math.abs(x - px));
      const edge = Math.abs(z) / (D / 2), sag = (0.1 + 0.16 * edge) * (1 - Math.cos(Math.PI * clamp(dx / (sp / 2), 0, 1))) / 2;
      const peak = Math.abs(z) < 0.4 ? 0.06 * Math.exp(-dx * dx / 0.05) : 0;
      return base(z) - sag + peak + 0.015 * Math.sin(x * 3.1 + z * 2);
    };
    const nu = LOW(q) ? nPole * 3 : nPole * 8, nv = LOW(q) ? 6 : 14, ov = 0.15;
    // السقف
    sheet(P.hair, nu, nv, (i, j) => { const x = lerp(-L / 2 - ov, L / 2 + ov, i / nu), z = lerp(-D / 2, D / 2, j / nv); return [[x, roofH(x, z), z], [x / 2, z / 2]]; }, () => tint, () => [0, 1, 0], (pp) => 0.04 * Math.abs(pp[2]) / D);
    // الرفّة الأمامية المتدلية والستارة الخلفية (الرواق) حتى الأرض
    sheet(P.hair, nu, 2, (i, j) => { const x = lerp(-L / 2 - ov, L / 2 + ov, i / nu), y0 = roofH(x, D / 2); return [[x, y0 - 0.32 * j / 2, D / 2 + 0.02 * j], [x / 2, 1 - j * 0.15]]; }, () => tint, () => [0, 0, 1]);
    const backRows = LOW(q) ? 3 : 6;
    sheet(P.hair, nu, backRows, (i, j) => { const x = lerp(-L / 2 - ov, L / 2 + ov, i / nu), t = j / backRows, y0 = roofH(x, -D / 2), fold = 0.05 * Math.sin(x * 4.3) * t; return [[x, lerp(y0, 0.02, t), -D / 2 - 0.35 * t * t + fold], [x / 2, t * 0.8]]; }, () => tint, () => [0, 0, -1], (pp, i, j) => 0.03 * j / backRows);
    // الجانبان (يمكن رفع الأمامي منهما)
    if (p.sides) for (const sx of [1, -1]) {
      const nz = LOW(q) ? 4 : 10, ny = LOW(q) ? 3 : 6, xE = sx * (L / 2 + ov);
      sheet(P.hair, nz, ny, (i, j) => { const z = lerp(-D / 2, D / 2 * (1 - 0.35 * p.open), i / nz), t = j / ny, y0 = roofH(xE, z); return [[xE + sx * 0.25 * t * t + 0.04 * Math.sin(z * 5) * t, lerp(y0, 0.02, t), z], [z / 2, t * 0.8]]; }, () => tint, () => [sx, 0, 0]);
    }
    // الأعمدة: ثلاثة صفوف (خلفي، أوسط أطول، أمامي)
    for (const px of poleX) for (const [z, fz] of [[-D / 2 + 0.05, 1], [0, 1], [D / 2 - 0.02, 1]]) {
      if (z < 0 && (px === poleX[0] || px === poleX[nPole])) continue;
      const top = roofH(px, z) - 0.01;
      AA.tube(P.wood, [[px, 0, z], [px + (rng() - 0.5) * 0.04, top, z]], [0.045, 0.038], LOW(q) ? 5 : 7, () => vary([0.75, 0.68, 0.6], rng, 0.1), () => 0, 0, null, true);
    }
    // الأطناب: من حافة السقف فوق الأعمدة الأمامية والخلفية إلى أوتاد بعيدة
    for (const px of poleX) for (const sz of [1, -1]) { const z = sz * D / 2, a = [px, roofH(px, z) - 0.02, z + sz * 0.02], b = [px * 1.08, 0.02, sz * (D / 2 + 1.7 + hc * 0.4)]; guy(P, a, b, rng); }
    for (const sx of [1, -1]) for (const z of [-D / 4, D / 4]) { const a = [sx * (L / 2 + ov), roofH(sx * L / 2, z), z], b = [sx * (L / 2 + 1.8), 0.02, z * 1.3]; guy(P, a, b, rng); }
    // القاطع (المعشّر): ستارة سدو تفصل المجلس (يمين، +X) عن المحرم (يسار)
    const xd = L / 2 - L * p.majlis;
    if (p.divider) sheet(P.sadu, 2, LOW(q) ? 4 : 8, (i, j) => { const z = lerp(-D / 2 + 0.05, D / 2 - 0.25, j / (LOW(q) ? 4 : 8)), y = i === 0 ? 0.02 : i === 1 ? roofH(xd, z) * 0.5 : roofH(xd, z) - 0.03; return [[xd + 0.03 * Math.sin(z * 4), y, z], [z / D + 0.5, y / 2.5]]; }, () => [1, 1, 1], () => [1, 0, 0]);
    // الفرش: زل على الأرض، مساند على الرواق، ووجار وطقم قهوة في المجلس
    const M = AA.majlis, mw = L * p.majlis - 0.5, mx = (xd + L / 2) / 2;
    if (p.furnish && M) {
      M.rugInto(P, { at: [mx, 0, 0] }, mw, D - 0.8, q, rng, true);
      M.seatRun(P, { at: [mx, 0, -D / 2 + 0.55] }, mw - 0.4, q, rng, true);
      if (mw > 2.6) M.seatRun(P, { at: [L / 2 - 0.45, 0, 0.2], rot: -Math.PI / 2 }, D - 2.0, q, rng, false);
      M.flameInto(P, [mx - 0.2, 0.07, D / 2 - 1.0], 0.38, rng, q, LOW(q) ? 3 : 7);
      for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, c = [mx - 0.2 + Math.cos(a) * 0.32, 0.06, D / 2 - 1.0 + Math.sin(a) * 0.32]; AA.blob(P.stone, c, [0.08, 0, 0], [0, 0.06, 0], [0, 0, 0.08], () => vary([0.7, 0.66, 0.6], rng, 0.2), 0, 0, 0, rng, 0.3, LOW(q)); }
      for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + 0.4; AA.tube(P.woodDark, [[mx - 0.2 + Math.cos(a) * 0.3, 0.05, D / 2 - 1.0 + Math.sin(a) * 0.3], [mx - 0.2, 0.15, D / 2 - 1.0]], [0.028, 0.02], 5, () => [0.7, 0.62, 0.55], () => 0, 0, null, true); }
      M.dallahInto(P, [mx + 0.25, 0.04, D / 2 - 0.85], 1, -1.3, q); M.dallahInto(P, [mx + 0.2, 0.04, D / 2 - 1.2], 0.8, -2.0, q);
      // المحرم: زولية ومساند وفراش وأوانٍ
      const wx = (-L / 2 + xd) / 2, ww = xd + L / 2 - 0.5;
      if (ww > 1.2) { M.rugInto(P, { at: [wx, 0, 0.2] }, ww, D - 1.4, q, rng, false); M.seatRun(P, { at: [wx, 0, -D / 2 + 0.55] }, Math.max(1, ww - 0.6), q, rng, false); M.jarInto(P, [-L / 2 + 0.5, 0.02, D / 2 - 0.6], 'burma', 1.3, q, rng, [0.74, 0.46, 0.3]); M.jarInto(P, [-L / 2 + 0.85, 0.02, D / 2 - 0.4], 'jarra', 1.4, q, rng, [0.8, 0.52, 0.34]); }
    }
    const seats = []; if (p.furnish) { const n = Math.max(1, Math.floor((mw - 0.4) / 0.8)); for (let k = 0; k < n; k++) seats.push({ at: [mx - (mw - 0.4) / 2 + (k + 0.5) * (mw - 0.4) / n, 0.17, -D / 2 + 0.53], rot: 0 }); }
    return done('bait_shaar', P, { height: hc + 0.1, radius: Math.hypot(L / 2 + 2, D / 2 + 2.5), collider: { type: 'compound' }, seats, majlis: { x: mx, width: mw }, divider: xd,
      light: p.furnish ? { at: [mx - 0.2, 0.4, D / 2 - 1.0], color: [1, 0.55, 0.2], intensity: 2.2, distance: 9, flicker: true } : null });
  }

  // ---------- خيمة قماش ----------
  function khaima(p, q) {
    const P = kit(), rng = AA.rng(p.seed), col = p.color === 'beige' ? hex('#e2d3b2') : p.color === 'green' ? hex('#7d8a5a') : [1, 1, 1];
    let light = null, H;
    if (p.style === 'bell') {
      const R = p.size, wallH = 1.35, apex = 2.0 + R * 0.45, door = 0.32, n = LOW(q) ? 16 : 40;
      H = apex;
      // جدار + سقف مخروطي: نفس الشبكة مع فتحة باب أمامية (الزاوية 0 = +Z)
      const prof = [[0.02, R * 1.02], [wallH * 0.5, R], [wallH, R], [wallH + 0.06, R * 1.03], [lerp(wallH, apex, 0.35), R * 0.68], [lerp(wallH, apex, 0.7), R * 0.32], [apex, 0.08]];
      const angs = []; for (let k = 0; k <= n; k++) angs.push(lerp(door, Math.PI * 2 - door, k / n));
      const pt = (a, y, r) => [Math.sin(a) * r, y, Math.cos(a) * r];
      for (const [B, outward, inset] of [[P.canvas, true, 0], [P.lining, false, 0.015]]) {
        sheet(B, n, prof.length - 1, (i, j) => { const [y, r] = prof[j], a = angs[i], rr = r - inset, droop = j === 3 ? 0.02 * Math.cos(a * n / 4) : 0; return [pt(a, y - droop, rr + (j <= 2 ? 0.015 * Math.sin(a * 9) : 0)), [a * R / 2, y / 2]]; }, () => outward ? col : [1, 1, 1], pp => { const d = [pp[0], 0, pp[2]], l = Math.hypot(d[0], d[2]) || 1, up = pp[1] > wallH ? 0.6 : 0; return outward ? [d[0] / l, up, d[2] / l] : [-d[0] / l, -up, -d[2] / l]; });
      }
      // السقف فوق فتحة الباب (يكمل المخروط) والباب ملفوف للأعلى
      sheet(P.canvas, 6, 3, (i, j) => { const a = lerp(-door, door, i / 6), y = lerp(wallH + 0.06, apex, j / 3), r = lerp(R * 1.03, 0.08, j / 3); return [pt(a, y, r), [a, y]]; }, () => col, pp => [pp[0] * 0.3, 0.8, pp[2] * 0.3]);
      for (const s2 of [1, -1]) { const a = s2 * door, c = pt(a, wallH * 0.98, R + 0.04); AA.loft(P.canvas, { path: [[c[0], 0.3, c[2]], [c[0], wallH, c[2]]], sides: 8, capStart: true, capEnd: true, up: () => [0, 0, 1], radius: () => 0.07, color: () => col }); }
      AA.tube(P.wood, [[0, 0, 0], [0, apex + 0.12, 0]], [0.05, 0.04], 7, () => [0.85, 0.78, 0.7], () => 0, 0, null, true);
      AA.lathe(P.canvas, [[apex - 0.05, 0.14], [apex + 0.05, 0.12], [apex + 0.1, 0]], { sides: 12, color: () => mixc(col, [0.4, 0.3, 0.2], 0.3) });
      for (let k = 0; k < 10; k++) { const a = (k + 0.5) / 10 * Math.PI * 2; guy(P, pt(a, wallH + 0.05, R * 1.03), pt(a, 0.02, R + 1.5), rng); }
      if (p.furnish && AA.majlis) { AA.majlis.rugInto(P, { at: [0, 0, 0] }, R * 1.3, R * 1.3, q, rng, false); AA.majlis.seatRun(P, { at: [0, 0, -R + 0.55] }, R * 1.2, q, rng, true); AA.majlis.lanternInto(P, { at: [0.25, 1.5, 0.05] }, 1, q, rng, true); light = { at: [0.25, 1.6, 0.05], color: [1, 0.7, 0.35], intensity: 1.2, distance: 6, flicker: true }; }
    } else { // مستطيلة بسقف جملوني
      const Lx = p.size * 1.6, Dz = p.size * 1.15, wallH = 1.6, ridge = 2.7, door = 0.55;
      H = ridge;
      const rf = (x, z) => lerp(wallH + 0.05, ridge, 1 - Math.abs(z) / (Dz / 2 + 0.15));
      for (const [B, out, ins] of [[P.canvas, 1, 0], [P.lining, -1, 0.015]]) {
        // السقف (منحدران)
        for (const sz of [1, -1]) sheet(B, LOW(q) ? 4 : 10, 3, (i, j) => { const x = lerp(-Lx / 2 - 0.15, Lx / 2 + 0.15, i / (LOW(q) ? 4 : 10)), z = sz * lerp(0, Dz / 2 + 0.15, j / 3); return [[x, rf(x, z) - ins - 0.02 * Math.sin(Math.PI * i / (LOW(q) ? 4 : 10)) * (j / 3), z], [x / 2, z / 2]]; }, () => out > 0 ? col : [1, 1, 1], () => [0, out, 0]);
        // الجدران الأربعة (الأمامي فيه باب)
        for (const sz of [1, -1]) {
          const segs = sz > 0 ? [[-Lx / 2, -door], [door, Lx / 2]] : [[-Lx / 2, Lx / 2]];
          for (const [x0, x1] of segs) sheet(B, LOW(q) ? 2 : 5, 2, (i, j) => { const x = lerp(x0, x1, i / (LOW(q) ? 2 : 5)), y = lerp(0.02, wallH, j / 2); return [[x, y, sz * (Dz / 2 - ins) + 0.01 * Math.sin(x * 6) * (1 - j / 2)], [x / 2, y / 2]]; }, () => out > 0 ? col : [1, 1, 1], () => [0, 0, sz * out]);
          // مثلث الجملون فوق الجدار ليس موجوداً (الجملون على الجانبين)
        }
        for (const sx of [1, -1]) {
          sheet(B, LOW(q) ? 2 : 6, 2, (i, j) => { const z = lerp(-Dz / 2, Dz / 2, i / (LOW(q) ? 2 : 6)), y = lerp(0.02, wallH, j / 2); return [[sx * (Lx / 2 - ins), y, z], [z / 2, y / 2]]; }, () => out > 0 ? col : [1, 1, 1], () => [sx * out, 0, 0]);
          sheet(B, 4, 2, (i, j) => { const z = lerp(-Dz / 2 - 0.0, Dz / 2, i / 4), y0 = wallH, y1 = rf(0, z); return [[sx * (Lx / 2 - ins), lerp(y0, y1, j / 2), z], [z / 2, j]]; }, () => out > 0 ? col : [1, 1, 1], () => [sx * out, 0, 0]);
        }
      }
      // ستارة الباب مرفوعة ومربوطة
      AA.loft(P.canvas, { path: [[-door, wallH - 0.05, Dz / 2 + 0.06], [door, wallH - 0.05, Dz / 2 + 0.06]], sides: 8, capStart: true, capEnd: true, up: () => [0, 1, 0], radius: () => 0.09, color: () => col });
      for (const x of [-Lx / 2, 0, Lx / 2]) AA.tube(P.wood, [[x * 0.98, 0, 0], [x * 0.98, (x === 0 ? ridge : wallH) + 0.05, 0]], [0.045, 0.04], 6, () => [0.85, 0.78, 0.7], () => 0, 0, null, true);
      AA.loft(P.wood, { path: [[-Lx / 2, ridge - 0.04, 0], [Lx / 2, ridge - 0.04, 0]], sides: 6, up: () => [0, 1, 0], radius: () => 0.035, color: () => [0.85, 0.78, 0.7] });
      for (const sz of [1, -1]) for (let k = 0; k <= 3; k++) { const x = lerp(-Lx / 2, Lx / 2, k / 3); guy(P, [x, wallH + 0.05, sz * (Dz / 2 + 0.15)], [x * 1.1, 0.02, sz * (Dz / 2 + 1.6)], rng); }
      if (p.furnish && AA.majlis) { AA.majlis.rugInto(P, { at: [0, 0, 0] }, Lx - 0.4, Dz - 0.4, q, rng, false); AA.majlis.seatRun(P, { at: [0, 0, -Dz / 2 + 0.5] }, Lx - 0.6, q, rng, true); AA.majlis.lanternInto(P, { at: [0.3, 1.7, 0] }, 1, q, rng, true); light = { at: [0.3, 1.8, 0], color: [1, 0.7, 0.35], intensity: 1.2, distance: 6, flicker: true }; }
    }
    return done('khaima', P, { height: H + 0.2, radius: p.size * 1.6 + 1.6, collider: { type: 'compound' }, door: { z: 1, width: 0.9 }, light });
  }

  const A = AA.assets;
  A.bait_shaar = { id: 'bait_shaar', name: 'بيت شعر', nameEn: 'Bedouin hair tent', category: 'badia',
    schema: [
      { key: 'length', label: 'الطول', min: 5, max: 18, step: 0.5, def: 11, unit: 'م' },
      { key: 'depth', label: 'العمق', min: 3.5, max: 7, step: 0.25, def: 5, unit: 'م' },
      { key: 'height', label: 'ارتفاع العمود الأوسط', min: 1.8, max: 3, step: 0.05, def: 2.35, unit: 'م' },
      { key: 'color', label: 'لون الشعر', type: 'enum', options: [['black', 'أسود'], ['brown', 'بني']], def: 'black' },
      { key: 'sides', label: 'الجوانب', type: 'bool', def: true },
      { key: 'open', label: 'رفع الجانب الأمامي', min: 0, max: 1, step: 0.05, def: 0.6, pct: true },
      { key: 'divider', label: 'قاطع سدو', type: 'bool', def: true },
      { key: 'majlis', label: 'نسبة المجلس', min: 0.35, max: 0.75, step: 0.05, def: 0.6, pct: true },
      { key: 'furnish', label: 'الفرش والوجار', type: 'bool', def: true }
    ], presets: { 'بيت صغير': { length: 6.5, depth: 4, height: 2, majlis: 0.55 }, 'بيت شيخ': { length: 16, depth: 6, height: 2.7 } }, generate: baitShaar };
  A.khaima = { id: 'khaima', name: 'خيمة', nameEn: 'Canvas tent', category: 'badia',
    schema: [
      { key: 'style', label: 'الشكل', type: 'enum', options: [['bell', 'مدوّرة بعمود'], ['box', 'مستطيلة']], def: 'bell' },
      { key: 'size', label: 'الحجم', min: 1.6, max: 4, step: 0.1, def: 2.6, unit: 'م' },
      { key: 'color', label: 'اللون', type: 'enum', options: [['white', 'أبيض'], ['beige', 'بيج'], ['green', 'زيتي']], def: 'white' },
      { key: 'furnish', label: 'فرش وفانوس', type: 'bool', def: true }
    ], presets: { 'خيمة مستطيلة': { style: 'box', size: 3 }, 'خيمة صغيرة': { size: 1.8, furnish: false } }, generate: khaima };
})(typeof window !== 'undefined' ? window : globalThis);
