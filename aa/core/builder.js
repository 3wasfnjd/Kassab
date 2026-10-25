// Aboden Assets — core/builder.js
// أداة البناء: تجمع النقاط والألوان والمثلثات وأوزان الرياح، وتُخرج بيانات خام
// يقرأها أي محرك (Three.js / Godot ArrayMesh / Roblox EditableMesh).
//
// كل نقطة تحمل:
//   position  [x,y,z] بالمتر، Y للأعلى، الأصل عند قاعدة الأصل على الأرض
//   color     sRGB 0..1
//   sway      وزن تمايل الفرع/السعفة مع الريح (0 = ثابت)
//   phase     طور الحركة حتى لا تتحرك الأجزاء معاً
//   flutter   رفرفة الأوراق السريعة
//   bend      انحناء الجذع كاملاً (يُحسب في finalize من الارتفاع)
(function (g) {
  'use strict';
  const AA = g.AA;
  const V = AA.v;

  class Builder {
    constructor() { this.pos = []; this.col = []; this.sway = []; this.phase = []; this.flut = []; this.idx = []; this.uv = []; this.sk = []; this.skinFn = null; this.skinned = false; }
    // ربط النقاط بالعظام: skinFn(p) -> [[عظمة, وزن], ...] (حتى 4)، أو setSkin لقيمة ثابتة
    setSkin(list) { this.skinFn = list ? () => list : null; }
    v(p, c, sway, phase, flut, uv) {
      if (this.skinFn) {
        this.skinned = true;
        const w = this.skinFn(p).slice().sort((a, b) => b[1] - a[1]).slice(0, 4);
        let sum = 0; for (const [, x] of w) sum += x;
        for (let k = 0; k < 4; k++) { this.sk.push(w[k] ? w[k][0] : 0); }
        for (let k = 0; k < 4; k++) { this.sk.push(w[k] ? w[k][1] / (sum || 1) : (k === 0 && !w.length ? 1 : 0)); }
      } else this.sk.push(0, 0, 0, 0, 1, 0, 0, 0);
      this.pos.push(p[0], p[1], p[2]); this.col.push(c[0], c[1], c[2]);
      this.uv.push(uv ? uv[0] : 0, uv ? uv[1] : 0);
      this.sway.push(sway || 0); this.phase.push(phase || 0); this.flut.push(flut || 0);
      return this.pos.length / 3 - 1;
    }
    t(a, b, c) { this.idx.push(a, b, c); }
    get vertexCount() { return this.pos.length / 3; }
    get triangles() { return this.idx.length / 3; }
  }
  AA.Builder = Builder;

  // أنبوب على مسار نقاط بنصف قطر لكل حلقة
  AA.tube = function (B, pts, radii, sides, colorFn, swayFn, phase, flutFn, capEnd) {
    const rings = [];
    let prevS = null;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const tan = V.norm(V.sub(b, a));
      let s;
      if (prevS) { // نقل الإطار لتفادي الالتواء
        s = V.sub(prevS, V.scale(tan, V.dot(prevS, tan)));
        if (V.len(s) < 1e-4) s = AA.basis(tan)[0];
        s = V.norm(s);
      } else s = AA.basis(tan)[0];
      prevS = s;
      const u = V.norm(V.cross(s, tan));
      const ring = [];
      for (let k = 0; k < sides; k++) {
        const ang = k / sides * Math.PI * 2;
        const p = V.madd(V.madd(pts[i], s, Math.cos(ang) * radii[i]), u, Math.sin(ang) * radii[i]);
        ring.push(B.v(p, colorFn(i, k), swayFn(i), phase, flutFn ? flutFn(i) : 0));
      }
      rings.push(ring);
    }
    for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < sides; k++) {
      const a = rings[i][k], b = rings[i][(k + 1) % sides], c = rings[i + 1][(k + 1) % sides], d = rings[i + 1][k];
      B.t(a, c, b); B.t(a, d, c);
    }
    if (capEnd) {
      const last = pts.length - 1;
      const tip = B.v(pts[last], colorFn(last, 0), swayFn(last), phase, flutFn ? flutFn(last) : 0);
      for (let k = 0; k < sides; k++) B.t(rings[last][(k + 1) % sides], rings[last][k], tip);
    }
  };

  // كرة منخفضة (عشرون وجهاً) — تمر، ثمار، كتل أوراق داخلية، أزهار
  const ICO = (function () {
    const t = (1 + Math.sqrt(5)) / 2;
    const vs = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(V.norm);
    const fs = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    return { vs, fs };
  })();
  const OCTA = { vs: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], fs: [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]] };

  // ax/ay/az متجهات المحاور مضروبة بأنصاف الأقطار
  AA.blob = function (B, c, ax, ay, az, colorFn, sway, phase, flut, rng, jitter, low) {
    const S = low ? OCTA : ICO, ids = [];
    for (const p of S.vs) {
      const k = 1 + (rng ? (rng() - 0.5) * (jitter || 0) : 0);
      const q = V.madd(V.madd(V.madd(c, ax, p[0] * k), ay, p[1] * k), az, p[2] * k);
      ids.push(B.v(q, colorFn(p), sway, phase, flut));
    }
    for (const f of S.fs) B.t(ids[f[0]], ids[f[1]], ids[f[2]]);
  };

  // عنقود أوراق: أوراق معينية حول مركز، وجهها باتجاه n
  AA.leafCluster = function (B, c, n, size, count, color, tipColor, sway, phase, flut, rng, o) {
    o = o || {};
    const elong = o.elong || 2.4, cup = o.cup == null ? 0.12 : o.cup, tilt = o.tilt == null ? 0.6 : o.tilt;
    const [t1, t2] = AA.basis(n);
    for (let i = 0; i < count; i++) {
      const a = i / count * Math.PI * 2 + rng() * 0.8;
      const dir = V.norm(V.madd(V.add(V.scale(t1, Math.cos(a)), V.scale(t2, Math.sin(a))), n, (rng() - 0.5) * tilt + (o.lift || 0)));
      const w = V.norm(V.cross(n, dir));
      const L = size * (0.7 + rng() * 0.6), W = L / elong;
      const base = V.madd(c, dir, L * 0.1);
      const mid = V.madd(V.madd(base, dir, L * 0.5), n, L * cup);
      const tip = V.madd(V.madd(base, dir, L), AA.DOWN, L * (o.droop || 0));
      const cc = AA.vary(color, rng, 0.25), ct = AA.mixc(cc, tipColor, 0.5);
      const b0 = B.v(base, cc, sway, phase, flut * 0.3);
      const m1 = B.v(V.madd(mid, w, W * 0.5), cc, sway, phase, flut);
      const tp = B.v(tip, ct, sway, phase, flut);
      const m2 = B.v(V.madd(mid, w, -W * 0.5), cc, sway, phase, flut);
      B.t(b0, m1, tp); B.t(b0, tp, m2);
    }
  };

  // شريط رفيع (عشب، أغصان الأثل المتدلية): يبدأ عند p باتجاه dir ثم ينحني للأسفل
  AA.ribbon = function (B, p, dir, length, width, segs, droop, color, tipColor, sway, phase, flut, rng, o) {
    o = o || {};
    let side = V.cross(dir, AA.UP);
    side = V.len(side) < 1e-4 ? [1, 0, 0] : V.norm(side);
    if (o.twist) { const a = (rng() - 0.5) * o.twist; side = V.norm(V.madd(V.scale(side, Math.cos(a)), AA.UP, Math.sin(a))); }
    let prev = null;
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const q = V.madd(V.madd(p, dir, length * u), AA.DOWN, droop * length * u * u);
      const hw = width * 0.5 * (o.taper === false ? 1 : (1 - u * 0.92));
      const c = AA.mixc(color, tipColor, u);
      const fl = flut * u, sw = sway + (o.swayGain || 0) * u;
      const a = B.v(V.madd(q, side, hw), c, sw, phase, fl);
      const b = B.v(V.madd(q, side, -hw), c, sw, phase, fl);
      if (prev) { B.t(prev[0], prev[1], b); B.t(prev[0], b, a); }
      prev = [a, b];
    }
  };

  // ورقة واحدة: معيّن مطوي قليلاً (مثلثان)
  AA.leaf = function (B, base, dir, nrm, L, W, color, tipColor, sway, phase, flut, fold) {
    const w = V.norm(V.cross(nrm, dir));
    const mid = V.madd(V.madd(base, dir, L * 0.45), nrm, L * (fold == null ? 0.08 : fold));
    const tip = V.madd(base, dir, L);
    const b0 = B.v(base, color, sway, phase, flut * 0.3);
    const m1 = B.v(V.madd(mid, w, W * 0.5), color, sway, phase, flut);
    const tp = B.v(tip, tipColor, sway, phase, flut);
    const m2 = B.v(V.madd(mid, w, -W * 0.5), color, sway, phase, flut);
    B.t(b0, m1, tp); B.t(b0, tp, m2);
  };

  // جسم دوراني (دلة، فنجال، جرة): مقطع [[y, r], ...] من الأسفل، يمكن أن يصعد من الخارج وينزل من الداخل
  // o = { sides, color(y, ang, i), uvU, uvV, capBottom, capTop, sx, sz, at }
  AA.lathe = function (B, prof, o) {
    o = o || {};
    const at = o.at || [0, 0, 0], sides = o.sides || 16, sx = o.sx || 1, sz = o.sz || 1, rings = [];
    let arc = 0;
    for (let i = 0; i < prof.length; i++) {
      if (i) arc += Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]);
      const [y, r] = prof[i], ring = [];
      for (let j = 0; j <= sides; j++) {
        const a = j / sides * Math.PI * 2;
        ring.push(B.v([at[0] + Math.sin(a) * r * sx, at[1] + y, at[2] + Math.cos(a) * r * sz], o.color ? o.color(y, a, i) : [1, 1, 1], 0, 0, 0, [j / sides * (o.uvU || 1), arc * (o.uvV || 4)]));
      }
      rings.push(ring);
    }
    for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < sides; j++) {
      const a = rings[i][j], b = rings[i][j + 1], c = rings[i + 1][j + 1], d = rings[i + 1][j];
      B.t(a, b, c); B.t(a, c, d);
    }
    const cap = (i, up) => {
      const c0 = B.v([at[0], at[1] + prof[i][0], at[2]], o.color ? o.color(prof[i][0], 0, i) : [1, 1, 1], 0, 0, 0, [0.5, 0.5]);
      for (let j = 0; j < sides; j++) { if (up) B.t(c0, rings[i][j], rings[i][j + 1]); else B.t(c0, rings[i][j + 1], rings[i][j]); }
    };
    if (o.capBottom) cap(0, false);
    if (o.capTop) cap(prof.length - 1, true);
    return rings;
  };

  // صندوق بحواف مدوّرة (مخدة، مسند، فرشة): نصف قطر التدوير r، وانتفاخ اختياري لوسط الأوجه
  // o = { seg, bulge, color(p, n), tile, at, rot }
  AA.roundBox = function (B, c, size, r, o) {
    o = o || {};
    const h = size.map(v => v / 2), seg = o.seg || 3, tile = o.tile || 1, bulge = o.bulge || 0;
    r = Math.min(r, h[0] - 1e-4, h[1] - 1e-4, h[2] - 1e-4);
    const samples = hh => { // كثيف عند الحواف المدوّرة
      const out = [];
      for (let k = 0; k <= seg; k++) out.push(-hh + r * (1 - Math.cos(k / seg * Math.PI / 2)));
      const inner = Math.max(1, Math.round((hh - r) * 2 / Math.max(o.spacing || 0.3, r * 2)));
      for (let k = 1; k < inner; k++) out.push(-hh + r + (hh - r) * 2 * k / inner);
      for (let k = seg; k >= 0; k--) out.push(hh - r * (1 - Math.cos(k / seg * Math.PI / 2)));
      return out;
    };
    const S = [samples(h[0]), samples(h[1]), samples(h[2])];
    const faces = [[0, 1, 1, 2], [0, -1, 2, 1], [1, 1, 2, 0], [1, -1, 0, 2], [2, 1, 0, 1], [2, -1, 1, 0]]; // [محور، إشارة، محور U، محور V] بحيث U×V = الاتجاه
    const xf = p => o.at || o.rot ? AA.xform(p, { at: o.at, rot: o.rot }) : p;
    for (const [ax, sg, ua, va] of faces) {
      const us = S[ua], vs = S[va], ids = [];
      for (let i = 0; i < us.length; i++) {
        ids.push([]);
        for (let j = 0; j < vs.length; j++) {
          const P = [0, 0, 0]; P[ax] = sg * h[ax]; P[ua] = us[i]; P[va] = vs[j];
          const inn = P.map((v, k) => clampAbs(v, h[k] - r)), d = V.sub(P, inn), dl = V.len(d) || 1;
          let q = V.madd(inn, d, r / dl);
          const nf = [0, 0, 0]; nf[ax] = sg;
          const bu = bulge * (1 - Math.pow(us[i] / h[ua], 2)) * (1 - Math.pow(vs[j] / h[va], 2));
          if (bu) q = V.madd(q, nf, bu);
          const wq = V.add(c, q);
          ids[i].push(B.v(xf(wq), o.color ? o.color(q, nf) : [1, 1, 1], 0, 0, 0, [(us[i] + h[ua]) / tile, (vs[j] + h[va]) / tile]));
        }
      }
      for (let i = 0; i < us.length - 1; i++) for (let j = 0; j < vs.length - 1; j++) { B.t(ids[i][j], ids[i + 1][j], ids[i + 1][j + 1]); B.t(ids[i][j], ids[i + 1][j + 1], ids[i][j + 1]); }
    }
  };
  const clampAbs = (v, m) => Math.max(-m, Math.min(m, v));

  // ظل داخلي للتاج (Ambient occlusion مخبوز في الألوان):
  // كل ما كانت النقطة أعمق داخل التاج كانت أغمق — هذا ما يعطي إحساس الكثافة والعمق
  AA.crownAO = function (B, from, center, radii, minShade, topLift) {
    for (let i = from; i < B.vertexCount; i++) {
      const x = (B.pos[i * 3] - center[0]) / radii[0], y = (B.pos[i * 3 + 1] - center[1]) / radii[1], z = (B.pos[i * 3 + 2] - center[2]) / radii[2];
      const d = Math.sqrt(x * x + y * y + z * z);
      let s = AA.lerp(minShade, 1, AA.smooth(0.15, 1.0, d)) * (1 + (topLift || 0) * AA.clamp(y, -1, 1));
      s = AA.clamp(s, 0, 1.15);
      for (let k = 0; k < 3; k++) B.col[i * 3 + k] = AA.clamp(B.col[i * 3 + k] * s, 0, 1);
    }
  };
  // حدود مجموعة نقاط (لحساب التاج)
  AA.bounds = function (pts) {
    const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (const p of pts) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]); }
    return { center: V.scale(V.add(mn, mx), 0.5), radii: [Math.max(0.2, (mx[0] - mn[0]) / 2), Math.max(0.2, (mx[1] - mn[1]) / 2), Math.max(0.2, (mx[2] - mn[2]) / 2)] };
  };

  // متعامدات (Normals) — يحسبها الكود حتى لا نعتمد على المحرك
  AA.computeNormals = function (pos, idx) {
    const n = new Float32Array(pos.length);
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
      const e1 = [pos[b] - pos[a], pos[b + 1] - pos[a + 1], pos[b + 2] - pos[a + 2]];
      const e2 = [pos[c] - pos[a], pos[c + 1] - pos[a + 1], pos[c + 2] - pos[a + 2]];
      const f = V.cross(e1, e2);
      for (const k of [a, b, c]) { n[k] += f[0]; n[k + 1] += f[1]; n[k + 2] += f[2]; }
    }
    for (let i = 0; i < n.length; i += 3) {
      const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
      n[i] /= l; n[i + 1] /= l; n[i + 2] /= l;
    }
    return n;
  };

  // يحوّل الأجزاء إلى أصل نهائي موحّد الشكل
  // parts: { name: { builder, material:{kind, roughness, doubleSided} } }
  // meta : { height, stiffness, radius, collider }
  AA.finalize = function (id, parts, meta) {
    const out = { id, parts: {}, meta, triangles: 0, vertices: 0 };
    const H = Math.max(0.2, meta.height), stiff = meta.stiffness == null ? 0.03 : meta.stiffness;
    for (const name in parts) {
      const { builder: B, material } = parts[name];
      if (!B || B.triangles === 0) continue;
      const positions = new Float32Array(B.pos);
      const indices = new Uint32Array(B.idx);
      const bend = new Float32Array(B.vertexCount);
      for (let i = 0; i < bend.length; i++) {
        const h = AA.clamp(positions[i * 3 + 1] / H, 0, 1.3);
        bend[i] = stiff * H * h * h;
      }
      out.parts[name] = {
        positions, indices,
        normals: AA.computeNormals(positions, indices),
        colors: new Float32Array(B.col),
        sway: new Float32Array(B.sway), phase: new Float32Array(B.phase),
        flutter: new Float32Array(B.flut), bend,
        uvs: new Float32Array(B.uv),
        material
      };
      if (meta.skeleton) {
        const n = B.vertexCount, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
        for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) { si[i * 4 + k] = B.sk[i * 8 + k]; sw[i * 4 + k] = B.sk[i * 8 + 4 + k]; }
        out.parts[name].skinIndex = si; out.parts[name].skinWeight = sw;
      }
      out.triangles += B.triangles; out.vertices += B.vertexCount;
    }
    if (meta.skeleton) { out.skeleton = meta.skeleton; out.clips = meta.clips || {}; delete meta.skeleton; delete meta.clips; }
    return out;
  };
})(typeof window !== 'undefined' ? window : globalThis);
