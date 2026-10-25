// Aboden Assets — plants/palm.js
// نخلة التمر + الفسيلة (نفس المولّد بإعدادات مختلفة)
(function (g) {
  'use strict';
  const AA = g.AA;
  const V = AA.v, hex = AA.hex, mixc = AA.mixc, vary = AA.vary, lerp = AA.lerp, clamp = AA.clamp;
  AA.assets = AA.assets || {};

  const Q = {
    high: { radial: 14, ringsPerM: 16, rachisSegs: 12, leaflets: 44, leafSegs: 3, strands: 20, perStrand: 9 },
    med:  { radial: 10, ringsPerM: 12, rachisSegs: 8,  leaflets: 28, leafSegs: 2, strands: 13, perStrand: 7 },
    low:  { radial: 7,  ringsPerM: 7,  rachisSegs: 5,  leaflets: 14, leafSegs: 1, strands: 7,  perStrand: 5 }
  };
  const STAGE = {
    khalal: { a: '#e7b52c', b: '#d9962a', rough: 0.42 },
    rutab:  { a: '#e0a93a', b: '#6b3a17', rough: 0.32 },
    tamr:   { a: '#4a2814', b: '#3a1e0f', rough: 0.62 }
  };

  function trunk(W, rng, q, p) {
    const H = p.height, leanAng = rng() * Math.PI * 2, ld = [Math.cos(leanAng), 0, Math.sin(leanAng)];
    const off = t => p.lean * H * 0.16 * t * t;
    const pt = t => [ld[0] * off(t), H * t, ld[2] * off(t)];
    const rows = Math.max(4, Math.round(Math.max(H, 0.6) * q.ringsPerM)), n = q.radial;
    const cDark = hex('#4a3a2a'), cMid = hex(p.young ? '#5e4a34' : '#7a6249'), cLight = hex(p.young ? '#8a6e4c' : '#a58a68'), cTop = hex(p.young ? '#5a4530' : '#8a6c45');
    const rings = [];
    for (let j = 0; j <= rows; j++) {
      const t = j / rows, y = t * H, c = pt(t);
      const tan = V.norm(V.sub(pt(Math.min(1, t + 0.01)), pt(Math.max(0, t - 0.01))));
      const s1 = V.norm([1 - tan[0] * tan[0], -tan[0] * tan[1], -tan[0] * tan[2]]);
      const s2 = V.norm(V.cross(tan, s1));
      const r = (0.19 + 0.14 * Math.exp(-y / 0.35) - 0.025 * t) * (p.young ? 1.1 : 1);
      const fade = AA.smooth(0.5, 2.2, y) + (p.young ? 1 : 0);
      const ring = [];
      for (let k = 0; k < n; k++) {
        const a = k / n * Math.PI * 2, stag = (k % 2) * 0.5;
        const saw = AA.frac(y * 3.1 + stag), bump = Math.pow(1 - saw, 1.6) * Math.min(1, fade);
        const rr = r * (1 + 0.17 * bump + (rng() - 0.5) * 0.03);
        const pos = V.madd(V.madd(c, s1, Math.cos(a) * rr), s2, Math.sin(a) * rr);
        let cc = mixc(cDark, cLight, 0.25 + bump * 0.75);
        cc = mixc(cc, cMid, 1 - Math.min(1, fade));
        if (t > 0.94) cc = mixc(cc, cTop, (t - 0.94) / 0.06);
        ring.push(W.v(pos, vary(cc, rng, 0.18), 0, 0, 0));
      }
      rings.push(ring);
    }
    for (let j = 0; j < rows; j++) for (let k = 0; k < n; k++) {
      const a = rings[j][k], b = rings[j][(k + 1) % n], c = rings[j + 1][(k + 1) % n], d = rings[j + 1][k];
      W.t(a, b, c); W.t(a, c, d);
    }
    const top = pt(1), cap = W.v(V.add(top, [0, 0.25, 0]), cTop, 0.05, 0, 0);
    for (let k = 0; k < n; k++) W.t(rings[rows][k], rings[rows][(k + 1) % n], cap);
    return V.add(top, [0, 0.12, 0]);
  }

  function frond(F, rng, q, base, theta, phi, L, droop, o) {
    const dirH = [Math.cos(theta), 0, Math.sin(theta)], cp = Math.cos(phi), sp = Math.sin(phi);
    const at = d => [base[0] + dirH[0] * d * cp, base[1] + d * sp - droop * d * d, base[2] + dirH[2] * d * cp];
    const tanAt = d => V.norm([dirH[0] * cp, sp - 2 * droop * d, dirH[2] * cp]);
    const phase = rng() * 6.28, flex = o.flex;
    const swayAt = s => flex * Math.pow(s, 1.6);
    const pts = [], radii = [];
    for (let i = 0; i <= q.rachisSegs; i++) { const s = i / q.rachisSegs; pts.push(at(s * L)); radii.push(0.012 + 0.075 * Math.exp(-s * 11)); }
    const rc = o.dry ? hex('#9a7a4c') : hex('#8f9a55');
    AA.tube(F, pts, radii, 4, () => vary(rc, rng, 0.12), i => swayAt(i / q.rachisSegs), phase, null, false);
    const n = q.leaflets, segs = q.leafSegs, Lmax = 0.17 * L, grav = o.dry ? 0.4 : 0.14, wBase = 0.026 * (L / 3.5);
    const darkC = hex('#2a3a18');
    for (const sgn of [-1, 1]) {
      for (let k = 0; k < n; k++) {
        const s = 0.06 + 0.94 * clamp((k + rng() * 0.7) / n, 0, 1);
        const d = s * L, ap = at(d), tan = tanAt(d);
        const side = V.norm(V.cross(tan, AA.UP)), upL = V.norm(V.cross(side, tan));
        const spine = s < 0.2;
        let len, w, cc;
        if (spine) { len = 0.13 + rng() * 0.1; w = 0.006; cc = o.dry ? hex('#7d6038') : hex('#a39a5a'); }
        else {
          len = Lmax * (0.35 + 0.65 * Math.sin(Math.PI * clamp((s - 0.2) / 0.8, 0, 1))) * (0.88 + rng() * 0.24);
          w = wBase * (0.85 + rng() * 0.3); cc = vary(o.color, rng, 0.22);
        }
        const upAmt = o.dry ? -0.5 : (spine ? 0.9 : 0.5 + rng() * 0.25);
        const dir = V.norm(V.madd(V.madd(V.scale(side, sgn), tan, o.dry ? 1.1 : 0.6), upL, upAmt));
        const wv = V.norm(V.cross(dir, upL)), nrm = V.norm(V.cross(wv, dir));
        const tip = o.dry ? o.color : mixc(cc, o.tipColor, 0.5);
        const rows = [];
        for (let m = 0; m <= segs; m++) {
          const u = m / segs;
          const pp = V.madd(V.madd(ap, dir, len * u), AA.DOWN, len * grav * u * u);
          const hw = w * Math.min(1, u * 4 + 0.35) * (1 - u * 0.88);
          const sw = swayAt(s), fl = spine ? 0 : u * (o.dry ? 0.3 : 1), ph = phase + k * 0.3;
          const c = mixc(cc, tip, u * 0.6);
          rows.push([
            F.v(V.madd(pp, wv, hw), c, sw, ph, fl),
            F.v(V.madd(pp, nrm, -hw * 0.45), mixc(c, darkC, 0.15), sw, ph, fl),
            F.v(V.madd(pp, wv, -hw), c, sw, ph, fl)
          ]);
        }
        for (let m = 0; m < segs; m++) {
          const [L0, C0, R0] = rows[m], [L1, C1, R1] = rows[m + 1];
          F.t(L0, C0, C1); F.t(L0, C1, L1); F.t(C0, R0, R1); F.t(C0, R1, C1);
        }
      }
    }
  }

  function bunch(F, D, rng, q, top, theta, stage) {
    const dirH = [Math.cos(theta), 0, Math.sin(theta)], phase = rng() * 6.28;
    const start = V.madd(V.madd(top, dirH, 0.18), AA.DOWN, 0.4);
    const reach = 0.8 + rng() * 0.4, drop = 0.9 + rng() * 0.4;
    const pts = [], radii = [];
    for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push(V.madd(V.madd(start, dirH, reach * Math.sin(u * 1.25)), AA.UP, 0.3 * u - drop * u * u)); radii.push(0.032 - 0.01 * u); }
    const stalkC = hex('#c8923a');
    AA.tube(F, pts, radii, 4, () => vary(stalkC, rng, 0.12), i => 0.12 + 0.35 * i / 8, phase, null, false);
    const E = pts[pts.length - 1], axis = V.norm(V.add(V.scale(dirH, 0.25), AA.DOWN));
    const [p1, p2] = AA.basis(axis);
    const st = STAGE[stage] || STAGE.rutab, cA = hex(st.a), cB = hex(st.b), strandC = hex('#d9a648');
    for (let s = 0; s < q.strands; s++) {
      const a = rng() * Math.PI * 2, spread = 0.15 + rng() * 0.35;
      const dS = V.norm(V.add(axis, V.add(V.scale(p1, Math.cos(a) * spread), V.scale(p2, Math.sin(a) * spread))));
      const len = 0.45 + rng() * 0.3;
      AA.tube(F, [E, V.madd(E, dS, len * 0.5), V.madd(E, dS, len)], [0.007, 0.005, 0.003], 3, () => strandC, i => 0.5 + 0.15 * i, phase, null, false);
      for (let d = 0; d < q.perStrand; d++) {
        const tt = 0.22 + 0.78 * (d + rng() * 0.5) / q.perStrand, ang = rng() * Math.PI * 2;
        const ax = V.norm(V.add(dS, V.add(V.scale(p1, (rng() - 0.5) * 0.5), V.scale(p2, (rng() - 0.5) * 0.5))));
        const [b1, b2] = AA.basis(ax);
        const center = V.madd(V.madd(V.madd(E, dS, len * tt), b1, Math.cos(ang) * 0.026), b2, Math.sin(ang) * 0.026);
        const rx = 0.019 + rng() * 0.004, ry = 0.03 + rng() * 0.007;
        const thr = stage === 'rutab' ? rng() * 1.6 - 0.7 : 0;
        const dc = vary(cA, rng, 0.18), dc2 = vary(cB, rng, 0.18);
        AA.blob(D, center, V.scale(b1, rx), V.scale(ax, ry), V.scale(b2, rx),
          lp => stage === 'rutab' ? (lp[1] > thr ? dc2 : dc) : mixc(dc, dc2, (lp[1] + 1) / 2 * 0.6),
          0.55 + 0.25 * tt, phase, 0.12, rng, stage === 'tamr' ? 0.18 : 0.03);
      }
    }
  }

  function generate(p, quality) {
    const q = Q[quality] || Q.med, rng = AA.rng(p.seed);
    const W = new AA.Builder(), F = new AA.Builder(), D = new AA.Builder();
    const top = trunk(W, rng, q, p);
    const young = hex('#97a64e'), mature = hex('#4d6a2c'), old = hex('#6c7547'), tipC = hex('#b9b46a');
    const N = p.fronds, phiTop = p.upright ? 1.35 : 1.25, phiLow = p.upright ? 0.35 : -0.18;
    for (let i = 0; i < N; i++) {
      const f = N > 1 ? i / (N - 1) : 0;
      const theta = i * 2.39996 + rng() * 0.25, phi = lerp(phiTop, phiLow, Math.pow(f, 0.9)) + (rng() - 0.5) * 0.12;
      const L = p.frondLen * (0.72 + 0.28 * Math.min(1, f * 3)) * (0.9 + rng() * 0.2);
      const droop = lerp(0.015, 0.11, f) * (3.6 / p.frondLen) * (p.upright ? 0.5 : 1);
      const base = V.madd(V.madd(top, [Math.cos(theta), 0, Math.sin(theta)], 0.1), AA.DOWN, 0.05 + 0.25 * f);
      const c = f < 0.25 ? mixc(young, mature, f / 0.25) : mixc(mature, old, (f - 0.25) / 0.75);
      frond(F, rng, q, base, theta, phi, L, droop, { color: c, tipColor: tipC, flex: lerp(0.7, 1.05, f), dry: false });
    }
    const dryA = hex('#b8945e'), dryB = hex('#8b6a40');
    for (let i = 0; i < p.dry; i++) {
      const f = p.dry > 1 ? i / (p.dry - 1) : 0;
      // الفسيلة: السعف اليابس يرقد على الأرض بدل أن يتدلى
      const theta = i * 2.39996 + 1.1 + rng() * 0.4;
      const phi = (p.young ? lerp(0.05, -0.22, f) : lerp(-0.55, -1.3, f)) + (rng() - 0.5) * 0.15;
      const base = V.madd(V.madd(top, [Math.cos(theta), 0, Math.sin(theta)], 0.14), AA.DOWN, p.young ? 0.1 + 0.1 * f : 0.35 + 0.45 * f);
      frond(F, rng, q, base, theta, phi, p.frondLen * 0.9, 0.02, { color: mixc(dryA, dryB, rng()), tipColor: dryB, flex: 0.25, dry: true });
    }
    for (let b = 0; b < p.bunches; b++) bunch(F, D, rng, q, top, b / Math.max(1, p.bunches) * Math.PI * 2 + rng() * 0.6, p.stage);
    return AA.finalize(p.__id || 'palm', {
      wood: { builder: W, material: { kind: 'bark', roughness: 0.95 } },
      leaves: { builder: F, material: { kind: 'leaf', roughness: 0.72, doubleSided: true } },
      fruit: { builder: D, material: { kind: 'fruit', roughness: (STAGE[p.stage] || STAGE.rutab).rough } }
    }, {
      height: Math.max(p.height, 0.5), stiffness: p.young ? 0.0 : 0.03,
      radius: p.frondLen * 0.9,
      collider: { type: 'cylinder', radius: p.young ? 0.4 : 0.3, height: Math.max(p.height, 0.6) }
    });
  }

  AA.assets.palm = {
    id: 'palm', name: 'نخلة', nameEn: 'Date palm', category: 'plants',
    schema: [
      { key: 'height', label: 'طول الجذع', min: 2, max: 14, step: 0.5, def: 8, unit: 'م' },
      { key: 'fronds', label: 'السعف الأخضر', min: 10, max: 44, step: 1, def: 28 },
      { key: 'dry', label: 'السعف اليابس', min: 0, max: 16, step: 1, def: 7 },
      { key: 'frondLen', label: 'طول السعفة', min: 2, max: 5, step: 0.1, def: 3.6, unit: 'م' },
      { key: 'lean', label: 'ميلان الجذع', min: 0, max: 1, step: 0.05, def: 0.35, pct: true },
      { key: 'bunches', label: 'العذوق', min: 0, max: 7, step: 1, def: 4 },
      { key: 'stage', label: 'مرحلة التمر', type: 'enum', options: [['khalal', 'خلال'], ['rutab', 'رطب'], ['tamr', 'تمر']], def: 'rutab' }
    ],
    presets: {
      'نخلة مزرعة': { height: 7, fronds: 30, dry: 4, lean: 0.15, bunches: 5 },
      'نخلة عالية مائلة': { height: 12, fronds: 24, dry: 9, lean: 0.8, bunches: 3 },
      'نخلة مهملة': { height: 9, fronds: 18, dry: 16, lean: 0.4, bunches: 0 }
    },
    generate
  };

  AA.assets.fasila = {
    id: 'fasila', name: 'فسيلة', nameEn: 'Palm offshoot', category: 'plants',
    schema: [
      { key: 'fronds', label: 'عدد السعف', min: 6, max: 24, step: 1, def: 14 },
      { key: 'frondLen', label: 'طول السعفة', min: 0.8, max: 2.6, step: 0.1, def: 1.8, unit: 'م' },
      { key: 'dry', label: 'السعف اليابس', min: 0, max: 6, step: 1, def: 2 }
    ],
    presets: { 'فسيلة صغيرة': { fronds: 9, frondLen: 1.1, dry: 1 }, 'فسيلة كبيرة': { fronds: 20, frondLen: 2.4, dry: 4 } },
    generate: (p, q) => generate(Object.assign({}, p, { __id: 'fasila', height: 0.35, lean: 0, bunches: 0, stage: 'rutab', upright: true, young: true }), q)
  };
})(typeof window !== 'undefined' ? window : globalThis);
