// Aboden Assets — lowpoly/lp-core.js
// حزمة لو-بولي: أدوات مشتركة. نفس فكرة الحزمة الواقعية (بيانات خام محايدة للمحرك) لكن:
// أوجه مسطحة (كل مثلث له رؤوسه ومتعامده)، ألوان مسطحة بلا خامات، وعدد مثلثات قليل جداً.
(function (g) {
  'use strict';
  const AA = g.AA;
  const V = AA.v;
  const LP = AA.lp = {};

  // ألوان الحزمة (لوحة موحّدة حتى تبدو الأصول من عالم واحد)
  LP.PAL = {
    sand: '#e8c590', sandDark: '#d9ad72', mud: '#d99b5f', mudLight: '#e8b77c', mudDark: '#b97a44',
    wood: '#8a5a34', woodLight: '#a8703f', woodDark: '#5e3b22', dark: '#3a2418',
    palmGreen: '#5f9f3a', palmGreen2: '#86bf45', palmGreen3: '#4a8531', palmDry: '#c49a5a', palmDry2: '#a87c45', trunk: '#a9814f', trunk2: '#8d6740', trunkTop: '#6e4f30', stalk: '#e2a23e',
    date: '#c8641f', date2: '#9a3d16', skin: '#e0a676', skinShade: '#c98d5e', white: '#f5f1e8', cream: '#efe4cf',
    red: '#d43b35', black: '#2b2726', teal: '#2e9c94', yellow: '#f0bf3a', camel: '#d9a866', camelDark: '#b98a4f', camelLight: '#ecc48c'
  };
  LP.c = name => AA.hex(LP.PAL[name] || name);

  // منشور (أسطوانة منخفضة الأضلاع) بين نقطتين بنصفي قطر، مع غطاءين
  LP.prism = function (B, a, b, r0, r1, sides, color, o) {
    o = o || {};
    const d = V.norm(V.sub(b, a)); let [u, w] = AA.basis(d);
    if (o.rot) { const c = Math.cos(o.rot), s = Math.sin(o.rot); const u2 = V.add(V.scale(u, c), V.scale(w, s)), w2 = V.add(V.scale(u, -s), V.scale(w, c)); u = u2; w = w2; }
    const sx = o.sx || 1, ring = (c, r) => { const out = []; for (let k = 0; k < sides; k++) { const t = k / sides * Math.PI * 2; out.push(V.madd(V.madd(c, u, Math.cos(t) * r * sx), w, Math.sin(t) * r)); } return out; };
    const R0 = ring(a, r0), R1 = ring(b, r1), col = typeof color === 'function' ? color : () => color;
    const i0 = R0.map((p, k) => B.v(p, col(0, k), o.sway ? o.sway(p) : 0, o.phase || 0, 0)), i1 = R1.map((p, k) => B.v(p, col(1, k), o.sway ? o.sway(p) : 0, o.phase || 0, 0));
    for (let k = 0; k < sides; k++) { const j = (k + 1) % sides; B.t(i0[k], i1[j], i0[j]); B.t(i0[k], i1[k], i1[j]); }
    if (!o.noCaps) {
      if (r0 > 1e-4) { const c0 = B.v(a, col(0, 0), 0, 0, 0); for (let k = 0; k < sides; k++) B.t(c0, i0[k], i0[(k + 1) % sides]); }
      if (r1 > 1e-4) { const c1 = B.v(b, col(1, 0), o.sway ? o.sway(b) : 0, o.phase || 0, 0); for (let k = 0; k < sides; k++) B.t(c1, i1[(k + 1) % sides], i1[k]); }
    }
  };
  // سلسلة منشورات على مسار (جذع، رقبة، رجل) — كل قطعة بلونها
  LP.chain = function (B, pts, radii, sides, colorFn, o) { for (let i = 0; i < pts.length - 1; i++) LP.prism(B, pts[i], pts[i + 1], radii[i], radii[i + 1], sides, colorFn(i), Object.assign({ noCaps: i > 0 && i < pts.length - 2 }, o || {})); };
  // كرة منخفضة (20 وجهاً) بأنصاف أقطار وتشويش خفيف، ولون لكل وجه عبر colorFn(normal)
  LP.gem = function (B, c, r, color, rng, jitter, low) {
    const rr = Array.isArray(r) ? r : [r, r, r];
    AA.blob(B, c, [rr[0], 0, 0], [0, rr[1], 0], [0, 0, rr[2]], typeof color === 'function' ? color : () => color, 0, 0, 0, rng, jitter || 0, !!low);
  };
  // كرة أوجه (icosphere) بدرجة تقسيم، ولون لكل وجه من اتجاه مركزه، وتشويه اختياري للشكل shape(dir)->dir'
  const ICO = (() => { const t = (1 + Math.sqrt(5)) / 2; return { v: [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(V.norm), f: [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]] }; })();
  LP.ico = function (B, c, r, detail, colorFn, o) {
    o = o || {};
    let faces = ICO.f.map(f => f.map(i => ICO.v[i]));
    for (let d = 0; d < (detail || 0); d++) { const nf = []; for (const [a, b, cc] of faces) { const ab = V.norm(V.add(a, b)), bc = V.norm(V.add(b, cc)), ca = V.norm(V.add(cc, a)); nf.push([a, ab, ca], [ab, b, bc], [ca, bc, cc], [ab, bc, ca]); } faces = nf; }
    const rr = Array.isArray(r) ? r : [r, r, r], P = dd => { const q = o.shape ? o.shape(dd) : dd; return [c[0] + q[0] * rr[0], c[1] + q[1] * rr[1], c[2] + q[2] * rr[2]]; };
    for (const f of faces) {
      const ctr = V.norm(V.add(V.add(f[0], f[1]), f[2]));
      if (o.keep && !o.keep(ctr)) continue;
      const col = colorFn(ctr), ids = f.map(dd => B.v(P(dd), col, o.sway || 0, o.phase || 0, o.flutter || 0));
      B.t(ids[0], ids[1], ids[2]);
    }
  };
  LP.box = (B, c, size, color, o, rotZ) => AA.box(B, c, size, color, 1, o || {}, rotZ);
  LP.tri = function (B, a, b, c, col, want) {
    const ia = B.v(a, col, 0, 0, 0), ib = B.v(b, col, 0, 0, 0), ic = B.v(c, col, 0, 0, 0), n = V.cross(V.sub(b, a), V.sub(c, a));
    if (!want || V.dot(n, want) >= 0) B.t(ia, ib, ic); else B.t(ia, ic, ib);
  };

  // إنهاء الأصل بأوجه مسطحة: كل مثلث له ثلاثة رؤوس خاصة، متعامده متعامد الوجه، ولونه متوسط ألوان رؤوسه
  LP.finalize = function (id, parts, meta) {
    const out = AA.finalize(id, parts, meta);
    for (const k in out.parts) {
      const p = out.parts[k], I = p.indices, n = I.length;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), uv = new Float32Array(n * 2);
      const sw = new Float32Array(n), ph = new Float32Array(n), fl = new Float32Array(n), be = new Float32Array(n);
      const si = p.skinIndex ? new Uint16Array(n * 4) : null, sk = p.skinWeight ? new Float32Array(n * 4) : null;
      for (let t = 0; t < n; t += 3) {
        const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3, P = p.positions;
        const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], e2 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]], f = V.norm(V.cross(e1, e2));
        const avg = [0, 1, 2].map(j => (p.colors[a + j] + p.colors[b + j] + p.colors[c + j]) / 3);
        for (let q = 0; q < 3; q++) {
          const src = I[t + q], dst = t + q;
          for (let j = 0; j < 3; j++) { pos[dst * 3 + j] = P[src * 3 + j]; nor[dst * 3 + j] = isFinite(f[j]) ? f[j] : 0; col[dst * 3 + j] = avg[j]; }
          uv[dst * 2] = p.uvs[src * 2]; uv[dst * 2 + 1] = p.uvs[src * 2 + 1];
          sw[dst] = p.sway[src]; ph[dst] = p.phase[src]; fl[dst] = p.flutter[src]; be[dst] = p.bend[src];
          if (si) for (let j = 0; j < 4; j++) { si[dst * 4 + j] = p.skinIndex[src * 4 + j]; sk[dst * 4 + j] = p.skinWeight[src * 4 + j]; }
        }
      }
      const idx = new Uint32Array(n); for (let i = 0; i < n; i++) idx[i] = i;
      Object.assign(p, { positions: pos, normals: nor, colors: col, uvs: uv, sway: sw, phase: ph, flutter: fl, bend: be, indices: idx });
      if (si) { p.skinIndex = si; p.skinWeight = sk; }
      p.material = Object.assign({ flat: true }, p.material);
    }
    out.vertices = Object.values(out.parts).reduce((s, p) => s + p.positions.length / 3, 0);
    out.style = 'lowpoly';
    return out;
  };
  // تسجيل أصل لو-بولي بنفس معاملات الأصل الواقعي المقابل (من lp-schemas.js)، مع إضافات اختيارية
  LP.def = function (base, generate, extra) {
    const S = (AA.lpSchemas || {})[base] || {}, e = extra || {};
    AA.assets['lp_' + base] = Object.assign({ id: 'lp_' + base, name: S.name || base, nameEn: 'Low-poly ' + (S.nameEn || base), category: 'lowpoly', base,
      schema: S.schema || [], presets: S.presets || {}, clips: S.clips || undefined, generate }, e);
  };
  // كتلة أوراق عضوية: كرة أوجه بتشويه ثابت (من اتجاه الرأس) وتلوين بالارتفاع
  LP.clump = function (B, c, r, cols, rng, o) {
    o = o || {}; const j = o.jitter == null ? 0.22 : o.jitter, seed = rng() * 100, rr = Array.isArray(r) ? r : [r, r, r];
    const h = d => { const s = Math.sin(d[0] * 12.9898 + d[1] * 78.233 + d[2] * 37.719 + seed) * 43758.5453; return s - Math.floor(s); };
    LP.ico(B, c, rr, o.detail == null ? 1 : o.detail, d => { const t = AA.clamp(d[1] * 0.5 + 0.5 + (rng() - 0.5) * 0.25, 0, 0.999); return AA.vary(cols[Math.floor(t * cols.length)], rng, 0.08); },
      { shape: d => { const k = 1 + (h(d) - 0.5) * 2 * j; return [d[0] * k, d[1] * k * (d[1] < 0 ? (o.flatBottom == null ? 0.55 : o.flatBottom) : 1), d[2] * k]; }, sway: o.sway || 0, phase: o.phase || 0, flutter: o.flutter || 0, keep: o.keep });
  };
  // تكبير أصل كامل (الرؤوس، الهيكل، إزاحة الحركات، والبيانات) بمعامل k
  LP.scaleOut = function (out, k) {
    if (Math.abs(k - 1) < 1e-4) return out;
    for (const p of Object.values(out.parts)) { const P = p.positions; for (let i = 0; i < P.length; i++) P[i] *= k; }
    if (out.skeleton) for (const b of out.skeleton.bones) { b.head = b.head.map(v => v * k); b.tail = b.tail.map(v => v * k); }
    for (const c of Object.values(out.clips || {})) if (c.root) for (let i = 0; i < c.root.length; i++) c.root[i] *= k;
    const m = out.meta; for (const key of ['height', 'radius', 'walkSpeed']) if (typeof m[key] === 'number') m[key] *= k;
    if (m.collider) { for (const key of ['radius', 'height']) if (typeof m.collider[key] === 'number') m.collider[key] *= k; if (m.collider.size) m.collider.size = m.collider.size.map(v => v * k); }
    if (m.seat) m.seat = m.seat.map(v => v * k);
    return out;
  };
  // مادة مسطحة بلون الرؤوس فقط
  LP.mat = (kind, extra) => Object.assign({ kind, roughness: 0.92 }, extra || {});
})(typeof window !== 'undefined' ? window : globalThis);
