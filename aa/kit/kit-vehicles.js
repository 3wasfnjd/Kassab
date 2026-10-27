// Aboden Assets — kit/kit-vehicles.js — المركبات: سيدان (وتاكسي وشرطة)، جيب SUV، ونيت حديث، فان (وإسعاف)، باص، شاحنة (صندوق/صهريج/سطحة)، دباب، سيكل، طيارة ركاب، طيارة صغيرة بمروحة، هليكوبتر، قارب
// العجلات أجزاء تدور (الأمامية تلف مع المقود)، والمراوح أجزاء rotor تدور باستمرار. الأمام = +Z.
(function (g) {
  'use strict';
  const AA = g.AA, K = AA.kit, V = AA.v, lerp = AA.lerp, mixc = AA.mixc;

  // بثق مقطع جانبي (z,y) بعرض يتغير مع الارتفاع hw(y)
  function extrudeW(B, prof, hw, col, o) {
    const { tris, ccw } = K.earclip(prof), n = prof.length, H = typeof hw === 'function' ? hw : () => hw, cc = K.c(col);
    const P3 = (pt, s) => [s * H(pt[1]), pt[1], pt[0]];
    for (const s of [1, -1]) for (const [a, b, c] of tris) K.tri(B, P3(prof[a], s), P3(prof[b], s), P3(prof[c], s), cc, [s, 0, 0], o);
    for (let i = 0; i < n; i++) { const a = prof[i], b = prof[(i + 1) % n], dz = b[0] - a[0], dy = b[1] - a[1], nrm = ccw ? [0, -dz, dy] : [0, dz, -dy];
      K.quad(B, P3(a, 1), P3(b, 1), P3(b, -1), P3(a, -1), cc, nrm, o); }
  }
  K.extrudeW = extrudeW;
  const arch = (zc, R, y0, n) => { const pts = [], Ra = R + 0.07; for (let k = 0; k <= n; k++) { const a = Math.PI - k / n * Math.PI; pts.push([zc + Math.cos(a) * Ra, Math.max(y0, R + Math.sin(a) * Ra * 0.95)]); } return pts; };
  const PAINT = { white: 'white', black: 'black', grey: 'grey', red: 'red', blue: 'blue', green: 'green', yellow: 'yellow', orange: 'orange', navy: 'navy', teal: 'teal', brown: 'brown', sandstone: 'sandstone', silver: 'greyLight' };
  const COL = K.COLORS.concat([['silver', 'فضي']]);

  // ---------- سيارة عامة: هيكل سفلي بأقواس + مقصورة زجاج بأعمدة وسقف ----------
  // s = { L, W, R, axF, axR, b0 (أسفل الهيكل), belt, hood, trunk, roof, cowl, wsTop, roofRear, rearBot, boxy, cabin (هيكل منفصل للونيت) }
  function carInto(P, s, paint, q, ex) {
    ex = ex || {};
    const Bd = P('paint'), n = q === 'low' ? 4 : 6, L = s.L, hwB = s.W / 2;
    const prof = [[-L / 2, s.b0 + 0.12], [-L / 2 + 0.08, s.b0]].concat(arch(s.axR, s.R, s.b0, n), arch(s.axF, s.R, s.b0, n), [[L / 2 - 0.1, s.b0], [L / 2, s.b0 + 0.14], [L / 2, s.hood - 0.12], [L / 2 - 0.12, s.hood], [s.cowl, s.belt], [s.rearBot, s.belt]].concat(ex.bed ? [[s.rearBot - 0.08, s.belt], [s.rearBot - 0.08, ex.bed], [-L / 2, ex.bed]] : [[-L / 2 + 0.05, s.trunk], [-L / 2, s.trunk - 0.12]]));
    extrudeW(Bd, prof.reverse(), y => hwB - 0.04 * AA.smooth(s.b0 + 0.25, s.b0, y), paint);
    // المقصورة: زجاج داكن، وفوقها سقف وأعمدة بلون السيارة
    const top = hwB - 0.14, bot = hwB - 0.05, hw = y => lerp(bot, top, AA.clamp((y - s.belt) / (s.roof - s.belt), 0, 1));
    const cab = [[s.cowl, s.belt], [s.wsTop, s.roof], [s.roofRear, s.roof], [s.rearBot, s.belt]];
    extrudeW(P('glassSolid'), cab.reverse(), hw, 'glassDark');
    K.box(Bd, [0, s.roof + 0.02, (s.wsTop + s.roofRear) / 2], [top * 2 + 0.02, 0.05, s.wsTop - s.roofRear + 0.04], paint);
    for (const x of [1, -1]) { K.rod(Bd, [x * bot, s.belt, s.cowl], [x * top, s.roof, s.wsTop], 0.045, paint, null, 4); K.rod(Bd, [x * bot, s.belt, s.rearBot], [x * top, s.roof, s.roofRear], 0.06, paint, null, 4);
      const bz = lerp(s.wsTop, s.roofRear, 0.45); K.rod(Bd, [x * bot, s.belt, bz + 0.05], [x * top, s.roof, bz], 0.04, paint, null, 4);
      if (ex.cpillar) K.rod(Bd, [x * bot, s.belt, lerp(bz, s.rearBot, 0.55)], [x * top, s.roof, lerp(bz, s.roofRear, 0.55)], 0.035, paint, null, 4); }
    // الواجهة والخلفية
    const D = P('dark'), fz = L / 2 + 0.005, rz = -L / 2 - 0.005;
    for (const x of [1, -1]) { K.box(P('lamp'), [x * (hwB - 0.25), s.hood - 0.16, fz], [0.32, 0.1, 0.04], 'white'); K.box(P('tail'), [x * (hwB - 0.18), s.trunk - 0.2, rz], [0.26, 0.12, 0.04], 'red'); K.box(P('amber'), [x * (hwB - 0.012), s.hood - 0.16, L / 2 - 0.15], [0.04, 0.06, 0.12], 'orange');
      K.box(D, [x * (hwB + 0.06), s.belt + 0.08, s.cowl - 0.15], [0.12, 0.1, 0.06], 'black'); }
    K.box(D, [0, s.hood - 0.18, fz], [hwB * 0.8, 0.14, 0.03], 'black'); // الشبك
    K.box(D, [0, s.b0 + 0.08, fz + 0.02], [hwB * 2 + 0.02, 0.16, 0.08], 'dark'); K.box(D, [0, s.b0 + 0.08, rz - 0.02], [hwB * 2 + 0.02, 0.16, 0.08], 'dark');
    K.box(P('plastic'), [0, s.b0 + 0.24, rz - 0.01], [0.5, 0.12, 0.02], 'white'); // اللوحة
    // خطوط الأبواب والمقابض
    const dz = ex.doorZ || [s.cowl - 0.05, lerp(s.wsTop, s.roofRear, 0.45) + 0.03, s.rearBot + 0.1];
    for (const x of [1, -1]) { for (const z of dz) K.box(D, [x * (hwB + 0.002), (s.b0 + s.belt) / 2 + 0.05, z], [0.006, s.belt - s.b0 - 0.2, 0.012], 'dark'); for (let k = 0; k < dz.length - 1; k++) K.box(P('chrome'), [x * (hwB + 0.01), s.belt - 0.1, dz[k + 1] + 0.18], [0.02, 0.03, 0.14], 'chrome'); }
    // الداخل (مقاعد ومقود) يبان من الزجاج
    const I = P('cloth'); for (const x of [0.4, -0.4]) { K.box(I, [x * hwB * 1.3, s.b0 + 0.45, s.cowl - 0.75], [0.45, 0.12, 0.45], 'dark'); K.box(I, [x * hwB * 1.3, s.b0 + 0.75, s.cowl - 1.0], [0.45, 0.55, 0.1], 'dark'); }
    K.cyl(D, [0.4 * hwB * 1.3, s.belt + 0.02, s.cowl - 0.35], [0.4 * hwB * 1.3, s.belt + 0.06, s.cowl - 0.45], 0.17, 0.17, 8, 'black');
  }
  function carDone(id, P, s, q, rim, extra) {
    K.wheels(P, [{ z: s.axF, x: s.W / 2 - 0.13, R: s.R, w: s.tw || 0.22, steer: true }].concat((s.rear || [s.axR]).map(z => ({ z, x: s.W / 2 - 0.13, R: s.R, w: s.tw || 0.22, dual: s.dual }))), q, rim);
    return K.done(id, P, Object.assign({ collider: K.boxCol(s.W, s.roof, s.L), physics: { wheelbase: s.axF - s.axR, mass: s.mass || 1400 }, walkSpeed: s.speed || 6, seats: [[0.4, s.b0 + 0.5, s.cowl - 0.75]], driver: [0.4 * s.W / 2 * 1.3, s.b0 + 0.5, s.cowl - 0.75] }, extra || {}));
  }

  K.def('sedan', { name: 'سيارة سيدان', nameEn: 'Sedan', group: 'vehicles',
    schema: [{ key: 'color', label: 'اللون', type: 'enum', options: COL, def: 'silver' }, { key: 'body', label: 'الشكل', type: 'enum', options: [['sedan', 'سيدان'], ['hatch', 'هاتشباك'], ['coupe', 'كوبيه']], def: 'sedan' }, { key: 'livery', label: 'الاستخدام', type: 'enum', options: [['none', 'خاصة'], ['taxi', 'تاكسي'], ['police', 'شرطة']], def: 'none' }, { key: 'rims', label: 'الجنوط', type: 'enum', options: [['greyLight', 'فضي'], ['black', 'أسود'], ['gold', 'ذهبي']], def: 'greyLight' }],
    presets: { 'تاكسي': { livery: 'taxi', color: 'white' }, 'شرطة': { livery: 'police', color: 'white' }, 'هاتشباك أحمر': { body: 'hatch', color: 'red' }, 'كوبيه أسود': { body: 'coupe', color: 'black', rims: 'gold' } },
    generate: (p, q) => { const P = K.parts(), b = p.body, paint = PAINT[p.color] || p.color;
      const s = b === 'hatch' ? { L: 4.1, W: 1.78, R: 0.31, axF: 1.3, axR: -1.25, b0: 0.2, belt: 0.92, hood: 0.86, trunk: 0.98, roof: 1.48, cowl: 0.85, wsTop: 0.05, roofRear: -1.65, rearBot: -1.98 }
        : b === 'coupe' ? { L: 4.5, W: 1.85, R: 0.33, axF: 1.4, axR: -1.3, b0: 0.18, belt: 0.86, hood: 0.78, trunk: 0.88, roof: 1.3, cowl: 0.75, wsTop: -0.15, roofRear: -0.95, rearBot: -1.75 }
        : { L: 4.7, W: 1.82, R: 0.32, axF: 1.42, axR: -1.38, b0: 0.2, belt: 0.92, hood: 0.84, trunk: 0.94, roof: 1.45, cowl: 0.95, wsTop: 0.15, roofRear: -0.95, rearBot: -1.55 };
      carInto(P, s, paint, q, { doorZ: b === 'coupe' ? [s.cowl - 0.05, -0.6] : null });
      if (p.livery === 'taxi') { K.box(P('paint'), [0, s.roof + 0.14, -0.4], [0.6, 0.18, 0.3], 'yellow'); K.text(P('neon'), 'TAXI', 0, s.roof + 0.14, -0.24, 0.025, 'black'); for (const x of [1, -1]) K.box(P('paint'), [x * (s.W / 2 + 0.004), 0.6, -0.1], [0.008, 0.12, 2.6], 'yellow'); }
      if (p.livery === 'police') { for (const x of [1, -1]) { K.box(P('paint'), [x * (s.W / 2 + 0.004), 0.62, 0], [0.008, 0.18, s.L - 0.8], 'green'); K.text(P('paint'), 'POLICE', 0, 0.82, 0, 0.035, 'navy', { at: [x * (s.W / 2 + 0.01), 0, 0], rot: x * Math.PI / 2 }); }
        K.box(P('dark'), [0, s.roof + 0.07, -0.3], [1.1, 0.08, 0.25], 'black'); K.box(P('sigRed'), [0.3, s.roof + 0.14, -0.3], [0.4, 0.08, 0.2], 'white'); K.box(P('lampCool'), [-0.3, s.roof + 0.14, -0.3], [0.4, 0.08, 0.2], 'blue'); }
      return carDone('sedan', P, s, q, p.rims, { light: { at: [0, s.hood - 0.15, s.L / 2 + 1.5], color: [1, 0.95, 0.85], intensity: 1.2, distance: 9 } }); } });

  K.def('suv', { name: 'جيب SUV', nameEn: 'SUV', group: 'vehicles',
    schema: [{ key: 'color', label: 'اللون', type: 'enum', options: COL, def: 'black' }, { key: 'rack', label: 'شبك سقف', type: 'bool', def: true }, { key: 'spare', label: 'استبنة خلفية', type: 'bool', def: false }, { key: 'rims', label: 'الجنوط', type: 'enum', options: [['greyLight', 'فضي'], ['black', 'أسود'], ['gold', 'ذهبي']], def: 'greyLight' }],
    presets: { 'أبيض': { color: 'white' }, 'رملي باستبنة': { color: 'sandstone', spare: true, rims: 'black' } },
    generate: (p, q) => { const P = K.parts(), paint = PAINT[p.color] || p.color, s = { L: 4.9, W: 1.98, R: 0.38, axF: 1.48, axR: -1.42, b0: 0.32, belt: 1.12, hood: 1.06, trunk: 1.12, roof: 1.86, cowl: 1.0, wsTop: 0.45, roofRear: -2.3, rearBot: -2.42, tw: 0.27, mass: 2300 };
      carInto(P, s, paint, q, { cpillar: true, doorZ: [s.cowl - 0.05, -0.1, -1.4] });
      K.box(P('dark'), [0, s.b0 + 0.05, 0], [s.W + 0.02, 0.08, 1.6], 'dark'); // عتبة جانبية
      if (p.rack) { for (const x of [1, -1]) K.box(P('metal'), [x * (s.W / 2 - 0.2), s.roof + 0.1, -0.9], [0.05, 0.05, 2.4], 'dark'); for (const z of [-1.9, -0.9, 0.1]) K.box(P('metal'), [0, s.roof + 0.12, z], [s.W - 0.4, 0.04, 0.05], 'dark'); }
      if (p.spare) { K.cyl(P('rubber'), [0, 1.0, -s.L / 2 - 0.02], [0, 1.0, -s.L / 2 - 0.27], 0.36, 0.36, 10, 'rubber'); K.cyl(P('paint'), [0, 1.0, -s.L / 2 - 0.27], [0, 1.0, -s.L / 2 - 0.29], 0.25, 0.25, 10, paint); }
      return carDone('suv', P, s, q, p.rims); } });

  K.def('pickup', { name: 'ونيت حديث', nameEn: 'Pickup truck', group: 'vehicles',
    schema: [{ key: 'color', label: 'اللون', type: 'enum', options: COL, def: 'white' }, { key: 'cab', label: 'الغمارة', type: 'enum', options: [['double', 'غمارتين'], ['single', 'غمارة']], def: 'double' }, { key: 'load', label: 'الحمولة', type: 'enum', options: [['none', 'فاضي'], ['boxes', 'كراتين'], ['water', 'قوارير ماء']], def: 'none' }],
    presets: { 'غمارة واحدة': { cab: 'single', color: 'grey' }, 'محمّل': { load: 'boxes', color: 'red' } },
    generate: (p, q) => { const P = K.parts(), paint = PAINT[p.color] || p.color, dbl = p.cab === 'double', s = { L: 5.4, W: 1.92, R: 0.38, axF: 1.75, axR: -1.65, b0: 0.36, belt: 1.12, hood: 1.08, trunk: 1.12, roof: 1.84, cowl: 1.25, wsTop: 0.7, roofRear: dbl ? -0.8 : 0.0, rearBot: dbl ? -0.85 : -0.05, tw: 0.26, mass: 2100 };
      const bedY = s.b0 + 0.42; carInto(P, s, paint, q, { doorZ: dbl ? [s.cowl - 0.05, 0.0, -0.8] : [s.cowl - 0.05, -0.05], bed: bedY });
      // صندوق الحمولة المكشوف: أرضية وجوانب وباب خلفي
      const z0 = s.rearBot - 0.08, z1 = -s.L / 2, Bd = P('paint'), bw = s.W / 2 - 0.04;
      K.box(P('dark'), [0, bedY + 0.01, (z0 + z1) / 2], [s.W - 0.14, 0.02, z0 - z1 - 0.02], 'dark');
      for (const x of [1, -1]) { K.box(Bd, [x * (bw - 0.03), (bedY + s.belt) / 2, (z0 + z1) / 2], [0.07, s.belt - bedY, z0 - z1], paint); K.box(P('dark'), [x * (bw - 0.03), s.belt + 0.01, (z0 + z1) / 2], [0.09, 0.025, z0 - z1], 'dark'); }
      K.box(Bd, [0, (bedY + s.belt) / 2, z1 + 0.035], [bw * 2 - 0.14, s.belt - bedY, 0.07], paint);
      if (p.load === 'boxes') { const rng = AA.rng(p.seed); for (let i = 0; i < 6; i++) K.box(P('cloth'), [(i % 2 - 0.5) * 0.7, bedY + 0.21 + Math.floor(i / 4) * 0.4, z0 - 0.4 - (Math.floor(i / 2) % 2) * 0.7], [0.6, 0.38, 0.6], AA.vary(K.c('#c9a06a'), rng, 0.08)); }
      if (p.load === 'water') for (let i = 0; i < 12; i++) K.cyl(P('water'), [((i % 4) - 1.5) * 0.4, bedY + 0.02, z0 - 0.35 - Math.floor(i / 4) * 0.45], [((i % 4) - 1.5) * 0.4, bedY + 0.47, z0 - 0.35 - Math.floor(i / 4) * 0.45], 0.14, 0.14, 8, 'water2');
      return carDone('pickup', P, s, q, 'greyLight'); } });

  K.def('van', { name: 'فان', nameEn: 'Van', group: 'vehicles',
    schema: [{ key: 'color', label: 'اللون', type: 'enum', options: COL, def: 'white' }, { key: 'livery', label: 'الاستخدام', type: 'enum', options: [['none', 'عادي'], ['ambulance', 'إسعاف'], ['delivery', 'توصيل']], def: 'none' }],
    presets: { 'إسعاف': { livery: 'ambulance', color: 'white' }, 'توصيل': { livery: 'delivery', color: 'orange' } },
    generate: (p, q) => { const P = K.parts(), paint = PAINT[p.color] || p.color, s = { L: 5.5, W: 2.0, R: 0.36, axF: 1.9, axR: -1.7, b0: 0.32, belt: 1.15, hood: 1.05, trunk: 2.35, roof: 2.45, cowl: 1.7, wsTop: 1.0, roofRear: -2.65, rearBot: -2.7, tw: 0.24, mass: 2600 };
      carInto(P, s, paint, q, { doorZ: [s.cowl - 0.05, 0.55, -0.6] });
      const Bd = P('paint'); for (const x of [1, -1]) K.box(Bd, [x * (s.W / 2 - 0.1), (s.belt + s.roof) / 2, -1.25], [0.2, s.roof - s.belt, 2.6], paint); // جوانب مصمتة للحمولة
      if (p.livery === 'ambulance') { for (const x of [1, -1]) { K.box(Bd, [x * (s.W / 2 + 0.004), 0.95, -0.5], [0.008, 0.2, 4.0], 'red'); const c = [x * (s.W / 2 + 0.01), 1.8, -1.2]; K.box(Bd, c, [0.01, 0.6, 0.18], 'red'); K.box(Bd, c, [0.01, 0.18, 0.6], 'red'); }
        K.box(P('sigRed'), [0.5, s.roof + 0.08, 0.6], [0.5, 0.12, 0.25], 'white'); K.box(P('lampCool'), [-0.5, s.roof + 0.08, 0.6], [0.5, 0.12, 0.25], 'blue'); }
      if (p.livery === 'delivery') for (const x of [1, -1]) { K.box(Bd, [x * (s.W / 2 + 0.004), 1.75, -1.2], [0.008, 0.8, 2.4], 'white'); K.text(P('paint'), 'EXPRESS', 0, 1.75, 0, 0.06, 'orange', { at: [x * (s.W / 2 + 0.012), 0, -1.2], rot: x * Math.PI / 2 }); }
      return carDone('van', P, s, q, 'greyLight'); } });

  K.def('bus', { name: 'باص', nameEn: 'Bus', group: 'vehicles',
    schema: [K.color('color', 'اللون', 'teal', [['silver', 'فضي']]), { key: 'kind', label: 'النوع', type: 'enum', options: [['city', 'نقل عام'], ['school', 'مدرسي'], ['coach', 'سفر']], def: 'city' }],
    presets: { 'باص مدرسة': { kind: 'school', color: 'yellow' }, 'باص سفر': { kind: 'coach', color: 'white' } },
    generate: (p, q) => { const P = K.parts(), L = p.kind === 'school' ? 10 : 12, W = 2.5, H = p.kind === 'coach' ? 3.5 : 3.1, R = 0.5, b0 = 0.4, axF = L / 2 - 2.4, axR = -L / 2 + 2.8, paint = PAINT[p.color] || p.color, n = q === 'low' ? 4 : 6, Bd = P('paint');
      const prof = [[-L / 2, b0], ...arch(axR, R, b0, n), ...arch(axF, R, b0, n), [L / 2, b0], [L / 2, H - 0.15], [L / 2 - 0.15, H], [-L / 2 + 0.15, H], [-L / 2, H - 0.15]];
      extrudeW(Bd, prof.reverse(), W / 2, paint);
      const G = P('glassSolid'), wy0 = 1.35, wy1 = H - 0.35;
      for (const x of [1, -1]) { const m = Math.round((L - 3.5) / 1.4); for (let k = 0; k < m; k++) { const z = -L / 2 + 0.8 + (k + 0.5) * (L - 3.2) / m; K.box(G, [x * (W / 2 + 0.005), (wy0 + wy1) / 2, z], [0.01, wy1 - wy0, (L - 3.2) / m - 0.12], 'glassDark'); } }
      K.box(G, [0, (0.9 + wy1 + 0.2) / 2, L / 2 + 0.005], [W - 0.2, wy1 + 0.2 - 0.9, 0.01], 'glassDark'); K.box(G, [0, (wy0 + wy1) / 2, -L / 2 - 0.005], [W - 0.4, wy1 - wy0, 0.01], 'glassDark');
      K.box(G, [-(W / 2 + 0.006), (0.6 + 2.6) / 2, L / 2 - 1.2], [0.01, 2.0, 1.0], 'glass'); // باب الركاب (الجهة اليمنى للسائق)
      for (const x of [1, -1]) { K.box(P('lamp'), [x * (W / 2 - 0.3), 0.85, L / 2 + 0.01], [0.35, 0.15, 0.03], 'white'); K.box(P('tail'), [x * (W / 2 - 0.2), 1.0, -L / 2 - 0.01], [0.18, 0.4, 0.03], 'red'); }
      K.box(P('dark'), [0, 0.5, L / 2 + 0.03], [W + 0.04, 0.22, 0.06], 'dark'); K.box(P('dark'), [0, 0.5, -L / 2 - 0.03], [W + 0.04, 0.22, 0.06], 'dark');
      K.box(P('dark'), [0, H - 0.2, L / 2 + 0.01], [1.6, 0.25, 0.03], 'black'); K.text(P('neon'), p.kind === 'school' ? 'SCHOOL' : p.kind === 'coach' ? 'RIYADH' : '10', 0, H - 0.2, L / 2 + 0.025, 0.035, 'orange');
      for (const x of [1, -1]) K.box(Bd, [x * (W / 2 + 0.004), 1.1, 0], [0.008, 0.12, L - 0.4], p.kind === 'school' ? 'black' : 'white');
      if (p.kind !== 'coach') K.box(P('metal'), [0, H + 0.15, -1], [1.6, 0.3, 2.4], 'greyLight'); // مكيف السقف
      const s = { W, L, R, axF, axR, roof: H, b0, cowl: L / 2 - 0.6, tw: 0.3, mass: 12000, speed: 5, dual: true, rear: [axR] };
      return carDone('bus', P, s, q, 'greyLight'); } });

  K.def('truck', { name: 'شاحنة', nameEn: 'Truck', group: 'vehicles',
    schema: [{ key: 'body', label: 'الحمولة', type: 'enum', options: [['box', 'صندوق'], ['tanker', 'صهريج'], ['flatbed', 'سطحة'], ['dump', 'قلاب']], def: 'box' }, K.color('cab', 'لون الغمارة', 'white', [['silver', 'فضي']]), K.color('cargo', 'لون الحمولة', 'white', [['silver', 'فضي']])],
    presets: { 'صهريج': { body: 'tanker', cargo: 'silver', cab: 'red' }, 'سطحة': { body: 'flatbed', cab: 'blue' }, 'قلاب': { body: 'dump', cab: 'yellow', cargo: 'orange' } },
    generate: (p, q) => { const P = K.parts(), L = 8.5, W = 2.45, R = 0.5, b0 = 0.6, cabL = 2.2, ch = 3.0, axF = L / 2 - 1.2, axR = -L / 2 + 2.0, Bd = P('paint'), cab = PAINT[p.cab] || p.cab, cg = PAINT[p.cargo] || p.cargo, n = K.sides(q, 12);
      // غمارة أمامية مكعبة
      K.extrude(Bd, [[L / 2 - cabL, b0], [L / 2, b0], [L / 2, ch - 0.9], [L / 2 - 0.25, ch], [L / 2 - cabL, ch]], 'x', -W / 2, W / 2, cab);
      K.box(P('glassSolid'), [0, ch - 0.6, L / 2 + 0.005], [W - 0.3, 0.9, 0.02], 'glassDark'); for (const x of [1, -1]) { K.box(P('glassSolid'), [x * (W / 2 + 0.005), ch - 0.65, L / 2 - 0.7], [0.01, 0.7, 0.9], 'glassDark'); K.box(P('lamp'), [x * (W / 2 - 0.35), b0 + 0.35, L / 2 + 0.01], [0.4, 0.18, 0.03], 'white'); K.box(P('dark'), [x * (W / 2 + 0.12), ch - 0.6, L / 2 - 0.15], [0.06, 0.5, 0.1], 'black'); }
      K.box(P('dark'), [0, b0 + 0.75, L / 2 + 0.01], [W * 0.6, 0.6, 0.03], 'dark'); K.box(P('dark'), [0, b0 + 0.05, L / 2 + 0.04], [W + 0.04, 0.25, 0.08], 'dark');
      K.box(P('dark'), [0, b0 - 0.05, -0.4], [1.0, 0.3, L - 1.4], 'dark'); // الشاسيه
      const z0 = L / 2 - cabL - 0.15, z1 = -L / 2;
      if (p.body === 'box') { K.box(P('paint'), [0, (b0 + 0.2 + 3.6) / 2, (z0 + z1) / 2], [W + 0.05, 3.6 - b0 - 0.2, z0 - z1], cg); K.box(P('dark'), [0, b0 + 0.15, (z0 + z1) / 2], [W, 0.1, z0 - z1], 'dark'); for (const x of [1, -1]) K.box(P('tail'), [x * (W / 2 - 0.2), b0 + 0.35, z1 - 0.01], [0.2, 0.15, 0.02], 'red'); K.box(P('dark'), [0, 2.0, z1 - 0.005], [0.03, 2.8, 0.01], 'dark'); }
      else if (p.body === 'tanker') { const r = 1.05, c = b0 + 0.25 + r; K.cyl(P('chrome'), [0, c, z0 - 0.1], [0, c, z1 + 0.1], r, r, n, cg, null, { rot: Math.PI / n }); K.cyl(P('chrome'), [0, c, z0 - 0.1], [0, c, z0], r, r * 0.6, n, cg); K.cyl(P('chrome'), [0, c, z1 + 0.1], [0, c, z1], r, r * 0.6, n, cg); K.box(P('metal'), [0, c + r + 0.05, (z0 + z1) / 2], [0.6, 0.1, z0 - z1 - 0.6], 'grey'); K.box(P('paint'), [0, c, (z0 + z1) / 2], [2 * r + 0.02, 0.2, z0 - z1 - 0.3], 'red'); }
      else if (p.body === 'flatbed') { K.box(P('wood'), [0, b0 + 0.25, (z0 + z1) / 2], [W, 0.12, z0 - z1], 'woodDark'); K.box(P('metal'), [0, b0 + 1.0, z0 - 0.05], [W, 1.5, 0.1], cab); const rng = AA.rng(p.seed); for (let i = 0; i < 3; i++) K.box(P('wood'), [0, b0 + 0.66, z0 - 0.9 - i * 1.6], [W - 0.3, 0.7, 1.3], AA.vary(K.c('woodLight'), rng, 0.1)); }
      else { K.extrude(P('paint'), [[z0, b0 + 0.25], [z1 + 0.1, b0 + 0.25], [z1, b0 + 1.6], [z0 + 0.3, b0 + 1.8], [z0 + 0.3, b0 + 2.1], [z0, b0 + 2.1]], 'x', -W / 2, W / 2, cg); }
      const s = { W, L, R, axF, axR, roof: ch, b0, cowl: L / 2 - 0.8, tw: 0.32, mass: 15000, speed: 5, dual: true, rear: [axR, axR - 1.35] };
      return carDone('truck', P, s, q, 'greyLight'); } });

  // ---------- دباب وسيكل ----------
  K.def('motorbike', { name: 'دباب', nameEn: 'Motorbike', group: 'vehicles', schema: [{ key: 'color', label: 'اللون', type: 'enum', options: COL, def: 'red' }, { key: 'kind', label: 'النوع', type: 'enum', options: [['sport', 'رياضي'], ['scooter', 'سكوتر'], ['quad', 'دباب رملي (4 كفرات)']], def: 'sport' }], presets: { 'سكوتر': { kind: 'scooter', color: 'teal' }, 'دباب رملي': { kind: 'quad', color: 'yellow' } },
    generate: (p, q) => { const P = K.parts(), c = PAINT[p.color] || p.color, Bd = P('paint'), D = P('dark');
      if (p.kind === 'quad') { const s = { W: 1.15, L: 1.9, R: 0.3, axF: 0.62, axR: -0.62, roof: 1.1, b0: 0.3, cowl: 0.3, tw: 0.24, speed: 7, mass: 300 };
        K.extrude(Bd, [[-0.75, 0.55], [0.75, 0.55], [0.95, 0.75], [0.6, 0.85], [-0.6, 0.85], [-0.95, 0.75]], 'x', -0.5, 0.5, c); K.box(D, [0, 0.9, -0.15], [0.35, 0.12, 0.8], 'black'); K.box(D, [0, 0.45, 0], [0.4, 0.25, 0.9], 'dark'); K.rod(P('metal'), [0, 0.85, 0.4], [0, 1.05, 0.5], 0.03, 'dark'); K.rod(P('metal'), [-0.35, 1.05, 0.5], [0.35, 1.05, 0.5], 0.025, 'black'); K.box(P('lamp'), [0, 0.75, 0.96], [0.4, 0.1, 0.04], 'white');
        K.wheels(P, [{ z: s.axF, x: 0.45, R: 0.3, w: 0.24, steer: true }, { z: s.axR, x: 0.45, R: 0.3, w: 0.26 }], q, 'dark'); return K.done('motorbike', P, { collider: K.boxCol(1.2, 1.1, 1.9), physics: { wheelbase: 1.24 }, walkSpeed: 7, seat: [0, 0.95, -0.15] }); }
      const sc = p.kind === 'scooter', R = sc ? 0.24 : 0.32, axF = sc ? 0.7 : 0.75, axR = sc ? -0.6 : -0.7;
      for (const [k, z, steer] of [[0, axF, true], [1, axR, false]]) { const spin = { pivot: [0, R, z], axis: 'x', radius: R, steer }; const T = P.custom('tire' + k, AA.lp.mat('rubber', { spin })), Rm = P.custom('rim' + k, AA.lp.mat('metal', { metalness: 0.35, spin })); K.wheelInto(T, Rm, [0, R, z], R, 0.13, 1, q, K.c('dark')); K.cyl(Rm, [-0.085, R, z], [0.085, R, z], R * 0.2, R * 0.2, 6, 'chrome'); }
      if (sc) { K.extrude(Bd, [[-0.75, 0.3], [0.45, 0.3], [0.55, 0.45], [0.6, 1.05], [0.48, 1.05], [0.35, 0.5], [-0.3, 0.5], [-0.8, 0.75]], 'x', -0.17, 0.17, c); K.box(D, [0, 0.82, -0.4], [0.3, 0.1, 0.55], 'black'); K.box(Bd, [0, 0.62, -0.4], [0.32, 0.25, 0.6], c); K.rod(P('metal'), [0, 1.05, 0.55], [0, 1.05, 0.55], 0.02, 'dark'); K.rod(P('metal'), [-0.3, 1.08, 0.52], [0.3, 1.08, 0.52], 0.022, 'black'); K.rod(P('metal'), [0, R, axF], [0, 1.05, 0.55], 0.03, 'chrome'); K.box(P('lamp'), [0, 0.95, 0.62], [0.15, 0.08, 0.03], 'white'); }
      else { K.extrude(Bd, [[-0.85, 0.75], [-0.3, 0.6], [0.35, 0.55], [0.75, 0.85], [0.55, 1.05], [0.1, 1.0], [-0.25, 0.85], [-0.85, 0.9]], 'x', -0.16, 0.16, c); K.box(D, [0, 0.5, 0], [0.3, 0.35, 0.6], 'dark'); K.box(D, [0, 0.93, -0.45], [0.28, 0.07, 0.5], 'black'); for (const x of [1, -1]) K.rod(P('metal'), [x * 0.08, R, axF], [x * 0.08, 1.0, 0.6], 0.025, 'chrome'); K.rod(P('metal'), [-0.32, 1.02, 0.55], [0.32, 1.02, 0.55], 0.02, 'black'); K.box(P('lamp'), [0, 0.92, 0.78], [0.14, 0.1, 0.04], 'white'); K.rod(P('chrome'), [0.12, 0.35, -0.2], [0.12, 0.45, -0.85], 0.045, 'chrome'); K.box(P('tail'), [0, 0.92, -0.88], [0.12, 0.05, 0.03], 'red'); }
      return K.done('motorbike', P, { collider: K.boxCol(0.6, 1.1, 2.0), physics: { wheelbase: axF - axR }, walkSpeed: 8, seat: [0, 0.9, -0.3] }); } });
  K.def('bicycle', { name: 'سيكل', nameEn: 'Bicycle', group: 'vehicles', schema: [{ key: 'color', label: 'اللون', type: 'enum', options: COL, def: 'blue' }, { key: 'basket', label: 'سلة', type: 'bool', def: false }], presets: { 'بسلة': { basket: true, color: 'green' } },
    generate: (p, q) => { const P = K.parts(), c = PAINT[p.color] || p.color, R = 0.34, M = P('paint'), n = K.sides(q, 12);
      for (const [k, z, steer] of [[0, 0.52, true], [1, -0.52, false]]) { const spin = { pivot: [0, R, z], axis: 'x', radius: R, steer }; const T = P.custom('tire' + k, AA.lp.mat('rubber', { spin })), Rm = P.custom('rim' + k, AA.lp.mat('metal', { metalness: 0.35, spin }));
        LP_ring(T, [0, R, z], R, 0.03, n, 'rubber'); for (let s = 0; s < 6; s++) { const a = s / 6 * Math.PI; K.rod(Rm, [0, R + Math.cos(a) * R * 0.9, z + Math.sin(a) * R * 0.9], [0, R - Math.cos(a) * R * 0.9, z - Math.sin(a) * R * 0.9], 0.006, 'greyLight', null, 3); } K.cyl(Rm, [-0.04, R, z], [0.04, R, z], 0.03, 0.03, 6, 'grey'); }
      const bb = [0, 0.3, -0.02], seat = [0, 0.82, -0.25], head = [0, 0.85, 0.4];
      K.rod(M, [0, R, -0.52], bb, 0.02, c); K.rod(M, [0, R, -0.52], seat, 0.02, c); K.rod(M, bb, seat, 0.025, c); K.rod(M, bb, head, 0.025, c); K.rod(M, seat, head, 0.025, c); K.rod(M, [0, R, 0.52], [0, 0.95, 0.42], 0.022, 'chrome');
      K.rod(P('metal'), [-0.28, 1.0, 0.38], [0.28, 1.0, 0.38], 0.016, 'black'); K.box(P('dark'), [0, 0.88, -0.28], [0.12, 0.05, 0.25], 'black'); K.cyl(P('metal'), [-0.03, 0.3, -0.02], [0.03, 0.3, -0.02], 0.09, 0.09, 8, 'dark');
      if (p.basket) K.box(P('wood'), [0, 0.95, 0.62], [0.35, 0.22, 0.25], 'woodLight');
      return K.done('bicycle', P, { collider: K.boxCol(0.5, 1.0, 1.8), physics: { wheelbase: 1.04 }, walkSpeed: 4, seat }); } });
  function LP_ring(B, c, R, r, n, col) { // إطار رفيع (حلقة) حول محور x
    for (let k = 0; k < n; k++) { const a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2; K.rod(B, V.add(c, [0, Math.cos(a0) * R, Math.sin(a0) * R]), V.add(c, [0, Math.cos(a1) * R, Math.sin(a1) * R]), r, col, null, 4); } }

  // ---------- طيران ----------
  // جسم أسطواني على محور z من مقاطع [z, r, yOffset]
  function fuselage(B, secs, n, col, colFn) { for (let i = 0; i < secs.length - 1; i++) { const [z0, r0, y0] = secs[i], [z1, r1, y1] = secs[i + 1]; K.cyl(B, [0, y0, z0], [0, y1, z1], r0, r1, n, colFn ? colFn(i) : col, null, { noCaps: !(i === 0 && r0 > 0.01) && !(i === secs.length - 2 && r1 > 0.01), rot: Math.PI / n }); } }
  function wing(B, root, span, chord0, chord1, sweep, thick, col, dihedral, side) { // جناح مسطح شبه منحرف من جذر عند root
    for (const s of side ? [side] : [1, -1]) { const tip = V.add(root, [s * span, span * (dihedral || 0), -sweep]);
      const pr = [[0, -thick / 2], [chord0, -thick / 2], [chord0, thick / 2], [0, thick / 2]];
      const a = V.add(root, [0, 0, chord0 / 2]), b = V.add(root, [0, 0, -chord0 / 2]), c = V.add(tip, [0, 0, -chord1 / 2]), d = V.add(tip, [0, 0, chord1 / 2]), up = [0, thick / 2, 0];
      K.quad(B, V.add(a, up), V.add(d, up), V.add(c, up), V.add(b, up), col, [0, 1, 0]); K.quad(B, V.sub(a, up), V.sub(b, up), V.sub(c, up), V.sub(d, up), col, [0, -1, 0]);
      K.quad(B, V.add(a, up), V.sub(a, up), V.sub(d, up), V.add(d, up), col, [0, 0, 1]); K.quad(B, V.add(b, up), V.add(c, up), V.sub(c, up), V.sub(b, up), col, [0, 0, -1]); K.quad(B, V.add(d, up), V.sub(d, up), V.sub(c, up), V.add(c, up), col, [s, 0, 0]); } }
  K.def('airliner', { name: 'طيارة ركاب', nameEn: 'Airliner', group: 'vehicles',
    schema: [{ key: 'size', label: 'الحجم', type: 'enum', options: [['narrow', 'ممر واحد'], ['wide', 'عريضة']], def: 'narrow' }, K.color('livery', 'لون الذيل', 'green', [['gold', 'ذهبي']]), { key: 'gear', label: 'العجلات نازلة', type: 'bool', def: true }],
    presets: { 'عريضة': { size: 'wide', livery: 'navy' }, 'في الجو': { gear: false } },
    generate: (p, q) => { const P = K.parts(), wide = p.size === 'wide', k = wide ? 1.45 : 1, Rf = 2.0 * k, L = 38 * k, n = K.sides(q, 12), Bd = P('paint'), yC = (p.gear ? 2.6 : 0.3) * k + Rf;
      fuselage(Bd, [[L / 2, 0.15, yC - 0.4], [L / 2 - 1.2, Rf * 0.55, yC - 0.3], [L / 2 - 3.5, Rf * 0.95, yC], [L / 2 - 6, Rf, yC], [-L / 2 + 9, Rf, yC], [-L / 2 + 2.5, Rf * 0.55, yC + Rf * 0.4], [-L / 2, 0.3, yC + Rf * 0.75]], n, 'white');
      K.box(P('paint'), [0, yC - Rf * 0.35, -3], [Rf * 2.02, 0.35 * k, L - 12], 'greyLight'); // بطن رمادي
      const G = P('glassSolid'); for (const x of [1, -1]) { const m = Math.round((L - 16) / 1.0); for (let i = 0; i < m; i++) K.box(G, [x * Rf * 0.985, yC + 0.45 * k, L / 2 - 7 - i * (L - 16) / m], [0.06, 0.32, 0.22], 'glassDark'); K.box(Bd, [x * Rf * 0.995, yC + 0.0, 0], [0.02, 0.2, L - 14], p.livery); }
      K.extrude(G, [[-0.7, 0], [0.7, 0], [0.55, 0.45], [-0.55, 0.45]], 'z', L / 2 - 2.6, L / 2 - 2.2, 'glassDark', { at: [0, yC + 0.3 * k, 0] });
      wing(Bd, [Rf * 0.6, yC - Rf * 0.45, 2 * k], 16 * k, 7 * k, 2 * k, 6 * k, 0.5 * k, 'greyLight', 0.08);
      wing(Bd, [Rf * 0.25, yC + Rf * 0.4, -L / 2 + 4], 6.5 * k, 3.4 * k, 1.4 * k, 2.4 * k, 0.25 * k, 'greyLight', 0.05);
      K.extrude(Bd, [[-L / 2 + 0.5, yC + Rf * 0.5], [-L / 2 + 6.5 * k, yC + Rf * 0.5], [-L / 2 + 2.8, yC + Rf * 0.5 + 7 * k], [-L / 2 + 0.5, yC + Rf * 0.5 + 7 * k]].map(([z, y]) => [z, y]), 'x', -0.2 * k, 0.2 * k, p.livery);
      for (const x of (wide ? [6, 11, -6, -11] : [6.5, -6.5])) { const c = [x * k, yC - Rf * 0.75, 3.5 * k - Math.abs(x) * 0.25]; K.cyl(P('metal'), V.add(c, [0, 0, 1.8 * k]), V.add(c, [0, 0, -2.4 * k]), 1.0 * k, 0.7 * k, n, 'offwhite'); K.cyl(P('dark'), V.add(c, [0, 0, 1.82 * k]), V.add(c, [0, 0, 1.6 * k]), 0.85 * k, 0.85 * k, n, 'dark'); K.box(P('metal'), V.add(c, [0, 0.8 * k, 0]), [0.25 * k, 0.8 * k, 2.4 * k], 'greyLight'); }
      if (p.gear) for (const [x, z, R] of [[0, L / 2 - 5, 0.5], [2.4, -1.5, 0.65], [-2.4, -1.5, 0.65]]) { const xx = x * k; K.rod(P('metal'), [xx, R, z * 1], [xx, yC - Rf * 0.8, z], 0.12 * k, 'greyLight'); for (const dx of [-0.35, 0.35]) K.cyl(P('rubber'), [xx + dx * k - 0.15, R, z], [xx + dx * k + 0.15, R, z], R, R, 10, 'rubber'); }
      for (const [x, cl] of [[16 * k + Rf * 0.6, 'sigGreen'], [-(16 * k + Rf * 0.6), 'sigRed']]) K.ball(P(cl), [x, yC - Rf * 0.45 + 16 * k * 0.08, 2 * k - 6 * k], 0.15, 'white');
      return K.done('airliner', P, { collider: K.boxCol(Rf * 2, yC + Rf, L), wingspan: 2 * (16 * k + Rf * 0.6), walkSpeed: 14 }); } });
  K.def('small_plane', { name: 'طيارة صغيرة', nameEn: 'Light aircraft', group: 'vehicles', schema: [K.color('color', 'اللون', 'white'), K.color('stripe', 'لون الخط', 'red')], presets: { 'صفراء': { color: 'yellow', stripe: 'black' } },
    generate: (p, q) => { const P = K.parts(), n = K.sides(q, 10), Bd = P('paint'), yC = 1.3;
      fuselage(Bd, [[3.6, 0.45, yC], [2.6, 0.62, yC + 0.05], [1.0, 0.7, yC + 0.15], [-1.0, 0.55, yC + 0.2], [-3.8, 0.18, yC + 0.4]], n, p.color);
      K.extrude(P('glassSolid'), [[1.9, 0], [0.6, 0.55], [-0.6, 0.55], [-1.2, 0]], 'x', -0.62, 0.62, 'glassDark', { at: [0, yC + 0.45, 0] });
      wing(Bd, [0.4, yC + 1.0, 0.4], 5.2, 1.6, 1.1, 0.2, 0.18, p.color, 0.02); for (const x of [1, -1]) K.rod(P('metal'), [x * 0.6, yC - 0.3, 0.4], [x * 2.6, yC + 1.0, 0.4], 0.05, 'grey');
      wing(Bd, [0.15, yC + 0.4, -3.4], 1.7, 0.9, 0.6, 0.3, 0.1, p.color);
      K.extrude(Bd, [[-3.9, yC + 0.4], [-2.8, yC + 0.4], [-3.4, yC + 1.8], [-3.9, yC + 1.8]], 'x', -0.06, 0.06, p.stripe);
      for (const x of [1, -1]) K.box(Bd, [x * 0.63, yC, 0], [0.02, 0.12, 5.5], p.stripe);
      const rotor = { pivot: [0, yC, 3.75], axis: 'z', speed: 40 }, Pr = P.custom('prop', AA.lp.mat('dark', { rotor }));
      K.box(Pr, [0, yC, 3.75], [0.12, 1.9, 0.05], 'dark'); K.cyl(Pr, [0, yC, 3.7], [0, yC, 3.95], 0.18, 0.04, 8, p.stripe);
      for (const [x, z, R] of [[0, 2.4, 0.25], [1.0, -0.2, 0.3], [-1.0, -0.2, 0.3]]) { K.rod(P('metal'), [x, R, z], [x * 0.5, yC - 0.4, z], 0.04, 'grey'); K.cyl(P('rubber'), [x - 0.07, R, z], [x + 0.07, R, z], R, R, 10, 'rubber'); }
      return K.done('small_plane', P, { collider: K.boxCol(1.4, 2.4, 7.6), wingspan: 11, walkSpeed: 10 }); } });
  K.def('helicopter', { name: 'هليكوبتر', nameEn: 'Helicopter', group: 'vehicles', schema: [K.color('color', 'اللون', 'navy', [['silver', 'فضي']]), { key: 'role', label: 'النوع', type: 'enum', options: [['civil', 'مدني'], ['rescue', 'إسعاف'], ['police', 'شرطة']], def: 'civil' }], presets: { 'إسعاف جوي': { role: 'rescue', color: 'red' }, 'شرطة': { role: 'police', color: 'white' } },
    generate: (p, q) => { const P = K.parts(), n = K.sides(q, 10), Bd = P('paint'), c = PAINT[p.color] || p.color, yC = 1.35;
      AA.lp.ico(Bd, [0, yC, 0.3], [0.95, 0.9, 1.6], 1, d => d[2] > 0.35 && d[1] > -0.2 ? K.c('glassDark') : K.c(c));
      fuselage(Bd, [[-0.9, 0.55, yC + 0.2], [-4.6, 0.15, yC + 0.55]], n, c); K.extrude(Bd, [[-4.9, yC + 0.4], [-4.2, yC + 0.4], [-4.6, yC + 1.5], [-5.0, yC + 1.5]], 'x', -0.06, 0.06, c);
      K.box(P('metal'), [0, yC + 0.95, -0.2], [0.8, 0.35, 1.4], 'grey'); K.cyl(P('metal'), [0, yC + 1.1, 0], [0, yC + 1.45, 0], 0.1, 0.1, 6, 'dark');
      for (const x of [1, -1]) { K.rod(P('metal'), [x * 0.7, 0.08, 1.0], [x * 0.7, 0.08, -1.3], 0.05, 'dark'); K.rod(P('metal'), [x * 0.7, 0.08, 0.7], [x * 0.5, yC - 0.6, 0.6], 0.04, 'dark'); K.rod(P('metal'), [x * 0.7, 0.08, -0.8], [x * 0.5, yC - 0.6, -0.7], 0.04, 'dark'); }
      const main = P.custom('rotor', AA.lp.mat('dark', { rotor: { pivot: [0, yC + 1.5, 0], axis: 'y', speed: 18 } })); for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2, d = [Math.cos(a), 0, Math.sin(a)]; K.box(main, V.add([0, yC + 1.5, 0], V.scale(d, 2.6)), [Math.abs(d[0]) > 0.5 ? 5.2 : 0.22, 0.04, Math.abs(d[2]) > 0.5 ? 5.2 : 0.22], 'dark'); } K.cyl(main, [0, yC + 1.45, 0], [0, yC + 1.6, 0], 0.18, 0.12, 6, 'grey');
      const tail = P.custom('tailRotor', AA.lp.mat('dark', { rotor: { pivot: [0.12, yC + 1.2, -4.7], axis: 'x', speed: 30 } })); K.box(tail, [0.12, yC + 1.2, -4.7], [0.04, 1.2, 0.12], 'dark'); K.box(tail, [0.12, yC + 1.2, -4.7], [0.04, 0.12, 1.2], 'dark');
      if (p.role === 'rescue') for (const x of [1, -1]) { const at = [x * 0.93, yC, -0.3]; K.box(Bd, at, [0.02, 0.45, 0.14], 'white'); K.box(Bd, at, [0.02, 0.14, 0.45], 'white'); }
      if (p.role === 'police') for (const x of [1, -1]) K.box(Bd, [x * 0.9, yC - 0.2, 0], [0.02, 0.15, 1.6], 'green');
      K.ball(P('sigRed'), [0, yC + 0.9, -4.6], 0.07, 'white');
      return K.done('helicopter', P, { collider: K.boxCol(1.9, 3, 6), rotorRadius: 5.2, walkSpeed: 12 }); } });

  // ---------- قارب ----------
  K.def('boat', { name: 'قارب', nameEn: 'Boat', group: 'vehicles', schema: [{ key: 'length', label: 'الطول', min: 4, max: 10, step: 0.5, def: 6, unit: 'م' }, K.color('color', 'لون البدن', 'white'), K.color('stripe', 'لون الخط', 'navy'), { key: 'kind', label: 'النوع', type: 'enum', options: [['speed', 'سريع'], ['fishing', 'صيد (هوري)']], def: 'speed' }], presets: { 'قارب صيد': { kind: 'fishing', color: 'sandstone', stripe: 'teal' } },
    generate: (p, q) => { const P = K.parts(), L = p.length, W = L * 0.36, H = 0.9, Bd = P('paint'), m = 6;
      // بدن: مقاطع على محور z، كل مقطع حرف V مسطّح أعلاه، يضيق للمقدمة
      const sec = t => { const w = W / 2 * (t > 0.6 ? Math.sqrt(Math.max(0.02, (1 - t) / 0.4)) : 1) * (t < 0.05 ? 0.92 : 1), keel = 0.05 + 0.25 * AA.smooth(0.6, 1, t), top = H + 0.25 * AA.smooth(0.5, 1, t); return [[-w, top], [-w * 0.85, 0.35], [0, keel - 0.05], [w * 0.85, 0.35], [w, top]]; };
      const rows = []; for (let i = 0; i <= m; i++) { const t = i / m, z = -L / 2 + t * L; rows.push(sec(t).map(([x, y]) => [x, y, z])); }
      for (let i = 0; i < m; i++) for (let j = 0; j < 4; j++) { const a = rows[i][j], b = rows[i][j + 1], c = rows[i + 1][j + 1], d = rows[i + 1][j], mid = V.scale(V.add(a, c), 0.5), out = V.norm([mid[0], mid[1] < 0.3 ? -1 : 0, 0.0001]); const col = j === 0 || j === 3 ? (p.color) : AA.mixc(K.c(p.color), [0, 0, 0], 0.08); K.tri(Bd, a, b, c, col, out); K.tri(Bd, a, c, d, col, out); }
      const t0 = rows[0]; K.tri(Bd, t0[0], t0[2], t0[1], p.color, [0, 0, -1]); K.tri(Bd, t0[0], t0[4], t0[2], p.color, [0, 0, -1]); K.tri(Bd, t0[2], t0[4], t0[3], p.color, [0, 0, -1]);
      const deck = rows.map(r => [r[0], r[4]]); for (let i = 0; i < m; i++) K.quad(P('wood'), deck[i][0].map((v, k) => k === 1 ? v - 0.02 : v), deck[i + 1][0].map((v, k) => k === 1 ? v - 0.02 : v), deck[i + 1][1].map((v, k) => k === 1 ? v - 0.02 : v), deck[i][1].map((v, k) => k === 1 ? v - 0.02 : v), p.kind === 'fishing' ? 'woodLight' : 'offwhite', [0, 1, 0]);
      for (const x of [1, -1]) K.box(Bd, [x * (W / 2 + 0.01), H - 0.15, -L * 0.1], [0.02, 0.12, L * 0.75], p.stripe);
      if (p.kind === 'speed') { K.extrude(P('glass'), [[-0.7, 0], [0.7, 0], [0.55, 0.45], [-0.55, 0.45]], 'z', L * 0.05, L * 0.05 + 0.04, 'glass', { at: [0, H, 0] }); K.box(P('cloth'), [0, H + 0.2, -L * 0.15], [W * 0.7, 0.4, 0.7], 'cream'); K.box(P('cloth'), [0, H + 0.4, -L * 0.15 - 0.3], [W * 0.7, 0.5, 0.12], 'cream'); }
      else { K.box(P('wood'), [0, H + 0.7, -L * 0.1], [W * 0.5, 1.4, 1.2], 'white'); K.box(P('glassSolid'), [0, H + 1.0, -L * 0.1 + 0.61], [W * 0.4, 0.4, 0.02], 'glassDark'); K.box(P('stone'), [0, H + 1.45, -L * 0.1], [W * 0.6, 0.1, 1.4], p.stripe); K.rod(P('wood'), [0, H, L * 0.25], [0, H + 3, L * 0.25], 0.05, 'woodDark'); }
      const mt = [0, H - 0.2, -L / 2 - 0.2]; K.box(P('dark'), V.add(mt, [0, 0.35, 0]), [0.35, 0.5, 0.4], 'black'); K.box(P('dark'), V.add(mt, [0, -0.25, 0]), [0.12, 0.8, 0.15], 'dark');
      return K.done('boat', P, { collider: K.boxCol(W, H, L), float: true, waterline: 0.35, walkSpeed: 6 }); } });
})(typeof window !== 'undefined' ? window : globalThis);
