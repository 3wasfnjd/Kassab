// Aboden Assets — plants/shrubs.js  (v0.3)
// شجيرات وأعشاب البر: العرفج (شجيرة كروية كثيفة) والثمام (قُصّة عشب كثيفة بسيقان قصبية)
(function (g) {
  'use strict';
  const AA = g.AA;
  const V = AA.v, hex = AA.hex, mixc = AA.mixc, vary = AA.vary, lerp = AA.lerp;

  // ---------------- العرفج ----------------
  // ساق رئيسية من المركز إلى منتصف الكتلة، ثم أغصان دقيقة إلى سطح قبة بيضاوية
  const QF = {
    high: { stems: 12, twigs: 14, leaves: 14, segs: 3, sides: 4 },
    med:  { stems: 10, twigs: 10, leaves: 10, segs: 2, sides: 3 },
    low:  { stems: 7,  twigs: 7,  leaves: 5,  segs: 2, sides: 3 }
  };
  function curve(a, b, bulge, segs) {
    const m = V.add(V.lerp(a, b, 0.5), bulge), pts = [];
    for (let i = 0; i <= segs; i++) { const t = i / segs; pts.push(V.add(V.scale(V.lerp(a, m, t), 1 - t), V.scale(V.lerp(m, b, t), t))); }
    return pts;
  }
  function arfaj(p, quality) {
    const q = QF[quality] || QF.med, rng = AA.rng(p.seed), S = p.size;
    const Rx = S * 0.8 * (0.9 + rng() * 0.2), Ry = S, Rz = S * 0.8 * (0.9 + rng() * 0.2);
    const W = new AA.Builder(), L = new AA.Builder(), Fl = new AA.Builder();
    const woodA = hex('#857a63'), woodB = hex('#9a9478'), leafA = hex('#6f7d55'), leafB = hex('#8f9a6b'), leafTip = hex('#aab28a');
    const yel = hex('#f0c22a'), ctr = hex('#c8861c');
    const center = [0, Ry * 0.45, 0], radii = [Rx, Ry * 0.6, Rz];
    const nS = Math.max(3, Math.round(q.stems * p.density));
    for (let s = 0; s < nS; s++) {
      const az = s / nS * 6.283 + (rng() - 0.5) * 0.6, el = lerp(0.35, 1.3, rng());
      const sd = [Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)];
      const base = [Math.cos(az) * 0.04 * S, 0, Math.sin(az) * 0.04 * S];
      const mid = [sd[0] * Rx * 0.45, Math.max(0.12 * S, sd[1] * Ry * 0.45), sd[2] * Rz * 0.45];
      const ph = rng() * 6.28;
      const sp = curve(base, mid, [0, 0.05 * S, 0], q.segs + 1);
      AA.tube(W, sp, sp.map((_, i) => lerp(0.018, 0.01, i / q.segs) * S), q.sides, () => vary(woodA, rng, 0.15), i => 0.1 * i / q.segs, ph, null, false);
      for (let t = 0; t < q.twigs; t++) {
        // هدف على سطح القبة قريب من اتجاه الساق
        let td = V.norm(V.add(sd, V.scale(AA.inSphere(rng), 1.1)));
        if (td[1] < 0.18) td[1] = 0.18 + rng() * 0.2;
        td = V.norm(td);
        const k = 0.85 + rng() * 0.2;
        const tgt = [td[0] * Rx * k, td[1] * Ry * k, td[2] * Rz * k];
        const tp = curve(mid, tgt, V.scale(td, 0.05 * S), q.segs);
        const tw = vary(mixc(woodA, woodB, rng()), rng, 0.15);
        AA.tube(W, tp, tp.map((_, i) => lerp(0.008, 0.003, i / q.segs) * S), 3, () => tw, i => 0.1 + 0.35 * i / q.segs, ph, null, true);
        for (let l = 0; l < q.leaves; l++) {
          const u = 0.3 + 0.7 * (l + rng()) / q.leaves;
          const f = u * q.segs, j = Math.min(q.segs - 1, Math.floor(f));
          const lp = V.lerp(tp[j], tp[j + 1], f - j);
          const ld = V.norm(V.add(td, V.scale(AA.inSphere(rng), 1.2)));
          const n = V.norm(V.add(AA.inSphere(rng), [0, 0.8, 0]));
          const c = vary(mixc(leafA, leafB, rng()), rng, 0.2);
          AA.leaf(L, lp, ld, n, 0.075 * S, 0.022 * S, c, mixc(c, leafTip, 0.5), 0.1 + 0.35 * u, ph, 0.8, 0.02);
        }
        if (p.bloom && tgt[1] > Ry * 0.3 && rng() < 0.8) { // زهرة: قرص أصفر بمركز برتقالي
          const fr = 0.028 * S, up = V.norm(V.add(td, [0, 0.8, 0]));
          const [a, b] = AA.basis(up);
          const c = V.madd(tgt, up, 0.01 * S);
          AA.blob(Fl, c, V.scale(a, fr), V.scale(up, fr * 0.45), V.scale(b, fr), lp => lp[1] > 0.6 ? ctr : vary(yel, rng, 0.08), 0.45, ph, 0.15, rng, 0.1, quality === 'low');
        }
      }
    }
    AA.crownAO(L, 0, center, radii, 0.45, 0.15);
    AA.crownAO(W, 0, center, radii, 0.5, 0);
    return AA.finalize('arfaj', {
      wood: { builder: W, material: { kind: 'bark', roughness: 0.9 } },
      leaves: { builder: L, material: { kind: 'leaf', roughness: 0.85, doubleSided: true } },
      fruit: { builder: Fl, material: { kind: 'flower', roughness: 0.6 } }
    }, { height: S, stiffness: 0, radius: Math.max(Rx, Rz), collider: { type: 'sphere', radius: S * 0.6 } });
  }

  AA.assets.arfaj = {
    id: 'arfaj', name: 'عرفج', nameEn: 'Arfaj (Rhanterium)', category: 'plants',
    schema: [
      { key: 'size', label: 'الحجم', min: 0.3, max: 1.3, step: 0.05, def: 0.75, unit: 'م' },
      { key: 'density', label: 'الكثافة', min: 0.4, max: 1.6, step: 0.1, def: 1, pct: true },
      { key: 'bloom', label: 'مزهر (الربيع)', type: 'bool', def: true }
    ],
    presets: { 'عرفج الربيع': { size: 0.9, bloom: true, density: 1.3 }, 'عرفج الصيف': { size: 0.7, bloom: false, density: 0.8 } },
    generate: arfaj
  };

  // ---------------- الثمام ----------------
  // قُصّة كثيفة: سيقان قصبية متعقدة ترتفع ثم تنحني للخارج، أوراق قصيرة عند العقد، وقش يابس عند القاعدة
  const QG = { high: { k: 1, segs: 5, sides: 3 }, med: { k: 0.65, segs: 4, sides: 3 }, low: { k: 0.35, segs: 3, sides: 0 } };
  function thumam(p, quality) {
    const q = QG[quality] || QG.med, rng = AA.rng(p.seed), S = p.size;
    const W = new AA.Builder(), L = new AA.Builder();
    const stemG = hex('#8c9a68'), stemD = hex('#c9b27c'), node = hex('#d8d0a8'), leafG = hex('#7d8b55'), tipG = hex('#aab37c');
    const straw = hex('#c8ad78'), strawTip = hex('#e0d0a4'), panC = hex('#c9b98e');
    const stemC = mixc(stemG, stemD, p.dryness), leafC = mixc(leafG, stemD, p.dryness);
    const n = Math.max(10, Math.round(p.blades * q.k));
    for (let i = 0; i < n; i++) {
      const r = Math.sqrt(rng()), az = rng() * 6.283;
      const out = [Math.cos(az), 0, Math.sin(az)];
      const base = [out[0] * r * 0.13 * S, 0, out[2] * r * 0.13 * S];
      const el = lerp(1.45, 0.85, r) + (rng() - 0.5) * 0.2;
      let d = [out[0] * Math.cos(el), Math.sin(el), out[2] * Math.cos(el)];
      const len = S * (0.65 + rng() * 0.45) * (1 - 0.25 * r);
      const pts = [base]; let pp = base;
      for (let s = 1; s <= q.segs; s++) {
        d = V.norm(V.madd(V.madd(d, out, 0.12), AA.DOWN, 0.06 * s / q.segs));
        pp = V.madd(pp, d, len / q.segs); pts.push(pp);
      }
      const ph = rng() * 6.28, cc = vary(stemC, rng, 0.18);
      if (q.sides) AA.tube(W, pts, pts.map((_, k) => lerp(0.007, 0.003, k / q.segs) * S), q.sides, (k) => (k % 2 ? mixc(cc, node, 0.5) : cc), k => 0.7 * Math.pow(k / q.segs, 1.5), ph, k => 0.2 * k / q.segs, true);
      else AA.ribbon(W, base, V.norm(V.sub(pts[q.segs], base)), len, 0.012 * S, q.segs, 0.1, cc, mixc(cc, node, 0.4), 0, ph, 0.3, rng, { swayGain: 0.7 });
      // أوراق قصيرة عند العقد
      for (let k = 1; k < q.segs; k += 2) {
        const nd = V.norm(V.add(V.scale(out, 0.9), [0, 0.5, 0]));
        AA.ribbon(L, pts[k], nd, 0.16 * S * (0.7 + rng() * 0.6), 0.014 * S, 2, 0.35, vary(leafC, rng, 0.15), tipG, 0.7 * Math.pow(k / q.segs, 1.5), ph, 0.6, rng, { swayGain: 0.2, twist: 0.8 });
      }
      // عنقود البذور
      if (rng() < 0.35) {
        const tip = pts[q.segs];
        for (let b = 0; b < 4; b++) {
          const bd = V.norm(V.add(V.add(d, V.scale(AA.inSphere(rng), 0.8)), [0, -0.2, 0]));
          AA.ribbon(L, tip, bd, 0.07 * S, 0.008 * S, 1, 0.2, panC, strawTip, 0.7, ph, 0.8, rng, {});
        }
      }
    }
    // قش يابس متكدّس عند القاعدة
    const ns = Math.round(n * 0.3);
    for (let i = 0; i < ns; i++) {
      const az = rng() * 6.283, out = [Math.cos(az), 0, Math.sin(az)], el = lerp(0.05, 0.5, rng());
      const d = [out[0] * Math.cos(el), Math.sin(el), out[2] * Math.cos(el)];
      AA.ribbon(L, [out[0] * 0.08 * S, 0.01, out[2] * 0.08 * S], d, S * (0.25 + rng() * 0.3), 0.012 * S, 2, 0.3, vary(straw, rng, 0.2), strawTip, 0, rng() * 6.28, 0.1, rng, { twist: 1.5 });
    }
    const center = [0, S * 0.35, 0], radii = [S * 0.55, S * 0.55, S * 0.55];
    AA.crownAO(W, 0, center, radii, 0.55, 0);
    AA.crownAO(L, 0, center, radii, 0.55, 0);
    return AA.finalize('thumam', {
      wood: { builder: W, material: { kind: 'leaf', roughness: 0.7, doubleSided: true } },
      leaves: { builder: L, material: { kind: 'leaf', roughness: 0.85, doubleSided: true } }
    }, { height: S, stiffness: 0, radius: S * 0.7, collider: { type: 'none' } });
  }

  AA.assets.thumam = {
    id: 'thumam', name: 'ثمام', nameEn: 'Thumam (Panicum turgidum)', category: 'plants',
    schema: [
      { key: 'size', label: 'الطول', min: 0.3, max: 1.4, step: 0.05, def: 0.8, unit: 'م' },
      { key: 'blades', label: 'عدد السيقان', min: 40, max: 220, step: 10, def: 140 },
      { key: 'dryness', label: 'اليباس', min: 0, max: 1, step: 0.05, def: 0.3, pct: true }
    ],
    presets: { 'ثمام أخضر': { dryness: 0.05, blades: 170 }, 'ثمام يابس': { dryness: 0.9, blades: 110 } },
    generate: thumam
  };
})(typeof window !== 'undefined' ? window : globalThis);
