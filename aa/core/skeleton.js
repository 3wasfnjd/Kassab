// Aboden Assets — core/skeleton.js
// الهيكل العظمي والحركة، محايد للمحرك:
//   skeleton = { bones: [{ name, parent, head:[x,y,z], tail:[x,y,z] }] }   — وضع الراحة بدون دوران
//   clips    = { اسم: { duration, fps, loop, tracks: { اسم_عظمة: { rot: Float32Array(إطارات×4) كواترنيون } }, root: Float32Array(إطارات×3) } }
// + جسم عضوي (loft) بمقاطع على مسار، ربط تلقائي بالعظام، ووضعية محسوبة بالمعالج (للاختبار والصور).
(function (g) {
  'use strict';
  const AA = g.AA;
  const V = AA.v, clamp = AA.clamp, lerp = AA.lerp, smooth = AA.smooth;

  class Skeleton {
    constructor() { this.bones = []; this.index = {}; }
    add(name, parent, head, tail) {
      this.index[name] = this.bones.length;
      this.bones.push({ name, parent: parent == null ? -1 : this.index[parent], head, tail: tail || V.add(head, [0, 0.1, 0]) });
      return this.index[name];
    }
    id(name) { return this.index[name]; }
    toJSON() { return { bones: this.bones.map(b => ({ name: b.name, parent: b.parent, head: b.head, tail: b.tail })) }; }
  }
  AA.Skeleton = Skeleton;

  // بُعد نقطة عن قطعة عظمة
  function segDist(p, a, b) {
    const ab = V.sub(b, a), t = clamp(V.dot(V.sub(p, a), ab) / (V.dot(ab, ab) || 1), 0, 1);
    return V.len(V.sub(p, V.madd(a, ab, t)));
  }
  // ربط تلقائي: أقرب العظام (من قائمة مرشحة) بوزن عكسي ناعم
  AA.autoSkin = function (skel, names, sharp) {
    const ids = names.map(n => skel.id(n)), k = sharp || 4;
    return p => {
      const w = ids.map(i => { const b = skel.bones[i]; return [i, 1 / Math.pow(segDist(p, b.head, b.tail) + 0.015, k)]; });
      w.sort((a, b) => b[1] - a[1]);
      return w.slice(0, 3);
    };
  };

  // ---------- كواترنيون ----------
  const Q = AA.q = {
    euler(x, y, z) { // درجات، الترتيب XYZ
      const r = Math.PI / 360, cx = Math.cos(x * r), sx = Math.sin(x * r), cy = Math.cos(y * r), sy = Math.sin(y * r), cz = Math.cos(z * r), sz = Math.sin(z * r);
      return [sx * cy * cz + cx * sy * sz, cx * sy * cz - sx * cy * sz, cx * cy * sz + sx * sy * cz, cx * cy * cz - sx * sy * sz];
    },
    mul(a, b) {
      return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
        a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
    },
    rotate(q, v) {
      const [x, y, z, w] = q, ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
      return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
    }
  };

  // مقطع حركة من دالة: fn(t) -> { اسم_عظمة: [x,y,z] بالدرجات, move: [dx,dy,dz] إزاحة الجذر }
  AA.clip = function (skel, duration, fps, loop, fn) {
    const frames = Math.max(2, Math.round(duration * fps) + 1), tracks = {}, root = new Float32Array(frames * 3);
    for (const b of skel.bones) tracks[b.name] = { rot: new Float32Array(frames * 4) };
    for (let f = 0; f < frames; f++) {
      const t = f / (frames - 1) * duration, pose = fn(t);
      for (const b of skel.bones) {
        const e = pose[b.name] || [0, 0, 0], q = Q.euler(e[0], e[1], e[2]);
        tracks[b.name].rot.set(q, f * 4);
      }
      const r = pose.move || [0, 0, 0]; root.set(r, f * 3);
    }
    // أزل المسارات الثابتة لتخفيف البيانات
    for (const n in tracks) { const r = tracks[n].rot; let still = true; for (let i = 0; i < r.length && still; i += 4) still = Math.abs(r[i]) + Math.abs(r[i + 1]) + Math.abs(r[i + 2]) < 1e-6; if (still) delete tracks[n]; }
    return { duration, fps, loop: !!loop, frames, tracks, root };
  };

  /*
   مشية بقدم مثبّتة (بدون انزلاق): لكل رجل مسار للقدم — وقت الملامسة تثبت على الأرض وتتحرك للخلف بنفس سرعة المشي،
   ووقت الرفع ترتفع بقوس وتتقدم — ثم تُحسب زوايا العظام بحل عكسي (IK) في المستوى الجانبي مع حدود للمفاصل.
   o = { duration, speed, fps, extra(t)->pose (حركات ثانوية: رقبة، ذيل، ذراعان، إزاحة الجذر),
         legs: [{ chain:[عظام من الورك للأسفل], foot: عظمة القدم/الحافر (تبقى مستوية وقت الملامسة) أو null,
                  phase, duty, lift, limits:[[min,max]...], init:[...], footSwing }] }
  */
  AA.gaitClip = function (sk, o) {
    const T = o.duration, rotYZ = (v, a) => { const r = a * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [v[1] * c - v[2] * s, v[1] * s + v[2] * c]; }; // [y, z]
    const legs = o.legs.map(L => {
      const bones = L.chain.map(n => skel(n));
      const segs = bones.map((b, k) => { const end = k < bones.length - 1 ? bones[k + 1].head : (L.foot ? skel(L.foot).head : b.tail); return V.sub(end, b.head); });
      let eff = bones[0].head.slice(); for (const sg of segs) eff = V.add(eff, sg);
      return Object.assign({ hip: bones[0].head, segs, eff0: eff }, L);
    });
    function skel(n) { const b = sk.bones[sk.id(n)]; if (!b) throw new Error('bone ' + n); return b; }
    // خفض الجسم تلقائياً حتى تصل القدم لطرفي الخطوة بدون أن تنفرد الرجل تماماً
    let autoDrop = 0;
    for (const L of legs) {
      const len = L.segs.reduce((acc, sg) => acc + Math.hypot(sg[1], sg[2]), 0), S = o.speed * T * L.duty, h0 = L.hip[1] - L.eff0[1];
      const hmax = Math.sqrt(Math.max(0, (len * (o.reach || 0.975)) ** 2 - (S / 2 + Math.abs(L.zOff || 0)) ** 2));
      autoDrop = Math.min(autoDrop, hmax - h0);
    }
    return AA.clip(sk, T, o.fps || 30, true, t => {
      const pose = o.extra ? o.extra(t) : {}, mv0 = pose.move || [0, 0, 0], mv = [mv0[0], mv0[1] + autoDrop, mv0[2]]; pose.move = mv;
      for (const L of legs) {
        const u = ((t / T + L.phase) % 1 + 1) % 1, S = o.speed * T * L.duty;
        let dz, dy, sw = 0;
        if (u < L.duty) { dz = S / 2 - S * u / L.duty; dy = 0; }
        else { const s = (u - L.duty) / (1 - L.duty), e = 0.5 - 0.5 * Math.cos(Math.PI * s); dz = -S / 2 + S * e; dy = L.lift * Math.pow(Math.sin(Math.PI * s), 0.8); sw = Math.sin(Math.PI * s); }
        const hip = [L.hip[1] + mv[1], L.hip[2] + mv[2]], tgt = [L.eff0[1] + dy, L.eff0[2] + (L.zOff || 0) + dz]; // [y, z]
        const th = (L.init || L.segs.map(() => 0)).slice(), n = th.length;
        const chain = () => { const pts = [hip]; let w = 0, p = hip; for (let k = 0; k < n; k++) { w += th[k]; const d = rotYZ(L.segs[k], w); p = [p[0] + d[0], p[1] + d[1]]; pts.push(p); } return pts; };
        // بحث نمطي: يقلّل بُعد القدم عن الهدف مع تفضيل خفيف لوضعية ثني طبيعية (يتجنب فخ الرجل المستقيمة)
        const pref = L.pref || L.init || th.map(() => 0), lim = L.limits || th.map(() => [-180, 180]);
        if (L.prev) for (let k = 0; k < n; k++) th[k] = L.prev[k];
        const cost = () => { const e = chain()[n]; let c = ((e[0] - tgt[0]) ** 2 + (e[1] - tgt[1]) ** 2) * 1e4; for (let k = 0; k < n; k++) c += 2e-4 * (th[k] - (L.swingPref ? lerp(pref[k], L.swingPref[k], sw) : pref[k])) ** 2; return c; };
        let best = cost(), step = 12;
        while (step > 0.02) {
          let moved = false;
          for (let k = 0; k < n; k++) for (const sg of [1, -1]) {
            const old = th[k]; th[k] = clamp(old + sg * step, lim[k][0], lim[k][1]);
            const c = cost(); if (c < best - 1e-9) { best = c; moved = true; } else th[k] = old;
          }
          if (!moved) step *= 0.5;
        }
        L.prev = th.slice();
        L.chain.forEach((nm, k) => { const old = pose[nm] || [0, 0, 0]; pose[nm] = [th[k], old[1], old[2]]; });
        if (L.foot) { const tot = th.reduce((a, b) => a + b, 0), old = pose[L.foot] || [0, 0, 0]; pose[L.foot] = [-tot + (L.footSwing || 0) * sw, old[1], old[2]]; }
      }
      return pose;
    });
  };

  // ---------- وضعية بالمعالج (Linear blend skinning) ----------
  AA.boneMatrices = function (skeleton, clip, t) {
    const bones = skeleton.bones, out = [];
    let f = 0, k = 0;
    if (clip) { const x = (clip.loop ? (t % clip.duration + clip.duration) % clip.duration : clamp(t, 0, clip.duration)) / clip.duration * (clip.frames - 1); f = Math.min(clip.frames - 2, Math.floor(x)); k = x - f; }
    const rq = (name) => {
      const tr = clip && clip.tracks[name];
      if (!tr) return [0, 0, 0, 1];
      const a = tr.rot.subarray(f * 4, f * 4 + 4), b = tr.rot.subarray(f * 4 + 4, f * 4 + 8);
      const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], s = d < 0 ? -1 : 1;
      const q = [lerp(a[0], b[0] * s, k), lerp(a[1], b[1] * s, k), lerp(a[2], b[2] * s, k), lerp(a[3], b[3] * s, k)];
      const l = Math.hypot(...q); return q.map(v => v / l);
    };
    const rootOff = clip ? [lerp(clip.root[f * 3], clip.root[f * 3 + 3], k), lerp(clip.root[f * 3 + 1], clip.root[f * 3 + 4], k), lerp(clip.root[f * 3 + 2], clip.root[f * 3 + 5], k)] : [0, 0, 0];
    for (let i = 0; i < bones.length; i++) {
      const b = bones[i], q = rq(b.name);
      if (b.parent < 0) out.push({ q, t: V.add(b.head, rootOff) });
      else { const P = out[b.parent], local = V.sub(b.head, bones[b.parent].head); out.push({ q: Q.mul(P.q, q), t: V.add(P.t, Q.rotate(P.q, local)) }); }
    }
    return out;
  };
  AA.posePart = function (skeleton, part, mats) {
    const n = part.positions.length / 3, out = new Float32Array(n * 3), B = skeleton.bones;
    for (let i = 0; i < n; i++) {
      const p = [part.positions[i * 3], part.positions[i * 3 + 1], part.positions[i * 3 + 2]];
      let x = 0, y = 0, z = 0;
      for (let k = 0; k < 4; k++) {
        const w = part.skinWeight[i * 4 + k]; if (!w) continue;
        const bi = part.skinIndex[i * 4 + k], m = mats[bi], r = Q.rotate(m.q, V.sub(p, B[bi].head));
        x += (r[0] + m.t[0]) * w; y += (r[1] + m.t[1]) * w; z += (r[2] + m.t[2]) * w;
      }
      out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
    }
    return out;
  };

  /*
   جسم عضوي (loft): حلقات مقاطع على مسار
   o = { path:[[x,y,z]...], radius(k,a)->[rx,ry] أو رقم, sides, color(k,a,p), uvScale, capStart, capEnd, up:[x,y,z] }
   الزاوية a: 0 = جهة up، تدور حول المسار
  */
  AA.loft = function (B, o) {
    const pts = o.path, n = pts.length, sides = o.sides || 10, rings = [];
    let arc = 0;
    for (let k = 0; k < n; k++) {
      const a = pts[Math.max(0, k - 1)], b = pts[Math.min(n - 1, k + 1)], tan = V.norm(V.sub(b, a));
      let up = o.up ? o.up(k) : [0, 1, 0];
      up = V.norm(V.sub(up, V.scale(tan, V.dot(up, tan))));
      if (!isFinite(up[0])) up = AA.basis(tan)[1];
      const side = V.norm(V.cross(tan, up));
      if (k > 0) arc += V.len(V.sub(pts[k], pts[k - 1]));
      const ring = [];
      for (let s = 0; s <= sides; s++) {
        const ang = s / sides * Math.PI * 2;
        let r = o.radius(k / (n - 1), ang);
        if (typeof r === 'number') r = [r, r];
        const p = V.madd(V.madd(pts[k], up, Math.cos(ang) * r[1]), side, Math.sin(ang) * r[0]);
        const c = o.color ? o.color(k / (n - 1), ang, p) : [1, 1, 1];
        ring.push(B.v(p, c, 0, 0, 0, [s / sides * (o.uvU || 1), arc * (o.uvV || 1)]));
      }
      rings.push(ring);
    }
    for (let k = 0; k < n - 1; k++) for (let s = 0; s < sides; s++) {
      const a = rings[k][s], b = rings[k][s + 1], c = rings[k + 1][s + 1], d = rings[k + 1][s];
      B.t(a, b, c); B.t(a, c, d);
    }
    const cap = (k, flip) => {
      const ctr = B.v(pts[k], o.color ? o.color(k / (n - 1), 0, pts[k]) : [1, 1, 1], 0, 0, 0, [0.5, 0.5]);
      for (let s = 0; s < sides; s++) { if (flip) B.t(ctr, rings[k][s + 1], rings[k][s]); else B.t(ctr, rings[k][s], rings[k][s + 1]); }
    };
    if (o.capStart) cap(0, true);
    if (o.capEnd) cap(n - 1, false);
    return rings;
  };
  // منحنى بيزييه من نقاط تحكم إلى n نقطة
  AA.bezier = function (cp, n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      let t = i / (n - 1), pts = cp.map(p => p.slice());
      while (pts.length > 1) pts = pts.slice(1).map((p, j) => V.lerp(pts[j], p, t));
      out.push(pts[0]);
    }
    return out;
  };
})(typeof window !== 'undefined' ? window : globalThis);
