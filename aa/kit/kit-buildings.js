// Aboden Assets — kit/kit-buildings.js — المباني: فيلا، بيت بسقف جملوني، عمارة شقق، محل، برج مكاتب، محطة وقود ومضخة، مسجد، مستودع، سور بوابة
(function (g) {
  'use strict';
  const AA = g.AA, K = AA.kit, V = AA.v, lerp = AA.lerp;
  const FL = 3.3; // ارتفاع الدور
  const WALLC = [['plaster', 'لياسة فاتحة'], ['sandstone', 'حجر بيج'], ['white', 'أبيض'], ['concrete', 'رمادي'], ['brick', 'طوب']];

  // واجهة: o يدوّر الوجه الأمامي المحلي (+Z) لأي جهة، والنافذة تبرز 3 سم عن الجدار
  const FACES = (W, D) => [[W, { at: [0, 0, D / 2], rot: 0 }], [D, { at: [W / 2, 0, 0], rot: Math.PI / 2 }], [W, { at: [0, 0, -D / 2], rot: Math.PI }], [D, { at: [-W / 2, 0, 0], rot: -Math.PI / 2 }]];
  function win(P, x, y, w, h, o, s) {
    s = s || {};
    K.box(P('plastic'), [x, y, 0.02], [w + 0.12, h + 0.12, 0.05], s.frame || 'offwhite', o);
    K.box(P(s.lit ? 'neon' : 'glassSolid'), [x, y, 0.05], [w, h, 0.02], s.glass || 'glassDark', o);
    if (s.mullion !== false && w > 0.9) K.box(P('plastic'), [x, y, 0.065], [0.05, h - 0.01, 0.02], s.frame || 'offwhite', o);
    if (s.sill !== false) K.box(P('stone'), [x, y - h / 2 - 0.08, 0.07], [w + 0.25, 0.06, 0.14], s.sillCol || 'offwhite', o);
    if (s.shade) K.box(P('stone'), [x, y + h / 2 + 0.12, 0.2], [w + 0.3, 0.08, 0.4], s.shade, o);
  }
  K.win = win;
  function door(P, x, w, h, o, col, glass) {
    K.box(P('plastic'), [x, h / 2, 0.02], [w + 0.16, h + 0.08, 0.05], 'dark', o);
    K.box(P(glass ? 'glassSolid' : 'wood'), [x, h / 2, 0.05], [w, h, 0.03], glass ? 'glassDark' : (col || 'woodDark'), o);
    if (!glass && w > 1.4) K.box(P('dark'), [x, h / 2, 0.07], [0.03, h, 0.01], 'black', o);
    K.box(P('metal'), [x + w / 2 - 0.15, h * 0.48, 0.08], [0.04, 0.3, 0.04], 'chrome', o);
  }
  K.door = door;
  // سطح بحاجز (درْوة) ومعدات السطح
  function parapet(P, W, D, y, col, h) { h = h || 0.9; const t = 0.18, B = P('stone'); K.box(B, [0, y + h / 2, D / 2 - t / 2], [W, h, t], col); K.box(B, [0, y + h / 2, -D / 2 + t / 2], [W, h, t], col); K.box(B, [W / 2 - t / 2, y + h / 2, 0], [t, h, D - 2 * t], col); K.box(B, [-W / 2 + t / 2, y + h / 2, 0], [t, h, D - 2 * t], col); K.box(P('stone'), [0, y + h + 0.03, D / 2 - t / 2], [W + 0.06, 0.06, t + 0.06], 'offwhite'); K.box(P('stone'), [0, y + h + 0.03, -D / 2 + t / 2], [W + 0.06, 0.06, t + 0.06], 'offwhite'); }
  function tankInto(P, at, q) { const n = K.sides(q, 10); K.box(P('metal'), V.add(at, [0, 0.25, 0]), [0.9, 0.5, 0.9], 'steel'); K.cyl(P('plastic'), V.add(at, [0, 0.5, 0]), V.add(at, [0, 1.6, 0]), 0.55, 0.55, n, 'white'); K.cyl(P('plastic'), V.add(at, [0, 1.6, 0]), V.add(at, [0, 1.75, 0]), 0.55, 0.25, n, 'white'); }
  function acInto(P, at, rot) { const o = { at, rot: rot || 0 }; K.box(P('metal'), [0, 0.35, 0], [0.9, 0.7, 0.4], 'offwhite', o); K.cyl(P('dark'), [0, 0.38, 0.2], [0, 0.38, 0.215], 0.26, 0.26, 10, 'dark', o); }
  function dishInto(P, at) { K.rod(P('metal'), at, V.add(at, [0, 0.8, 0]), 0.03, 'grey'); K.cyl(P('metal'), V.add(at, [0, 0.9, -0.05]), V.add(at, [0, 1.0, 0.2]), 0.42, 0.05, 10, 'white'); }
  K.tankInto = tankInto; K.acInto = acInto; K.dishInto = dishInto;
  const wc = m => ({ plaster: 'plaster', sandstone: 'sandstone', white: 'white', concrete: 'concrete', brick: 'brick' }[m] || m);

  // ---------- فيلا ----------
  K.def('villa', { name: 'فيلا', nameEn: 'Villa', group: 'buildings',
    schema: [
      { key: 'width', label: 'العرض', min: 9, max: 20, step: 0.5, def: 13, unit: 'م' }, { key: 'depth', label: 'العمق', min: 8, max: 16, step: 0.5, def: 10, unit: 'م' },
      { key: 'floors', label: 'الأدوار', min: 1, max: 3, step: 1, def: 2 }, { key: 'color', label: 'الواجهة', type: 'enum', options: WALLC, def: 'plaster' },
      K.color('accent', 'لون التكسية', 'sandstone', [['wood', 'خشب']]), { key: 'wall', label: 'سور وبوابة', type: 'bool', def: true }, { key: 'roof', label: 'معدات السطح', type: 'bool', def: true }
    ],
    presets: { 'دور واحد': { floors: 1, width: 11 }, 'فيلا كبيرة': { width: 18, depth: 14, floors: 3 }, 'بيضاء بلا سور': { color: 'white', accent: 'grey', wall: false } },
    generate: (p, q) => {
      const P = K.parts(), rng = AA.rng(p.seed), W = p.width, D = p.depth, F = p.floors, col = wc(p.color), S = P('stone');
      const upW = W * 0.78, upX = W * 0.11; // الأدوار العليا أصغر قليلاً ومزاحة
      for (let f = 0; f < F; f++) { const w = f ? upW : W, x = f ? upX : 0; K.box(S, [x, f * FL + FL / 2, 0], [w, FL, D], col); K.box(S, [x, (f + 1) * FL - 0.08, 0], [w + 0.3, 0.2, D + 0.3], 'offwhite'); }
      K.box(S, [0, 0.15, 0], [W + 0.4, 0.3, D + 0.4], 'concreteDark'); // قاعدة
      // تكسية حجرية عمودية بجانب المدخل
      const ex = -W / 2 + 2.2; K.box(P('stone'), [ex, F * FL / 2, D / 2 + 0.06], [1.6, F * FL, 0.12], p.accent);
      // النوافذ على كل الواجهات
      for (let f = 0; f < F; f++) { const w = f ? upW : W, x0 = f ? upX : 0, y = f * FL + 1.75;
        for (const [L, o0] of FACES(w, D)) { const o = { at: V.add(o0.at, [x0, 0, 0]), rot: o0.rot }, n = Math.max(1, Math.floor((L - 2) / 2.6));
          for (let k = 0; k < n; k++) { const x = -L / 2 + (k + 0.5) * L / n + 0.4; if (o.rot === 0 && Math.abs(x0 + x - ex) < 1.6) continue; win(P, x, y, 1.4, 1.5, o, { shade: f === F - 1 ? null : 'offwhite' }); } } }
      // المدخل: مظلة وباب ودرجتين
      K.box(S, [ex, 2.9, D / 2 + 0.9], [2.6, 0.2, 1.8], 'offwhite'); door(P, ex, 1.5, 2.4, { at: [0, 0.3, D / 2 + 0.12] }, 'woodDark');
      for (let k = 0; k < 2; k++) K.box(S, [ex, 0.1 + k * 0.1, D / 2 + 1.1 - k * 0.3], [2.2, 0.2 + k * 0.2, 0.6 + k * 0.0], 'concrete');
      // السطح
      const topY = F * FL, rw = F > 1 ? upW : W, rx = F > 1 ? upX : 0;
      parapet(P, rw, D, topY, col);
      if (F > 1) { const x0 = -W / 2, x1 = upX - upW / 2, B = P('stone'); // سطح الدور الأرضي المكشوف: حاجز على ثلاث جهات
        K.box(B, [(x0 + x1) / 2, FL + 0.5, D / 2 - 0.09], [x1 - x0, 1.0, 0.18], col); K.box(B, [(x0 + x1) / 2, FL + 0.5, -D / 2 + 0.09], [x1 - x0, 1.0, 0.18], col); K.box(B, [x0 + 0.09, FL + 0.5, 0], [0.18, 1.0, D - 0.36], col); }
      if (p.roof) { tankInto(P, [rx + rw / 2 - 1.2, topY, -D / 2 + 1.2], q); tankInto(P, [rx + rw / 2 - 2.5, topY, -D / 2 + 1.2], q); acInto(P, [rx - rw / 2 + 1.2, topY, -D / 2 + 1.0]); acInto(P, [rx - rw / 2 + 2.4, topY, -D / 2 + 1.0]); dishInto(P, [rx, topY, D / 2 - 1.2]); }
      // مكيفات على الجدار الجانبي
      for (let f = 0; f < F; f++) acInto(P, [W / 2 + 0.2, f * FL + 0.6, -D / 4], Math.PI / 2);
      let LW = W, LD = D;
      if (p.wall) { // سور بارتفاع 2.7 م حول الأرض، ببوابة مشاة وبوابة سيارة منزلقة
        LW = W + 6; LD = D + 9; const H = 2.7, t = 0.25, zf = D / 2 + 5.5, zb = -D / 2 - 3.5, B = P('stone'), gx = W / 2 - 1.5, gw = 4.5, px = ex, pw = 1.3;
        K.box(B, [0, H / 2, zb], [LW, H, t], col); for (const s of [1, -1]) K.box(B, [s * LW / 2, H / 2, (zf + zb) / 2], [t, H, zf - zb], col);
        const segs = [[-LW / 2, px - pw / 2], [px + pw / 2, gx - gw / 2], [gx + gw / 2, LW / 2]]; for (const [a, b] of segs) if (b - a > 0.05) K.box(B, [(a + b) / 2, H / 2, zf], [b - a, H, t], col);
        K.box(B, [0, H + 0.05, zf], [LW + 0.1, 0.1, t + 0.1], 'offwhite'); K.box(B, [px, H - 0.25, zf], [pw, 0.5, t], col);
        door(P, px, pw - 0.1, 2.15, { at: [0, 0, zf + t / 2 - 0.03] }, 'dark'); // باب المشاة
        const M = P('metal'); K.box(M, [gx, 1.0, zf], [gw, 2.0, 0.06], 'dark'); for (let k = 0; k < 14; k++) K.box(M, [gx - gw / 2 + (k + 0.5) * gw / 14, 1.0, zf + 0.04], [0.06, 1.9, 0.02], 'grey');
        K.box(P('concrete'), [gx, 0.03, zf + 0.6], [gw + 1, 0.06, 1.2], 'concrete'); // مدخل السيارة (حتى حافة الرصيف)
        K.box(P('lamp'), [px - pw / 2 - 0.3, 2.2, zf + 0.15], [0.18, 0.25, 0.1], 'white');
      }
      return K.done('villa', P, { collider: K.boxCol(W, F * FL + 1, D), lot: [LW, LD], door: { x: ex, z: D / 2 }, floors: F, light: p.wall ? { at: [-W / 2 + 0.8, 2.2, D / 2 + 6], color: [1, 0.85, 0.6], intensity: 1.2, distance: 8 } : null });
    } });

  // ---------- بيت بسقف جملوني ----------
  K.def('house', { name: 'بيت بسقف', nameEn: 'Gable house', group: 'buildings',
    schema: [{ key: 'width', label: 'العرض', min: 6, max: 14, step: 0.5, def: 8, unit: 'م' }, { key: 'depth', label: 'العمق', min: 6, max: 12, step: 0.5, def: 7, unit: 'م' }, { key: 'floors', label: 'الأدوار', min: 1, max: 2, step: 1, def: 1 },
      { key: 'color', label: 'الجدران', type: 'enum', options: WALLC.concat([['#9fc1d6', 'أزرق فاتح'], ['#e9c7a0', 'مشمشي']]), def: 'plaster' }, K.color('roofColor', 'السقف', 'roofRed', [['roofRed', 'قرميد أحمر'], ['roofGrey', 'رمادي']]), { key: 'porch', label: 'شرفة أمامية', type: 'bool', def: true }, { key: 'chimney', label: 'مدخنة', type: 'bool', def: true }],
    presets: { 'دورين': { floors: 2, roofColor: 'roofGrey' }, 'كوخ صغير': { width: 6, depth: 6, porch: false, color: '#e9c7a0' } },
    generate: (p, q) => { const P = K.parts(), W = p.width, D = p.depth, H = p.floors * 3, S = P('stone'), col = wc(p.color), pitch = 0.6, rh = W / 2 * pitch, o = 0.45;
      K.box(S, [0, 0.2, 0], [W + 0.2, 0.4, D + 0.2], 'concreteDark'); K.box(S, [0, H / 2 + 0.2, 0], [W, H, D], col);
      K.extrude(S, [[-W / 2, H + 0.2], [W / 2, H + 0.2], [0, H + 0.2 + rh]], 'z', -D / 2, D / 2, col);
      const R = P('paint'), rows = 6; for (const s of [1, -1]) for (let r = 0; r < rows; r++) { const t0 = r / rows, t1 = (r + 1) / rows, x0 = s * lerp(W / 2 + o, 0, t0), x1 = s * lerp(W / 2 + o, 0, t1), y0 = H + 0.2 - o * pitch + (rh + o * pitch) * t0 + 0.05, y1 = H + 0.2 - o * pitch + (rh + o * pitch) * t1 + 0.05;
        K.extrude(R, [[x0, y0], [x1, y1], [x1, y1 + 0.1], [x0, y0 + 0.1]], 'z', -D / 2 - o, D / 2 + o, { side: AA.vary(K.c(p.roofColor), AA.rng(p.seed + r), 0.07) }); }
      if (p.chimney) K.box(S, [W * 0.25, H + 0.2 + rh * 0.8, -D * 0.2], [0.6, rh * 0.9, 0.6], 'brick');
      for (let f = 0; f < p.floors; f++) for (const [L, o0] of FACES(W, D)) { const n = Math.max(1, Math.floor(L / 2.8)); for (let k = 0; k < n; k++) { const x = -L / 2 + (k + 0.5) * L / n; if (f === 0 && o0.rot === 0 && Math.abs(x) < 1) continue; win(P, x, 0.2 + f * 3 + 1.6, 1.0, 1.2, o0, { frame: 'white', shade: null }); } }
      door(P, 0, 1.0, 2.1, { at: [0, 0.4, D / 2] }, 'red');
      if (p.porch) { K.box(P('wood'), [0, 0.3, D / 2 + 1.1], [W * 0.6, 0.2, 2.2], 'woodLight'); for (const s of [1, -1]) K.box(P('wood'), [s * (W * 0.3 - 0.1), 1.6, D / 2 + 2.05], [0.15, 2.4, 0.15], 'white'); K.extrude(R, [[D / 2, 2.8], [D / 2 + 2.4, 2.5], [D / 2 + 2.4, 2.62], [D / 2, 2.92]], 'x', -W * 0.32, W * 0.32, p.roofColor); }
      return K.done('house', P, { collider: K.boxCol(W, H + rh, D), door: { x: 0, z: D / 2 } }); } });

  // ---------- عمارة شقق ----------
  K.def('apartment', { name: 'عمارة شقق', nameEn: 'Apartment block', group: 'buildings',
    schema: [{ key: 'floors', label: 'الأدوار', min: 2, max: 12, step: 1, def: 5 }, { key: 'width', label: 'العرض', min: 10, max: 30, step: 1, def: 16, unit: 'م' }, { key: 'depth', label: 'العمق', min: 8, max: 20, step: 1, def: 12, unit: 'م' },
      { key: 'color', label: 'الواجهة', type: 'enum', options: WALLC, def: 'sandstone' }, { key: 'balconies', label: 'بلكونات', type: 'bool', def: true }, { key: 'shops', label: 'محلات في الأرضي', type: 'bool', def: true }],
    presets: { 'عالية': { floors: 10, width: 14 }, 'سكنية بدون محلات': { shops: false, color: 'white' } },
    generate: (p, q) => { const P = K.parts(), rng = AA.rng(p.seed), F = p.floors, W = p.width, D = p.depth, S = P('stone'), col = wc(p.color), H = F * FL;
      K.box(S, [0, H / 2, 0], [W, H, D], col);
      for (let f = 1; f < F; f++) K.box(S, [0, f * FL, 0], [W + 0.12, 0.14, D + 0.12], 'offwhite');
      const bay = 3.4, nb = Math.max(2, Math.floor(W / bay));
      for (let f = 0; f < F; f++) for (const [L, o] of FACES(W, D)) { const n = o.rot % Math.PI === 0 ? nb : Math.max(1, Math.floor(L / bay));
        for (let k = 0; k < n; k++) { const x = -L / 2 + (k + 0.5) * L / n, y = f * FL + 1.7;
          if (f === 0 && p.shops && o.rot === 0) { const sw = L / n - 0.5; K.box(P('glassSolid'), [x, 1.5, 0.04], [sw, 2.6, 0.04], 'glass', o); K.box(P('paint'), [x, 3.0, 0.15], [sw + 0.2, 0.55, 0.3], ['red', 'teal', 'orange', 'blue', 'green'][(k + p.seed) % 5], o); continue; }
          if (f === 0 && o.rot === 0 && k === Math.floor(n / 2)) { door(P, x, 1.8, 2.4, o, null, true); continue; }
          win(P, x, y, 1.5, 1.5, o, { lit: rng() < 0.12, shade: null });
          if (p.balconies && f > 0 && o.rot === 0 && k % 2 === 0) { K.box(S, [x, f * FL + 0.08, 0.7], [2.6, 0.16, 1.4], 'offwhite', o); K.box(P('glass'), [x, f * FL + 0.65, 1.38], [2.6, 0.95, 0.03], 'glass', o); for (const s of [1, -1]) K.box(P('glass'), [x + s * 1.28, f * FL + 0.65, 0.7], [0.03, 0.95, 1.36], 'glass', o); K.box(P('metal'), [x, f * FL + 1.15, 1.38], [2.6, 0.05, 0.06], 'chrome', o); } } }
      parapet(P, W, D, H, col);
      for (let k = 0; k < Math.min(6, Math.round(W / 4)); k++) tankInto(P, [-W / 2 + 1.5 + k * 1.4, H, -D / 2 + 1.4], q);
      for (let k = 0; k < 3; k++) acInto(P, [W / 2 - 1.5 - k * 1.3, H, D / 2 - 1.0]);
      K.box(S, [W / 4, H + 1.4, 0], [3, 2.8, 3], col); dishInto(P, [-W / 4, H, 1]);
      return K.done('apartment', P, { collider: K.boxCol(W, H + 1, D), floors: F }); } });

  // ---------- محل ----------
  const SHOPS = [['grocery', 'بقالة', 'MARKET', 'green'], ['cafe', 'كوفي', 'CAFE', 'brown'], ['pharmacy', 'صيدلية', 'PHARMACY', 'teal'], ['barber', 'حلاق', 'BARBER', 'navy'], ['bakery', 'مخبز', 'BAKERY', 'orange'], ['restaurant', 'مطعم', 'FOOD', 'red']];
  K.def('shop', { name: 'محل', nameEn: 'Shop', group: 'buildings',
    schema: [{ key: 'kind', label: 'النوع', type: 'enum', options: SHOPS.map(s => [s[0], s[1]]), def: 'grocery' }, { key: 'width', label: 'العرض', min: 4, max: 12, step: 0.5, def: 6, unit: 'م' }, { key: 'awning', label: 'مظلة', type: 'bool', def: true }, { key: 'color', label: 'الجدار', type: 'enum', options: WALLC, def: 'concrete' }],
    presets: { 'كوفي': { kind: 'cafe', color: 'white' }, 'صيدلية': { kind: 'pharmacy', awning: false }, 'مطعم': { kind: 'restaurant', width: 9 } },
    generate: (p, q) => { const P = K.parts(), W = p.width, D = 6, H = 4.2, S = P('stone'), sh = SHOPS.find(s => s[0] === p.kind) || SHOPS[0], brand = sh[3];
      K.box(S, [0, H / 2, 0], [W, H, D], wc(p.color)); parapet(P, W, D, H, wc(p.color), 0.6);
      K.box(P('glassSolid'), [0, 1.5, D / 2 + 0.03], [W - 1.0, 2.6, 0.04], 'glass'); for (let k = 0; k <= Math.round(W / 2); k++) K.box(P('metal'), [-(W - 1) / 2 + k * (W - 1) / Math.round(W / 2), 1.5, D / 2 + 0.06], [0.07, 2.6, 0.05], 'dark');
      door(P, -W / 4, 1.2, 2.5, { at: [0, 0, D / 2 + 0.05] }, null, true);
      K.box(P('paint'), [0, 3.45, D / 2 + 0.15], [W - 0.3, 0.8, 0.25], brand); const T = P('neon'); K.text(T, sh[2], 0, 3.45, D / 2 + 0.29, Math.min(0.11, (W - 1) / (sh[2].length * 4) * 0.95), 'white');
      if (p.awning) { const A = P('cloth2'), n = Math.round(W / 0.5); for (let k = 0; k < n; k++) K.extrude(A, [[D / 2 + 0.05, 3.0], [D / 2 + 1.3, 2.55], [D / 2 + 1.3, 2.35], [D / 2 + 1.35, 2.35], [D / 2 + 1.35, 2.6], [D / 2 + 0.05, 3.08]], 'x', -W / 2 + 0.2 + k * (W - 0.4) / n, -W / 2 + 0.2 + (k + 1) * (W - 0.4) / n, k % 2 ? 'white' : brand); }
      if (p.kind === 'pharmacy') { const c = [W / 2 - 0.1, 3.4, D / 2 - 0.6]; K.box(P('sigGreen'), V.add(c, [0.15, 0, 0]), [0.08, 0.7, 0.22], 'white'); K.box(P('sigGreen'), V.add(c, [0.15, 0, 0]), [0.08, 0.22, 0.7], 'white'); }
      if (p.kind === 'barber') { K.cyl(P('paint'), [W / 2 - 0.5, 1.2, D / 2 + 0.25], [W / 2 - 0.5, 2.4, D / 2 + 0.25], 0.12, 0.12, 6, (t, k) => K.c(['red', 'white', 'blue'][k % 3])); }
      acInto(P, [W / 2 - 1, H, -1.5]); acInto(P, [-W / 2 + 1, H, -1.5]);
      return K.done('shop', P, { collider: K.boxCol(W, H, D), door: { x: -W / 4, z: D / 2 }, light: { at: [0, 3.0, D / 2 + 1], color: [1, 0.95, 0.85], intensity: 1.3, distance: 7 } }); } });

  // ---------- برج مكاتب ----------
  K.def('office_tower', { name: 'برج مكاتب', nameEn: 'Office tower', group: 'buildings',
    schema: [{ key: 'floors', label: 'الأدوار', min: 6, max: 40, step: 1, def: 16 }, { key: 'width', label: 'العرض', min: 12, max: 30, step: 1, def: 18, unit: 'م' }, K.color('glass', 'لون الزجاج', 'glassDark', [['glassDark', 'أزرق غامق'], ['glass', 'أزرق فاتح'], ['#5a8f7a', 'أخضر'], ['#8a7a5a', 'برونزي']]), { key: 'crown', label: 'تاج علوي', type: 'bool', def: true }, { key: 'taper', label: 'تدرّج للأعلى', type: 'bool', def: false }],
    presets: { 'ناطحة سحاب': { floors: 36, width: 22, taper: true }, 'برونزي': { glass: '#8a7a5a', floors: 12 } },
    generate: (p, q) => { const P = K.parts(), rng = AA.rng(p.seed), F = p.floors, W0 = p.width, h = 3.6, S = P('stone'), G = P('glassSolid');
      K.box(S, [0, 2.5, 0], [W0 + 2, 5, W0 + 2], 'concrete'); K.box(G, [0, 2.4, 0], [W0 + 2.04, 3.8, W0 + 2.04], 'glass'); // بهو
      let y = 5, W = W0;
      for (let f = 0; f < F; f++) { if (p.taper && f && f % Math.ceil(F / 3) === 0) W *= 0.82;
        K.box(G, [0, y + h / 2, 0], [W, h - 0.5, W], p.glass); K.box(S, [0, y + 0.25, 0], [W + 0.24, 0.5, W + 0.24], 'greyLight');
        for (const [L, o] of FACES(W, W)) { const n = Math.round(L / 3); for (let k = 1; k < n; k++) K.box(P('metal'), [-L / 2 + k * L / n, y + h / 2, 0.05], [0.12, h - 0.5, 0.1], 'steel', o); if (rng() < 0.25) K.box(P('neon'), [-L / 2 + (Math.floor(rng() * n) + 0.5) * L / n, y + h / 2, 0.03], [L / n - 0.3, h - 0.8, 0.02], '#fff1c8', o); }
        y += h; }
      K.box(S, [0, y + 0.3, 0], [W + 0.2, 0.6, W + 0.2], 'greyLight');
      if (p.crown) { K.box(S, [0, y + 2, 0], [W * 0.6, 3.4, W * 0.6], 'greyLight'); K.rod(P('metal'), [0, y + 3.7, 0], [0, y + 10, 0], 0.15, 'steel'); K.ball(P('sigRed'), [0, y + 10.2, 0], 0.25, 'white'); }
      return K.done('office_tower', P, { collider: K.boxCol(W0 + 2, y, W0 + 2), floors: F, light: p.crown ? { at: [0, y + 10.2, 0], color: [1, 0.1, 0.05], intensity: 1, distance: 6 } : null }); } });

  // ---------- محطة الوقود ----------
  function pumpInto(P, at, rot, brand, q) {
    const o = { at, rot: rot || 0 }, M = P('paint');
    K.box(P('concrete'), [0, 0.1, 0], [1.0, 0.2, 2.4], 'concrete', o);
    K.box(M, [0, 1.05, 0], [0.6, 1.7, 0.9], 'white', o); K.box(M, [0, 1.95, 0], [0.66, 0.25, 0.96], brand, o);
    for (const s of [1, -1]) { K.box(P('screen'), [s * 0.305, 1.5, 0], [0.01, 0.28, 0.5], 'white', o); K.box(P('dark'), [s * 0.31, 1.15, 0.2], [0.02, 0.25, 0.25], 'black', o); for (let k = 0; k < 3; k++) { K.box(P('dark'), [s * 0.34, 0.85, -0.3 + k * 0.17], [0.06, 0.18, 0.07], ['green', 'red', 'yellow'][k], o); }
      K.rod(P('rubber'), [s * 0.33, 0.95, -0.38], [s * 0.45, 0.5, -0.38], 0.02, 'rubber', o); }
    K.box(M, [0, 0.12, 0], [0.62, 0.04, 0.92], 'dark', o);
  }
  K.pumpInto = pumpInto;
  const BRANDS = [['red', 'أحمر'], ['green', 'أخضر'], ['blue', 'أزرق'], ['yellow', 'أصفر'], ['orange', 'برتقالي']];
  K.def('fuel_pump', { name: 'مضخة وقود', nameEn: 'Fuel pump', group: 'buildings', schema: [K.color('brand', 'لون الشركة', 'green')], presets: { 'حمراء': { brand: 'red' } },
    generate: (p, q) => { const P = K.parts(); pumpInto(P, [0, 0, 0], 0, p.brand, q); return K.done('fuel_pump', P, { collider: K.boxCol(1, 2.1, 2.4) }); } });
  K.def('gas_station', { name: 'محطة وقود', nameEn: 'Gas station', group: 'buildings',
    schema: [{ key: 'pumps', label: 'جزر المضخات', min: 1, max: 4, step: 1, def: 3 }, { key: 'brand', label: 'لون الشركة', type: 'enum', options: BRANDS, def: 'green' }, { key: 'store', label: 'بقالة', type: 'bool', def: true }, { key: 'sign', label: 'لوحة الأسعار', type: 'bool', def: true }, { key: 'carwash', label: 'مغسلة', type: 'bool', def: false }],
    presets: { 'محطة صغيرة': { pumps: 1, store: false }, 'محطة طريق سريع': { pumps: 4, carwash: true, brand: 'red' } },
    generate: (p, q) => {
      const P = K.parts(), n = p.pumps, gap = 5, Wc = n * gap + 2, Dc = 9, Hc = 5.4, S = P('stone'), M = P('metal'), brand = p.brand;
      const LW = Wc + 18, LD = 26;
      K.box(P('concrete'), [0, 0.03, 0], [LW, 0.06, LD], 'concrete'); // أرضية المحطة
      for (let k = -2; k <= 2; k++) K.box(P('dark'), [k * LW / 5, 0.065, 0], [0.05, 0.01, LD], 'concreteDark');
      // المظلة
      const cz = 2; K.box(S, [0, Hc + 0.4, cz], [Wc, 0.8, Dc], 'white'); K.box(P('paint'), [0, Hc + 0.25, cz + Dc / 2 + 0.02], [Wc + 0.04, 0.35, 0.05], brand); K.box(P('paint'), [0, Hc + 0.25, cz - Dc / 2 - 0.02], [Wc + 0.04, 0.35, 0.05], brand);
      for (const s of [1, -1]) K.box(P('paint'), [s * (Wc / 2 + 0.02), Hc + 0.25, cz], [0.05, 0.35, Dc], brand);
      K.box(P('lamp'), [0, Hc - 0.02, cz], [Wc - 1, 0.04, Dc - 1.5], 'white');
      for (let k = 0; k < n; k++) { const x = -Wc / 2 + 1 + (k + 0.5) * gap; K.box(M, [x, Hc / 2, cz], [0.4, Hc, 0.4], 'white'); K.box(P('paint'), [x, 0.6, cz], [0.44, 1.0, 0.44], brand); pumpInto(P, [x, 0, cz - 2.2], 0, brand, q); pumpInto(P, [x, 0, cz + 2.2], 0, brand, q); }
      // البقالة
      if (p.store) { const sw = 12, sd = 7, sx = 0, sz = -LD / 2 + sd / 2 + 1, sh = 4;
        K.box(S, [sx, sh / 2, sz], [sw, sh, sd], 'offwhite'); K.box(P('glassSolid'), [sx, 1.4, sz + sd / 2 + 0.03], [sw - 2, 2.4, 0.04], 'glass'); door(P, sx + 2, 1.8, 2.4, { at: [0, 0, sz + sd / 2 + 0.05] }, null, true);
        K.box(P('paint'), [sx, sh - 0.4, sz + sd / 2 + 0.12], [sw, 0.8, 0.2], brand); K.text(P('neon'), 'MINI MARKET', sx, sh - 0.4, sz + sd / 2 + 0.24, 0.1, 'white'); parapet(P, sw, sd, sh, 'offwhite', 0.5); acInto(P, [sx + 3, sh, sz - 1]); }
      // لوحة الأسعار
      if (p.sign) { const x = LW / 2 - 1.5, z = LD / 2 - 1.5, H = 7.5; K.box(S, [x, 0.4, z], [1.4, 0.8, 0.8], 'concreteDark'); K.box(P('paint'), [x, H / 2 + 0.8, z], [1.6, H, 0.4], 'white'); K.box(P('paint'), [x, H - 0.4, z], [1.7, 1.6, 0.45], brand);
        for (const [k, pr, c] of [[0, '91', 'green'], [1, '95', 'red'], [2, 'D', 'yellow']]) { const y = H - 2.2 - k * 1.2; K.box(P('dark'), [x, y, z + 0.21], [1.3, 0.9, 0.02], 'black'); K.text(P('neon'), pr, x - 0.28, y, z + 0.23, 0.07, c); K.text(P('neon'), ['2.18', '2.33', '1.66'][k].replace('.', ''), x + 0.28, y, z + 0.23, 0.05, 'white'); } }
      // ماء وهواء
      { const x = -LW / 2 + 2, z = LD / 2 - 3; K.box(P('paint'), [x, 0.8, z], [0.6, 1.6, 0.5], 'blue'); K.box(P('screen'), [x, 1.2, z + 0.26], [0.4, 0.3, 0.01], 'white'); K.rod(P('rubber'), [x + 0.31, 1.0, z], [x + 0.5, 0.3, z + 0.3], 0.02, 'rubber'); }
      if (p.carwash) { const x = -LW / 2 + 4.5, z = -LD / 2 + 5, w = 5, d = 8, h = 4.2; K.box(S, [x, h + 0.2, z], [w, 0.4, d], 'white'); for (const s of [1, -1]) K.box(S, [x + s * (w / 2 - 0.15), h / 2, z], [0.3, h, d], 'white'); K.box(P('paint'), [x, h + 0.2, z + d / 2 + 0.02], [w, 0.4, 0.04], brand);
        for (const s of [1, -1]) K.cyl(P('cloth'), [x + s * 1.4, 0.3, z], [x + s * 1.4, 3.2, z], 0.45, 0.45, 8, s > 0 ? 'blue' : 'red'); }
      return K.done('gas_station', P, { collider: K.boxCol(Wc, Hc + 0.8, Dc), lot: [LW, LD], light: { at: [0, Hc - 0.3, cz], color: [0.95, 0.97, 1], intensity: 3, distance: 16 }, pumpsAt: Array.from({ length: n }, (_, k) => [-Wc / 2 + 1 + (k + 0.5) * gap, 0, cz]) });
    } });

  // ---------- مسجد حي ----------
  K.def('mosque_modern', { name: 'مسجد', nameEn: 'Mosque', group: 'buildings',
    schema: [{ key: 'size', label: 'المقاس', min: 10, max: 30, step: 1, def: 16, unit: 'م' }, { key: 'minarets', label: 'المنارات', min: 1, max: 2, step: 1, def: 1 }, K.color('dome', 'لون القبة', 'white', [['#3f8a5a', 'أخضر'], ['gold', 'ذهبي']]), { key: 'color', label: 'الجدران', type: 'enum', options: WALLC.slice(0, 4), def: 'white' }],
    presets: { 'قبة ذهبية': { dome: 'gold', minarets: 2, size: 24 }, 'صغير': { size: 11, dome: '#3f8a5a' } },
    generate: (p, q) => { const P = K.parts(), S = P('stone'), W = p.size, D = p.size * 0.8, H = 6, col = wc(p.color), n = K.sides(q, 14);
      K.box(S, [0, 0.25, 0], [W + 1, 0.5, D + 1], 'concreteDark'); K.box(S, [0, H / 2 + 0.5, 0], [W, H, D], col); K.box(S, [0, H + 0.5, 0], [W + 0.4, 0.3, D + 0.4], 'offwhite');
      for (const [L, o] of FACES(W, D)) { const m = Math.max(2, Math.floor(L / 3)); for (let k = 0; k < m; k++) { const x = -L / 2 + (k + 0.5) * L / m; K.extrude(P('glassSolid'), [[-0.55, 1.6], [0.55, 1.6], [0.55, 3.8], [0, 4.5], [-0.55, 3.8]], 'z', 0.02, 0.06, 'glass', { at: V.add(o.at, [Math.cos(o.rot) * x, 0, -Math.sin(o.rot) * x]), rot: o.rot }); } }
      K.extrude(P('wood'), [[-1, 0.5], [1, 0.5], [1, 3.2], [0, 3.9], [-1, 3.2]], 'z', D / 2 + 0.02, D / 2 + 0.08, 'woodDark');
      // القبة
      const r = Math.min(W, D) * 0.28, cy = H + 0.8; K.cyl(S, [0, cy, 0], [0, cy + 1.2, 0], r, r, n, col);
      const rings = 5; for (let i = 0; i < rings; i++) { const a0 = i / rings * Math.PI / 2, a1 = (i + 1) / rings * Math.PI / 2; K.cyl(P('paint'), [0, cy + 1.2 + Math.sin(a0) * r * 1.1, 0], [0, cy + 1.2 + Math.sin(a1) * r * 1.1, 0], Math.cos(a0) * r * 1.02, Math.cos(a1) * r * 1.02 + 0.001, n, p.dome, null, { noCaps: i < rings - 1 && i > 0 }); }
      K.rod(P('metal'), [0, cy + 1.2 + r * 1.1, 0], [0, cy + 2.2 + r * 1.1, 0], 0.06, 'gold');
      // المنارات
      const ms = p.minarets === 2 ? [1, -1] : [1];
      for (const s of ms) { const x = s * (W / 2 + 1.2), z = D / 2 - 1, mh = H * 3.2; K.box(S, [x, mh * 0.35, z], [2, mh * 0.7, 2], col); K.cyl(S, [x, mh * 0.7, z], [x, mh, z], 0.8, 0.65, K.sides(q, 8), col); K.cyl(S, [x, mh * 0.7, z], [x, mh * 0.7 + 0.3, z], 1.25, 1.25, K.sides(q, 8), 'offwhite'); K.cyl(S, [x, mh, z], [x, mh + 0.3, z], 0.9, 0.9, 8, 'offwhite'); K.cyl(P('paint'), [x, mh + 0.3, z], [x, mh + 2.2, z], 0.7, 0.02, 8, p.dome); K.box(P('lampCool'), [x, mh * 0.85, z + 0.66], [0.25, 0.8, 0.05], 'white'); }
      tankInto(P, [-W / 2 + 1.5, H + 0.65, -D / 2 + 1.5], q); acInto(P, [W / 2 - 1.5, H + 0.65, -D / 2 + 1.2]); acInto(P, [W / 2 - 2.8, H + 0.65, -D / 2 + 1.2]);
      return K.done('mosque_modern', P, { collider: K.boxCol(W, H, D), door: { x: 0, z: D / 2 } }); } });

  // ---------- مستودع ----------
  K.def('warehouse', { name: 'مستودع', nameEn: 'Warehouse', group: 'buildings',
    schema: [{ key: 'length', label: 'الطول', min: 12, max: 40, step: 2, def: 20, unit: 'م' }, { key: 'width', label: 'العرض', min: 10, max: 24, step: 1, def: 14, unit: 'م' }, K.color('color', 'اللون', 'greyLight', [['greyLight', 'رمادي فاتح'], ['#6f8fa8', 'أزرق']]), { key: 'doors', label: 'أبواب الشحن', min: 1, max: 4, step: 1, def: 2 }],
    presets: { 'أزرق كبير': { color: '#6f8fa8', length: 32, doors: 3 } },
    generate: (p, q) => { const P = K.parts(), L = p.length, W = p.width, H = 7, rh = 1.6, S = P('metal');
      K.box(P('stone'), [0, 0.3, 0], [W + 0.4, 0.6, L + 0.4], 'concrete');
      K.extrude(S, [[-W / 2, 0.6], [W / 2, 0.6], [W / 2, H], [0, H + rh], [-W / 2, H]], 'z', -L / 2, L / 2, p.color);
      for (const s of [1, -1]) { const m = Math.round(L / 0.6); for (let k = 0; k < m; k++) K.box(S, [s * (W / 2 + 0.02), (H + 0.6) / 2, -L / 2 + (k + 0.5) * L / m], [0.04, H - 0.6, 0.08], AA.mixc(K.c(p.color), [0, 0, 0], 0.12)); }
      for (const s of [1, -1]) K.extrude(P('paint'), [[s * (W / 2 + 0.3), H - 0.1], [0, H + rh + 0.1], [0, H + rh + 0.25], [s * (W / 2 + 0.3), H + 0.05]], 'z', -L / 2 - 0.2, L / 2 + 0.2, 'roofGrey');
      const dw = 3.6, n = p.doors; for (let k = 0; k < n; k++) { const x = -W / 2 + (k + 0.5) * W / n; K.box(P('paint'), [x, 2.8, L / 2 + 0.03], [dw, 4.2, 0.06], 'offwhite'); for (let r = 0; r < 12; r++) K.box(P('dark'), [x, 0.9 + r * 0.35, L / 2 + 0.07], [dw, 0.02, 0.02], 'grey'); K.box(P('stone'), [x, 0.3, L / 2 + 1.0], [dw + 1, 0.6, 2], 'concreteDark'); K.box(P('amber'), [x + dw / 2 + 0.3, 5.3, L / 2 + 0.06], [0.2, 0.2, 0.06], 'white'); }
      door(P, W / 2 - 1.2, 1.0, 2.2, { at: [0, 0.6, L / 2 + 0.03] }, 'grey');
      return K.done('warehouse', P, { collider: K.boxCol(W, H + rh, L) }); } });

  // ---------- سور ببوابة ----------
  K.def('compound_wall', { name: 'سور ببوابة', nameEn: 'Compound wall', group: 'buildings',
    schema: [{ key: 'length', label: 'الطول', min: 2, max: 20, step: 1, def: 8, unit: 'م' }, { key: 'height', label: 'الارتفاع', min: 1.5, max: 4, step: 0.1, def: 2.7, unit: 'م' }, { key: 'gate', label: 'البوابة', type: 'enum', options: [['none', 'بدون'], ['person', 'باب مشاة'], ['car', 'بوابة سيارة'], ['both', 'الاثنين']], def: 'car' }, { key: 'color', label: 'اللون', type: 'enum', options: WALLC, def: 'sandstone' }],
    presets: { 'بدون بوابة': { gate: 'none' }, 'باب مشاة': { gate: 'person', length: 4 } },
    generate: (p, q) => { const P = K.parts(), L = p.length, H = p.height, t = 0.25, col = wc(p.color), B = P('stone'), holes = [];
      if (p.gate === 'car' || p.gate === 'both') holes.push([L / 2 - 5, L / 2 - 0.8, 'car']); if (p.gate === 'person' || p.gate === 'both') holes.push([-L / 2 + 0.8, -L / 2 + 2.0, 'person']);
      let x = -L / 2; for (const [a, b] of holes.map(h => [Math.max(-L / 2, h[0]), Math.min(L / 2, h[1])]).sort((a, b) => a[0] - b[0])) { if (a - x > 0.02) K.box(B, [(x + a) / 2, H / 2, 0], [a - x, H, t], col); x = b; } if (L / 2 - x > 0.02) K.box(B, [(x + L / 2) / 2, H / 2, 0], [L / 2 - x, H, t], col);
      K.box(B, [0, H + 0.05, 0], [L + 0.1, 0.1, t + 0.1], 'offwhite');
      for (const [a, b, kind] of holes) { const w = Math.min(L / 2, b) - Math.max(-L / 2, a), cx = (a + b) / 2; if (w < 0.3) continue;
        if (kind === 'person') { K.box(B, [cx, H - 0.25, 0], [w, 0.5, t], col); K.door(P, cx, w - 0.1, 2.15, { at: [0, 0, 0.06] }, 'dark'); }
        else { const M = P('metal'); K.box(M, [cx, 1.0, 0], [w, 2.0, 0.06], 'dark'); for (let k = 0; k < Math.round(w / 0.3); k++) K.box(M, [a + (k + 0.5) * w / Math.round(w / 0.3), 1.0, 0.04], [0.06, 1.9, 0.02], 'grey'); } }
      return K.done('compound_wall', P, { collider: K.boxCol(L, H, t) }); } });
})(typeof window !== 'undefined' ? window : globalThis);
