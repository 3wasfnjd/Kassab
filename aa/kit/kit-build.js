// Aboden Assets — kit/kit-build.js — قطع البناء: بلاطة أرضية، قطعة جدار (سادة/شباك/باب)، عمود، درج، درابزين وسياج، سقف جملوني، منصة، جزيرة عائمة
// القطع بمقاس شبكة ثابت (المتر) حتى تتركّب مع بعض: البلاطة والجدار عرضهما من 1 إلى 4 م، والجدار سماكته 0.2 وارتفاعه 3 م افتراضياً.
(function (g) {
  'use strict';
  const AA = g.AA, K = AA.kit, V = AA.v, lerp = AA.lerp;

  // ---------- أدوات مشتركة: شجرة صغيرة وصخرة (تستخدمها الجزر وحزمة الطبيعة) ----------
  K.treeInto = function (P, at, h, kind, rng, q) {
    const T = P('wood'), Lf = P('leaves'), n = K.sides(q, 6), cols = kind === 'pine' ? ['pine2', 'pine', 'pine'] : kind === 'autumn' ? ['#c8642c', '#e0903a', '#e8b84a'] : ['leaf3', 'leaf', 'leaf2'];
    const tc = kind === 'birch' ? 'offwhite' : 'trunk';
    if (kind === 'pine') {
      K.cyl(T, at, V.add(at, [0, h * 0.35, 0]), 0.09 * h / 4, 0.07 * h / 4, n, 'bark');
      for (let k = 0; k < 3; k++) { const y0 = h * (0.25 + k * 0.22), r = h * (0.3 - k * 0.07); K.cyl(Lf, V.add(at, [0, y0, 0]), V.add(at, [0, y0 + h * 0.4, 0]), r, 0.0, n + 1, AA.vary(K.c(cols[k % 3]), rng, 0.08), null, { sway: p => 0.04 * (p[1] - at[1]) / h, phase: rng() * 6 }); }
    } else {
      K.cyl(T, at, V.add(at, [0, h * 0.55, 0]), 0.1 * h / 4, 0.07 * h / 4, n, tc);
      const c = V.add(at, [0, h * 0.68, 0]), r = h * (kind === 'tall' ? 0.22 : 0.32);
      AA.lp.clump(Lf, c, [r, r * (kind === 'tall' ? 1.8 : 0.95), r], cols.map(K.c), rng, { jitter: 0.25, sway: 0.05, phase: rng() * 6, detail: q === 'low' ? 0 : 1 });
      if (kind !== 'tall') for (let k = 0; k < 2; k++) { const a = rng() * 6.28; AA.lp.clump(Lf, V.add(c, [Math.cos(a) * r * 0.75, -r * 0.25, Math.sin(a) * r * 0.75]), r * 0.6, cols.map(K.c), rng, { jitter: 0.25, sway: 0.05, phase: rng() * 6, detail: 0 }); }
    }
  };
  K.rockInto = function (B, at, r, rng, cols) {
    cols = (cols || ['rock2', 'rock', 'rockLight']).map(K.c);
    AA.lp.clump(B, V.add(at, [0, r * 0.35, 0]), [r, r * 0.7, r * 0.85], cols, rng, { jitter: 0.3, detail: 0, flatBottom: 0.3 });
  };

  // ---------- بلاطة أرضية ----------
  const FLOORS = [['grass', 'عشب'], ['wood', 'باركيه'], ['tiles', 'بلاط'], ['marble', 'رخام'], ['concrete', 'خرسانة'], ['asphalt', 'أسفلت'], ['sand', 'رمل'], ['stone', 'حجر'], ['water', 'ماء']];
  function floorInto(P, w, d, th, mat, rng, q) {
    const top = th;
    if (mat === 'grass') { K.box(P('ground'), [0, top / 2 - 0.04, 0], [w, top - 0.08, d], 'soil'); const n = Math.max(1, Math.round(w)), m = Math.max(1, Math.round(d)); for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) K.box(P('grass'), [-w / 2 + (i + 0.5) * w / n, top - 0.04, -d / 2 + (j + 0.5) * d / m], [w / n, 0.08, d / m], AA.vary(K.c((i + j) % 2 ? 'grass' : 'grass2'), rng, 0.06)); return; }
    if (mat === 'water') { K.box(P('stone'), [0, top * 0.25, 0], [w, top * 0.5, d], 'rock2'); K.box(P('water'), [0, top * 0.75, 0], [w, top * 0.5, d], 'water'); return; }
    const base = { wood: 'woodDark', tiles: 'concreteDark', marble: 'greyLight', concrete: 'concreteDark', asphalt: 'asphalt', sand: 'sand2', stone: 'rock2' }[mat];
    K.box(P('stone'), [0, (top - 0.03) / 2, 0], [w, top - 0.03, d], base);
    const B = P(mat === 'wood' ? 'wood' : mat === 'sand' ? 'ground' : 'stone'), y = top - 0.015;
    if (mat === 'wood') { const n = Math.max(2, Math.round(w / 0.2)); for (let i = 0; i < n; i++) { const off = (i % 3) * 0.33 * d; K.box(B, [-w / 2 + (i + 0.5) * w / n, y, 0], [w / n - 0.008, 0.03, d - 0.004], AA.vary(K.c(i % 2 ? 'wood' : 'woodLight'), rng, 0.1)); if (off) K.box(P('dark'), [-w / 2 + (i + 0.5) * w / n, y + 0.0175, -d / 2 + off], [w / n - 0.02, 0.005, 0.006], 'woodDark'); } }
    else if (mat === 'tiles' || mat === 'marble' || mat === 'stone') { const s = mat === 'stone' ? 0.33 : mat === 'marble' ? 0.8 : 0.5, n = Math.max(1, Math.round(w / s)), m = Math.max(1, Math.round(d / s)); for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const c = mat === 'tiles' ? ((i + j) % 2 ? 'offwhite' : 'greyLight') : mat === 'marble' ? AA.vary(K.c((i * 7 + j * 3) % 4 ? 'white' : 'cream'), rng, 0.03) : AA.vary(K.c(['rock', 'rockLight', 'rock2'][(i * 5 + j * 3) % 3]), rng, 0.06); K.box(B, [-w / 2 + (i + 0.5) * w / n, y + (mat === 'stone' ? (rng() - 0.5) * 0.01 : 0), -d / 2 + (j + 0.5) * d / m], [w / n - (mat === 'stone' ? 0.04 : 0.01), 0.03, d / m - (mat === 'stone' ? 0.04 : 0.01)], c); } }
    else if (mat === 'concrete') { const n = Math.max(1, Math.round(w / 2)), m = Math.max(1, Math.round(d / 2)); for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) K.box(B, [-w / 2 + (i + 0.5) * w / n, y, -d / 2 + (j + 0.5) * d / m], [w / n - 0.02, 0.03, d / m - 0.02], AA.vary(K.c('concrete'), rng, 0.04)); }
    else K.box(B, [0, y, 0], [w, 0.03, d], mat === 'asphalt' ? 'asphalt2' : 'sand');
  }
  K.floorInto = floorInto;
  K.def('floor_tile', { name: 'بلاطة أرضية', nameEn: 'Floor tile', group: 'build',
    schema: [{ key: 'material', label: 'الخامة', type: 'enum', options: FLOORS, def: 'grass' }, { key: 'width', label: 'العرض', min: 1, max: 4, step: 1, def: 2, unit: 'م' }, { key: 'depth', label: 'العمق', min: 1, max: 4, step: 1, def: 2, unit: 'م' }, { key: 'thickness', label: 'السماكة', min: 0.1, max: 1, step: 0.05, def: 0.2, unit: 'م' }],
    presets: { 'باركيه': { material: 'wood' }, 'بلاط مربعات': { material: 'tiles' }, 'رخام': { material: 'marble' }, 'حجر': { material: 'stone' }, 'ماء': { material: 'water' } },
    generate: (p, q) => { const P = K.parts(); floorInto(P, p.width, p.depth, p.thickness, p.material, AA.rng(p.seed), q); return K.done('floor_tile', P, { collider: K.boxCol(p.width, p.thickness, p.depth), snap: { grid: 1, top: p.thickness } }); } });

  // ---------- قطعة جدار ----------
  const WALLS = [['plaster', 'لياسة'], ['brick', 'طوب'], ['concrete', 'خرسانة'], ['wood', 'خشب'], ['stone', 'حجر'], ['glass', 'زجاج']];
  // جدار بفتحة مستطيلة (x0..x1 , y0..y1) — يُبنى من صناديق حول الفتحة
  function wallWithHole(B, w, h, t, hole, col, o) {
    if (!hole) { K.box(B, [0, h / 2, 0], [w, h, t], col, o); return; }
    const [x0, x1, y0, y1] = hole;
    if (x0 > -w / 2 + 1e-3) K.box(B, [(-w / 2 + x0) / 2, h / 2, 0], [x0 + w / 2, h, t], col, o);
    if (x1 < w / 2 - 1e-3) K.box(B, [(x1 + w / 2) / 2, h / 2, 0], [w / 2 - x1, h, t], col, o);
    if (y0 > 1e-3) K.box(B, [(x0 + x1) / 2, y0 / 2, 0], [x1 - x0, y0, t], col, o);
    if (y1 < h - 1e-3) K.box(B, [(x0 + x1) / 2, (y1 + h) / 2, 0], [x1 - x0, h - y1, t], col, o);
  }
  K.wallWithHole = wallWithHole;
  // إطار وزجاج شباك داخل فتحة
  K.windowInto = function (P, x0, x1, y0, y1, t, frameCol, o, bars) {
    const F = P('plastic'), G = P('glass'), f = 0.06, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    for (const s of [1, -1]) { K.box(F, [s > 0 ? x1 - f / 2 : x0 + f / 2, cy, 0], [f, y1 - y0, t + 0.02], frameCol, o); }
    K.box(F, [cx, y0 + f / 2, 0], [x1 - x0 - 2 * f, f, t + 0.02], frameCol, o); K.box(F, [cx, y1 - f / 2, 0], [x1 - x0 - 2 * f, f, t + 0.02], frameCol, o);
    K.box(F, [cx, y0 - 0.03, t / 2 + 0.04], [x1 - x0 + 0.12, 0.05, 0.1], 'offwhite', o); // عتبة
    if (x1 - x0 > 0.9) K.box(F, [cx, cy, 0], [0.05, y1 - y0 - 2 * f, t * 0.6], frameCol, o);
    K.box(G, [cx, cy, 0], [x1 - x0 - 2 * f, y1 - y0 - 2 * f, 0.02], 'glass', o);
    if (bars) for (let k = 1; k < 4; k++) K.box(P('metal'), [x0 + (x1 - x0) * k / 4, cy, t / 2 + 0.03], [0.025, y1 - y0, 0.025], 'dark', o);
  };
  K.doorLeafInto = function (B, x0, x1, y1, t, col, o, style) {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    K.box(B, [cx, y1 / 2, 0], [w - 0.02, y1 - 0.01, 0.05], col, o);
    if (style !== 'flat') for (const [y, hh] of [[y1 * 0.28, y1 * 0.36], [y1 * 0.72, y1 * 0.36]]) K.box(B, [cx, y, 0.03], [w * 0.7, hh, 0.012], AA.mixc(K.c(col), [0, 0, 0], 0.12), o);
    K.box(B, [x1 - 0.12, y1 * 0.48, 0.05], [0.12, 0.03, 0.04], 'chrome', o);
  };
  K.def('wall_piece', { name: 'قطعة جدار', nameEn: 'Wall piece', group: 'build',
    schema: [
      { key: 'type', label: 'النوع', type: 'enum', options: [['plain', 'سادة'], ['window', 'شباك'], ['door', 'باب'], ['doorway', 'فتحة بدون باب'], ['half', 'نصف جدار']], def: 'window' },
      { key: 'material', label: 'الخامة', type: 'enum', options: WALLS, def: 'plaster' },
      { key: 'width', label: 'العرض', min: 1, max: 4, step: 1, def: 2, unit: 'م' }, { key: 'height', label: 'الارتفاع', min: 2.5, max: 4, step: 0.5, def: 3, unit: 'م' },
      K.color('trim', 'لون الإطار', 'white', [['wood', 'خشب']])
    ],
    presets: { 'باب خشب': { type: 'door', trim: 'wood' }, 'جدار طوب': { type: 'plain', material: 'brick' }, 'واجهة زجاج': { type: 'plain', material: 'glass' }, 'سور نصفي': { type: 'half', material: 'stone' } },
    generate: (p, q) => {
      const P = K.parts(), rng = AA.rng(p.seed), w = p.width, h = p.type === 'half' ? 1.1 : p.height, t = 0.2, m = p.material;
      const col = { plaster: 'plaster', brick: 'brick', concrete: 'concrete', wood: 'woodLight', stone: 'sandstone', glass: 'glassDark' }[m], B = P(m === 'wood' ? 'wood' : m === 'glass' ? 'plastic' : 'stone');
      let hole = null;
      if (p.type === 'window') { const ww = Math.min(1.4, w - 0.6); hole = [-ww / 2, ww / 2, 0.9, Math.min(h - 0.5, 2.2)]; }
      if (p.type === 'door' || p.type === 'doorway') { const dw = Math.min(1.0, w - 0.4); hole = [-dw / 2, dw / 2, 0, 2.15]; }
      if (m === 'glass') { // واجهة زجاج: إطار ألمنيوم بأعمدة
        const n = Math.max(1, Math.round(w)); K.box(B, [0, 0.05, 0], [w, 0.1, t], 'dark'); K.box(B, [0, h - 0.05, 0], [w, 0.1, t], 'dark');
        for (let k = 0; k <= n; k++) K.box(B, [-w / 2 + k * w / n + (k === 0 ? 0.03 : k === n ? -0.03 : 0), h / 2, 0], [0.06, h, t], 'dark');
        K.box(P('glass'), [0, h / 2, 0], [w - 0.06, h - 0.2, 0.03], 'glass');
      } else if (m === 'brick') { // صفوف طوب بتلوين متناوب
        wallWithHole(P('stone'), w, h, t - 0.02, hole, 'concreteDark');
        const rows = Math.round(h / 0.25);
        for (let r = 0; r < rows; r++) { const y = (r + 0.5) * h / rows, n = Math.round(w / 0.5), off = r % 2 ? 0.25 : 0;
          for (let k = -1; k <= n; k++) { let a = -w / 2 + k * 0.5 + off + 0.008, b = a + 0.5 - 0.016; a = Math.max(a, -w / 2); b = Math.min(b, w / 2); if (b - a < 0.04) continue;
            const inHole = hole && y > hole[2] && y < hole[3]; const segs = inHole ? [[a, Math.min(b, hole[0])], [Math.max(a, hole[1]), b]] : [[a, b]];
            for (const [s0, s1] of segs) if (s1 - s0 > 0.03) for (const sz of [1, -1]) K.box(B, [(s0 + s1) / 2, y, sz * (t / 2 - 0.005)], [s1 - s0, h / rows - 0.016, 0.03], AA.vary(K.c('brick'), rng, 0.12)); } }
      } else {
        wallWithHole(B, w, h, t, hole, col);
        if (m === 'wood') { const n = Math.round(h / 0.2); for (let r = 1; r < n; r++) for (const sz of [1, -1]) { const y = r * h / n; if (hole && y > hole[2] && y < hole[3]) continue; K.box(P('dark'), [0, y, sz * (t / 2 + 0.002)], [w, 0.012, 0.004], 'woodDark'); } }
        if (m === 'plaster' || m === 'concrete') for (const sz of [1, -1]) K.box(B, [0, 0.08, sz * (t / 2 + 0.01)], [w, 0.16, 0.02], 'concreteDark'); // وزرة سفلية
      }
      if (p.type === 'window') K.windowInto(P, hole[0], hole[1], hole[2], hole[3], t, p.trim);
      if (p.type === 'door') { const Fr = P('plastic'); K.box(Fr, [hole[0] - 0.03, 1.075, 0], [0.08, 2.15, t + 0.04], p.trim); K.box(Fr, [hole[1] + 0.03, 1.075, 0], [0.08, 2.15, t + 0.04], p.trim); K.box(Fr, [0, 2.19, 0], [hole[1] - hole[0] + 0.16, 0.08, t + 0.04], p.trim);
        K.doorLeafInto(P(p.trim === 'wood' ? 'wood' : 'paint'), hole[0], hole[1], 2.15, t, p.trim === 'wood' ? 'wood' : 'offwhite'); }
      return K.done('wall_piece', P, { collider: K.boxCol(w, h, t), snap: { grid: 1, width: w, height: h, thickness: t }, opening: hole });
    } });

  K.def('pillar', { name: 'عمود', nameEn: 'Pillar', group: 'build',
    schema: [{ key: 'height', label: 'الارتفاع', min: 1, max: 6, step: 0.5, def: 3, unit: 'م' }, { key: 'shape', label: 'الشكل', type: 'enum', options: [['square', 'مربع'], ['round', 'دائري'], ['classic', 'كلاسيكي']], def: 'square' }, { key: 'material', label: 'الخامة', type: 'enum', options: WALLS.slice(0, 5), def: 'plaster' }],
    presets: { 'دائري': { shape: 'round' }, 'كلاسيكي': { shape: 'classic', material: 'stone' } },
    generate: (p, q) => { const P = K.parts(), H = p.height, B = P(p.material === 'wood' ? 'wood' : 'stone'), col = { plaster: 'plaster', brick: 'brick', concrete: 'concrete', wood: 'woodLight', stone: 'sandstone' }[p.material], n = K.sides(q, 10);
      if (p.shape === 'square') K.box(B, [0, H / 2, 0], [0.3, H, 0.3], col);
      else if (p.shape === 'round') K.cyl(B, [0, 0, 0], [0, H, 0], 0.16, 0.16, n, col);
      else { K.box(B, [0, 0.1, 0], [0.5, 0.2, 0.5], col); K.box(B, [0, H - 0.1, 0], [0.5, 0.2, 0.5], col); K.cyl(B, [0, 0.2, 0], [0, 0.32, 0], 0.22, 0.18, n, col); K.cyl(B, [0, 0.32, 0], [0, H - 0.32, 0], 0.17, 0.15, n, col); K.cyl(B, [0, H - 0.32, 0], [0, H - 0.2, 0], 0.15, 0.22, n, col); }
      return K.done('pillar', P, { collider: K.boxCol(0.4, H, 0.4) }); } });

  K.def('stairs', { name: 'درج', nameEn: 'Stairs', group: 'build',
    schema: [{ key: 'height', label: 'الارتفاع', min: 0.5, max: 4, step: 0.25, def: 3, unit: 'م' }, { key: 'width', label: 'العرض', min: 0.8, max: 3, step: 0.1, def: 1.2, unit: 'م' }, { key: 'material', label: 'الخامة', type: 'enum', options: [['concrete', 'خرسانة'], ['wood', 'خشب'], ['stone', 'حجر'], ['metal', 'حديد']], def: 'concrete' }, { key: 'rail', label: 'درابزين', type: 'bool', def: true }],
    presets: { 'درج خشب': { material: 'wood' }, 'درجتين': { height: 0.5, rail: false } },
    generate: (p, q) => { const P = K.parts(), H = p.height, W = p.width, n = Math.max(2, Math.round(H / 0.18)), rise = H / n, run = 0.28, L = n * run;
      const B = P(p.material === 'wood' ? 'wood' : p.material === 'metal' ? 'metal' : 'stone'), col = { concrete: 'concrete', wood: 'wood', stone: 'sandstone', metal: 'steel' }[p.material];
      for (let k = 0; k < n; k++) { const z = L / 2 - (k + 0.5) * run; if (p.material === 'metal' || p.material === 'wood') K.box(B, [0, (k + 1) * rise - 0.025, z], [W, 0.05, run + 0.02], col); else K.box(B, [0, (k + 1) * rise / 2, z], [W, (k + 1) * rise, run], AA.vary(K.c(col), AA.rng(p.seed + k), 0.04)); }
      if (p.material === 'metal' || p.material === 'wood') for (const s of [1, -1]) K.extrude(B, [[L / 2, 0], [L / 2 - 0.25, 0], [-L / 2, H - 0.25], [-L / 2, H], [-L / 2 + 0.2, H]], 'x', s * W / 2 - 0.04, s * W / 2 + 0.04, p.material === 'wood' ? 'woodDark' : 'dark');
      if (p.rail) { const M = P('metal'); for (const s of [1, -1]) { const x = s * (W / 2 - 0.04); for (let k = 0; k <= n; k += Math.max(1, Math.round(n / 4))) { const z = L / 2 - (k + 0.5) * run, y = (k + 1) * rise; K.rod(M, [x, y, z], [x, y + 0.9, z], 0.02, 'dark'); } K.rod(M, [x, rise + 0.9, L / 2 - 0.5 * run], [x, H + 0.9, -L / 2 + 0.5 * run], 0.03, 'dark'); } }
      return K.done('stairs', P, { collider: { type: 'ramp', size: [W, H, L] }, rise, run, steps: n }); } });

  K.def('railing', { name: 'درابزين وسياج', nameEn: 'Railing / fence', group: 'build',
    schema: [{ key: 'style', label: 'النوع', type: 'enum', options: [['metal', 'حديد'], ['picket', 'سياج خشب'], ['glass', 'زجاج'], ['chain', 'شبك'], ['hedge', 'سياج شجيرات']], def: 'metal' }, { key: 'length', label: 'الطول', min: 1, max: 8, step: 0.5, def: 3, unit: 'م' }, { key: 'height', label: 'الارتفاع', min: 0.6, max: 2.5, step: 0.1, def: 1.0, unit: 'م' }, K.color('color', 'اللون', 'white', [['wood', 'خشب']])],
    presets: { 'سياج خشب': { style: 'picket', color: 'white', height: 1 }, 'شبك عالي': { style: 'chain', height: 2.2, color: 'grey' }, 'زجاج': { style: 'glass' }, 'شجيرات': { style: 'hedge', height: 1.1 } },
    generate: (p, q) => { const P = K.parts(), L = p.length, H = p.height, rng = AA.rng(p.seed), M = P('metal'), n = Math.max(2, Math.round(L / 1.5) + 1);
      if (p.style === 'hedge') { const m = Math.max(1, Math.round(L / 0.9)); for (let k = 0; k < m; k++) AA.lp.clump(P('leaves'), [-L / 2 + (k + 0.5) * L / m, H * 0.5, 0], [L / m * 0.62, H * 0.55, 0.42], ['leaf3', 'leaf', 'leaf2'].map(K.c), rng, { jitter: 0.18, detail: 0, flatBottom: 1 }); return K.done('railing', P, { collider: K.boxCol(L, H, 0.7) }); }
      const W = p.style === 'picket' ? P('wood') : M, col = p.style === 'chain' ? 'grey' : p.color;
      for (let k = 0; k < n; k++) K.box(W, [-L / 2 + k * L / (n - 1) + (k === 0 ? 0.03 : k === n - 1 ? -0.03 : 0), H / 2, 0], [0.065, H + 0.004, 0.065], col); // الأعمدة أعرض قليلاً من القضبان حتى لا تتطابق الأوجه
      if (p.style === 'picket') { const m = Math.round(L / 0.16); for (let k = 0; k < m; k++) { const x = -L / 2 + (k + 0.5) * L / m; K.extrude(W, [[-0.045, 0.05], [0.045, 0.05], [0.045, H - 0.05], [0, H + 0.03], [-0.045, H - 0.05]], 'z', 0.035, 0.055, col, { at: [x, 0, 0] }); } for (const y of [0.25, H - 0.25]) K.box(W, [0, y, 0.015], [L, 0.07, 0.035], col); }
      else if (p.style === 'glass') { K.box(M, [0, H - 0.03, 0], [L, 0.06, 0.08], 'chrome'); K.box(P('glass'), [0, H / 2, 0], [L - 0.1, H - 0.1, 0.02], 'glass'); }
      else if (p.style === 'chain') { K.box(M, [0, H - 0.03, 0], [L, 0.05, 0.05], 'grey'); const m = Math.round(L / 0.1), o = Math.round(H / 0.1); for (let k = 0; k < m; k++) K.box(M, [-L / 2 + (k + 0.5) * L / m, H / 2, 0], [0.008, H - 0.06, 0.008], 'greyLight'); for (let k = 0; k < o; k++) K.box(M, [0, (k + 0.5) * H / o, 0], [L, 0.008, 0.008], 'greyLight'); }
      else { for (const y of [0.1, H - 0.04]) K.box(M, [0, y, 0], [L, 0.05, 0.05], col); const m = Math.round(L / 0.12); for (let k = 0; k < m; k++) K.box(M, [-L / 2 + (k + 0.5) * L / m, H / 2, 0], [0.02, H - 0.1, 0.02], col); }
      return K.done('railing', P, { collider: K.boxCol(L, H, 0.1) }); } });

  K.def('roof', { name: 'سقف جملوني', nameEn: 'Gable roof', group: 'build',
    schema: [{ key: 'width', label: 'العرض', min: 2, max: 12, step: 0.5, def: 6, unit: 'م' }, { key: 'depth', label: 'الطول', min: 2, max: 14, step: 0.5, def: 8, unit: 'م' }, { key: 'pitch', label: 'الميل', min: 0.2, max: 1, step: 0.05, def: 0.5 }, K.color('color', 'اللون', 'roofRed', [['roofRed', 'قرميد أحمر'], ['roofGrey', 'رمادي']])],
    presets: { 'رمادي حاد': { color: 'roofGrey', pitch: 0.8 }, 'مسطح تقريباً': { pitch: 0.25 } },
    generate: (p, q) => { const P = K.parts(), W = p.width, D = p.depth, h = W / 2 * p.pitch, o = 0.3, B = P('stone');
      K.extrude(P('stone'), [[-W / 2, 0], [W / 2, 0], [0, h]], 'z', -D / 2, D / 2, 'plaster');
      const rows = Math.max(3, Math.round(Math.hypot(W / 2, h) / 0.35));
      for (const s of [1, -1]) for (let r = 0; r < rows; r++) { const t0 = r / rows, t1 = (r + 1) / rows, x0 = s * lerp(W / 2 + o, 0, t0), x1 = s * lerp(W / 2 + o, 0, t1), y0 = lerp(-o * p.pitch, h, t0) + 0.06, y1 = lerp(-o * p.pitch, h, t1) + 0.06;
        K.extrude(B, [[x0, y0], [x1, y1], [x1, y1 + 0.06], [x0, y0 + 0.06]].map(([x, y]) => [x, y]), 'z', -D / 2 - o - (r % 2) * 0.006, D / 2 + o + (r % 2) * 0.006, { side: AA.vary(K.c(p.color), AA.rng(p.seed + r), 0.08) }); }
      K.cyl(B, [0, h + 0.1, -D / 2 - o], [0, h + 0.1, D / 2 + o], 0.09, 0.09, 6, AA.mixc(K.c(p.color), [0, 0, 0], 0.2));
      return K.done('roof', P, { collider: K.boxCol(W + 2 * o, h, D + 2 * o) }); } });

  K.def('platform', { name: 'منصة', nameEn: 'Platform', group: 'build',
    schema: [{ key: 'shape', label: 'الشكل', type: 'enum', options: [['box', 'مربعة'], ['round', 'دائرية'], ['hex', 'سداسية']], def: 'box' }, { key: 'size', label: 'المقاس', min: 1, max: 6, step: 0.5, def: 2, unit: 'م' }, { key: 'material', label: 'الخامة', type: 'enum', options: FLOORS.slice(0, 8), def: 'grass' }],
    presets: { 'دائرية حجر': { shape: 'round', material: 'stone' }, 'سداسية خشب': { shape: 'hex', material: 'wood' } },
    generate: (p, q) => { const P = K.parts(), S = p.size, rng = AA.rng(p.seed), top = 0.6;
      if (p.shape === 'box') { floorInto(P, S, S, top, p.material, rng, q); }
      else { const n = p.shape === 'hex' ? 6 : K.sides(q, 12), ring = K.circle(S / 2, n, p.shape === 'hex' ? Math.PI / 6 : 0), topc = { grass: 'grass', wood: 'wood', tiles: 'offwhite', marble: 'white', concrete: 'concrete', asphalt: 'asphalt2', sand: 'sand', stone: 'rockLight' }[p.material];
        K.slab(P('stone'), ring, 0, top - 0.1, p.material === 'grass' ? 'soil' : 'concreteDark'); K.slab(P(p.material === 'grass' ? 'grass' : p.material === 'wood' ? 'wood' : 'stone'), ring.map(([x, z]) => [x * 1.02, z * 1.02]), top - 0.1, top, topc); }
      return K.done('platform', P, { collider: K.boxCol(S, top, S), top }); } });

  // ---------- جزيرة عائمة ----------
  // الأصل عند رأس الصخرة السفلي (y=0) والسطح العشبي على ارتفاع meta.top — تُرفع في المشهد بالمقدار المطلوب.
  K.def('floating_island', { name: 'جزيرة عائمة', nameEn: 'Floating island', group: 'build',
    schema: [
      { key: 'radius', label: 'نصف القطر', min: 2, max: 12, step: 0.5, def: 5, unit: 'م' },
      { key: 'depth', label: 'عمق الصخرة', min: 1.5, max: 10, step: 0.5, def: 5, unit: 'م' },
      { key: 'biome', label: 'الطبيعة', type: 'enum', options: [['grass', 'عشب'], ['desert', 'صحراء'], ['snow', 'ثلج'], ['autumn', 'خريف']], def: 'grass' },
      { key: 'trees', label: 'الأشجار', min: 0, max: 8, step: 1, def: 3 },
      { key: 'rocks', label: 'الصخور', min: 0, max: 6, step: 1, def: 2 },
      { key: 'waterfall', label: 'شلال', type: 'bool', def: true },
      { key: 'shards', label: 'صخور طافية حولها', min: 0, max: 6, step: 1, def: 3 }
    ],
    presets: { 'جزيرة صحراوية': { biome: 'desert', trees: 2, waterfall: false }, 'جزيرة ثلجية': { biome: 'snow', trees: 4 }, 'صغيرة': { radius: 2.5, depth: 2.5, trees: 1, rocks: 1, waterfall: false, shards: 1 }, 'خريف': { biome: 'autumn' } },
    generate: (p, q) => {
      const P = K.parts(), rng = AA.rng(p.seed), R = p.radius, D = p.depth, n = K.sides(q, 12), H = D + 0.5;
      const B = { grass: ['grass', 'grass2', 'soil'], desert: ['sand', 'sand2', 'sand2'], snow: ['snow', '#e3e9ee', 'rock'], autumn: ['#c9a24a', '#b98a3c', 'soil'] }[p.biome];
      const rr = []; for (let k = 0; k < n; k++) rr.push(R * (0.85 + rng() * 0.3));
      const ring = (s, y, j) => rr.map((r, k) => { const a = k / n * Math.PI * 2 + (j || 0); return [Math.cos(a) * r * s, y, Math.sin(a) * r * s]; });
      // السطح (قرص بطبقة تربة)
      const top = ring(1, H, 0), C = [0, H + 0.12, 0], Gt = P('grass'), mid = ring(0.55, H + 0.06, 0.2);
      for (let k = 0; k < n; k++) { const k2 = (k + 1) % n, c1 = AA.vary(K.c(B[k % 2]), rng, 0.06), c2 = AA.vary(K.c(B[(k + 1) % 2]), rng, 0.06);
        K.tri(Gt, C, mid[k2], mid[k], c1, [0, 1, 0]); K.tri(Gt, mid[k], mid[k2], top[k2], c2, [0, 1, 0]); K.tri(Gt, mid[k], top[k2], top[k], c1, [0, 1, 0]); }
      const lv = [[1.0, H, B[2] === 'rock' ? 'rockLight' : B[2]], [1.0, H - 0.35, B[2] === 'rock' ? 'rockLight' : B[2]], [0.86, H - 0.5, 'rock'], [0.62, H - 0.55 - D * 0.3, 'rock2'], [0.34, H - 0.5 - D * 0.65, 'rock2'], [0.12, 0.35, 'bark']];
      const rings = lv.map(([s, y], i) => ring(s * (i ? 0.95 + rng() * 0.08 : 1), y, i * 0.13));
      const S = P('stone');
      for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < n; k++) { const a = rings[i][k], b = rings[i][(k + 1) % n], c = rings[i + 1][(k + 1) % n], d = rings[i + 1][k], mid = V.scale(V.add(a, b), 0.5), out = V.norm([mid[0], 0, mid[2]]), col = AA.vary(K.c(lv[i][2]), rng, 0.08); K.tri(S, a, b, c, col, out); K.tri(S, a, c, d, col, out); }
      const last = rings[rings.length - 1]; for (let k = 0; k < n; k++) K.tri(S, last[k], last[(k + 1) % n], [0, 0, 0], AA.vary(K.c('rock2'), rng, 0.1), V.add(V.norm([last[k][0], 0, last[k][2]]), [0, -1, 0]));
      // زينة السطح
      const spots = []; const pick = (minR, maxR) => { for (let g2 = 0; g2 < 40; g2++) { const a = rng() * 6.28, r = R * (minR + rng() * (maxR - minR)), x = Math.cos(a) * r, z = Math.sin(a) * r; if (spots.every(s => Math.hypot(s[0] - x, s[1] - z) > 1.3)) { spots.push([x, z]); return [x, H + 0.05, z]; } } return null; };
      const treeKind = { grass: 'round', desert: 'palm', snow: 'pine', autumn: 'autumn' }[p.biome];
      for (let k = 0; k < p.trees; k++) { const at = pick(0, 0.7); if (!at) continue; const h = 2.2 + rng() * 2.2;
        if (treeKind === 'palm') { const T = P('wood'); K.cyl(T, at, V.add(at, [0.2, h, 0]), 0.12, 0.09, 6, 'trunk'); for (let f = 0; f < 6; f++) { const a = f / 6 * 6.28, tip = V.add(at, [0.2 + Math.cos(a) * 1.3, h - 0.5, Math.sin(a) * 1.3]); K.tri(P('leaves'), V.add(at, [0.2, h + 0.1, 0]), tip, V.add(tip, [Math.sin(a) * 0.35, 0.15, -Math.cos(a) * 0.35]), 'leaf', null); K.tri(P('leaves'), V.add(at, [0.2, h + 0.1, 0]), V.add(tip, [Math.sin(a) * 0.35, 0.15, -Math.cos(a) * 0.35]), tip, 'leaf3', null); } }
        else K.treeInto(P, at, h, treeKind, rng, q); }
      for (let k = 0; k < p.rocks; k++) { const at = pick(0.3, 0.85); if (at) K.rockInto(P('stone'), V.add(at, [0, -0.05, 0]), 0.35 + rng() * 0.4, rng, p.biome === 'desert' ? ['sand2', 'sandstone', 'sand'] : null); }
      if (p.biome === 'grass' || p.biome === 'autumn') for (let k = 0; k < 6; k++) { const at = pick(0.2, 0.9); if (at) for (let f = 0; f < 3; f++) K.ball(P('flower'), V.add(at, [(rng() - 0.5) * 0.4, 0.12, (rng() - 0.5) * 0.4]), 0.08, ['red', 'yellow', 'white', 'pink'][(k + f) % 4], null, 0); }
      if (p.waterfall) { // بركة صغيرة على الحافة وماء ينسكب من الطرف
        const a = rng() * 6.28, r0 = R * 0.55, cx = Math.cos(a) * r0, cz = Math.sin(a) * r0, W = P('water');
        K.slab(W, K.circle(0.9, 8), H + 0.02, H + 0.08, 'water', { at: [cx, 0, cz] });
        const ex = Math.cos(a) * (R * 1.02), ez = Math.sin(a) * (R * 1.02), side = [-Math.sin(a) * 0.35, 0, Math.cos(a) * 0.35], out = [Math.cos(a), 0, Math.sin(a)];
        K.quad(W, V.add([cx, H + 0.07, cz], side), V.sub([cx, H + 0.07, cz], side), V.sub([ex, H + 0.07, ez], side), V.add([ex, H + 0.07, ez], side), 'water2', [0, 1, 0]);
        for (let s = 0; s < 6; s++) { const y0 = H + 0.05 - s * (H * 0.95) / 6, y1 = y0 - H * 0.95 / 6, o0 = 0.1 + s * 0.05, o1 = o0 + 0.05;
          K.quad(W, V.add(V.add([ex, y0, ez], V.scale(out, o0)), side), V.sub(V.add([ex, y0, ez], V.scale(out, o0)), side), V.sub(V.add([ex, y1, ez], V.scale(out, o1)), side), V.add(V.add([ex, y1, ez], V.scale(out, o1)), side), s % 2 ? 'water' : 'water2', out); }
      }
      for (let k = 0; k < p.shards; k++) { const a = rng() * 6.28, r = R * (1.25 + rng() * 0.5), y = H * (0.25 + rng() * 0.6), s = 0.3 + rng() * 0.5, c = [Math.cos(a) * r, y, Math.sin(a) * r];
        K.cyl(S, V.add(c, [0, s * 0.6, 0]), V.add(c, [0, -s * 1.2, 0]), s, 0.02, 5, AA.vary(K.c('rock2'), rng, 0.1)); K.slab(P('grass'), K.circle(s * 1.02, 5), c[1] + s * 0.6, c[1] + s * 0.6 + 0.08, B[0], { at: [c[0], 0, c[2]] }); }
      return K.done('floating_island', P, { collider: { type: 'cylinder', radius: R, height: 0.6, center: [0, H - 0.2, 0] }, top: H + 0.05, float: true, height: H + 5 });
    } });
})(typeof window !== 'undefined' ? window : globalThis);
