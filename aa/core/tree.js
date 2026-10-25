// Aboden Assets — core/tree.js
// مولّد شجرة متفرعة عام (سدر، طلح، أثل، ...). كل شجرة تغيّر الإعدادات فقط.
(function (g) {
  'use strict';
  const AA = g.AA;
  const V = AA.v;

  /*
   o = {
     trunks: [{base:[x,y,z], dir:[x,y,z]}],
     trunkLength, trunkRadius,
     levels,                 // عدد مستويات التفرع بعد الجذع
     children: [n0, n1, ...], // عدد الفروع لكل مستوى
     spread:   [a0, a1, ...], // زاوية الانفراج (راديان)
     upward:   [u0, u1, ...], // ميل نحو الأعلى لكل مستوى (سالب = نحو الأفق)
     flatten, flattenFrom,   // تسطيح الفروع العليا (الطلح)
     lenRatio, radRatio, taper,
     childStart,             // من أين تبدأ الفروع على الأب (0..1)
     gnarl,                  // تعرّج
     segs: [...], sides: [...],
     swayGain: [...],        // زيادة التمايل لكل مستوى
     bark(depth, t, k) -> color,
     onTip(point, dir, sway, depth, radius) // أوراق عند الأطراف
     tipPoints: [0.5, 1]
   }
  */
  AA.growTree = function (B, rng, o) {
    const tipPoints = o.tipPoints || [1];
    function along(pts, t) {
      const f = t * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f));
      return V.lerp(pts[i], pts[i + 1], f - i);
    }
    function alongN(arr, t) {
      const f = t * (arr.length - 1), i = Math.min(arr.length - 2, Math.floor(f));
      return arr[i] + (arr[i + 1] - arr[i]) * (f - i);
    }
    function branch(start, dir, len, rad, depth, sway0) {
      const segs = o.segs[Math.min(depth, o.segs.length - 1)];
      const sides = o.sides[Math.min(depth, o.sides.length - 1)];
      const gain = o.swayGain[Math.min(depth, o.swayGain.length - 1)];
      const up = o.upward[Math.min(depth, o.upward.length - 1)] || 0;
      const pts = [start], radii = [rad], sws = [sway0];
      let p = start, d = dir;
      const sl = len / segs;
      for (let i = 1; i <= segs; i++) {
        let nd = [d[0] + (rng() - 0.5) * o.gnarl, d[1] + (rng() - 0.5) * o.gnarl * 0.6, d[2] + (rng() - 0.5) * o.gnarl];
        nd = V.madd(nd, AA.UP, up * 0.35);
        if (o.flatten && depth >= o.flattenFrom) nd[1] *= (1 - o.flatten);
        if (o.ceiling && p[1] > o.ceiling) nd[1] = Math.min(nd[1], 0) * 0.3 - 0.02; // سقف مسطح (الطلح)
        if (o.gravity) nd = V.madd(nd, AA.DOWN, o.gravity[Math.min(depth, o.gravity.length - 1)] * i / segs);
        const floor = o.floor == null ? 0.6 : o.floor; // الفروع لا تنزل تحت هذا الارتفاع
        if (depth > 0 && p[1] < floor) nd[1] = Math.max(nd[1], 0.35);
        d = V.norm(nd);
        p = V.madd(p, d, sl);
        pts.push(p);
        radii.push(Math.max(0.004, rad * (1 - (1 - o.taper) * i / segs)));
        sws.push(sway0 + gain * i / segs);
      }
      const phase = rng() * 6.283;
      AA.tube(B.wood, pts, radii, sides, (i, k) => o.bark(depth, i / segs, k, rng), i => sws[i], phase, null, depth >= o.levels);

      if (depth < o.levels) {
        const n = o.children[Math.min(depth, o.children.length - 1)];
        const spread = o.spread[Math.min(depth, o.spread.length - 1)];
        const az0 = rng() * Math.PI * 2;
        for (let c = 0; c < n; c++) {
          const t = o.childStart + (1 - o.childStart) * AA.clamp((c + 0.3 + rng() * 0.6) / n, 0, 1);
          const pAt = along(pts, t);
          const dl = V.norm(V.sub(along(pts, Math.min(1, t + 0.05)), along(pts, Math.max(0, t - 0.05))));
          const [p1, p2] = AA.basis(dl);
          const az = az0 + c / n * Math.PI * 2 + (rng() - 0.5) * 0.9;
          const pp = V.norm(V.add(V.scale(p1, Math.cos(az)), V.scale(p2, Math.sin(az))));
          const leader = o.leader && c === n - 1;
          const a = (leader ? spread * 0.25 : spread) * (0.75 + rng() * 0.5);
          const cd = V.norm(V.add(V.scale(dl, Math.cos(a)), V.scale(pp, Math.sin(a))));
          const lr = Array.isArray(o.lenRatio) ? o.lenRatio[Math.min(depth, o.lenRatio.length - 1)] : o.lenRatio;
          const cl = len * lr * (leader ? 0.95 : (0.75 + rng() * 0.45));
          branch(pAt, cd, cl, alongN(radii, t) * o.radRatio, depth + 1, alongN(sws, t));
        }
      } else {
        for (const t of tipPoints) {
          const pAt = along(pts, t);
          const dl = V.norm(V.sub(along(pts, Math.min(1, t + 0.05)), along(pts, Math.max(0, t - 0.1))));
          o.onTip(pAt, dl, alongN(sws, t), depth, alongN(radii, t));
        }
      }
    }
    for (const tr of o.trunks) branch(tr.base, V.norm(tr.dir), tr.length || o.trunkLength, tr.radius || o.trunkRadius, 0, 0);
  };
})(typeof window !== 'undefined' ? window : globalThis);
