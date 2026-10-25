// Aboden Assets — architecture/house.js
// بيت نجدي كامل من طقم الطين: جدران بفتحات حقيقية، باب نجدي، نوافذ، مثلثات تهوية، مرازيم ومزراب،
// سطح بدروة وشُرَف، غرفة سطح اختيارية، وبرج اختياري. كل البيت في 5 أوامر رسم فقط.
(function (g) {
  'use strict';
  const AA = g.AA;
  const V = AA.v, lerp = AA.lerp;
  const STEP = { high: 0.18, med: 0.3, low: 0.5 };

  function rotd(o, d) { if (!o.rot) return d; const c = Math.cos(o.rot), s = Math.sin(o.rot); return [d[0] * c + d[2] * s, d[1], -d[0] * s + d[2] * c]; }

  // ضلفة باب نجدي (مثل najdi.js)
  function doorLeaf(P, o, x0, w, h, z) {
    const oo = { at: AA.xform([x0, 0, z], o), rot: o.rot || 0 }, t = 0.06;
    for (const [sz, n] of [[t / 2, 1], [-t / 2, -1]]) {
      const ps = [[0, 0, sz], [w, 0, sz], [w, h, sz], [0, h, sz]];
      const uv = n > 0 ? [[0, 0], [1, 0], [1, 1], [0, 1]] : [[1, 0], [0, 0], [0, 1], [1, 1]];
      AA.quad(P.door, ps.map(p => AA.xform(p, oo)), uv, [[1, 1, 1]], rotd(oo, [0, 0, n]));
    }
  }

  // شُرفة مدرّجة صغيرة: قاعدة، درجة، ورأس مدوّر — لوح واحد خفيف (نحو 40 مثلثاً)
  const CREN = (() => {
    const half = [[0.21, 0], [0.21, 0.14], [0.14, 0.14], [0.14, 0.27]];
    for (let k = 1; k <= 4; k++) { const a = k / 4 * Math.PI / 2; half.push([0.09 * Math.cos(a), 0.27 + 0.05 + 0.1 * Math.sin(a)]); }
    half.splice(4, 0, [0.09, 0.27], [0.09, 0.32]);
    const right = half, left = half.slice().reverse().map(([x, y]) => [-x, y]);
    return right.concat(left.slice(1));
  })();
  function crenel(P, o, d, k) { k = k || 1; AA.profileSlab(P, o, CREN.map(([x, y]) => [x * k, y * k]), d, 2, [1.04, 1.04, 1.04], true); }
  // شُرفة الزاوية: شُرفتان متقاطعتان بحجم أكبر فوق قاعدة مربعة
  function cornerCrenel(P, at, k) {
    AA.mudSolid(P, { sx: 0.62, sz: 0.62, h: 0.16, r: 0.05, topRound: 0.0, step: 0.4, disp: 0.006, seed: 11, tile: 4, at });
    const top = V.add(at, [0, 0.15, 0]);
    crenel(P, { at: top, rot: 0 }, 0.3, k); crenel(P, { at: top, rot: Math.PI / 2 }, 0.3, k);
  }

  // جدار واحد من البيت مع كل تفاصيله. side: {L, at, rot, door, windows:[[x, floor]], beams, spout}
  function facade(P, p, q, rng, side, H, roofY) {
    const T = p.thickness, st = STEP[q];
    const ops = [], flat = [];
    if (side.door) ops.push({ x0: side.door.x - side.door.w / 2, x1: side.door.x + side.door.w / 2, y0: 0, y1: side.door.h });
    for (const [x, f] of side.windows) {
      const y = f * p.floorH + 1.45, w = 0.42, h = 0.52;
      ops.push({ x0: x - w / 2, x1: x + w / 2, y0: y - h / 2, y1: y + h / 2, blind: true });
    }
    const vents = [];
    if (p.vents) for (let x = -side.L / 2 + 0.55; x < side.L / 2 - 0.5; x += 0.34) vents.push([x, roofY + 0.22, 0.12]);
    for (const [x, f] of side.windows) if (rng() < 0.5) for (let k = 0; k < 3; k++) vents.push([x + (k - 1) * 0.16, f * p.floorH + 2.0, 0.09]);
    vents.forEach(([x, y, s]) => flat.push({ x, y: y + s / 2, r: s }));
    const o = { L: side.L, H, T, taper: 0.03, step: st, seed: side.seed, openings: ops, flat, at: side.at, rot: side.rot,
      top: x => H + 0.03 * Math.sin(x * 1.9 + side.seed), backMinY: roofY - 0.05, r: 0.06 };
    const r = AA.mudPanel(P, o);
    for (const [x, y, s] of vents) AA.triVent(P, o, x, y, s, r.faceZ(y));
    if (side.door) {
      const d = side.door;
      AA.box(P.wood, [d.x, d.h + 0.08, r.faceZ(d.h) - 0.04], [d.w + 0.5, 0.15, 0.12], [0.9, 0.9, 0.9], 0.6, o);
      doorLeaf(P, o, d.x - d.w / 2 + 0.01, d.w - 0.02, d.h - 0.01, 0);
    }
    // شبابيك خشب صغيرة على بعض النوافذ
    for (const [x, f] of side.windows) if (rng() < 0.45) {
      const y = f * p.floorH + 1.45, z = r.faceZ(y) - 0.02;
      AA.box(P.wood, [x, y - 0.3, z + 0.04], [0.62, 0.06, 0.12], [0.85, 0.85, 0.85], 0.5, o);
    }
    // المرازيم: رؤوس جذوع السقف بين الأدوار، والمزراب
    if (side.beams) for (let f = 1; f <= p.floors; f++) {
      const y = f * p.floorH - 0.12, n = Math.max(2, Math.round(side.L / 0.65));
      for (let k = 0; k < n; k++) {
        const x = -side.L / 2 + (k + 0.5) * side.L / n;
        if (Math.abs(x) > side.L / 2 - 0.4) continue;
        if (side.spout && f === p.floors && k === Math.floor(n * 0.7)) {
          AA.box(P.wood, [x, roofY + 0.05, r.faceZ(roofY) + 0.4], [0.2, 0.12, 0.85], [0.9, 0.9, 0.9], 0.5, o);
          continue;
        }
        AA.box(P.wood, [x, y + 0.02 * Math.sin(k * 2.1), r.faceZ(y) + 0.12], [0.12 + rng() * 0.03, 0.12 + rng() * 0.03, 0.26], [0.85, 0.85, 0.85], 0.4, o);
      }
    }
    // الشُّرَف المثلثة على الدروة
    // الشُّرَف: درجتان من الطين ورأس ناعم مدوّر (بدل المثلثات الحادة)
    if (p.crenels) {
      const span = side.L - 1.4, n = Math.max(1, Math.round(span / (q === 'low' ? 1.6 : 0.8)));
      for (let k = 0; k <= n; k++) {
        const x = -span / 2 + k * span / n;
        if (Math.abs(x) > side.L / 2 - 0.65) continue;
        crenel(P, { at: AA.xform([x, H - 0.02, 0], o), rot: o.rot }, T * 0.62);
      }
    }
    return r;
  }

  // كتلة مربعة من أربعة جدران + سطح (تُستعمل للبيت ولغرفة السطح)
  function block(P, p, q, rng, b) {
    const { W, D, y0, H, roofY, T, sides } = b, cx = b.cx || 0, cz = b.cz || 0;
    const list = [
      { L: W, at: [cx, y0, cz + D / 2 - T / 2], rot: 0, key: 'front' },
      { L: W, at: [cx, y0, cz - D / 2 + T / 2], rot: Math.PI, key: 'back' },
      { L: D - T * 0.9, at: [cx + W / 2 - T / 2, y0, cz], rot: Math.PI / 2, key: 'right' },
      { L: D - T * 0.9, at: [cx - W / 2 + T / 2, y0, cz], rot: -Math.PI / 2, key: 'left' }
    ];
    const pp = Object.assign({}, p, { thickness: T });
    for (const s of list) facade(P, pp, q, rng, Object.assign({ seed: Math.floor(rng() * 1e6), windows: [] }, s, sides[s.key] || {}), H, roofY);
    // السطح
    const y = y0 + roofY, hw = W / 2 - T * 0.6, hd = D / 2 - T * 0.6;
    const ps = [[cx - hw, y, cz + hd], [cx + hw, y, cz + hd], [cx + hw, y, cz - hd], [cx - hw, y, cz - hd]];
    AA.quad(P.top, ps, ps.map(q2 => [q2[0] / 2, q2[2] / 2]), [[0.95, 0.95, 0.95]], [0, 1, 0]);
    // أبراج الزوايا الصغيرة على الدروة
    // شُرف الزوايا: أكبر ومتقاطعة (مثل شرفة الزاوية في المرجع p6)
    if (p.crenels) for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]])
      cornerCrenel(P, [cx + sx * (W / 2 - 0.3), y0 + H - 0.03, cz + sz * (D / 2 - 0.3)], 1.45);
  }

  function house(p, q) {
    const rng = AA.rng(p.seed);
    const P = { wall: new AA.Builder(), top: new AA.Builder(), dark: new AA.Builder(), wood: new AA.Builder(), door: new AA.Builder() };
    const W = p.width, D = p.depth, F = Math.round(p.floors), roofY = F * p.floorH, H = roofY + p.parapet, T = p.thickness;
    const wins = (L, floors, skipX) => {
      const out = [];
      for (let f = 0; f < floors; f++) {
        const n = Math.max(1, Math.floor((L - 1.2) / 2.2));
        for (let k = 0; k < n; k++) {
          const x = -L / 2 + 0.9 + (k + 0.5) * (L - 1.8) / n + (rng() - 0.5) * 0.4;
          if (skipX != null && f === 0 && Math.abs(x - skipX) < 1.2) continue;
          if (rng() < 0.8) out.push([x, f]);
        }
      }
      return out;
    };
    const doorX = (rng() - 0.5) * (W - 3);
    const sides = {
      front: { door: { x: doorX, w: p.doorWidth, h: 2.15 }, windows: wins(W, F, doorX), beams: true, spout: true },
      back: { windows: wins(W, F).filter(() => rng() < 0.5) },
      right: { windows: wins(D - T, F), beams: true },
      left: { windows: wins(D - T, F).filter(() => rng() < 0.7) }
    };
    block(P, p, q, rng, { W, D, y0: 0, H, roofY, T, sides });
    if (p.roofRoom) {
      const rw = Math.max(2.8, W * 0.38), rd = Math.max(2.8, D * 0.42), rh = p.floorH * 0.85;
      const cx = (rng() < 0.5 ? -1 : 1) * (W / 2 - rw / 2 - 0.2), cz = -(D / 2 - rd / 2 - 0.2);
      block(P, p, q, rng, { W: rw, D: rd, y0: roofY, H: rh + p.parapet * 0.6, roofY: rh, T: 0.38, cx, cz,
        sides: { front: { door: { x: 0, w: 0.9, h: 1.9 }, windows: [] }, right: { windows: [[0, 0]] }, left: { windows: [[0, 0]] } } });
    }
    if (p.tower) {
      const tw = 2.6, th = H + 3.2, at = [W / 2 - tw / 2 + 0.25, 0, -(D / 2 - tw / 2 + 0.25)];
      const horn = (x, z) => 0.6 * AA.smooth(0.5, 0.95, Math.abs(x) / (tw / 2)) * AA.smooth(0.5, 0.95, Math.abs(z) / (tw / 2));
      const sol = AA.mudSolid(P, { sx: tw, sz: tw, h: th, r: 0.25, taperX: 0.28, taperZ: 0.28, topRound: 0.1, horn, disp: 0.025, step: STEP[q], seed: p.seed + 3, tile: 4, at });
      for (let f = 0; f < 4; f++) {
        const o = { at, rot: f * Math.PI / 2 }, yv = th - 0.6;
        for (let x = -0.7; x <= 0.71; x += 0.35) AA.triVent(P, o, x, yv, 0.13, sol.faceAt(yv) + 0.03);
      }
    }
    return AA.finalize('najdi_house', {
      wall: { builder: P.wall, material: { kind: 'mud', texture: p.worn ? 'mud_wall_worn' : 'mud_wall', roughness: 0.96 } },
      top:  { builder: P.top,  material: { kind: 'mud', texture: 'mud_top', roughness: 0.95 } },
      dark: { builder: P.dark, material: { kind: 'dark', roughness: 1, color: [0.07, 0.045, 0.03] } },
      wood: { builder: P.wood, material: { kind: 'wood', texture: 'wood', roughness: 0.85 } },
      door: { builder: P.door, material: { kind: 'wood', texture: 'najdi_door', roughness: 0.8 } }
    }, { stiffness: 0, height: p.tower ? H + 3.8 : H, radius: Math.max(W, D) / 2,
      collider: { type: 'box', size: [W, H, D] }, door: { x: doorX, z: D / 2, width: p.doorWidth } });
  }

  AA.najdiCrenel = crenel; AA.najdiCornerCrenel = cornerCrenel; AA.najdiDoorLeaf = doorLeaf;
  AA.assets.najdi_house = {
    id: 'najdi_house', name: 'بيت نجدي', nameEn: 'Najdi house', category: 'architecture', ref: 'house',
    schema: [
      { key: 'width', label: 'العرض (الواجهة)', min: 5, max: 16, step: 0.5, def: 9, unit: 'م' },
      { key: 'depth', label: 'العمق', min: 5, max: 16, step: 0.5, def: 8, unit: 'م' },
      { key: 'floors', label: 'الأدوار', min: 1, max: 2, step: 1, def: 1 },
      { key: 'floorH', label: 'ارتفاع الدور', min: 2.8, max: 4, step: 0.1, def: 3.2, unit: 'م' },
      { key: 'parapet', label: 'ارتفاع الدروة', min: 0.5, max: 1.4, step: 0.05, def: 0.85, unit: 'م' },
      { key: 'thickness', label: 'سماكة الجدار', min: 0.35, max: 0.8, step: 0.05, def: 0.5, unit: 'م' },
      { key: 'doorWidth', label: 'عرض الباب', min: 0.9, max: 1.8, step: 0.05, def: 1.15, unit: 'م' },
      { key: 'crenels', label: 'الشُّرَف', type: 'bool', def: true },
      { key: 'vents', label: 'مثلثات التهوية', type: 'bool', def: true },
      { key: 'roofRoom', label: 'غرفة سطح', type: 'bool', def: false },
      { key: 'tower', label: 'برج', type: 'bool', def: false },
      { key: 'worn', label: 'طوب ظاهر أكثر', type: 'bool', def: false }
    ],
    presets: {
      'بيت صغير': { width: 6.5, depth: 6, floors: 1 },
      'بيت دورين': { width: 10, depth: 9, floors: 2, roofRoom: false },
      'بيت كبير ببرج': { width: 13, depth: 11, floors: 2, roofRoom: true, tower: true },
      'بيت قديم': { width: 8, depth: 7, worn: true, crenels: false }
    },
    generate: house
  };
})(typeof window !== 'undefined' ? window : globalThis);
