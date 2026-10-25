// Aboden Assets — core/math.js
// رياضيات محايدة للمحرك: عشوائية ثابتة، متجهات كمصفوفات [x,y,z]، ألوان sRGB بين 0 و 1.
// لا يعتمد على أي محرك — يُترجم كما هو إلى GDScript أو Luau.
(function (g) {
  'use strict';
  const AA = g.AA = g.AA || {};

  // عشوائية ثابتة: نفس البذرة = نفس الشكل في كل محرك
  AA.rng = function (seed) {
    let a = seed | 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  AA.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  AA.lerp = (a, b, t) => a + (b - a) * t;
  AA.smooth = (a, b, x) => { const t = AA.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  AA.frac = x => x - Math.floor(x);

  const v = AA.v = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    madd: (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: a => Math.hypot(a[0], a[1], a[2]),
    norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
  };
  AA.UP = [0, 1, 0];
  AA.DOWN = [0, -1, 0];

  // قاعدة متعامدة حول اتجاه
  AA.basis = function (d) {
    const ref = Math.abs(d[1]) < 0.92 ? [0, 1, 0] : [1, 0, 0];
    const s = v.norm(v.cross(d, ref));
    const u = v.norm(v.cross(s, d));
    return [s, u];
  };
  // نقطة عشوائية داخل كرة
  AA.inSphere = function (rng) {
    for (;;) {
      const p = [rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1];
      if (p[0] * p[0] + p[1] * p[1] + p[2] * p[2] <= 1) return p;
    }
  };

  // ألوان sRGB (0..1). المحرك يحوّلها لخطي إن احتاج.
  AA.hex = function (h) {
    const n = parseInt(h.replace('#', ''), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };
  AA.mixc = (a, b, t) => { t = AA.clamp(t, 0, 1); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
  AA.vary = (c, rng, amt) => { const k = 1 + (rng() - 0.5) * amt; return [AA.clamp(c[0] * k, 0, 1), AA.clamp(c[1] * k, 0, 1), AA.clamp(c[2] * k, 0, 1)]; };

  // جودة: عالية / متوسطة / خفيفة
  AA.QUALITY = ['high', 'med', 'low'];

  // سجل الأصول + الإعدادات الافتراضية من مخطط كل أصل
  AA.assets = AA.assets || {};
  AA.params = function (asset, over) {
    const p = { seed: 1 };
    for (const s of asset.schema) p[s.key] = s.def;
    return Object.assign(p, over || {});
  };
})(typeof window !== 'undefined' ? window : globalThis);
