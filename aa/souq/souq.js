// Aboden Assets — souq/souq.js
// السوق: كشك خشبي، دكان طين، عربة خشب، أكياس خيش، صناديق، سلال خوص، حواجز خشب وسعف، وحوش بباب.
// كل قطعة صغيرة (كيس، سلة، صندوق) دالة تكتب في نفس البنّائين، فالكشك والعربة يتركّبون منها بأمر رسم واحد لكل مادة.
(function (g) {
  'use strict';
  const AA = g.AA;
  const V = AA.v, hex = AA.hex, mixc = AA.mixc, vary = AA.vary, lerp = AA.lerp, smooth = AA.smooth, clamp = AA.clamp;
  const LOW = q => q === 'low';
  const SIDES = { high: 14, med: 10, low: 6 };

  function kit() { return { wheel: new AA.Builder(), tire: new AA.Builder(), wood: new AA.Builder(), burlap: new AA.Builder(), weave: new AA.Builder(), awning: new AA.Builder(), goods: new AA.Builder(), dark: new AA.Builder(), metal: new AA.Builder(), rope: new AA.Builder(), mud: new AA.Builder(), mudTop: new AA.Builder(), clay: new AA.Builder(), brass: new AA.Builder(), metal2: new AA.Builder(), glass: new AA.Builder(), flame: new AA.Builder(), cloth: new AA.Builder() }; }
  function done(id, P, meta, awningTex) {
    const spin = meta.spin; delete meta.spin;
    return AA.finalize(id, {
      wheel:  { builder: P.wheel,  material: { kind: 'wood', texture: 'wood', roughness: 0.82, spin } },
      tire:   { builder: P.tire,   material: { kind: 'metal', roughness: 0.5, color: [0.16, 0.15, 0.14], spin } },
      wood:   { builder: P.wood,   material: { kind: 'wood', texture: 'wood', roughness: 0.82 } },
      burlap: { builder: P.burlap, material: { kind: 'cloth', texture: 'burlap', roughness: 0.95 } },
      weave:  { builder: P.weave,  material: { kind: 'weave', texture: 'weave', roughness: 0.9, doubleSided: true } },
      awning: { builder: P.awning, material: { kind: 'cloth', texture: awningTex || 'stripes_red', roughness: 0.9, doubleSided: true } },
      goods:  { builder: P.goods,  material: { kind: 'fruit', roughness: 0.6 } },
      dark:   { builder: P.dark,   material: { kind: 'dark', roughness: 0.9, color: [0.06, 0.045, 0.035] } },
      metal:  { builder: P.metal,  material: { kind: 'metal', roughness: 0.55, color: [0.16, 0.15, 0.14] } },
      rope:   { builder: P.rope,   material: { kind: 'rope', roughness: 1, color: [0.62, 0.5, 0.32] } },
      mud:    { builder: P.mud,    material: { kind: 'mud', texture: 'mud_wall', roughness: 0.96 } },
      mudTop: { builder: P.mudTop, material: { kind: 'mud', texture: 'mud_top', roughness: 0.95 } },
      clay:   { builder: P.clay,   material: { kind: 'clay', texture: 'clay', roughness: 0.92 } },
      brass:  { builder: P.brass,  material: { kind: 'metal', roughness: 0.32, metalness: 0.55, color: [0.8, 0.6, 0.27] } },
      metal2: { builder: P.metal2, material: { kind: 'metal', roughness: 0.4, metalness: 0.45, color: [0.3, 0.29, 0.27] } },
      glass:  { builder: P.glass,  material: { kind: 'glass', roughness: 0.1, opacity: 0.32, doubleSided: true, color: [1, 0.95, 0.85] } },
      flame:  { builder: P.flame,  material: { kind: 'flame', roughness: 1, emissive: [1, 0.45, 0.1], glow: 1.5, doubleSided: true } },
      cloth:  { builder: P.cloth,  material: { kind: 'cloth', texture: 'cloth', roughness: 0.9, doubleSided: true } }
    }, Object.assign({ stiffness: 0 }, meta));
  }
  // يرسم بإحداثيات محلية ثم ينقل الرؤوس الجديدة إلى مكانها (إزاحة + دوران حول Y)
  function place(P, o, fn) {
    const start = {}; for (const k in P) start[k] = P[k].vertexCount;
    fn();
    if (!o || (!o.at && !o.rot)) return;
    for (const k in P) { const B = P[k]; for (let i = start[k]; i < B.vertexCount; i++) { const q = AA.xform([B.pos[i * 3], B.pos[i * 3 + 1], B.pos[i * 3 + 2]], o); B.pos[i * 3] = q[0]; B.pos[i * 3 + 1] = q[1]; B.pos[i * 3 + 2] = q[2]; } }
  }
  // خشبة: صندوق بلون متفاوت قليلاً
  const plank = (P, c, size, rng, tint, rotZ) => AA.box(P.wood, c, size, vary(tint || [0.92, 0.86, 0.78], rng, 0.14), 0.6, {}, rotZ || 0);
  // عمود خشب خشن
  function post(P, base, h, r, rng, q) {
    const pts = []; for (let k = 0; k <= 4; k++) pts.push([base[0] + (rng() - 0.5) * 0.02, base[1] + h * k / 4, base[2] + (rng() - 0.5) * 0.02]);
    AA.tube(P.wood, pts, pts.map((_, k) => r * (1 - 0.12 * k / 4)), LOW(q) ? 5 : 7, () => vary([0.78, 0.7, 0.6], rng, 0.1), () => 0, 0, null, true);
  }

  // ---------- البضائع ----------
  const GOODS = {
    dates:    { c: '#3d1d0e', c2: '#5e2d14', kind: 'pieces', size: 0.022 },
    lemons:   { c: '#d9c23a', c2: '#c4a92a', kind: 'pieces', size: 0.032 },
    oranges:  { c: '#e0802a', c2: '#c96a1e', kind: 'pieces', size: 0.04 },
    tomatoes: { c: '#c2321f', c2: '#a52818', kind: 'pieces', size: 0.035 },
    spice_red:    { c: '#a8321c', c2: '#8a2614', kind: 'mound' },
    spice_yellow: { c: '#d49a1c', c2: '#b88214', kind: 'mound' },
    spice_green:  { c: '#6b7a2e', c2: '#56631f', kind: 'mound' },
    rice:     { c: '#efe8d8', c2: '#ddd3bc', kind: 'mound' },
    coffee:   { c: '#5a3a22', c2: '#4a2e1a', kind: 'mound' },
    cardamom: { c: '#8a9a52', c2: '#6f7f40', kind: 'mound' }
  };
  // كومة بضاعة داخل وعاء دائري (نصف قطر r) سطحها عند y
  function goods(P, c, r, y, type, rng, q, rx, rz) {
    const G = GOODS[type] || GOODS.dates, A = hex(G.c), B2 = hex(G.c2);
    rx = rx || r; rz = rz || r;
    if (G.kind === 'mound') { // كومة ناعمة بحبيبات: حلقات من المركز للحافة
      const nr = LOW(q) ? 3 : 6, na = LOW(q) ? 8 : 18, hh = r * 0.4, ids = [];
      for (let i = 0; i <= nr; i++) { ids.push([]); for (let j = 0; j <= na; j++) {
        const t = i / nr, a = j / na * Math.PI * 2, n = 1 + 0.08 * (AA.noise3(Math.cos(a) * 2 + c[0] * 9, t * 3, Math.sin(a) * 2, 7) - 0.5) * (i > 0 ? 1 : 0);
        const px = Math.cos(a) * rx * t * n, pz = Math.sin(a) * rz * t * n, py = y + hh * Math.pow(Math.max(0, 1 - t * t), 0.8) - (t >= 1 ? 0.01 : 0);
        ids[i].push(P.goods.v([c[0] + px, py, c[2] + pz], vary(mixc(A, B2, rng() * 0.6 + 0.4 * t), rng, 0.05), 0, 0, 0, [px, pz]));
      } }
      for (let i = 0; i < nr; i++) for (let j = 0; j < na; j++) { P.goods.t(ids[i][j], ids[i + 1][j + 1], ids[i + 1][j]); P.goods.t(ids[i][j], ids[i][j + 1], ids[i + 1][j + 1]); }
    } else {
      const n = Math.min(LOW(q) ? 14 : 40, Math.round(rx * rz * Math.PI / (G.size * G.size * 4.5)));
      AA.blob(P.goods, [c[0], y - G.size * 0.6, c[2]], [rx * 0.92, 0, 0], [0, r * 0.25, 0], [0, 0, rz * 0.92], () => mixc(A, B2, 0.65), 0, 0, 0, rng, 0.05, LOW(q));
      for (let k = 0; k < n; k++) {
        const a = rng() * 6.283, d = Math.sqrt(rng()) * 0.85, px = Math.cos(a) * rx * d, pz = Math.sin(a) * rz * d, py = y + r * 0.22 * (1 - d * d) + G.size * 0.3;
        const s = G.size * (0.85 + rng() * 0.3), col = vary(mixc(A, B2, rng()), rng, 0.1);
        if (type === 'dates') { // التمرة مستطيلة ومائلة باتجاه عشوائي
          const b1 = rng() * Math.PI, ax = [Math.cos(b1), (rng() - 0.5) * 0.6, Math.sin(b1)], an = V.norm(ax), [u, w] = AA.basis(an);
          AA.blob(P.goods, [c[0] + px, py, c[2] + pz], V.scale(u, s * 0.8), V.scale(an, s * 1.45), V.scale(w, s * 0.8), () => col, 0, 0, 0, rng, 0.06, LOW(q));
        } else AA.blob(P.goods, [c[0] + px, py, c[2] + pz], [s, 0, 0], [0, s * 0.95, 0], [0, 0, s], () => col, 0, 0, 0, rng, 0.08, LOW(q));
      }
    }
  }

  // ---------- كيس خيش ----------
  function sackInto(P, o, s, rng, q) {
    const h = s.height, r = s.radius, open = s.open;
    place(P, o, () => {
      const top = open ? h : h * 0.82, pts = []; for (let k = 0; k <= 8; k++) pts.push([0, top * k / 8, 0]);
      const wr = (t, ang) => {
        let R = r * (0.86 + 0.14 * Math.sin(Math.PI * Math.min(1, t * 1.3 + 0.1)));
        if (!open) R *= 1 - 0.55 * smooth(0.7, 1, t);
        R *= 1 + 0.05 * (AA.noise3(Math.cos(ang) * 2, t * 4, Math.sin(ang) * 2, s.seed) - 0.5) + 0.03 * Math.sin(ang * 5 + t * 7) * smooth(0.5, 1, t);
        return [R, R * 0.93];
      };
      AA.loft(P.burlap, { path: pts, sides: SIDES[q] + 2, up: () => [0, 0, 1], capStart: true, capEnd: !open, uvU: 2.5, uvV: 2.5, radius: wr, color: () => vary([1, 1, 1], rng, 0.08) });
      if (open) { // حافة مطوية للخارج + البضاعة
        const ring = []; for (let k = 0; k <= 16; k++) { const a = k / 16 * Math.PI * 2, R = wr(1, a)[0] * 1.06; ring.push([Math.sin(a) * R, top - 0.015, Math.cos(a) * R * 0.93]); }
        AA.tube(P.burlap, ring, ring.map(() => 0.025), 5, () => [0.92, 0.92, 0.92], () => 0, 0, null, false);
        goods(P, [0, 0, 0], r * 0.88, top - 0.02, s.goods, rng, q, r * 0.88, r * 0.82);
      } else { // عنق مربوط وطرف منفوش
        const neck = []; for (let k = 0; k <= 10; k++) { const a = k / 10 * Math.PI * 2; neck.push([Math.sin(a) * r * 0.3, top + 0.01, Math.cos(a) * r * 0.28]); }
        AA.tube(P.rope, neck, neck.map(() => 0.012), 4, () => [1, 1, 1], () => 0, 0, null, false);
        AA.loft(P.burlap, { path: [[0, top, 0], [0, top + h * 0.12, 0]], sides: 8, up: () => [0, 0, 1], capEnd: true, radius: t => r * (0.3 + 0.25 * t), color: () => [0.95, 0.95, 0.95] });
      }
    });
  }
  function sack(p, q) {
    const P = kit(), rng = AA.rng(p.seed);
    sackInto(P, null, { height: p.height, radius: p.height * 0.42, open: p.open, goods: p.goods, seed: p.seed }, rng, q);
    return done('sack', P, { height: p.height, radius: p.height * 0.45, collider: { type: 'cylinder', radius: p.height * 0.4, height: p.height }, physics: { mass: 25 * p.height / 0.7, friction: 0.8 } });
  }

  // ---------- صندوق خشب ----------
  function crateInto(P, o, c, rng, q) {
    const W = c.w, D = c.d, H = c.h, t = 0.022, slats = Math.max(2, Math.round(H / 0.11));
    place(P, o, () => {
      const tint = c.tint || [0.95, 0.86, 0.72];
      for (const [cx, cz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) plank(P, [cx * (W / 2 - 0.018), H / 2, cz * (D / 2 - 0.018)], [0.05, H, 0.05], rng, mixc(tint, [0.6, 0.5, 0.4], 0.25));
      for (let k = 0; k < slats; k++) {
        const y = (k + 0.5) * H / slats, sh = H / slats - 0.025;
        plank(P, [0, y, D / 2 - t / 2], [W - 0.012, sh, t], rng, tint); plank(P, [0, y, -D / 2 + t / 2], [W - 0.012, sh, t], rng, tint);
        plank(P, [W / 2 - t / 2 - 0.004, y, 0], [t, sh, D - 2 * t - 0.01], rng, tint); plank(P, [-W / 2 + t / 2 + 0.004, y, 0], [t, sh, D - 2 * t - 0.01], rng, tint); // الجانبان بين اللوحين الأمامي والخلفي
      }
      plank(P, [0, 0.035, 0], [W - 0.03, 0.024, D - 0.03], rng, mixc(tint, [0.5, 0.4, 0.3], 0.3));
      if (c.lid) for (let k = 0; k < 4; k++) plank(P, [0, H + 0.012, -D / 2 + (k + 0.5) * D / 4], [W, 0.024, D / 4 - 0.01], rng, tint);
      else if (c.goods && c.goods !== 'empty') goods(P, [0, 0, 0], Math.min(W, D) * 0.46, H - 0.03, c.goods, rng, q, W * 0.45, D * 0.45);
    });
  }
  function crate(p, q) {
    const P = kit(), rng = AA.rng(p.seed);
    crateInto(P, null, { w: p.width, d: p.width * 0.72, h: p.width * 0.55, lid: p.goods === 'closed', goods: p.goods }, rng, q);
    if (p.stack > 1) for (let k = 1; k < p.stack; k++) crateInto(P, { at: [(rng() - 0.5) * 0.05, k * (p.width * 0.55 + 0.024), (rng() - 0.5) * 0.05], rot: (rng() - 0.5) * 0.15 }, { w: p.width, d: p.width * 0.72, h: p.width * 0.55, lid: true }, rng, q);
    return done('crate', P, { height: p.width * 0.6 * p.stack, radius: p.width * 0.6, collider: { type: 'box', size: [p.width, p.width * 0.55 * p.stack, p.width * 0.72] }, physics: { mass: 12 * p.stack, friction: 0.6 } });
  }

  // ---------- سلة خوص (قفة / زنبيل) ----------
  function basketInto(P, o, b, rng, q) {
    const R = b.radius, H = b.height, fl = b.flare || 1.2;
    place(P, o, () => {
      const pts = []; for (let k = 0; k <= 6; k++) pts.push([0, H * k / 6, 0]);
      const rr = t => R * lerp(1, fl, Math.pow(t, 0.8)) * (1 + 0.06 * Math.sin(Math.PI * t));
      AA.loft(P.weave, { path: pts, sides: SIDES[q] + 4, up: () => [0, 0, 1], capStart: true, uvU: 3, uvV: 1.5, radius: t => rr(t), color: (t) => vary([1, 1, 1], rng, 0.05) });
      const ring = []; for (let k = 0; k <= 20; k++) { const a = k / 20 * Math.PI * 2; ring.push([Math.sin(a) * rr(1), H, Math.cos(a) * rr(1)]); }
      AA.tube(P.weave, ring, ring.map(() => 0.018), 5, () => [0.85, 0.82, 0.78], () => 0, 0, null, false); // الحافة المجدولة
      if (b.handles) for (const s of [1, -1]) {
        const hp = []; for (let k = 0; k <= 8; k++) { const a = k / 8 * Math.PI; hp.push([s * rr(1) * 0.98, H + Math.sin(a) * R * 0.5, Math.cos(a) * R * 0.45]); }
        AA.tube(P.weave, hp, hp.map(() => 0.012), 5, () => [0.85, 0.82, 0.78], () => 0, 0, null, false);
      }
      if (b.goods && b.goods !== 'empty') goods(P, [0, 0, 0], rr(1) * 0.9, H - 0.02, b.goods, rng, q);
    });
  }
  function basket(p, q) {
    const P = kit(), rng = AA.rng(p.seed);
    basketInto(P, null, { radius: p.radius, height: p.radius * (p.shape === 'tall' ? 1.6 : 0.85), flare: p.shape === 'tall' ? 1.05 : 1.3, handles: p.handles, goods: p.goods }, rng, q);
    return done('basket', P, { height: p.radius * 1.4, radius: p.radius * 1.3, collider: { type: 'cylinder', radius: p.radius * 1.2, height: p.radius }, physics: { mass: 3, friction: 0.7 } });
  }

  // ---------- عجلة خشب بأسلاك وطوق حديد ----------
  function wheel(P, c, R, rng, q) {
    const n = LOW(q) ? 14 : 26, rim = [];
    for (let k = 0; k <= n; k++) { const a = k / n * Math.PI * 2; rim.push([c[0], c[1] + Math.cos(a) * R, c[2] + Math.sin(a) * R]); }
    AA.tube(P.wheel, rim, rim.map(() => 0.04), 6, () => [0.85, 0.78, 0.7], () => 0, 0, null, false);
    const tire = rim.map(p => [p[0], c[1] + (p[1] - c[1]) * 1.06, c[2] + (p[2] - c[2]) * 1.06]);
    AA.tube(P.tire, tire, tire.map(() => 0.018), 5, () => [1, 1, 1], () => 0, 0, null, false);
    AA.loft(P.wheel, { path: [[c[0] - 0.09, c[1], c[2]], [c[0] + 0.09, c[1], c[2]]], sides: 8, up: () => [0, 1, 0], capStart: true, capEnd: true, radius: t => 0.075 - 0.02 * Math.abs(t - 0.5), color: () => [0.75, 0.68, 0.6] });
    const sp = LOW(q) ? 6 : 10;
    for (let k = 0; k < sp; k++) { const a = k / sp * Math.PI * 2; AA.tube(P.wheel, [[c[0], c[1] + Math.cos(a) * 0.07, c[2] + Math.sin(a) * 0.07], [c[0], c[1] + Math.cos(a) * (R - 0.03), c[2] + Math.sin(a) * (R - 0.03)]], [0.02, 0.016], 5, () => [0.88, 0.8, 0.7], () => 0, 0, null, false); }
  }

  // ---------- عربة خشب ----------
  function cart(p, q) {
    const P = kit(), rng = AA.rng(p.seed), L = p.length, W = 1.15, R = p.wheel, bedY = R + 0.08;
    // المنصة: ألواح طولية
    for (let k = 0; k < 7; k++) plank(P, [-W / 2 + (k + 0.5) * W / 7, bedY, 0], [W / 7 - 0.012, 0.04, L], rng);
    // الدابة: حمار أو حصان بين ذراعي الجر (تُركّب في المحرك كأصل متحرك مستقل عند نقطة hitch)
    let hitch = null;
    if (p.animal !== 'none') {
      const ap = AA.params(AA.assets[p.animal], { seed: p.seed + 5, harness: true }), am = AA.assets[p.animal].generate(ap, 'low').meta.hitch;
      const az = L / 2 + 0.32 - am.rump, sY = am.shaftY, hw = am.halfWidth + 0.07, zEnd = az + am.shoulder;
      hitch = { asset: p.animal, params: ap, at: [0, 0, az] };
      for (const s of [1, -1]) { // ذراعان يميلان من جانبي العربة إلى جنبي الدابة ويرتفعان لمستوى الكتف
        const a0 = [s * (W / 2 - 0.05), bedY - 0.05, -L / 2 + 0.1], a1 = [s * (W / 2 - 0.05), bedY - 0.05, L / 2], a2 = [s * hw, sY, zEnd];
        AA.box(P.wood, V.scale(V.add(a0, a1), 0.5), [0.08, 0.07, L - 0.1], vary([0.8, 0.72, 0.62], rng, 0.1), 0.6, {});
        const d = V.sub(a2, a1), len = V.len(d), yaw = Math.atan2(d[0], d[2]), pitch = -Math.asin(d[1] / len);
        place(P, { at: V.scale(V.add(a1, a2), 0.5), rot: yaw }, () => {
          const n0 = P.wood.vertexCount; AA.box(P.wood, [0, 0, 0], [0.07, 0.065, len], vary([0.8, 0.72, 0.62], rng, 0.1), 0.6, {});
          for (let i = n0; i < P.wood.vertexCount; i++) { const y = P.wood.pos[i * 3 + 1], z = P.wood.pos[i * 3 + 2]; P.wood.pos[i * 3 + 1] = y * Math.cos(pitch) - z * Math.sin(pitch); P.wood.pos[i * 3 + 2] = y * Math.sin(pitch) + z * Math.cos(pitch); }
        });
        AA.box(P.dark, [s * hw, sY, zEnd - 0.04], [0.09, 0.09, 0.05], [0.4, 0.25, 0.15], 0.5, {}); // رباط جلد بالطوق
      }
      plank(P, [0, bedY - 0.02, L / 2 + 0.04], [W - 0.1, 0.06, 0.06], rng, [0.8, 0.72, 0.62]); // عارضة أمامية
    }
    for (const s of [1, -1]) { // العارضتان والذراعان (يد الجر)
      if (p.animal === 'none') plank(P, [s * (W / 2 - 0.05), bedY - 0.05, 0.3], [0.08, 0.07, L + 0.6 + p.shafts], rng, [0.8, 0.72, 0.62]);
      plank(P, [s * (W / 2 - 0.01), bedY + 0.16, 0], [0.04, 0.24, L], rng); // جانب
      for (const z of [-L / 2 + 0.05, -L / 6, L / 6, L / 2 - 0.05]) plank(P, [s * (W / 2 - 0.01), bedY + 0.16, z], [0.06, 0.3, 0.06], rng, [0.8, 0.72, 0.62]);
    }
    plank(P, [0, bedY + 0.16, -L / 2 + 0.01], [W, 0.24, 0.04], rng);
    if (p.animal === 'none') plank(P, [0, bedY + 0.16 + 0.0, L / 2 + 0.6 + p.shafts / 2 - 0.05], [W - 0.1, 0.06, 0.06], rng, [0.8, 0.72, 0.62]); // عارضة الجر
    // المحور والعجلتان
    AA.loft(P.metal, { path: [[-W / 2 - 0.12, R, -0.1], [W / 2 + 0.12, R, -0.1]], sides: 6, up: () => [0, 1, 0], capStart: true, capEnd: true, radius: () => 0.03, color: () => [1, 1, 1] });
    for (const s of [1, -1]) wheel(P, [s * (W / 2 + 0.1), R, -0.1], R, rng, q);
    // دعامة أمامية تحمل العربة واقفة (بدون دابة فقط)
    if (p.animal === 'none') plank(P, [0, (bedY - 0.06) / 2, L / 2 + 0.35], [0.06, bedY - 0.06, 0.06], rng, [0.7, 0.62, 0.54]);
    // الحمولة
    const load = p.load;
    if (load === 'sacks') {
      const spots = [[-0.3, -0.45], [0.28, -0.4], [-0.28, 0.25], [0.3, 0.3]];
      spots.forEach(([x, z], k) => sackInto(P, { at: [x, bedY + 0.02, z * L / 1.6], rot: rng() * 6 }, { height: 0.55, radius: 0.22, open: k % 2 === 1, goods: ['spice_red', 'spice_yellow', 'rice', 'coffee'][k], seed: k + p.seed }, rng, q));
    } else if (load === 'crates') {
      crateInto(P, { at: [-0.25, bedY + 0.02, -0.3], rot: 0.05 }, { w: 0.5, d: 0.38, h: 0.3, goods: 'oranges' }, rng, q);
      crateInto(P, { at: [0.27, bedY + 0.02, -0.25], rot: -0.08 }, { w: 0.5, d: 0.38, h: 0.3, goods: 'lemons' }, rng, q);
      crateInto(P, { at: [0, bedY + 0.02, 0.3], rot: 0.02 }, { w: 0.5, d: 0.38, h: 0.3, goods: 'tomatoes' }, rng, q);
      crateInto(P, { at: [-0.22, bedY + 0.32, -0.28], rot: 0.12 }, { w: 0.5, d: 0.38, h: 0.3, lid: true }, rng, q);
    } else if (load === 'dates') {
      for (let k = 0; k < 5; k++) basketInto(P, { at: [(k % 2 ? 0.27 : -0.27), bedY + 0.02, -0.45 + k * 0.24] }, { radius: 0.17, height: 0.2, flare: 1.25, goods: 'dates' }, rng, q);
    }
    return done('cart', P, { height: bedY + 0.6, radius: (L + 1.2) / 2 + (hitch ? 1 : 0), collider: { type: 'box', size: [W + 0.3, bedY + 0.3, L + 0.6 + p.shafts] }, physics: { mass: 120, friction: 0.5 },
      wheels: [[W / 2 + 0.1, R, -0.1], [-(W / 2 + 0.1), R, -0.1]], wheelRadius: R, spin: { pivot: [0, R, -0.1], axis: 'x', radius: R }, hitch, walkSpeed: hitch ? AA.assets[hitch.asset].generate(hitch.params, 'low').meta.walkSpeed : 0 });
  }

  // ---------- مظلة: قماش مخطط أو عريش سعف ----------
  function awning(P, x0, x1, zBack, zFront, yBack, yFront, kind, rng, q) {
    const nu = LOW(q) ? 4 : 10, nv = LOW(q) ? 2 : 5;
    if (kind === 'palm') { // عريش: حصير خوص + سعف يابس متدلٍّ من الحافة
      const rows = [];
      for (let i = 0; i <= nv; i++) { const t = i / nv, z = lerp(zBack, zFront, t), y = lerp(yBack, yFront, t) - 0.04 * Math.sin(Math.PI * t); const r = []; for (let j = 0; j <= nu; j++) r.push([lerp(x0, x1, j / nu), y, z]); rows.push(r); }
      const ids = rows.map(r => r.map(p => P.weave.v(p, vary([0.85, 0.8, 0.72], rng, 0.08), 0, 0, 0, [p[0] / 1.2, p[2] / 1.2])));
      for (let i = 0; i < nv; i++) for (let j = 0; j < nu; j++) { P.weave.t(ids[i][j], ids[i + 1][j + 1], ids[i][j + 1]); P.weave.t(ids[i][j], ids[i + 1][j], ids[i + 1][j + 1]); }
      const n = Math.round((x1 - x0) / (LOW(q) ? 0.18 : 0.08));
      for (let k = 0; k <= n; k++) {
        const x = lerp(x0, x1, k / n) + (rng() - 0.5) * 0.04, base = [x, yFront + 0.01, zFront], len = 0.35 + rng() * 0.25;
        AA.ribbon(P.weave, base, V.norm([0, -0.6, 0.35 + rng() * 0.2]), len, 0.06, 3, 0.4, vary([0.82, 0.7, 0.5], rng, 0.12), [0.7, 0.58, 0.4], 0, rng() * 6, 0.6, rng, { twist: 0.6, swayGain: 0.3 });
      }
      // جريد العريش الحامل
      for (let k = 0; k <= 4; k++) AA.tube(P.wood, [[lerp(x0, x1, k / 4), yBack - 0.02, zBack], [lerp(x0, x1, k / 4), yFront - 0.03, zFront]], [0.022, 0.02], 5, () => [0.8, 0.72, 0.6], () => 0, 0, null, true);
    } else { // قماش مخطط بحافة مسننة
      const rows = [];
      for (let i = 0; i <= nv; i++) { const t = i / nv, z = lerp(zBack, zFront, t), y = lerp(yBack, yFront, t) - 0.06 * Math.sin(Math.PI * t); const r = []; for (let j = 0; j <= nu; j++) r.push([lerp(x0, x1, j / nu), y, z]); rows.push(r); }
      const ids = rows.map(r => r.map(p => P.awning.v(p, [1, 1, 1], 0, 0, 0, [(p[0] - x0) / (x1 - x0) * 2, p[2]])));
      for (let i = 0; i < nv; i++) for (let j = 0; j < nu; j++) { P.awning.t(ids[i][j], ids[i + 1][j + 1], ids[i][j + 1]); P.awning.t(ids[i][j], ids[i + 1][j], ids[i + 1][j + 1]); }
      const nt = Math.round((x1 - x0) / 0.25); // الأسنان المتدلية
      for (let k = 0; k < nt; k++) {
        const a = lerp(x0, x1, k / nt), b = lerp(x0, x1, (k + 1) / nt);
        const ia = P.awning.v([a, yFront, zFront], [1, 1, 1], 0, 0, 0.3, [(a - x0) / (x1 - x0) * 2, 0]), ib = P.awning.v([b, yFront, zFront], [1, 1, 1], 0, 0, 0.3, [(b - x0) / (x1 - x0) * 2, 0]);
        const ic = P.awning.v([(a + b) / 2, yFront - 0.14, zFront + 0.01], [1, 1, 1], 0, 0, 0.6, [((a + b) / 2 - x0) / (x1 - x0) * 2, 0.2]);
        P.awning.t(ia, ic, ib);
      }
    }
  }

  // ---------- كشك خشب ----------
  function kiosk(p, q) {
    const P = kit(), rng = AA.rng(p.seed), W = p.width, D = 1.6, H = 2.3, cY = 0.9;
    for (const [x, z] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) post(P, [x, 0, z], z > 0 ? H : H + 0.3, 0.06, rng, q);
    // البسطة الأمامية: صندوق ألواح + سطح مائل قليلاً
    for (let k = 0; k < 6; k++) plank(P, [0, 0.08 + k * 0.14, D / 2 - 0.05], [W - 0.08, 0.13, 0.03], rng);
    for (let k = 0; k < 6; k++) plank(P, [-W / 2 + (k + 0.5) * W / 6, cY + 0.02, D / 2 - 0.35], [W / 6 - 0.012, 0.035, 0.62], rng, [0.95, 0.88, 0.78], -0.0);
    // جدار خلفي من ألواح ورفّان
    for (let k = 0; k < 12; k++) plank(P, [-W / 2 + (k + 0.5) * W / 12, (H + 0.24) / 2 + 0.01, -D / 2 + 0.03], [W / 12 - 0.008, H + 0.24, 0.025], rng, [0.85, 0.78, 0.68]);
    for (const y of [1.2, 1.65]) plank(P, [0, y, -D / 2 + 0.2], [W - 0.12, 0.035, 0.3], rng);
    // جانبان نصفيان
    for (const s of [1, -1]) for (let k = 0; k < 5; k++) plank(P, [s * W / 2, 0.1 + k * 0.17, 0], [0.025, 0.15, D - 0.1], rng, [0.85, 0.78, 0.68]);
    // المظلة
    awning(P, -W / 2 - 0.1, W / 2 + 0.1, -D / 2 - 0.05, D / 2 + 0.55, H + 0.35, H - 0.05, p.roof, rng, q);
    // البضاعة حسب النوع
    const g = p.goods;
    if (g === 'spices') {
      const types = ['spice_red', 'spice_yellow', 'spice_green', 'coffee', 'cardamom', 'rice'];
      const n = Math.max(3, Math.round(W / 0.38));
      for (let k = 0; k < n; k++) basketInto(P, { at: [-W / 2 + 0.25 + k * (W - 0.5) / Math.max(1, n - 1), cY + 0.04, D / 2 - 0.35] }, { radius: 0.14, height: 0.12, flare: 1.3, goods: types[k % types.length] }, rng, q);
      for (let k = 0; k < 3; k++) sackInto(P, { at: [-W / 2 + 0.35 + k * 0.45, 0, D / 2 + 0.35], rot: rng() * 6 }, { height: 0.6, radius: 0.24, open: true, goods: types[(k + 2) % types.length], seed: k }, rng, q);
    } else if (g === 'fruit') {
      const types = ['oranges', 'lemons', 'tomatoes'];
      const n = Math.max(2, Math.round(W / 0.55));
      for (let k = 0; k < n; k++) crateInto(P, { at: [-W / 2 + 0.33 + k * (W - 0.66) / Math.max(1, n - 1), cY + 0.04, D / 2 - 0.35], rot: (rng() - 0.5) * 0.1 }, { w: 0.48, d: 0.36, h: 0.2, goods: types[k % 3] }, rng, q);
      for (let k = 0; k < 2; k++) crateInto(P, { at: [-W / 2 + 0.4 + k * 0.6, 0, D / 2 + 0.3], rot: (rng() - 0.5) * 0.2 }, { w: 0.5, d: 0.38, h: 0.32, goods: types[(k + 1) % 3] }, rng, q);
    } else if (g === 'pottery') { // فخار: جرار وبرم على البسطة وأمامها
      const M = AA.majlis, kinds = ['jarra', 'burma', 'ibriq'], tints = [[0.8, 0.52, 0.34], [0.72, 0.45, 0.3], [0.86, 0.62, 0.42]];
      const n = Math.max(3, Math.round(W / 0.42));
      for (let k = 0; k < n; k++) M.jarInto(P, [-W / 2 + 0.25 + k * (W - 0.5) / Math.max(1, n - 1), cY + 0.04, D / 2 - 0.35], kinds[(k + 1) % 3], 0.8 + rng() * 0.3, q, rng, tints[k % 3]);
      for (let k = 0; k < 3; k++) M.jarInto(P, [-W / 2 + 0.35 + k * 0.5, 0.02, D / 2 + 0.35], k === 1 ? 'burma' : 'jarra', 1.5 + rng() * 0.3, q, rng, tints[(k + 1) % 3]);
      for (const y of [1.22, 1.67]) for (let k = 0; k < Math.round(W / 0.3); k++) M.jarInto(P, [-W / 2 + 0.2 + k * 0.3, y + 0.02, -D / 2 + 0.2], 'ibriq', 0.9, q, rng, tints[k % 3]);
    } else if (g === 'brass') { // دلال وصواني وفوانيس
      const M = AA.majlis, n = Math.max(3, Math.round(W / 0.36));
      for (let k = 0; k < n; k++) M.dallahInto(P, [-W / 2 + 0.22 + k * (W - 0.44) / Math.max(1, n - 1), cY + 0.04, D / 2 - 0.35 + (k % 2) * 0.12], 0.9 + 0.4 * ((k * 7) % 3) / 2, (rng() - 0.5) * 1.2, q, P.brass);
      for (const y of [1.22, 1.67]) for (let k = 0; k < Math.round(W / 0.4); k++) {
        const x = -W / 2 + 0.25 + k * 0.4;
        AA.loft(P.brass, { path: [[x, y + 0.17, -D / 2 + 0.07], [x, y + 0.17, -D / 2 + 0.085]], sides: LOW(q) ? 10 : 18, capStart: true, capEnd: true, up: () => [0, 1, 0], radius: () => 0.15, color: () => [0.95, 0.95, 0.95] }); // صينية مسنودة للجدار
      }
      for (let k = 0; k < 2; k++) M.lanternInto(P, { at: [-W / 2 + 0.5 + k * (W - 1), H - 0.45, D / 2 + 0.25] }, 1, q, rng, true);
      for (let k = 0; k < 2; k++) AA.tube(P.metal2, [[-W / 2 + 0.5 + k * (W - 1), H - 0.45 + 0.335, D / 2 + 0.25], [-W / 2 + 0.5 + k * (W - 1), H + 0.05, D / 2 + 0.25]], [0.004, 0.004], 4, () => [1, 1, 1], () => 0, 0, null, false);
    } else if (g === 'cloth') { // أقمشة: لفّات على البسطة والرفوف وقطع معلّقة
      const COLS = ['#8a2a24', '#2f5f8a', '#d9c9a8', '#3f6f3a', '#c48a2a', '#6a3a7a', '#efe9de', '#1b1716'].map(hex);
      const roll = (c, len, r, col) => AA.loft(P.cloth, { path: [[c[0] - len / 2, c[1] + r, c[2]], [c[0] + len / 2, c[1] + r, c[2]]], sides: LOW(q) ? 6 : 12, capStart: true, capEnd: true, uvU: 3, uvV: 1, up: () => [0, 1, 0], radius: () => r, color: () => col });
      for (let k = 0; k < 6; k++) roll([-W / 2 + 0.5 + (k % 3) * (W - 1) / 2, cY + 0.04 + Math.floor(k / 3) * 0.13, D / 2 - 0.45 + (k % 2) * 0.16], 0.7, 0.065, COLS[k % COLS.length]);
      for (const y of [1.22, 1.67]) for (let k = 0; k < Math.round((W - 0.2) / 0.16); k++) { // أطراف لفّات على الرفّ (مقطع دائري يواجه الزبون)
        const x = -W / 2 + 0.16 + k * 0.16, col = COLS[(k * 3 + (y > 1.5 ? 1 : 0)) % COLS.length];
        AA.loft(P.cloth, { path: [[x, y + 0.085, -D / 2 + 0.06], [x, y + 0.085, -D / 2 + 0.34]], sides: LOW(q) ? 6 : 10, capStart: true, capEnd: true, up: () => [0, 1, 0], radius: () => 0.065, color: () => col });
      }
      const nh = Math.max(3, Math.round(W / 0.45)); // قطع معلّقة من عارضة أمامية
      AA.box(P.wood, [0, H - 0.12, D / 2 + 0.05], [W, 0.05, 0.05], [0.8, 0.72, 0.62], 0.6, {});
      for (let k = 0; k < nh; k++) {
        const x0 = -W / 2 + 0.15 + k * (W - 0.3) / nh, w = (W - 0.3) / nh - 0.05, col = COLS[(k + 1) % COLS.length], L2 = 0.8 + rng() * 0.5, rows = LOW(q) ? 2 : 5, ids = [];
        for (let i = 0; i <= rows; i++) { const t = i / rows, y = H - 0.12 - L2 * t, zz = D / 2 + 0.05 + 0.03 * Math.sin(t * 3 + k); ids.push([P.cloth.v([x0, y, zz], col, 0.15 * t, k, 0.4 * t, [0, t * 2]), P.cloth.v([x0 + w, y, zz], col, 0.15 * t, k, 0.4 * t, [w * 2, t * 2])]); }
        for (let i = 0; i < rows; i++) { P.cloth.t(ids[i][0], ids[i][1], ids[i + 1][1]); P.cloth.t(ids[i][0], ids[i + 1][1], ids[i + 1][0]); }
      }
    } else { // تمور
      const n = Math.max(3, Math.round(W / 0.4));
      for (let k = 0; k < n; k++) basketInto(P, { at: [-W / 2 + 0.25 + k * (W - 0.5) / Math.max(1, n - 1), cY + 0.04, D / 2 - 0.35] }, { radius: 0.16, height: 0.16, flare: 1.25, goods: 'dates' }, rng, q);
      for (let k = 0; k < 2; k++) basketInto(P, { at: [-W / 2 + 0.4 + k * 0.55, 0, D / 2 + 0.3] }, { radius: 0.22, height: 0.4, flare: 1.08, handles: true, goods: 'dates' }, rng, q);
    }
    // بضاعة على الرفوف (أكياس صغيرة مغلقة)
    if (g !== 'pottery' && g !== 'brass' && g !== 'cloth') for (const y of [1.22, 1.67]) for (let k = 0; k < Math.round(W / 0.32); k++) sackInto(P, { at: [-W / 2 + 0.22 + k * 0.32, y + 0.02, -D / 2 + 0.2], rot: rng() * 6 }, { height: 0.22, radius: 0.09, open: false, seed: k + y * 10 }, rng, q);
    return done('kiosk', P, { height: H + 0.4, radius: W / 2 + 0.6, collider: { type: 'box', size: [W, H, D] }, seller: { at: [0, 0, -0.25], rot: 0 }, light: g === 'brass' ? { at: [-W / 2 + 0.5, H - 0.35, D / 2 + 0.25], color: [1, 0.7, 0.35], intensity: 1.2, distance: 6, flicker: true } : null }, p.roof === 'red' ? 'stripes_red' : p.roof === 'green' ? 'stripes_green' : 'stripes_blue');
  }

  // ---------- دكان طين ----------
  function shop(p, q) {
    const P = kit(), rng = AA.rng(p.seed), W = p.width, D = 3, H = 3.1, dw = Math.min(2.2, W - 1.2), dh = 2.2;
    const MP = { wall: P.mud, top: P.mudTop, dark: P.dark };
    const r = AA.mudPanel(MP, { L: W, H, T: 0.45, taper: 0.03, step: q === 'low' ? 0.4 : 0.22, seed: p.seed, openings: [{ x0: -dw / 2, x1: dw / 2, y0: 0, y1: dh }], at: [0, 0, D / 2], top: x => H + 0.03 * Math.sin(x * 2) });
    for (const s of [1, -1]) AA.mudPanel(MP, { L: D - 0.4, H, T: 0.45, taper: 0.03, step: q === 'low' ? 0.4 : 0.3, seed: p.seed + s, at: [s * (W / 2 - 0.22), 0, 0], rot: s * Math.PI / 2 });
    AA.mudPanel(MP, { L: W, H, T: 0.45, taper: 0.03, step: q === 'low' ? 0.4 : 0.3, seed: p.seed + 7, at: [0, 0, -D / 2], rot: Math.PI });
    AA.box(P.mudTop, [0, H - 0.1, 0], [W - 0.4, 0.12, D - 0.4], [0.95, 0.95, 0.95], 2, {});
    // ظلام الداخل
    AA.box(P.dark, [0, H / 2, -D / 2 + 0.24], [W - 0.5, H - 0.2, 0.02], [1, 1, 1], 1, {});
    AA.box(P.dark, [0, 0.045, 0], [W - 0.5, 0.03, D - 0.5], [0.6, 0.6, 0.6], 1, {});
    // عتبة وبابان خشب مفتوحان للخارج
    plank(P, [0, dh + 0.08, D / 2 + 0.2], [dw + 0.5, 0.14, 0.12], rng, [0.8, 0.72, 0.62]);
    for (const s of [1, -1]) place(P, { at: [s * dw / 2, 0, D / 2 + 0.24], rot: s * 1.35 }, () => {
      const lw = dw / 2 - 0.02;
      for (let k = 0; k < 4; k++) plank(P, [-s * (k + 0.5) * lw / 4, dh / 2, 0.02], [lw / 4 - 0.01, dh - 0.04, 0.04], rng, [0.62, 0.45, 0.3]);
      for (const y of [0.25, dh / 2, dh - 0.25]) plank(P, [-s * lw / 2, y, 0.05], [lw, 0.09, 0.03], rng, [0.55, 0.4, 0.27]);
    });
    // مظلة فوق الباب وبضاعة عند المدخل
    awning(P, -dw / 2 - 0.5, dw / 2 + 0.5, D / 2 + 0.24, D / 2 + 1.3, dh + 0.45, dh - 0.05, p.roof, rng, q);
    for (const s of [1, -1]) post(P, [s * (dw / 2 + 0.45), 0, D / 2 + 1.28], dh - 0.05, 0.045, rng, q);
    if (p.goods !== 'none') {
      const types = p.goods === 'spices' ? ['spice_red', 'spice_yellow', 'coffee', 'cardamom'] : ['rice', 'coffee', 'rice', 'spice_yellow'];
      for (let k = 0; k < 4; k++) sackInto(P, { at: [(k < 2 ? -1 : 1) * (dw / 2 + 0.05 + (k % 2) * 0.48), 0, D / 2 + 0.7], rot: rng() * 6 }, { height: 0.62, radius: 0.24, open: true, goods: types[k], seed: k + p.seed }, rng, q);
      for (let k = 0; k < 3; k++) sackInto(P, { at: [-W / 2 + 0.9 + k * 0.5, 0, -D / 2 + 0.6], rot: rng() * 6 }, { height: 0.75, radius: 0.27, open: false, seed: 20 + k }, rng, q);
    }
    return done('shop', P, { height: H + 0.1, radius: Math.max(W, D) / 2 + 0.8, collider: { type: 'box', size: [W, H, D] }, door: { x: 0, z: D / 2, width: dw } }, p.roof === 'red' ? 'stripes_red' : p.roof === 'green' ? 'stripes_green' : 'stripes_blue');
  }

  // ---------- حاجز خشب / سعف ----------
  function fenceRun(P, x0, x1, z, style, H, rng, q, gap) {
    const L = x1 - x0, n = Math.max(1, Math.round(L / (style === 'fronds' ? 1.6 : 2)));
    for (let k = 0; k <= n; k++) post(P, [lerp(x0, x1, k / n), 0, z], H + 0.12, style === 'fronds' ? 0.05 : 0.06, rng, q);
    if (style === 'rails') {
      for (const y of [H * 0.3, H * 0.62, H * 0.92]) for (let k = 0; k < n; k++) {
        const a = lerp(x0, x1, k / n), b = lerp(x0, x1, (k + 1) / n), sag = (rng() - 0.5) * 0.03;
        AA.box(P.wood, [(a + b) / 2, y + sag, z + 0.06 + (k % 2) * 0.012], [b - a - 0.01, 0.08, 0.04], vary([0.86, 0.78, 0.68], rng, 0.12), 0.6, {}, (rng() - 0.5) * 0.04);
      }
    } else if (style === 'pickets') {
      for (const y of [H * 0.25, H * 0.75]) AA.box(P.wood, [(x0 + x1) / 2, y, z + 0.05], [L + 0.1, 0.07, 0.035], vary([0.8, 0.72, 0.62], rng, 0.1), 0.6, {});
      for (let x = x0 + 0.08; x < x1 - 0.04; x += 0.16) AA.box(P.wood, [x, H * 0.5 + (rng() - 0.5) * 0.06, z + 0.08], [0.1, H * (0.95 + rng() * 0.1), 0.025], vary([0.9, 0.84, 0.74], rng, 0.14), 0.6, {}, (rng() - 0.5) * 0.04);
    } else { // سعف يابس واقف مربوط بحبلين
      const step = LOW(q) ? 0.12 : 0.055;
      for (let x = x0 + 0.03; x < x1 - 0.02; x += step) {
        const h = H * (0.9 + rng() * 0.2), lean = (rng() - 0.5) * 0.1;
        AA.ribbon(P.weave, [x, 0, z + (rng() - 0.5) * 0.04], V.norm([lean, 1, (rng() - 0.5) * 0.06]), h, 0.075, LOW(q) ? 2 : 4, 0.02, vary([0.78, 0.66, 0.46], rng, 0.14), [0.66, 0.55, 0.38], 0, rng() * 6, 0.15, rng, { twist: 0.8, taper: false });
      }
      for (const y of [H * 0.35, H * 0.75]) AA.tube(P.rope, [[x0, y, z + 0.05], [x1, y, z + 0.05]], [0.012, 0.012], 4, () => [1, 1, 1], () => 0, 0, null, false);
    }
  }
  function fence(p, q) {
    const P = kit(), rng = AA.rng(p.seed);
    fenceRun(P, -p.length / 2, p.length / 2, 0, p.style, p.height, rng, q);
    return done('fence', P, { height: p.height + 0.15, radius: p.length / 2, collider: { type: 'box', size: [p.length, p.height, 0.15] }, snap: { length: p.length } });
  }
  // حوش: أربعة أضلاع + باب يُفتح، ومعلف وحوض ماء اختياريان
  function pen(p, q) {
    const P = kit(), rng = AA.rng(p.seed), W = p.width, D = p.depth, H = p.height, g = 1.4;
    place(P, { at: [0, 0, -D / 2], rot: 0 }, () => fenceRun(P, -W / 2, W / 2, 0, p.style, H, rng, q));
    place(P, { at: [-W / 2, 0, 0], rot: Math.PI / 2 }, () => fenceRun(P, -D / 2, D / 2, 0, p.style, H, rng, q));
    place(P, { at: [W / 2, 0, 0], rot: -Math.PI / 2 }, () => fenceRun(P, -D / 2, D / 2, 0, p.style, H, rng, q));
    place(P, { at: [0, 0, D / 2], rot: Math.PI }, () => { fenceRun(P, -W / 2, -g / 2, 0, p.style, H, rng, q); fenceRun(P, g / 2, W / 2, 0, p.style, H, rng, q); });
    // الباب: إطار خشب بقطري، مفتوح جزئياً
    place(P, { at: [-g / 2, 0, D / 2], rot: -p.gate * 1.4 }, () => {
      for (const y of [0.15, H * 0.5, H - 0.08]) AA.box(P.wood, [g / 2, y, 0], [g - 0.04, 0.08, 0.045], vary([0.82, 0.74, 0.64], rng, 0.1), 0.6, {});
      for (const x of [0.04, g - 0.04]) AA.box(P.wood, [x, H / 2, 0], [0.07, H, 0.05], [0.78, 0.7, 0.6], 0.6, {});
      AA.box(P.wood, [g / 2, H / 2, 0.01], [0.06, Math.hypot(g, H) - 0.15, 0.04], [0.8, 0.72, 0.62], 0.6, {}, Math.atan2(g, H));
    });
    if (p.feeder) { // معلف خشب وحوض ماء
      place(P, { at: [-W / 2 + 1.0, 0, -D / 2 + 0.5] }, () => {
        for (const s of [1, -1]) AA.box(P.wood, [0, 0.25, s * 0.22], [1.6, 0.4, 0.04], [0.8, 0.72, 0.62], 0.6, {});
        for (const s of [1, -1]) AA.box(P.wood, [s * 0.8, 0.26, 0], [0.04, 0.38, 0.4], [0.8, 0.72, 0.62], 0.6, {});
        AA.box(P.wood, [0, 0.11, 0], [1.56, 0.04, 0.4], [0.7, 0.62, 0.54], 0.6, {});
        AA.blob(P.goods, [0, 0.38, 0], [0.75, 0, 0], [0, 0.1, 0], [0, 0, 0.18], () => vary([0.78, 0.7, 0.36], rng, 0.1), 0, 0, 0.2, rng, 0.2, LOW(q)); // برسيم/علف
      });
    }
    return done('pen', P, { height: H + 0.15, radius: Math.max(W, D) / 2, collider: { type: 'compound' }, gate: { at: [0, 0, D / 2], width: g } });
  }

  const A = AA.assets;
  const goodsOpts = [['dates', 'تمر'], ['spice_red', 'بهار أحمر'], ['spice_yellow', 'كركم'], ['spice_green', 'حبق'], ['rice', 'رز'], ['coffee', 'قهوة'], ['cardamom', 'هيل'], ['oranges', 'برتقال'], ['lemons', 'ليمون'], ['tomatoes', 'طماط']];
  A.kiosk = { id: 'kiosk', name: 'كشك', nameEn: 'Market stall', category: 'souq',
    schema: [
      { key: 'width', label: 'العرض', min: 1.6, max: 4, step: 0.1, def: 2.6, unit: 'م' },
      { key: 'goods', label: 'البضاعة', type: 'enum', options: [['dates', 'تمور'], ['spices', 'بهارات'], ['fruit', 'خضار وفواكه'], ['pottery', 'فخار'], ['brass', 'دلال ونحاس'], ['cloth', 'أقمشة']], def: 'spices' },
      { key: 'roof', label: 'المظلة', type: 'enum', options: [['palm', 'عريش سعف'], ['red', 'قماش أحمر'], ['green', 'قماش أخضر'], ['blue', 'قماش أزرق']], def: 'palm' }
    ], presets: { 'كشك تمور': { goods: 'dates', roof: 'palm' }, 'كشك خضار': { goods: 'fruit', roof: 'green', width: 3.2 }, 'كشك فخار': { goods: 'pottery', roof: 'palm' }, 'كشك دلال': { goods: 'brass', roof: 'blue' }, 'كشك أقمشة': { goods: 'cloth', roof: 'red', width: 3 } }, generate: kiosk };
  A.shop = { id: 'shop', name: 'دكان', nameEn: 'Mud shop', category: 'souq',
    schema: [
      { key: 'width', label: 'العرض', min: 3, max: 6, step: 0.25, def: 4, unit: 'م' },
      { key: 'goods', label: 'البضاعة', type: 'enum', options: [['spices', 'بهارات'], ['grain', 'رز وحبوب'], ['none', 'بدون']], def: 'spices' },
      { key: 'roof', label: 'المظلة', type: 'enum', options: [['palm', 'عريش سعف'], ['red', 'قماش أحمر'], ['green', 'قماش أخضر'], ['blue', 'قماش أزرق']], def: 'red' }
    ], presets: { 'دكان حبوب': { goods: 'grain', roof: 'palm' } }, generate: shop };
  A.cart = { id: 'cart', name: 'عربة خشب', nameEn: 'Wooden cart', category: 'souq',
    schema: [
      { key: 'length', label: 'طول المنصة', min: 1.2, max: 2.4, step: 0.1, def: 1.7, unit: 'م' },
      { key: 'wheel', label: 'قطر العجلة', min: 0.3, max: 0.6, step: 0.02, def: 0.46, unit: 'م' },
      { key: 'shafts', label: 'طول يد الجر', min: 0.2, max: 1.4, step: 0.1, def: 0.6, unit: 'م' },
      { key: 'load', label: 'الحمولة', type: 'enum', options: [['sacks', 'أكياس'], ['crates', 'صناديق'], ['dates', 'سلال تمر'], ['none', 'فارغة']], def: 'sacks' },
      { key: 'animal', label: 'يجرّها', type: 'enum', options: [['none', 'بدون'], ['donkey', 'حمار'], ['horse', 'حصان']], def: 'none' }
    ], presets: { 'عربة حمار': { animal: 'donkey', load: 'sacks' }, 'عربة حصان': { animal: 'horse', load: 'crates', length: 2.1 }, 'عربة تمر': { load: 'dates', length: 1.5 } }, generate: cart };
  A.sack = { id: 'sack', name: 'كيس خيش', nameEn: 'Burlap sack', category: 'souq',
    schema: [
      { key: 'height', label: 'الارتفاع', min: 0.3, max: 1, step: 0.05, def: 0.65, unit: 'م' },
      { key: 'open', label: 'مفتوح', type: 'bool', def: true },
      { key: 'goods', label: 'المحتوى', type: 'enum', options: goodsOpts, def: 'spice_red' }
    ], presets: { 'كيس مربوط': { open: false }, 'كيس رز': { goods: 'rice' } }, generate: sack };
  A.crate = { id: 'crate', name: 'صندوق', nameEn: 'Wooden crate', category: 'souq',
    schema: [
      { key: 'width', label: 'العرض', min: 0.35, max: 1, step: 0.05, def: 0.55, unit: 'م' },
      { key: 'goods', label: 'المحتوى', type: 'enum', options: [['oranges', 'برتقال'], ['lemons', 'ليمون'], ['tomatoes', 'طماط'], ['dates', 'تمر'], ['closed', 'مغلق'], ['empty', 'فارغ']], def: 'oranges' },
      { key: 'stack', label: 'عدد المكدّس', min: 1, max: 4, step: 1, def: 1 }
    ], presets: { 'صناديق مكدّسة': { goods: 'lemons', stack: 3 } }, generate: crate };
  A.basket = { id: 'basket', name: 'سلة خوص', nameEn: 'Palm basket', category: 'souq',
    schema: [
      { key: 'radius', label: 'نصف القطر', min: 0.1, max: 0.4, step: 0.01, def: 0.2, unit: 'م' },
      { key: 'shape', label: 'الشكل', type: 'enum', options: [['wide', 'قفة عريضة'], ['tall', 'زنبيل طويل']], def: 'wide' },
      { key: 'handles', label: 'مقابض', type: 'bool', def: true },
      { key: 'goods', label: 'المحتوى', type: 'enum', options: goodsOpts.concat([['empty', 'فارغة']]), def: 'dates' }
    ], presets: { 'زنبيل': { shape: 'tall', radius: 0.18 } }, generate: basket };
  A.fence = { id: 'fence', name: 'حاجز', nameEn: 'Fence', category: 'souq',
    schema: [
      { key: 'length', label: 'الطول', min: 1, max: 10, step: 0.5, def: 4, unit: 'م' },
      { key: 'height', label: 'الارتفاع', min: 0.6, max: 2.2, step: 0.05, def: 1.1, unit: 'م' },
      { key: 'style', label: 'النوع', type: 'enum', options: [['rails', 'عوارض خشب'], ['pickets', 'ألواح'], ['fronds', 'سعف']], def: 'rails' }
    ], presets: { 'سياج سعف': { style: 'fronds', height: 1.8 }, 'سياج ألواح': { style: 'pickets' } }, generate: fence };
  A.pen = { id: 'pen', name: 'حوش', nameEn: 'Animal pen', category: 'souq',
    schema: [
      { key: 'width', label: 'العرض', min: 4, max: 16, step: 0.5, def: 8, unit: 'م' },
      { key: 'depth', label: 'العمق', min: 4, max: 16, step: 0.5, def: 6, unit: 'م' },
      { key: 'height', label: 'الارتفاع', min: 0.8, max: 2, step: 0.05, def: 1.2, unit: 'م' },
      { key: 'style', label: 'النوع', type: 'enum', options: [['rails', 'عوارض خشب'], ['pickets', 'ألواح'], ['fronds', 'سعف']], def: 'rails' },
      { key: 'gate', label: 'فتح الباب', min: 0, max: 1, step: 0.05, def: 0.5, pct: true },
      { key: 'feeder', label: 'معلف', type: 'bool', def: true }
    ], presets: { 'حظيرة سعف': { style: 'fronds', height: 1.6 } }, generate: pen };
  AA.souq = { sackInto, crateInto, basketInto, place };
})(typeof window !== 'undefined' ? window : globalThis);
