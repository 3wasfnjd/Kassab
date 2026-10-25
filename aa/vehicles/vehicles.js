// Aboden Assets — vehicles/vehicles.js
// مركبات صحراوية عامة (بدون شعارات أو ماركات): جيب صحراوي بأبواب أربعة، ووانيت بصندوق مفتوح.
// البدن مقاطع جانبية تُمدّ عرضياً بحواف مشطوفة وفتحات عجلات حقيقية، والزجاج شفاف يبيّن المقاعد.
// العجلات الأمامية والخلفية جزءان مستقلان (spin) يدوران حول محوريهما، و meta فيها بيانات الفيزياء.
// الأمام = +Z، يسار السائق = +X (قيادة يسار).
(function (g) {
  'use strict';
  const AA = g.AA;
  const V = AA.v, hex = AA.hex, mixc = AA.mixc, vary = AA.vary, lerp = AA.lerp, smooth = AA.smooth, clamp = AA.clamp;
  const LOW = q => q === 'low';

  const PAINT = { white: '#eeeeea', beige: '#d6c6a2', red: '#9a2620', blue: '#2a4876', black: '#1a1a1c', champagne: '#c4ae84', green: '#55603e', silver: '#b4b6b6' };
  function kit() {
    const k = {};
    for (const n of ['paint', 'trim', 'chrome', 'glass', 'lamp', 'tail', 'amber', 'tireFL', 'tireFR', 'tireR', 'rimFL', 'rimFR', 'rimR', 'interior', 'under', 'burlap', 'rope', 'goods', 'wood', 'hay']) k[n] = new AA.Builder();
    for (let d = 0; d < 2; d++) for (const sd of ['L', 'R']) { k['door' + d + sd] = new AA.Builder(); k['dglass' + d + sd] = new AA.Builder(); }
    return k;
  }
  function done(id, P, meta, axF, axR, R, ex) {
    const spinR = { pivot: [0, R, axR], axis: 'x', radius: R }, spinFx = sx => ({ pivot: [sx * ex.wx, R, axF], axis: 'x', radius: R, steer: true });
    const parts = {};
    // الأبواب: كل باب جزء مستقل بمفصّل عمودي عند حافته الأمامية (يُفتح للخارج)
    (ex.doors || []).forEach((d, k) => { for (const [sd, sx] of [['L', 1], ['R', -1]]) {
      const hinge = { id: 'door' + k + sd, pivot: [sx * ex.W, 0, d[1]], axis: 'y', sign: -sx, max: 1.15 };
      for (const B of [P['door' + k + sd], P['dglass' + k + sd]]) if (B) for (let i = 0; i < B.pos.length; i += 3) B.pos[i] += sx * 0.004; // خارج سطح الجسم بقليل حتى لا تتنافس الطبقتان
      parts['door' + k + sd] = { builder: P['door' + k + sd], material: { kind: 'paint', roughness: 0.36, metalness: 0.12, doubleSided: true, hinge } };
      parts['dglass' + k + sd] = { builder: P['dglass' + k + sd], material: { kind: 'glass', roughness: 0.05, opacity: 0.42, doubleSided: true, color: [0.1, 0.13, 0.15], hinge } };
    } });
    return AA.finalize(id, Object.assign({
      paint:    { builder: P.paint,    material: { kind: 'paint', roughness: 0.36, metalness: 0.12, doubleSided: true } },
      trim:     { builder: P.trim,     material: { kind: 'plastic', roughness: 0.6, color: [0.07, 0.07, 0.07] } },
      chrome:   { builder: P.chrome,   material: { kind: 'metal', roughness: 0.25, metalness: 0.6, color: [0.78, 0.78, 0.78] } },
      glass:    { builder: P.glass,    material: { kind: 'glass', roughness: 0.05, opacity: 0.42, doubleSided: true, color: [0.1, 0.13, 0.15] } },
      lamp:     { builder: P.lamp,     material: { kind: 'lamp', roughness: 0.2, emissive: [1, 0.95, 0.82], glow: 1.1 } },
      tail:     { builder: P.tail,     material: { kind: 'lamp', roughness: 0.3, color: [0.7, 0.08, 0.06], emissive: [0.9, 0.05, 0.03], glow: 0.5 } },
      amber:    { builder: P.amber,    material: { kind: 'lamp', roughness: 0.3, color: [0.95, 0.55, 0.1], emissive: [1, 0.5, 0.05], glow: 0.3 } },
      tireFL:   { builder: P.tireFL,   material: { kind: 'rubber', roughness: 0.92, color: [0.075, 0.072, 0.07], spin: spinFx(1) } },
      tireFR:   { builder: P.tireFR,   material: { kind: 'rubber', roughness: 0.92, color: [0.075, 0.072, 0.07], spin: spinFx(-1) } },
      tireR:    { builder: P.tireR,    material: { kind: 'rubber', roughness: 0.92, color: [0.075, 0.072, 0.07], spin: spinR } },
      rimFL:    { builder: P.rimFL,    material: { kind: 'metal', roughness: 0.35, metalness: 0.35, spin: spinFx(1) } },
      rimFR:    { builder: P.rimFR,    material: { kind: 'metal', roughness: 0.35, metalness: 0.35, spin: spinFx(-1) } },
      rimR:     { builder: P.rimR,     material: { kind: 'metal', roughness: 0.35, metalness: 0.35, spin: spinR } },
      interior: { builder: P.interior, material: { kind: 'cloth', roughness: 0.95, color: [0.2, 0.18, 0.16] } },
      under:    { builder: P.under,    material: { kind: 'dark', roughness: 0.9, color: [0.05, 0.05, 0.05] } },
      burlap:   { builder: P.burlap,   material: { kind: 'cloth', texture: 'burlap', roughness: 0.95 } },
      rope:     { builder: P.rope,     material: { kind: 'rope', roughness: 1, color: [0.62, 0.5, 0.32] } },
      goods:    { builder: P.goods,    material: { kind: 'fruit', roughness: 0.6 } },
      wood:     { builder: P.wood,     material: { kind: 'wood', texture: 'wood', roughness: 0.82 } },
      hay:      { builder: P.hay,      material: { kind: 'hay', texture: 'weave', roughness: 1 } }
    }, parts), Object.assign({ stiffness: 0, pose: { steer: ex.steer || 0, doors: ex.open || 0 } }, meta));
  }

  // ---------- هندسة مساعدة ----------
  const area2 = pts => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q2 = pts[(i + 1) % pts.length]; a += p[0] * q2[1] - q2[0] * p[1]; } return a / 2; };
  const cr = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  function inTri(p, a, b, c) { const d1 = cr(a, b, p), d2 = cr(b, c, p), d3 = cr(c, a, p); return d1 > 1e-9 && d2 > 1e-9 && d3 > 1e-9; }
  // تثليث مضلع (حتى غير المحدّب، مثل جانب السيارة بفتحات العجلات) بطريقة قصّ الآذان. المضلع عكس عقارب الساعة
  function earclip(pts) {
    const idx = pts.map((_, i) => i), tris = [];
    let guard = 0;
    while (idx.length > 3 && guard++ < 10000) {
      let found = false;
      for (let i = 0; i < idx.length; i++) {
        const a = idx[(i + idx.length - 1) % idx.length], b = idx[i], c = idx[(i + 1) % idx.length];
        if (cr(pts[a], pts[b], pts[c]) <= 1e-10) continue;
        let ok = true;
        for (const k of idx) { if (k === a || k === b || k === c) continue; if (inTri(pts[k], pts[a], pts[b], pts[c])) { ok = false; break; } }
        if (!ok) continue;
        tris.push([a, b, c]); idx.splice(i, 1); found = true; break;
      }
      if (!found) break;
    }
    if (idx.length === 3) tris.push([idx[0], idx[1], idx[2]]);
    return tris;
  }
  function tri3(B, ps, cols, want) {
    const ids = ps.map((p, k) => B.v(p, cols[k], 0, 0, 0, [0, 0]));
    const n = V.cross(V.sub(ps[1], ps[0]), V.sub(ps[2], ps[0]));
    if (V.dot(n, want) >= 0) B.t(ids[0], ids[1], ids[2]); else B.t(ids[0], ids[2], ids[1]);
  }
  /*
   مقطع جانبي (z, y) يُمدّ على X من −w إلى +w بحواف مشطوفة r.
   w(z, y): نصف العرض (يسمح بميلان الزجاج للداخل). color(p): لون كل نقطة. skip: أضلاع لا يُرسم سطحها (فتحة الصندوق)
  */
  function extrudeX(B, prof, o) {
    let P = prof.map(p => p.slice());
    if (area2(P) < 0) P.reverse();
    const n = P.length, r = o.r || 0.04, wF = o.w, col = o.color || (() => [1, 1, 1]), skip = o.skip || (() => false);
    const en = []; // متجه الخروج لكل ضلع
    for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n], du = b[0] - a[0], dv = b[1] - a[1], l = Math.hypot(du, dv) || 1; en.push([dv / l, -du / l]); }
    const inset = P.map((p, i) => {
      const e0 = en[(i + n - 1) % n], e1 = en[i]; let m = [e0[0] + e1[0], e0[1] + e1[1]]; const ml = Math.hypot(m[0], m[1]) || 1; m = [m[0] / ml, m[1] / ml];
      const c = Math.max(0.35, m[0] * e1[0] + m[1] * e1[1]); return [p[0] - m[0] * r / c, p[1] - m[1] * r / c];
    });
    const L = [ // أربع طبقات: وجه +X مقصوص، حافة، حافة، وجه −X
      inset.map((p, i) => [wF(P[i][0], P[i][1]), p[1], p[0]]),
      P.map(p => [wF(p[0], p[1]) - r, p[1], p[0]]),
      P.map(p => [-(wF(p[0], p[1]) - r), p[1], p[0]]),
      inset.map((p, i) => [-wF(P[i][0], P[i][1]), p[1], p[0]])
    ];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, e = en[i], ew = [0, e[1], e[0]];
      for (let k = 0; k < 3; k++) {
        if (k === 1 && skip(i, P[i], P[j])) continue;
        const want = k === 0 ? V.norm(V.add(ew, [1, 0, 0])) : k === 2 ? V.norm(V.add(ew, [-1, 0, 0])) : ew;
        const ps = [L[k][i], L[k][j], L[k + 1][j], L[k + 1][i]];
        AA.quad(B, ps, [[0, 0], [1, 0], [1, 1], [0, 1]], ps.map(col), want);
      }
    }
    if (!o.noCap) for (const t of earclip(inset)) for (const [k, sx] of [[0, 1], [3, -1]]) { const ps = t.map(i => L[k][i]); tri3(B, ps, ps.map(col), [sx, 0, 0]); }
    return { P, inset, layers: L, en };
  }
  // قصّ مضلع بين خطّين z0 ≤ z ≤ z1 (لتقسيم الزجاج الجانبي إلى نوافذ)
  function clipZ(poly, z0, z1) {
    const clip = (pts, keep, inter) => { const out = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], ka = keep(a), kb = keep(b); if (ka) out.push(a); if (ka !== kb) out.push(inter(a, b)); } return out; };
    const at = z => (a, b) => { const t = (z - a[0]) / (b[0] - a[0]); return [z, a[1] + (b[1] - a[1]) * t]; };
    return clip(clip(poly, p => p[0] >= z0, at(z0)), p => p[0] <= z1, at(z1));
  }
  function clipAxis(poly, ax, lo, hi) {
    const clip = (pts, keep, inter) => { const out = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], ka = keep(a), kb = keep(b); if (ka) out.push(a); if (ka !== kb) out.push(inter(a, b)); } return out; };
    const at = v => (a, b) => { const t = (v - a[ax]) / (b[ax] - a[ax]), r = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; r[ax] = v; return r; };
    let out = poly; if (lo > -1e8) out = clip(out, p => p[ax] >= lo, at(lo)); if (hi < 1e8) out = clip(out, p => p[ax] <= hi, at(hi)); return clean(out);
  }
  function clean(poly) { // يحذف النقاط المكررة والواقعة على خط واحد حتى ينجح التثليث
    let P = poly.slice(), changed = true;
    while (changed && P.length > 3) { changed = false; for (let i = 0; i < P.length; i++) { const a = P[(i + P.length - 1) % P.length], b = P[i], c = P[(i + 1) % P.length]; if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-6 || Math.abs(cr(a, b, c)) < 1e-9) { P.splice(i, 1); changed = true; break; } } }
    return P.length >= 3 ? P : [];
  }
  // لوح باب بسماكة: وجه خارجي على x = sx·w، ووجه داخلي، وحواف
  function slab(B, poly, sx, w, t, colOut, colIn) {
    if (poly.length < 3) return;
    const P = area2(poly) < 0 ? poly.slice().reverse() : poly, n = P.length, o = pt => [sx * w, pt[1], pt[0]], ii = pt => [sx * (w - t), pt[1], pt[0]];
    for (const tr of earclip(P)) { tri3(B, tr.map(i => o(P[i])), tr.map(() => colOut), [sx, 0, 0]); tri3(B, tr.map(i => ii(P[i])), tr.map(() => colIn), [-sx, 0, 0]); }
    for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n], du = b[0] - a[0], dv = b[1] - a[1], ps = [o(a), o(b), ii(b), ii(a)]; AA.quad(B, ps, [[0, 0], [1, 0], [1, 1], [0, 1]], [colIn], [0, -du, dv]); }
  }
  function offsetPoly(poly, d) { // إزاحة للداخل (المضلع عكس عقارب الساعة)
    const P = area2(poly) < 0 ? poly.slice().reverse() : poly, n = P.length, en = [];
    for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n], du = b[0] - a[0], dv = b[1] - a[1], l = Math.hypot(du, dv) || 1; en.push([dv / l, -du / l]); }
    return P.map((p, i) => { const e0 = en[(i + n - 1) % n], e1 = en[i]; let m = [e0[0] + e1[0], e0[1] + e1[1]]; const ml = Math.hypot(m[0], m[1]) || 1; m = [m[0] / ml, m[1] / ml]; const c = Math.max(0.35, m[0] * e1[0] + m[1] * e1[1]); return [p[0] - m[0] * d / c, p[1] - m[1] * d / c]; });
  }
  // مضلع مسطّح على جانبي السيارة (زجاج، خطوط أبواب، شريط زينة) على بُعد x = ±(w + off)
  function sidePoly(B, poly, wF, off, col, sides) {
    if (poly.length < 3) return;
    const P = area2(poly) < 0 ? poly.slice().reverse() : poly;
    for (const t of earclip(P)) for (const sx of sides || [1, -1]) { const ps = t.map(i => [sx * (wF(P[i][0], P[i][1]) + off), P[i][1], P[i][0]]); tri3(B, ps, ps.map(() => col), [sx, 0, 0]); }
  }
  // مربع على سطح مائل بين نقطتين من المقطع (زجاج أمامي/خلفي)
  function slopeQuad(B, a, b, t0, t1, wF, inX, off, col) {
    const p0 = [lerp(a[0], b[0], t0), lerp(a[1], b[1], t0)], p1 = [lerp(a[0], b[0], t1), lerp(a[1], b[1], t1)], du = b[0] - a[0], dv = b[1] - a[1], l = Math.hypot(du, dv);
    let nz = dv / l, ny = -du / l; // خارج المضلع عكس عقارب الساعة؛ نتحقق بالاتجاه المطلوب لاحقاً
    const mk = (p, sx) => [sx * (wF(p[0], p[1]) - inX), p[1] + ny * off, p[0] + nz * off];
    const ps = [mk(p0, 1), mk(p1, 1), mk(p1, -1), mk(p0, -1)];
    return { ps, n: [0, ny, nz], draw: want => AA.quad(B, ps, [[0, 0], [1, 0], [1, 1], [0, 1]], [col], want) };
  }
  // نقل الرؤوس الجديدة في بنّاء: rot حول Y ثم إزاحة
  function moveNew(B, from, fn) { for (let i = from; i < B.vertexCount; i++) { const p = fn([B.pos[i * 3], B.pos[i * 3 + 1], B.pos[i * 3 + 2]]); B.pos[i * 3] = p[0]; B.pos[i * 3 + 1] = p[1]; B.pos[i * 3 + 2] = p[2]; } }

  // ---------- العجلة: إطار بنقشة بارزة + جنط ----------
  function wheelInto(T, Rm, c, R, w, side, q, rimCol, axis) {
    const sides = LOW(q) ? 16 : 32;
    const prof = [[-w / 2 + 0.012, 0.6 * R], [-w / 2, 0.74 * R], [-w / 2 + 0.008, 0.9 * R], [-w / 2 + 0.035, 0.975 * R], [-w / 2 + 0.07, R], [w / 2 - 0.07, R], [w / 2 - 0.035, 0.975 * R], [w / 2 - 0.008, 0.9 * R], [w / 2, 0.74 * R], [w / 2 - 0.012, 0.6 * R]];
    const map = axis === 'z' ? p => [c[0] + p[0], c[1] + p[2], c[2] - p[1]] : side > 0 ? p => [c[0] + p[1], c[1] - p[0], c[2] + p[2]] : p => [c[0] - p[1], c[1] + p[0], c[2] + p[2]];
    let n0 = T.vertexCount;
    AA.lathe(T, prof, { sides, color: (y, a, i) => i >= 4 && i <= 5 ? [0.85, 0.85, 0.85] : [1, 1, 1] });
    for (let i = n0; i < T.vertexCount; i++) { // نقشة الإطار: كتل بارزة متبادلة
      const x = T.pos[i * 3], z = T.pos[i * 3 + 2], r = Math.hypot(x, z); if (r < 0.96 * R) continue;
      const a = Math.atan2(x, z), k = Math.round(a / (Math.PI * 2) * sides), y = T.pos[i * 3 + 1], f = ((k + (y > 0 ? 1 : 0)) % 4 + 4) % 4 < 2 ? 1 : 0.972;
      T.pos[i * 3] = x * f; T.pos[i * 3 + 2] = z * f;
    }
    moveNew(T, n0, map);
    n0 = Rm.vertexCount;
    AA.lathe(Rm, [[w / 2 - 0.02, 0.62 * R], [w / 2 - 0.03, 0.6 * R], [w / 2 - 0.065, 0.46 * R], [w / 2 - 0.065, 0.22 * R], [w / 2 - 0.045, 0.18 * R], [w / 2 - 0.04, 0.08 * R], [w / 2 - 0.045, 0]], { sides: LOW(q) ? 12 : 20, color: (y, a, i) => i === 2 || i === 3 ? mixc(rimCol, [0.2, 0.2, 0.2], 0.15) : rimCol });
    // فتحات الجنط وصواميل
    if (!LOW(q)) for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; AA.blob(Rm, [Math.sin(a) * 0.34 * R, w / 2 - 0.06, Math.cos(a) * 0.34 * R], [0.045 * R, 0, 0], [0, 0.004, 0], [0, 0, 0.045 * R], () => [0.15, 0.15, 0.15], 0, 0, 0, null, 0, true); }
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.5; AA.blob(Rm, [Math.sin(a) * 0.13 * R, w / 2 - 0.04, Math.cos(a) * 0.13 * R], [0.012, 0, 0], [0, 0.012, 0], [0, 0, 0.012], () => [0.8, 0.8, 0.8], 0, 0, 0, null, 0, true); }
    moveNew(Rm, n0, map);
  }

  // ---------- البدن المشترك ----------
  // spec: { L, W, R, axF, axR, floorY, hoodY, belt, roofF, roofR, glassF, cabRear, bed }
  function bodyInto(P, s, p, q, rng) {
    const paint = hex(PAINT[p.color] || PAINT.white), dust = hex('#b8996e'), dirt = p.dirt;
    const pc = pt => vary(mixc(paint, dust, dirt * (0.15 + 0.85 * smooth(0.95, 0.42, pt[1]))), rng, 0.01);
    const W = s.W, wBody = () => W, Ra = s.R + 0.075, zF = s.zF != null ? s.zF : s.L / 2, zB = s.zB != null ? s.zB : -s.L / 2, arches = s.arches || [s.axR, s.axF];
    // المقطع الجانبي السفلي: مقدمة، غطاء المحرك، الخط العلوي، المؤخرة، والقاع بفتحتي العجلات
    const arch = (zc, from, to) => { const out = [], n = LOW(q) ? 6 : 12, a0 = Math.PI - Math.asin(clamp((s.bottom - s.R) / Ra, -1, 1)), a1 = Math.asin(clamp((s.bottom - s.R) / Ra, -1, 1)); for (let k = 0; k <= n; k++) { const a = lerp(a0, a1, k / n); out.push([zc + Ra * Math.cos(a), s.R + Ra * Math.sin(a)]); } return out; };
    const prof = [[zF - 0.06, s.bottom], [zF, s.bumperY + 0.18], [zF - 0.03, s.hoodY - 0.04], [zF - 0.16, s.hoodY], [s.cowlZ, s.belt + 0.02]];
    if (s.bed) prof.push([s.cabRear - 0.04, s.belt], [zB + 0.05, s.belt - 0.02]); else prof.push([zB + 0.08, s.belt]);
    prof.push([zB, s.belt - 0.1], [zB + 0.02, s.bottom + 0.05], [zB + 0.12, s.bottom]);
    // القاع من الخلف للأمام: فتحة العجلة الخلفية ثم الأمامية (عكس اتجاه الزاوية لأن المسار يمشي نحو +Z)
    for (const zc of arches) for (const pt of arch(zc)) prof.push([pt[0], pt[1]]);
    // سطح الخط العلوي (فوق الكابينة والصندوق) لا يُرسم: البدن مجوّف من الداخل
    const topSkip = (i, a, b) => Math.abs(a[1] - s.belt) < 0.05 && Math.abs(b[1] - s.belt) < 0.05 && Math.abs(a[0] - b[0]) > 1 && Math.max(a[0], b[0]) <= s.cowlZ + 0.01;
    const body = extrudeX(P.paint, prof, { w: wBody, r: 0.05, color: pc, skip: topSkip, noCap: true });
    // الجانبان: قطع بين الأبواب + عتبة تحت كل باب، والأبواب أجزاء مستقلة تُفتح على مفصّلها الأمامي
    const yDb = s.bottom + 0.1, gap = 0.006, doors = s.doors || [];
    const cuts = [-9]; for (const d of doors) cuts.push(d[0] - gap, d[1] + gap); cuts.push(9);
    const capPoly = (poly, sx) => { for (const t of earclip(poly)) { const ps = t.map(i => [sx * W, poly[i][1], poly[i][0]]); tri3(P.paint, ps, ps.map(pc), [sx, 0, 0]); } };
    const insetCCW = body.inset;
    for (const sx of [1, -1]) {
      for (let k = 0; k < cuts.length; k += 2) capPoly(clipAxis(insetCCW, 0, cuts[k], cuts[k + 1]), sx);
      for (const d of doors) capPoly(clipAxis(clipAxis(insetCCW, 0, d[0] - gap, d[1] + gap), 1, -1e9, yDb), sx);
    }
    // الكابينة / الجزء الزجاجي: تميل جوانبه للداخل، والنوافذ فتحات حقيقية
    const gW = (z, y) => W - 0.05 - 0.09 * clamp((y - s.belt) / (s.roofY - s.belt), 0, 1);
    const gh = [[s.cowlZ - 0.02, s.belt], [s.glassF, s.roofY - 0.02], [s.glassF - 0.12, s.roofY], [s.roofR + 0.1, s.roofY], [s.roofR, s.roofY - 0.05], [s.cabRear, s.belt]];
    const isWS = (a, b) => Math.abs(Math.min(a[1], b[1]) - s.belt) < 0.01 && Math.abs(Math.max(a[1], b[1]) - s.roofY) < 0.1 && Math.abs(a[0] - b[0]) > 0.04;
    const cab = extrudeX(P.paint, gh, { w: gW, r: 0.045, color: pc, noCap: true, skip: (i, a, b) => isWS(a, b) || topSkip(i, a, b) });
    const outer = cab.inset, inner = offsetPoly(outer, 0.075).map(pt => [pt[0], Math.max(pt[1], s.belt + 0.06)]);
    const gside = (B, poly, sx, off, colFn) => { if (poly.length < 3) return; const Q = area2(poly) < 0 ? poly.slice().reverse() : poly; for (const t of earclip(Q)) { const ps = t.map(i => [sx * (gW(Q[i][0], Q[i][1]) + off), Q[i][1], Q[i][0]]); tri3(B, ps, ps.map(colFn), [sx, 0, 0]); } };
    for (const sx of [1, -1]) {
      for (let i = 0; i < outer.length; i++) { // إطار حول الفتحات
        const j = (i + 1) % outer.length, q4 = [outer[i], outer[j], inner[j], inner[i]];
        gside(P.paint, clean(q4), sx, 0, pc);
      }
      const wz = [-9]; for (const [z0, z1] of s.windows) wz.push(z0, z1); wz.push(9);
      for (let k = 0; k < wz.length; k += 2) gside(P.paint, clipAxis(inner, 0, wz[k], wz[k + 1]), sx, 0, pc); // الأعمدة
    }
    // زجاج النوافذ: نافذة الباب تتبع الباب
    const winOf = s.windows.map(([z0, z1]) => doors.findIndex(d => z0 < d[1] && z1 > d[0]));
    s.windows.forEach(([z0, z1], k) => { for (const sx of [1, -1]) { const d = winOf[k], B = d >= 0 ? P['dglass' + d + (sx > 0 ? 'L' : 'R')] : P.glass; gside(B, clipAxis(inner, 0, z0, z1), sx, 0.002, () => [1, 1, 1]); } });
    // الزجاج الأمامي والخلفي في فتحتين بإطار
    const winFrame = (a, b, t0, t1, inX, want) => {
      const mk = (t, x) => { const pz = lerp(a[0], b[0], t), py = lerp(a[1], b[1], t); return [x * (gW(pz, py) - 0.045), py, pz]; };
      const mkI = (t, x) => { const pz = lerp(a[0], b[0], t), py = lerp(a[1], b[1], t); return [x * (gW(pz, py) - inX), py, pz]; };
      const Q = (ps) => AA.quad(P.paint, ps, [[0, 0], [1, 0], [1, 1], [0, 1]], ps.map(pc), want);
      Q([mk(0, 1), mk(0, -1), mk(t0, -1), mk(t0, 1)]); Q([mk(t1, 1), mk(t1, -1), mk(1, -1), mk(1, 1)]);
      for (const x of [1, -1]) Q([mk(t0, x), mkI(t0, x), mkI(t1, x), mk(t1, x)]);
      slopeQuad(P.glass, a, b, t0, t1, gW, inX, 0.0, [1, 1, 1]).draw(want);
    };
    winFrame(gh[0], gh[1], 0.06, 0.94, 0.1, V.norm([0, 0.5, 1]));
    winFrame(gh[4], gh[5], 0.08, 0.88, 0.12, [0, 0.2, -1]);
    // الأبواب: لوح سفلي بسماكة + مقبض، تُركّب على مفصّل
    const paintC = hex(PAINT[p.color] || PAINT.white), inC = mixc(paintC, [0.25, 0.22, 0.2], 0.55);
    doors.forEach((d, k) => { for (const sx of [1, -1]) {
      const B = P['door' + k + (sx > 0 ? 'L' : 'R')], poly = clipAxis(clipAxis(insetCCW, 0, d[0] + gap, d[1] - gap), 1, yDb, 1e9);
      const st = B.vertexCount; slab(B, poly, sx, W, 0.07, paintC, inC);
      for (let i = st; i < B.vertexCount; i++) { const c = pc([0, B.pos[i * 3 + 1], 0]), out = Math.abs(B.pos[i * 3]) > W - 0.01; if (out) { B.col[i * 3] = c[0]; B.col[i * 3 + 1] = c[1]; B.col[i * 3 + 2] = c[2]; } }
      AA.box(B, [sx * (W + 0.012), s.belt - 0.13, d[0] + 0.14], [0.025, 0.035, 0.16], [0.08, 0.08, 0.08], 1, {});
    } });
    // أرضية الكابينة، الجدار الأمامي، والجدار الخلفي للكابينة (الوانيت)
    AA.quad(P.interior, [[-W + 0.06, s.floorY, s.cabRear + 0.03], [W - 0.06, s.floorY, s.cabRear + 0.03], [W - 0.06, s.floorY, s.cowlZ - 0.1], [-W + 0.06, s.floorY, s.cowlZ - 0.1]], [[0, 0], [1, 0], [1, 1], [0, 1]], [[0.55, 0.5, 0.45]], [0, 1, 0]);
    AA.quad(P.interior, [[-W + 0.06, s.floorY, s.cowlZ - 0.1], [W - 0.06, s.floorY, s.cowlZ - 0.1], [W - 0.06, s.belt, s.cowlZ - 0.1], [-W + 0.06, s.belt, s.cowlZ - 0.1]], [[0, 0], [1, 0], [1, 1], [0, 1]], [[0.6, 0.55, 0.5]], [0, 0, -1]);
    if (s.bed) AA.quad(P.interior, [[-W + 0.06, s.floorY, s.cabRear + 0.03], [W - 0.06, s.floorY, s.cabRear + 0.03], [W - 0.06, s.belt, s.cabRear + 0.03], [-W + 0.06, s.belt, s.cabRear + 0.03]], [[0, 0], [1, 0], [1, 1], [0, 1]], [[0.6, 0.55, 0.5]], [0, 0, 1]);
    const archTop = z => { let y = s.bottom + 0.1; for (const zc of arches) if (Math.abs(z - zc) < Ra) y = Math.max(y, s.R + Math.sqrt(Ra * Ra - (z - zc) * (z - zc)) + 0.06); return y; };
    if (p.stripe) for (const [y0, y1] of [[s.belt - 0.24, s.belt - 0.2], [s.belt - 0.18, s.belt - 0.165]]) sidePoly(P.trim, clipZ([[zB + 0.15, y0], [zF - 0.2, y0], [zF - 0.2, y1], [zB + 0.15, y1]], -9, 9), wBody, 0.008, [1, 1, 1]); // فوق سطح الأبواب أيضاً
    // شريط بلاستيك سفلي وحواف فتحات العجلات
    for (const zc of arches) for (const sx of [1, -1]) {
      const pts = arch(zc).map(pt => [sx * (W + 0.01), pt[1], pt[0]]);
      AA.tube(P.trim, pts, pts.map(() => 0.035), 5, () => [1, 1, 1], () => 0, 0, null, false);
    }
    // تحت السيارة: هيكل ومحوران
    if (!s.noUnder) AA.box(P.under, [0, s.bottom - 0.08, (s.axF + s.axR) / 2], [W * 1.4, 0.16, s.axF - s.axR + 0.6], [1, 1, 1], 1, {});
    if (!s.noUnder) for (const zc of [s.axF, s.axR]) AA.loft(P.under, { path: [[-W + 0.08, s.R, zc], [W - 0.08, s.R, zc]], sides: 6, up: () => [0, 1, 0], capStart: true, capEnd: true, radius: () => 0.05, color: () => [1, 1, 1] });
    // الداخل: مقاعد، لوحة قيادة، مقود (يسار)
    AA.box(P.interior, [0, s.belt - 0.02, s.cowlZ - 0.3], [W * 2 - 0.2, 0.22, 0.4], [1, 1, 1], 1, {});
    for (const x of [0.4, -0.4]) { AA.roundBox(P.interior, [x, s.floorY + 0.2, s.seatF], [0.5, 0.14, 0.5], 0.05, { seg: 1 }); AA.roundBox(P.interior, [x, s.floorY + 0.55, s.seatF - 0.26], [0.5, 0.65, 0.12], 0.05, { seg: 1 }); }
    if (s.seatR != null) { AA.roundBox(P.interior, [0, s.floorY + 0.2, s.seatR], [W * 2 - 0.3, 0.14, 0.5], 0.05, { seg: 1 }); AA.roundBox(P.interior, [0, s.floorY + 0.55, s.seatR - 0.26], [W * 2 - 0.3, 0.6, 0.12], 0.05, { seg: 1 }); }
    { const c = [0.4, s.belt + 0.08, s.cowlZ - 0.48], ring = []; for (let k = 0; k <= 16; k++) { const a = k / 16 * Math.PI * 2; ring.push([c[0] + Math.cos(a) * 0.19, c[1] + Math.sin(a) * 0.19 * 0.8, c[2] - Math.sin(a) * 0.19 * 0.6]); } AA.tube(P.trim, ring, ring.map(() => 0.018), 5, () => [1, 1, 1], () => 0, 0, null, false); }
    // المقدمة: شبك، مصابيح، صدام، ولوحة
    const zf = zF;
    AA.box(P.trim, [0, s.hoodY - 0.2, zf + 0.005], [W * 1.15, 0.26, 0.03], [1, 1, 1], 1, {});
    for (let k = 0; k < 4; k++) AA.box(P.chrome, [0, s.hoodY - 0.11 - k * 0.06, zf + 0.022], [W * 1.12, 0.014, 0.012], [1, 1, 1], 1, {});
    for (const sx of [1, -1]) {
      if (s.roundLamps) {
        AA.loft(P.chrome, { path: [[sx * (W - 0.2), s.hoodY - 0.2, zf - 0.01], [sx * (W - 0.2), s.hoodY - 0.2, zf + 0.03]], sides: 16, up: () => [0, 1, 0], capStart: false, capEnd: false, radius: () => 0.105, color: () => [1, 1, 1] });
        AA.loft(P.lamp, { path: [[sx * (W - 0.2), s.hoodY - 0.2, zf + 0.0], [sx * (W - 0.2), s.hoodY - 0.2, zf + 0.025]], sides: 16, up: () => [0, 1, 0], capEnd: true, radius: t => 0.09 - 0.02 * t, color: () => [1, 1, 1] });
      } else {
        AA.box(P.chrome, [sx * (W - 0.24), s.hoodY - 0.17, zf + 0.004], [0.36, 0.17, 0.03], [1, 1, 1], 1, {});
        AA.box(P.lamp, [sx * (W - 0.24), s.hoodY - 0.17, zf + 0.02], [0.32, 0.13, 0.01], [1, 1, 1], 1, {});
      }
      AA.box(P.amber, [sx * (W - 0.12), s.bumperY + 0.14, zf - 0.02], [0.14, 0.06, 0.03], [1, 1, 1], 1, {});
      if (!s.noRear) AA.box(P.tail, [sx * (W - 0.09), s.belt - 0.2, zB - 0.004], [0.16, 0.26, 0.02], [1, 1, 1], 1, {});
      if (!s.noRear) AA.box(P.amber, [sx * (W - 0.09), s.belt - 0.38, zB - 0.004], [0.16, 0.07, 0.02], [1, 1, 1], 1, {});
      // مرآة جانبية
      AA.box(P.trim, [sx * (W + 0.08), s.belt + 0.2, s.glassF - 0.05], [0.12, 0.16, 0.05], [1, 1, 1], 1, {});
      AA.box(P.trim, [sx * (W + 0.02), s.belt + 0.14, s.glassF - 0.05], [0.08, 0.03, 0.03], [1, 1, 1], 1, {});
    }
    const bump = p.bumper === 'chrome' ? P.chrome : P.trim;
    AA.roundBox(bump, [0, s.bumperY, zf + 0.05], [W * 2 + 0.06, 0.2, 0.16], 0.05, { seg: LOW(q) ? 1 : 2 });
    if (!s.noRear) AA.roundBox(bump, [0, s.bumperY, zB - 0.05], [W * 2 + 0.06, 0.2, 0.16], 0.05, { seg: LOW(q) ? 1 : 2 });
    for (const z of s.noRear ? [zf + 0.135] : [zf + 0.135, zB - 0.135]) AA.box(P.chrome, [0, s.bumperY + 0.04, z], [0.42, 0.11, 0.01], [0.95, 0.95, 0.95], 1, {}); // لوحة بلا كتابة
    return { body, gW };
  }

  // ---------- جيب صحراوي ----------
  function jeep(p, q) {
    const P = kit(), rng = AA.rng(p.seed), R = 0.39 * p.tire, L = 4.85, W = 0.9;
    const s = { L, W, R, axF: 1.3, axR: -1.43, bottom: 0.44 + (R - 0.39), bumperY: 0.55 + (R - 0.39) * 0.8, hoodY: 1.13, belt: 1.1, cowlZ: 1.15, glassF: 0.72, roofY: 1.92, roofR: -2.32, cabRear: -2.42,
      floorY: 0.55, seatF: 0.2, seatR: -0.85, windows: [[0.02, 0.95], [-1.05, -0.08], [-2.28, -1.15]], doors: [[-0.04, 0.98], [-1.08, -0.06]], roundLamps: true };
    s.hoodY += (R - 0.39); s.belt += (R - 0.39); s.roofY += (R - 0.39) * 0.9; s.floorY += R - 0.39;
    bodyInto(P, s, p, q, rng);
    const rimCol = p.rims === 'black' ? [0.18, 0.18, 0.18] : p.rims === 'steel' ? [0.92, 0.92, 0.9] : [0.72, 0.73, 0.74];
    for (const sx of [1, -1]) { wheelInto(P[sx > 0 ? 'tireFL' : 'tireFR'], P[sx > 0 ? 'rimFL' : 'rimFR'], [sx * 0.79, R, s.axF], R, 0.27, sx, q, rimCol); wheelInto(P.tireR, P.rimR, [sx * 0.79, R, s.axR], R, 0.27, sx, q, rimCol); }
    // إطار احتياطي على الباب الخلفي
    if (p.spare) { const a = P.trim.vertexCount; wheelInto(P.trim, P.chrome, [0.25, s.belt - 0.12, -L / 2 - 0.16], R * 0.98, 0.25, 1, q, rimCol, 'z'); }
    // شنكل (سنوركل) على الجهة اليمنى
    if (p.snorkel) { const pts = [[-W - 0.03, s.belt - 0.15, s.cowlZ + 0.25], [-W - 0.05, s.belt + 0.05, s.cowlZ + 0.05], [-W + 0.0, s.roofY - 0.08, s.glassF - 0.08], [-W + 0.02, s.roofY + 0.08, s.glassF - 0.05]]; AA.tube(P.trim, pts, [0.05, 0.05, 0.048, 0.05], 8, () => [1, 1, 1], () => 0, 0, null, true); AA.box(P.trim, [-W + 0.02, s.roofY + 0.1, s.glassF - 0.0], [0.12, 0.1, 0.14], [1, 1, 1], 1, {}); }
    // حامل سقف وحمولة
    if (p.rack) {
      const y = s.roofY + 0.12, z0 = -2.1, z1 = 0.5;
      for (const sx of [1, -1]) { AA.loft(P.chrome, { path: [[sx * 0.72, y, z0], [sx * 0.72, y, z1]], sides: 6, up: () => [0, 1, 0], capStart: true, capEnd: true, radius: () => 0.022, color: () => [0.35, 0.35, 0.35] }); for (const z of [z0 + 0.1, (z0 + z1) / 2, z1 - 0.1]) AA.box(P.trim, [sx * 0.72, y - 0.07, z], [0.05, 0.13, 0.05], [1, 1, 1], 1, {}); }
      for (let k = 0; k <= 5; k++) AA.loft(P.chrome, { path: [[-0.72, y, lerp(z0, z1, k / 5)], [0.72, y, lerp(z0, z1, k / 5)]], sides: 5, up: () => [0, 1, 0], radius: () => 0.016, color: () => [0.35, 0.35, 0.35] });
      if (p.load !== 'none') { // أكياس وجالونات مربوطة
        for (let k = 0; k < 3; k++) AA.souq.sackInto(P, { at: [-0.35 + k * 0.35, y + 0.02, -1.55 + (k % 2) * 0.2], rot: rng() * 6 }, { height: 0.5, radius: 0.2, open: false, seed: k + p.seed }, rng, q);
        for (let k = 0; k < 2; k++) AA.roundBox(P.paint, [0.3 - k * 0.22, y + 0.21, -0.4], [0.18, 0.4, 0.3], 0.03, { seg: 1, color: () => [0.25, 0.35, 0.2] });
      }
    }
    const lights = { at: [0, s.hoodY - 0.2, L / 2 + 0.4], color: [1, 0.95, 0.82], intensity: 2.2, distance: 14 };
    return done('jeep', P, { height: s.roofY + (p.rack ? 0.5 : 0.05), radius: L / 2 + 0.3, collider: { type: 'box', size: [W * 2 + 0.2, s.roofY, L] },
      physics: { mass: 2200, centerOfMass: [0, 0.75, -0.05], wheelbase: s.axF - s.axR, track: 1.58, wheelRadius: R, suspension: { travel: 0.24, stiffness: 42000, damping: 3800 }, maxSteer: 34, drive: '4x4' },
      wheels: [[0.79, R, s.axF], [-0.79, R, s.axF], [0.79, R, s.axR], [-0.79, R, s.axR]], seats: [{ at: [0.4, s.floorY + 0.28, s.seatF], driver: true }, { at: [-0.4, s.floorY + 0.28, s.seatF] }, { at: [0.4, s.floorY + 0.28, s.seatR] }, { at: [-0.4, s.floorY + 0.28, s.seatR] }],
      light: lights, walkSpeed: 3.2 }, s.axF, s.axR, R, { wx: 0.79, W, doors: s.doors, steer: p.steer, open: p.doors });
  }

  // ---------- وانيت ----------
  function pickup(p, q) {
    const P = kit(), rng = AA.rng(p.seed), R = 0.37 * p.tire, L = 5.1, W = 0.88;
    const s = { L, W, R, axF: 1.55, axR: -1.5, bottom: 0.42 + (R - 0.37), bumperY: 0.52 + (R - 0.37) * 0.8, hoodY: 1.06, belt: 1.04, cowlZ: 1.3, glassF: 0.85, roofY: 1.78, roofR: -0.5, cabRear: -0.62,
      floorY: 0.5, seatF: 0.0, seatR: null, windows: [[-0.47, 1.1]], doors: [[-0.52, 1.12]], roundLamps: false, bed: true };
    s.hoodY += (R - 0.37); s.belt += (R - 0.37); s.roofY += (R - 0.37) * 0.9; s.floorY += R - 0.37;
    bodyInto(P, s, p, q, rng);
    // الصندوق: أرضية وجدران داخلية وحافة علوية وأقواس العجلات من الداخل
    const zb0 = s.cabRear - 0.06, zb1 = -L / 2 + 0.06, fy = s.belt - 0.38, wi = W - 0.05, paint = hex(PAINT[p.color] || PAINT.white), inC = mixc(paint, [0.2, 0.2, 0.2], 0.25);
    AA.quad(P.paint, [[-wi, fy, zb0], [wi, fy, zb0], [wi, fy, zb1], [-wi, fy, zb1]], [[0, 0], [1, 0], [1, 1], [0, 1]], [mixc(inC, [0.1, 0.1, 0.1], 0.4)], [0, 1, 0]);
    for (let k = 0; k < 6; k++) AA.box(P.trim, [0, fy + 0.008, lerp(zb0, zb1, (k + 0.5) / 6)], [wi * 2 - 0.05, 0.014, 0.04], [1, 1, 1], 1, {}); // مجاري الأرضية
    for (const sx of [1, -1]) AA.quad(P.paint, [[sx * wi, fy, zb0], [sx * wi, s.belt - 0.02, zb0], [sx * wi, s.belt - 0.02, zb1], [sx * wi, fy, zb1]], [[0, 0], [1, 0], [1, 1], [0, 1]], [inC], [-sx, 0, 0]);
    AA.quad(P.paint, [[-wi, fy, zb0], [wi, fy, zb0], [wi, s.belt, zb0], [-wi, s.belt, zb0]], [[0, 0], [1, 0], [1, 1], [0, 1]], [inC], [0, 0, -1]);
    AA.quad(P.paint, [[-wi, fy, zb1], [wi, fy, zb1], [wi, s.belt - 0.02, zb1], [-wi, s.belt - 0.02, zb1]], [[0, 0], [1, 0], [1, 1], [0, 1]], [inC], [0, 0, 1]);
    for (const sx of [1, -1]) AA.roundBox(P.paint, [sx * (wi - 0.14), fy + 0.12, s.axR], [0.28, 0.26, 0.98], 0.08, { seg: 1, color: () => inC });
    AA.roundBox(P.paint, [0, s.belt + 0.01, zb0 + 0.02], [W * 2 - 0.04, 0.04, 0.08], 0.015, { seg: 1, color: () => paint });
    // قفص حديد للصندوق (لنقل الغنم)
    if (p.cage) {
      const top = s.belt + 0.55, zz = [zb0 + 0.05, (zb0 + zb1) / 2, zb1 + 0.05];
      for (const sx of [1, -1]) { for (const z of zz) AA.loft(P.trim, { path: [[sx * (W - 0.04), s.belt, z], [sx * (W - 0.04), top, z]], sides: 5, up: () => [0, 0, 1], radius: () => 0.018, color: () => [1, 1, 1] }); for (const y of [s.belt + 0.28, top]) AA.loft(P.trim, { path: [[sx * (W - 0.04), y, zb0 + 0.05], [sx * (W - 0.04), y, zb1 + 0.05]], sides: 5, up: () => [0, 1, 0], radius: () => 0.016, color: () => [1, 1, 1] }); }
      for (const z of zz) AA.loft(P.trim, { path: [[-(W - 0.04), top, z], [W - 0.04, top, z]], sides: 5, up: () => [0, 1, 0], radius: () => 0.016, color: () => [1, 1, 1] });
    }
    // الحمولة
    let riders = null;
    const ld = p.load, bedL = zb0 - zb1;
    if (ld === 'sacks') { const spots = [[-0.45, 0.2], [0.05, 0.25], [0.5, 0.2], [-0.4, 0.75], [0.1, 0.8], [0.5, 0.7], [-0.2, 0.48]]; spots.forEach(([x, t], k) => AA.souq.sackInto(P, { at: [x, fy + 0.01 + (k === 6 ? 0.42 : 0), lerp(zb0, zb1, t)], rot: rng() * 6 }, { height: 0.55, radius: 0.22, open: false, seed: k + p.seed }, rng, q)); }
    else if (ld === 'crates') { for (let k = 0; k < 6; k++) AA.souq.crateInto(P, { at: [(k % 2 ? 0.3 : -0.3), fy + 0.01 + (k > 3 ? 0.32 : 0), lerp(zb0, zb1, 0.2 + 0.3 * (k % 4 > 1 ? 1 : 0) + (k > 3 ? 0.15 : 0))], rot: (rng() - 0.5) * 0.15 }, { w: 0.55, d: 0.42, h: 0.3, goods: k > 3 ? null : ['oranges', 'tomatoes', 'lemons', 'oranges'][k], lid: k > 3 }, rng, q); }
    else if (ld === 'hay') { for (let k = 0; k < 6; k++) { const x = (k % 2 ? 0.34 : -0.34), z = lerp(zb0, zb1, 0.22 + 0.55 * (Math.floor(k / 2) % 2)), y = fy + 0.18 + (k > 3 ? 0.36 : 0); AA.roundBox(P.hay, [x, y, k > 3 ? lerp(zb0, zb1, 0.5) : z], [0.62, 0.36, 0.95], 0.06, { seg: 1, tile: 0.4, color: () => vary([0.86, 0.82, 0.5], rng, 0.1) }); } }
    else if (ld === 'sheep') { riders = []; for (let k = 0; k < 3; k++) riders.push({ asset: 'sheep', params: { seed: p.seed + k, breed: k === 1 ? 'naimi' : 'najdi' }, at: [(k - 1) * 0.42, fy - 0.01, lerp(zb0, zb1, 0.35 + 0.15 * (k % 2))], rot: Math.PI / 2 + (k - 1) * 0.4 }); }
    else if (ld === 'water') { for (let k = 0; k < 2; k++) AA.loft(P.paint, { path: [[(k ? 0.32 : -0.32), fy + 0.02, lerp(zb0, zb1, 0.5)], [(k ? 0.32 : -0.32), fy + 0.6, lerp(zb0, zb1, 0.5)]], sides: LOW(q) ? 10 : 20, up: () => [0, 0, 1], capEnd: true, uvU: 1, radius: () => 0.36, color: () => [0.86, 0.86, 0.82] }); }
    const rimCol = p.rims === 'black' ? [0.18, 0.18, 0.18] : p.rims === 'steel' ? [0.92, 0.92, 0.9] : [0.72, 0.73, 0.74];
    for (const sx of [1, -1]) { wheelInto(P[sx > 0 ? 'tireFL' : 'tireFR'], P[sx > 0 ? 'rimFL' : 'rimFR'], [sx * 0.78, R, s.axF], R, 0.25, sx, q, rimCol); wheelInto(P.tireR, P.rimR, [sx * 0.78, R, s.axR], R, 0.25, sx, q, rimCol); }
    return done('pickup', P, { height: s.roofY + (p.cage ? 0 : 0.05), radius: L / 2 + 0.3, collider: { type: 'box', size: [W * 2 + 0.2, s.roofY, L] },
      physics: { mass: 1650, centerOfMass: [0, 0.7, 0.2], wheelbase: s.axF - s.axR, track: 1.54, wheelRadius: R, suspension: { travel: 0.22, stiffness: 36000, damping: 3200 }, maxSteer: 36, drive: '4x2' },
      wheels: [[0.78, R, s.axF], [-0.78, R, s.axF], [0.78, R, s.axR], [-0.78, R, s.axR]], seats: [{ at: [0.4, s.floorY + 0.28, s.seatF], driver: true }, { at: [-0.4, s.floorY + 0.28, s.seatF] }],
      bed: { floorY: fy, z0: zb1, z1: zb0, halfWidth: wi }, riders, light: { at: [0, s.hoodY - 0.17, L / 2 + 0.4], color: [1, 0.95, 0.82], intensity: 2.2, distance: 14 }, walkSpeed: 3.6 }, s.axF, s.axR, R, { wx: 0.78, W, doors: s.doors, steer: p.steer, open: p.doors });
  }


  // ---------- شاحنة (لوري) ووايت ماء: كابينة بغطاء محرك أمامي، شاسيه، عجلات خلفية مزدوجة ----------
  function truck(p, q, kind) {
    const P = kit(), rng = AA.rng(p.seed), R = 0.5 * p.tire, W = 1.12, axF = 2.75, axR = -2.35, zEnd = -4.15, fy = 1.32;
    const s = { L: 8, W, R, axF, axR, zF: 4.02, zB: 0.95, arches: [axF], bottom: 1.0, bumperY: 0.92, hoodY: 1.82, belt: 1.92, cowlZ: 2.32, glassF: 2.16, roofY: 2.86, roofR: 1.06, cabRear: 0.98,
      floorY: 1.12, seatF: 1.45, seatR: null, windows: [[1.1, 2.12]], doors: [[1.02, 2.2]], roundLamps: true, noRear: true, noUnder: true };
    bodyInto(P, s, p, q, rng);
    const paint = hex(PAINT[p.color] || PAINT.red), dust = hex('#b8996e'), pc = pt => vary(mixc(paint, dust, p.dirt * (0.15 + 0.85 * smooth(1.4, 0.6, pt[1]))), rng, 0.01);
    // رفارف العجلات الأمامية: قوس سميك خارج الكابينة
    for (const sx of [1, -1]) {
      const Ra = R + 0.14, out = [], inn = [], n = LOW(q) ? 6 : 12;
      for (let k = 0; k <= n; k++) { const a = lerp(0.15, Math.PI - 0.15, k / n); out.push([axF + Math.cos(a) * (Ra + 0.07), R + Math.sin(a) * (Ra + 0.07)]); inn.push([axF + Math.cos(a) * Ra, R + Math.sin(a) * Ra]); }
      const st = P.paint.vertexCount; extrudeX(P.paint, out.concat(inn.reverse()), { w: () => 0.2, r: 0.02, color: pc });
      moveNew(P.paint, st, pt => [pt[0] + sx * (W - 0.12), pt[1], pt[2]]);
    }
    // درجة الباب، شمسية فوق الزجاج، أنوار سقف، عادم، خزان وقود
    for (const sx of [1, -1]) AA.box(P.trim, [sx * (W - 0.12), 0.78, 1.6], [0.3, 0.05, 0.9], [1, 1, 1], 1, {});
    AA.box(P.paint, [0, s.roofY + 0.02, s.glassF + 0.1], [W * 2 - 0.1, 0.05, 0.36], [1, 1, 1], 1, {});
    for (let k = -2; k <= 2; k++) AA.box(P.amber, [k * 0.3, s.roofY + 0.07, s.glassF + 0.1], [0.12, 0.06, 0.06], [1, 1, 1], 1, {});
    AA.tube(P.chrome, [[-W + 0.12, 1.0, 0.78], [-W + 0.12, 2.4, 0.78], [-W + 0.12, 3.25, 0.76]], [0.065, 0.065, 0.06], 10, () => [0.8, 0.8, 0.8], () => 0, 0, null, false);
    AA.loft(P.chrome, { path: [[W - 0.18, 0.72, 0.4], [W - 0.18, 0.72, -1.0]], sides: 12, up: () => [0, 1, 0], capStart: true, capEnd: true, radius: () => 0.26, color: () => [0.75, 0.75, 0.75] });
    // الشاسيه والمحاور
    for (const sx of [1, -1]) AA.box(P.under, [sx * 0.45, 0.88, (4.0 + zEnd) / 2], [0.16, 0.26, 4.0 - zEnd], [1, 1, 1], 1, {});
    for (const zc of [axF, axR]) AA.loft(P.under, { path: [[-1.0, R, zc], [1.0, R, zc]], sides: 8, up: () => [0, 1, 0], capStart: true, capEnd: true, radius: () => zc === axR ? 0.12 : 0.07, color: () => [1, 1, 1] });
    AA.blob(P.under, [0, R, axR], [0.22, 0, 0], [0, 0.22, 0], [0, 0, 0.2], () => [1, 1, 1], 0, 0, 0, null, 0, LOW(q)); // الدفرنس
    // العجلات: أمامية مفردة، خلفية مزدوجة
    const rimCol = p.rims === 'black' ? [0.18, 0.18, 0.18] : p.rims === 'silver' ? [0.72, 0.73, 0.74] : [0.92, 0.92, 0.9];
    for (const sx of [1, -1]) {
      wheelInto(P[sx > 0 ? 'tireFL' : 'tireFR'], P[sx > 0 ? 'rimFL' : 'rimFR'], [sx * 0.98, R, axF], R, 0.3, sx, q, rimCol);
      wheelInto(P.tireR, P.rimR, [sx * 1.0, R, axR], R, 0.29, sx, q, rimCol); wheelInto(P.tireR, P.rimR, [sx * 0.69, R, axR], R, 0.29, sx, q, mixc(rimCol, [0.3, 0.3, 0.3], 0.4));
      AA.box(P.trim, [sx * 0.92, 0.42, axR - R - 0.12], [0.55, 0.62, 0.02], [1, 1, 1], 1, {}); // رفرف طين
      AA.quad(P.paint, [[sx * 1.2, 1.1, axR + 0.75], [sx * 1.2, 1.1, axR - 0.75], [sx * 0.55, 1.1, axR - 0.75], [sx * 0.55, 1.1, axR + 0.75]], [[0, 0], [1, 0], [1, 1], [0, 1]], [mixc(paint, [0.1, 0.1, 0.1], 0.5)], [0, 1, 0]);
    }
    // الخلف: صدام حماية، أنوار
    AA.box(P.trim, [0, 0.62, zEnd + 0.05], [2.2, 0.12, 0.1], [1, 1, 1], 1, {});
    for (const sx of [1, -1]) { AA.box(P.tail, [sx * 0.95, 0.82, zEnd], [0.22, 0.12, 0.04], [1, 1, 1], 1, {}); AA.box(P.amber, [sx * 0.68, 0.82, zEnd], [0.12, 0.12, 0.04], [1, 1, 1], 1, {}); }
    AA.box(P.chrome, [0, 0.82, zEnd - 0.01], [0.42, 0.11, 0.01], [0.95, 0.95, 0.95], 1, {}); // لوحة بلا كتابة
    let riders = null, height = s.roofY + 0.1;
    if (kind === 'lorry') {
      // صندوق خشب: أرضية، ألواح جانبية ملوّنة، جدار أمامي عالٍ، وباب خلفي
      const z0 = 0.8, z1 = zEnd + 0.05, bw = 1.2, H = p.sideH, rows = Math.max(2, Math.round(H / 0.3)), COLS = [hex('#2a5a9a'), hex('#c9302a'), hex('#e0b030'), hex('#2f7a4a')];
      for (let k = 0; k < 9; k++) AA.box(P.wood, [-bw + (k + 0.5) * bw * 2 / 9, fy, (z0 + z1) / 2], [bw * 2 / 9 - 0.01, 0.07, z0 - z1], vary([0.9, 0.82, 0.72], rng, 0.1), 1, {});
      for (const sx of [1, -1]) AA.box(P.paint, [sx * (bw - 0.06), fy - 0.12, (z0 + z1) / 2], [0.12, 0.18, z0 - z1], [0.25, 0.25, 0.25], 1, {});
      const plankCol = r => p.painted ? mixc(COLS[r % COLS.length], [1, 1, 1], 0.12) : vary([0.92, 0.84, 0.72], rng, 0.08);
      for (let r = 0; r < rows; r++) {
        const y = fy + 0.04 + (r + 0.5) * H / rows, h = H / rows - 0.02, c = plankCol(r);
        const PB = p.painted ? P.paint : P.wood;
        for (const sx of [1, -1]) AA.box(PB, [sx * bw, y, (z0 + z1) / 2], [0.05, h, z0 - z1], c, 1, {});
        AA.box(PB, [0, y, z1], [bw * 2 - 0.06, h, 0.05], c, 1, {});
      }
      for (let r = 0; r < rows + 2; r++) { const y = fy + 0.04 + (r + 0.5) * (H + 0.6) / (rows + 2); AA.box(p.painted ? P.paint : P.wood, [0, y, z0], [bw * 2 - 0.06, (H + 0.6) / (rows + 2) - 0.02, 0.06], plankCol(r + 1), 1, {}); }
      for (const z of [z0, (z0 + z1) / 2, z1]) for (const sx of [1, -1]) AA.box(P.paint, [sx * (bw + 0.03), fy + H / 2 + 0.03, z], [0.07, H + 0.06, 0.09], [0.22, 0.22, 0.22], 1, {}); // أعمدة حديد
      for (const sx of [1, -1]) for (let k = 1; k < 5; k++) AA.box(P.chrome, [sx * (bw + 0.035), fy + 0.04 + H * 0.5, lerp(z0, z1, k / 5)], [0.02, 0.06, 0.06], [1, 1, 1], 1, {}); // أقفال
      const ld = p.load, at = t => lerp(z0 - 0.2, z1 + 0.2, t);
      if (ld === 'sacks') for (let k = 0; k < 14; k++) AA.souq.sackInto(P, { at: [(k % 3 - 1) * 0.7, fy + 0.04 + (k > 8 ? 0.5 : 0), at(((k % 9) / 3 | 0) * 0.33 + 0.12 + (k > 8 ? 0.1 : 0))], rot: rng() * 6 }, { height: 0.6, radius: 0.27, open: false, seed: k }, rng, q);
      else if (ld === 'hay') for (let k = 0; k < 12; k++) AA.roundBox(P.hay, [(k % 2 ? 0.55 : -0.55), fy + 0.24 + Math.floor(k / 6) * 0.42, at(0.12 + (k % 6 / 2 | 0) * 0.36)], [1.0, 0.4, 1.3], 0.07, { seg: 1, tile: 0.4, color: () => vary([0.86, 0.82, 0.5], rng, 0.1) });
      else if (ld === 'crates') for (let k = 0; k < 12; k++) AA.souq.crateInto(P, { at: [(k % 3 - 1) * 0.72, fy + 0.04 + (k > 8 ? 0.42 : 0), at(((k % 9) / 3 | 0) * 0.33 + 0.12)], rot: (rng() - 0.5) * 0.1 }, { w: 0.65, d: 0.5, h: 0.4, lid: true }, rng, q);
      else if (ld === 'camel') riders = [{ asset: 'camel', params: { seed: p.seed, saddle: false, coat: 'wadh' }, at: [0, fy + 0.04, at(0.5)], rot: 0 }];
      else if (ld === 'sheep') { riders = []; for (let k = 0; k < 6; k++) riders.push({ asset: 'sheep', params: { seed: p.seed + k, breed: k % 3 === 1 ? 'naimi' : k % 3 === 2 ? 'goat' : 'najdi' }, at: [(k % 2 ? 0.45 : -0.45), fy + 0.04, at(0.15 + (k >> 1) * 0.32)], rot: (rng() - 0.5) * 1.5 }); }
      height = Math.max(height, fy + H + 0.7);
    } else { // وايت: خزان ماء بيضاوي على قواعد، سلّم، فتحات علوية، ومحابس خلفية
      const z0 = 0.62, z1 = zEnd + 0.15, ry = 0.82, rx = 1.08, cy = fy + 0.02 + ry, tc = hex(p.tank === 'steel' ? '#c8cacb' : '#f2f2ee'), band = hex(p.band === 'green' ? '#2f7a4a' : p.band === 'red' ? '#b8312f' : '#2a5a9a');
      const path = []; for (let k = 0; k <= 12; k++) path.push([0, cy, lerp(z0, z1, k / 12)]);
      AA.loft(P.paint, { path, sides: LOW(q) ? 14 : 28, up: () => [0, 1, 0], uvU: 1, uvV: 0.5, radius: () => [rx, ry],
        color: (t, ang) => { const yy = Math.cos(ang); return Math.abs(yy + 0.05) < 0.09 ? band : Math.abs(yy + 0.22) < 0.03 ? band : tc; } });
      for (const [z, d] of [[z0, 1], [z1, -1]]) { const st = P.paint.vertexCount; AA.lathe(P.paint, [[0, 1], [0.08, 0.92], [0.14, 0.6], [0.16, 0]], { sides: LOW(q) ? 14 : 28, color: () => tc }); moveNew(P.paint, st, pt => [pt[0] * rx, cy + pt[2] * ry, z + d * pt[1]]); }
      for (const z of [z0 - 0.3, (z0 + z1) / 2, z1 + 0.4]) AA.box(P.under, [0, fy + 0.12, z], [1.6, 0.24, 0.25], [1, 1, 1], 1, {});
      for (const z of [z0 - 0.9, z1 + 1.1]) { AA.loft(P.chrome, { path: [[0, cy + ry - 0.05, z], [0, cy + ry + 0.08, z]], sides: 14, up: () => [0, 0, 1], capEnd: true, radius: () => 0.26, color: () => [0.85, 0.85, 0.85] }); }
      for (const sx of [1, -1]) AA.loft(P.chrome, { path: [[sx * 0.55, cy + ry + 0.25, z0 - 0.2], [sx * 0.55, cy + ry + 0.25, z1 + 0.3]], sides: 6, up: () => [0, 1, 0], radius: () => 0.025, color: () => [0.8, 0.8, 0.8] }); // درابزين
      for (let k = 0; k < 7; k++) AA.loft(P.chrome, { path: [[-0.25, fy + 0.4 + k * 0.28, z1 - 0.16], [0.25, fy + 0.4 + k * 0.28, z1 - 0.16]], sides: 5, up: () => [0, 1, 0], radius: () => 0.018, color: () => [0.8, 0.8, 0.8] });
      for (const sx of [1, -1]) AA.loft(P.chrome, { path: [[sx * 0.25, fy + 0.2, z1 - 0.16], [sx * 0.25, cy + ry + 0.25, z1 - 0.16]], sides: 6, up: () => [0, 0, 1], radius: () => 0.022, color: () => [0.8, 0.8, 0.8] });
      AA.loft(P.trim, { path: [[0.5, fy + 0.25, z1 - 0.1], [0.5, fy + 0.25, z1 - 0.45], [0.5, 0.6, zEnd - 0.1]], sides: 8, up: () => [0, 1, 0], radius: () => 0.07, color: () => [0.9, 0.9, 0.9] }); // خرطوم/محبس
      AA.box(P.chrome, [0.5, fy + 0.25, z1 - 0.12], [0.2, 0.2, 0.12], [1, 1, 1], 1, {});
      // خرطوم ملفوف على جنب
      for (let k = 0; k < 3; k++) { const ring = []; for (let j = 0; j <= 14; j++) { const a = j / 14 * Math.PI * 2; ring.push([-1.14 - k * 0.04, fy - 0.2 + Math.sin(a) * 0.28, -1.5 + Math.cos(a) * 0.28]); } AA.tube(P.trim, ring, ring.map(() => 0.035), 5, () => [1, 1, 1], () => 0, 0, null, false); }
      height = Math.max(height, cy + ry + 0.3);
    }
    const mass = kind === 'lorry' ? 7500 : 11000;
    return done(kind, P, { height, radius: 4.4, collider: { type: 'box', size: [2.5, height, 8.3] },
      physics: { mass, centerOfMass: [0, 1.2, -0.4], wheelbase: axF - axR, track: 2.0, wheelRadius: R, dualRear: true, suspension: { travel: 0.18, stiffness: 180000, damping: 14000 }, maxSteer: 38, drive: '4x2' },
      wheels: [[0.98, R, axF], [-0.98, R, axF], [1.0, R, axR], [0.69, R, axR], [-0.69, R, axR], [-1.0, R, axR]], seats: [{ at: [0.45, s.floorY + 0.28, s.seatF], driver: true }, { at: [-0.45, s.floorY + 0.28, s.seatF] }],
      riders, light: { at: [0, 1.3, 4.5], color: [1, 0.95, 0.82], intensity: 2.6, distance: 16 }, walkSpeed: 3.0, capacity: kind === 'wayt' ? { water_l: 12000 } : { kg: 6000 } }, axF, axR, R, { wx: 0.98, W, doors: s.doors, steer: p.steer, open: p.doors });
  }

  const A = AA.assets;
  const colorOpt = def => ({ key: 'color', label: 'اللون', type: 'enum', options: [['white', 'أبيض'], ['beige', 'بيج'], ['champagne', 'ذهبي'], ['silver', 'فضي'], ['red', 'أحمر'], ['blue', 'أزرق'], ['green', 'زيتي'], ['black', 'أسود']], def });
  const common = [
    { key: 'dirt', label: 'غبار', min: 0, max: 1, step: 0.05, def: 0.35, pct: true },
    { key: 'tire', label: 'حجم الكفرات', min: 0.9, max: 1.25, step: 0.01, def: 1, pct: true },
    { key: 'rims', label: 'الجنوط', type: 'enum', options: [['silver', 'فضية'], ['steel', 'حديد أبيض'], ['black', 'سوداء']], def: 'silver' },
    { key: 'bumper', label: 'الصدام', type: 'enum', options: [['black', 'أسود'], ['chrome', 'كروم']], def: 'black' },
    { key: 'steer', label: 'لفّة الكفرات', min: -34, max: 34, step: 1, def: 0, unit: '°' },
    { key: 'doors', label: 'فتح الأبواب', min: 0, max: 1, step: 0.05, def: 0, pct: true }
  ];
  A.jeep = { id: 'jeep', name: 'جيب صحراوي', nameEn: 'Desert 4x4', category: 'vehicles',
    schema: [colorOpt('beige')].concat(common, [
      { key: 'stripe', label: 'شريط جانبي', type: 'bool', def: true },
      { key: 'spare', label: 'كفر احتياطي', type: 'bool', def: true },
      { key: 'snorkel', label: 'شنكل هواء', type: 'bool', def: true },
      { key: 'rack', label: 'حامل سقف', type: 'bool', def: false },
      { key: 'load', label: 'حمولة السقف', type: 'enum', options: [['none', 'بدون'], ['bags', 'أكياس وجالونات']], def: 'bags' }
    ]), presets: { 'جيب مقناص': { color: 'white', rack: true, tire: 1.12, dirt: 0.6, rims: 'steel' }, 'جيب نظيف': { color: 'black', dirt: 0, stripe: false, snorkel: false, bumper: 'chrome' } }, generate: jeep };
  A.pickup = { id: 'pickup', name: 'وانيت', nameEn: 'Pickup truck', category: 'vehicles',
    schema: [colorOpt('white')].concat(common, [
      { key: 'load', label: 'الحمولة', type: 'enum', options: [['none', 'فاضي'], ['sacks', 'أكياس'], ['crates', 'صناديق'], ['hay', 'برسيم'], ['water', 'خزانات ماء'], ['sheep', 'غنم']], def: 'sacks' },
      { key: 'cage', label: 'قفص حديد', type: 'bool', def: false }
    ]), presets: { 'وانيت غنم': { load: 'sheep', cage: true, dirt: 0.5 }, 'وانيت برسيم': { load: 'hay', color: 'red' }, 'وانيت ماء': { load: 'water', color: 'blue', rims: 'steel' } }, generate: pickup };

  A.lorry = { id: 'lorry', name: 'لوري', nameEn: 'Cargo lorry', category: 'vehicles',
    schema: [colorOpt('red')].concat(common.filter(c => c.key !== 'bumper'), [
      { key: 'sideH', label: 'ارتفاع الألواح', min: 0.5, max: 1.4, step: 0.05, def: 0.9, unit: 'م' },
      { key: 'painted', label: 'ألواح ملوّنة', type: 'bool', def: true },
      { key: 'load', label: 'الحمولة', type: 'enum', options: [['none', 'فاضي'], ['sacks', 'أكياس'], ['hay', 'برسيم'], ['crates', 'صناديق'], ['sheep', 'غنم'], ['camel', 'ناقة']], def: 'hay' }
    ]).map(c => c.key === 'rims' ? Object.assign({}, c, { def: 'steel' }) : c),
    presets: { 'لوري ناقة': { load: 'camel', sideH: 1.2, color: 'blue' }, 'لوري غنم': { load: 'sheep', sideH: 1.1, color: 'green' }, 'لوري خشب سادة': { painted: false, load: 'sacks', color: 'beige' } }, generate: (p, q) => truck(p, q, 'lorry') };
  A.wayt = { id: 'wayt', name: 'وايت ماء', nameEn: 'Water tanker', category: 'vehicles',
    schema: [colorOpt('white')].concat(common.filter(c => c.key !== 'bumper'), [
      { key: 'tank', label: 'الخزان', type: 'enum', options: [['white', 'أبيض'], ['steel', 'ستانلس']], def: 'white' },
      { key: 'band', label: 'لون الشريط', type: 'enum', options: [['blue', 'أزرق'], ['green', 'أخضر'], ['red', 'أحمر']], def: 'blue' }
    ]).map(c => c.key === 'rims' ? Object.assign({}, c, { def: 'steel' }) : c),
    presets: { 'وايت ستانلس': { tank: 'steel', color: 'blue' } }, generate: (p, q) => truck(p, q, 'wayt') };
})(typeof window !== 'undefined' ? window : globalThis);
