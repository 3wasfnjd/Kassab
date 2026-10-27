// Aboden Assets — kit/kit-street.js — الشارع: طريق، تقاطع، إنارة، إشارة مرور، لوحات، كراسي، حاويات، حنفية حريق، موقف باص، أقماع، حواجز، حاجز طريق، لوحة إعلانات، أعمدة كهرباء
(function (g) {
  'use strict';
  const AA = g.AA, K = AA.kit, V = AA.v, lerp = AA.lerp;
  const LANE = 3.4, Y0 = 0.06, CURB = 0.18; // سطح الأسفلت أعلى من الأرض بـ 4 سم (المشاهد تنزّل الأصل 2 سم) حتى لا يتنافس مع الأرض

  // خط بكسل صغير (3×5) للأرقام والحروف على اللوحات
  const FONT = { '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111',
    S: '111100111001111', T: '111010010010010', O: '111101101101111', P: '111101111100100', B: '110101110101110', U: '101101101101111', A: '010101111101101', X: '101101010101101', I: '111010010010111', K: '101110100110101', R: '110101110110101', C: '111100100100111', D: '110101101101110', E: '111100111100111', F: '111100111100100', G: '111100101101111', H: '101101111101101', J: '001001001101111', L: '100100100100111', M: '101111111101101', N: '110101101101101', Q: '111101101111001', V: '101101101101010', W: '101101111111101', Y: '101101010010010', Z: '111001010100111', '-': '000000111000000', '.': '000000000000010', ' ': '000000000000000' };
  // يكتب نصاً على مستوى XY عند z (وجهه +Z) — cell حجم البكسل
  K.text = function (B, str, cx, cy, z, cell, col, o) {
    const w = str.length * 4 - 1, x0 = cx - w * cell / 2;
    [...str].forEach((ch, k) => { const f = FONT[ch]; if (!f) return; for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (f[r * 3 + c] === '1') K.box(B, [x0 + (k * 4 + c + 0.5) * cell, cy + (2 - r) * cell, z], [cell * 1.02, cell * 1.02, 0.012], col, o); });
  };

  // ---------- الطريق ----------
  function roadInto(P, L, lanes, side, divided, q, rng) {
    const W = lanes * LANE, A = P('road'), M = P('paint'), C = P('concrete');
    K.box(A, [0, Y0 / 2, 0], [W, Y0, L], 'asphalt');
    // خطوط الحافة والمسارات
    for (const s of [1, -1]) K.box(M, [s * (W / 2 - 0.3), Y0 + 0.004, 0], [0.14, 0.008, L], 'line');
    for (let k = 1; k < lanes; k++) {
      const x = -W / 2 + k * LANE;
      if (k === lanes / 2 && divided) { for (const dx of [-0.11, 0.11]) K.box(M, [x + dx, Y0 + 0.004, 0], [0.11, 0.008, L], 'lineY'); continue; } // خط أصفر مزدوج في المنتصف
      const n = Math.max(1, Math.floor(L / 6)); for (let i = 0; i < n; i++) K.box(M, [x, Y0 + 0.004, -L / 2 + (i + 0.5) * L / n], [0.12, 0.008, Math.min(3, L / n * 0.5)], 'line');
    }
    if (side) for (const s of [1, -1]) { // رصيف بحافة ملوّنة (أحمر وأبيض) وبلاط
      const x0 = s * W / 2, sw = side;
      const nc = Math.max(1, Math.round(L / 1.2));
      for (let i = 0; i < nc; i++) K.box(C, [x0 + s * 0.12, CURB / 2, -L / 2 + (i + 0.5) * L / nc], [0.24, CURB, L / nc - 0.004], i % 2 ? 'white' : 'curbRed');
      const nt = Math.max(1, Math.round(L / 1.5)), tw = (sw - 0.24);
      for (let i = 0; i < nt; i++) K.box(C, [x0 + s * (0.24 + tw / 2), CURB / 2 - 0.005, -L / 2 + (i + 0.5) * L / nt], [tw - 0.01, CURB - 0.01, L / nt - 0.01], AA.vary(K.c(i % 2 ? 'walk' : 'walk2'), rng, 0.03));
    }
    return W + 2 * (side || 0);
  }
  K.def('road', { name: 'طريق', nameEn: 'Road', group: 'street',
    schema: [
      { key: 'length', label: 'الطول', min: 4, max: 40, step: 1, def: 12, unit: 'م' },
      { key: 'lanes', label: 'المسارات', type: 'enum', options: [['2', 'مساران'], ['4', 'أربعة'], ['1', 'مسار واحد']], def: '2' },
      { key: 'sidewalk', label: 'عرض الرصيف', min: 0, max: 4, step: 0.5, def: 2, unit: 'م' },
      { key: 'divided', label: 'خط أصفر مزدوج', type: 'bool', def: true }
    ],
    presets: { 'شارع رئيسي': { lanes: '4', sidewalk: 3 }, 'طريق صحراوي': { sidewalk: 0, length: 30 }, 'زقاق': { lanes: '1', sidewalk: 1 } },
    generate: (p, q) => { const P = K.parts(), rng = AA.rng(p.seed), L = p.length, W = roadInto(P, L, +p.lanes, p.sidewalk, p.divided, q, rng);
      return K.done('road', P, { collider: K.boxCol(W, 0.2, L), tile: { width: W, length: L, lanes: +p.lanes, sidewalk: p.sidewalk } }); } });

  K.def('intersection', { name: 'تقاطع', nameEn: 'Intersection', group: 'street',
    schema: [
      { key: 'lanes', label: 'المسارات', type: 'enum', options: [['2', 'مساران'], ['4', 'أربعة']], def: '2' },
      { key: 'type', label: 'النوع', type: 'enum', options: [['x', 'رباعي'], ['t', 'ثلاثي (T)']], def: 'x' },
      { key: 'sidewalk', label: 'عرض الرصيف', min: 0, max: 4, step: 0.5, def: 2, unit: 'م' },
      { key: 'crosswalk', label: 'ممر مشاة', type: 'bool', def: true }
    ],
    presets: { 'تقاطع كبير': { lanes: '4', sidewalk: 3 }, 'تقاطع T': { type: 't' } },
    generate: (p, q) => {
      const P = K.parts(), rng = AA.rng(p.seed), W = +p.lanes * LANE, S = p.sidewalk, A = P('road'), M = P('paint'), C = P('concrete'), T = W + 2 * S;
      K.box(A, [0, Y0 / 2, 0], [W, Y0, W], 'asphalt');
      const arms = p.type === 't' ? [[0, 1], [1, 0], [-1, 0]] : [[0, 1], [0, -1], [1, 0], [-1, 0]];
      if (p.type === 't') K.box(M, [0, Y0 + 0.004, -(W / 2 - 0.3)], [W, 0.008, 0.14], 'line'); // حافة الجهة المسدودة
      for (const [dx, dz] of arms) { // ممر مشاة على كل ذراع
        const along = dx !== 0, n = Math.round(W / 0.9);
        if (p.crosswalk) for (let i = 0; i < n; i++) { const t = -W / 2 + (i + 0.5) * W / n; if (!along && Math.abs(t) + W / n * 0.25 > W / 2 - 2.82) continue; K.box(M, along ? [dx * (W / 2 - 1.6), Y0 + 0.004, t] : [t, Y0 + 0.004, dz * (W / 2 - 1.6)], along ? [2.4, 0.008, W / n * 0.5] : [W / n * 0.5, 0.008, 2.4], 'line'); }
      }
      if (S) { // الأرصفة في الزوايا (وفي الجهة المسدودة للتقاطع T)
        for (const sx of [1, -1]) for (const sz of [1, -1]) { K.box(C, [sx * (W / 2 + S / 2 + 0.12), CURB / 2 - 0.005, sz * (W / 2 + S / 2 + 0.12)], [S - 0.24, CURB - 0.01, S - 0.24], AA.vary(K.c('walk'), rng, 0.04));
          const n = Math.max(1, Math.round(S / 1.2)); for (let i = 0; i < n; i++) { const t = W / 2 + (i + 0.5) * S / n, c = i % 2 ? 'white' : 'curbRed'; K.box(C, [sx * (W / 2 + 0.12), CURB / 2, sz * t], [0.24, CURB, S / n - 0.004], c); const t2 = W / 2 + 0.24 + (i + 0.5) * (S - 0.24) / n; K.box(C, [sx * t2, CURB / 2, sz * (W / 2 + 0.12)], [(S - 0.24) / n - 0.004, CURB, 0.24], i % 2 ? 'curbRed' : 'white'); } }
        if (p.type === 't') K.box(C, [0, CURB / 2, -(W / 2 + S / 2)], [W, CURB, S], 'walk2');
      }
      return K.done('intersection', P, { collider: K.boxCol(T, 0.2, T), tile: { width: W, sidewalk: S, type: p.type } });
    } });

  // ---------- الإنارة ----------
  K.def('street_lamp', { name: 'عمود إنارة', nameEn: 'Street lamp', group: 'street',
    schema: [
      { key: 'height', label: 'الارتفاع', min: 3, max: 12, step: 0.5, def: 7, unit: 'م' },
      { key: 'arms', label: 'الأذرع', type: 'enum', options: [['1', 'ذراع'], ['2', 'ذراعان'], ['0', 'فانوس علوي']], def: '1' },
      K.color('color', 'لون العمود', 'grey', [['steel', 'معدني']])
    ],
    presets: { 'عمود مزدوج': { arms: '2', height: 9 }, 'عمود حديقة': { arms: '0', height: 3.5, color: 'black' } },
    generate: (p, q) => {
      const P = K.parts(), H = p.height, M = P('metal'), Lm = P('lamp'), n = K.sides(q, 8), col = p.color;
      K.cyl(M, [0, 0, 0], [0, 0.5, 0], 0.16, 0.13, n, col);
      K.cyl(M, [0, 0.5, 0], [0, H, 0], 0.1, 0.06, n, col);
      const lights = [];
      if (p.arms === '0') { K.cyl(M, [0, H, 0], [0, H + 0.1, 0], 0.2, 0.2, n, col); K.cyl(Lm, [0, H + 0.1, 0], [0, H + 0.55, 0], 0.17, 0.2, n, 'white'); K.cyl(M, [0, H + 0.55, 0], [0, H + 0.75, 0], 0.26, 0.04, n, col); lights.push([0, H + 0.3, 0]); }
      else for (const s of (p.arms === '2' ? [1, -1] : [1])) {
        const L = Math.min(2.2, 0.25 * H + 0.4), tip = [0, H + 0.35, s * L];
        K.rod(M, [0, H - 0.3, 0], [0, H + 0.25, s * L * 0.5], 0.05, col); K.rod(M, [0, H + 0.25, s * L * 0.5], tip, 0.045, col);
        K.box(M, [0, H + 0.3, s * (L + 0.25)], [0.32, 0.14, 0.7], col); K.box(Lm, [0, H + 0.215, s * (L + 0.25)], [0.24, 0.035, 0.56], 'white');
        lights.push([0, H + 0.1, s * (L + 0.25)]);
      }
      return K.done('street_lamp', P, { collider: { type: 'capsule', radius: 0.16, height: H, axis: 'y' }, light: { at: lights[0], color: [1, 0.86, 0.62], intensity: 2.6, distance: H * 2.4 }, lights });
    } });

  // ---------- إشارة المرور ----------
  K.def('traffic_light', { name: 'إشارة مرور', nameEn: 'Traffic light', group: 'street',
    schema: [
      { key: 'state', label: 'الضوء', type: 'enum', options: [['red', 'أحمر'], ['amber', 'أصفر'], ['green', 'أخضر']], def: 'red' },
      { key: 'mast', label: 'ذراع فوق الطريق', min: 0, max: 6, step: 0.5, def: 0, unit: 'م' },
      { key: 'pedestrian', label: 'إشارة مشاة', type: 'bool', def: true }
    ],
    presets: { 'ذراع طويل': { mast: 4.5, state: 'green' }, 'أخضر': { state: 'green' } },
    generate: (p, q) => {
      const P = K.parts(), M = P('metal'), D = P('dark'), n = K.sides(q, 8), H = p.mast ? 5.6 : 3.2;
      K.cyl(M, [0, 0, 0], [0, H, 0], 0.09, 0.07, n, 'dark');
      const head = (c, sx) => { // صندوق بثلاثة أضواء، وجهه +Z
        K.box(D, V.add(c, [0, 0, 0]), [0.36, 1.05, 0.28], 'black');
        for (const [k, st] of [[0.33, 'red'], [0, 'amber'], [-0.33, 'green']]) {
          const on = st === p.state, B = on ? P({ red: 'sigRed', amber: 'sigAmber', green: 'sigGreen' }[st]) : P('dark');
          K.cyl(B, V.add(c, [0, k, 0.14]), V.add(c, [0, k, 0.165]), 0.12, 0.12, n, on ? 'white' : { red: '#4a1614', amber: '#4a3812', green: '#123a22' }[st]);
          K.box(D, V.add(c, [0, k + 0.14, 0.24]), [0.3, 0.025, 0.16], 'black');
        }
        K.box(D, V.add(c, [0, 0, -0.16]), [0.52, 1.25, 0.03], 'black'); // لوحة خلفية
      };
      if (p.mast) { K.rod(M, [0, H - 0.2, 0], [p.mast, H - 0.2, 0], 0.06, 'dark'); K.rod(M, [0, H - 1.0, 0], [p.mast * 0.4, H - 0.25, 0], 0.035, 'dark'); head([p.mast - 0.3, H - 0.85, 0.05]); head([0, 2.6, 0.2]); }
      else head([0, H - 0.4, 0.2]);
      if (p.pedestrian) { const c = [0, 2.0, -0.16]; K.box(D, c, [0.28, 0.56, 0.2], 'black'); K.box(P(p.state === 'red' ? 'sigGreen' : 'sigRed'), V.add(c, [0, p.state === 'red' ? -0.12 : 0.12, -0.105]), [0.18, 0.18, 0.01], 'white'); }
      return K.done('traffic_light', P, { collider: { type: 'capsule', radius: 0.12, height: H, axis: 'y' }, states: ['red', 'amber', 'green'] });
    } });

  // ---------- لوحات الطريق ----------
  const SIGNS = [['stop', 'قف'], ['yield', 'أفضلية'], ['speed', 'حد السرعة'], ['no_entry', 'ممنوع الدخول'], ['parking', 'موقف'], ['warning', 'تحذير'], ['direction', 'اتجاهات'], ['bump', 'مطب']];
  K.def('sign', { name: 'لوحة طريق', nameEn: 'Road sign', group: 'street',
    schema: [
      { key: 'type', label: 'النوع', type: 'enum', options: SIGNS, def: 'stop' },
      { key: 'speed', label: 'رقم السرعة', type: 'enum', options: [['40', '40'], ['60', '60'], ['80', '80'], ['120', '120']], def: '60' },
      { key: 'height', label: 'ارتفاع العمود', min: 1.6, max: 3, step: 0.1, def: 2.2, unit: 'م' }
    ],
    presets: { 'حد سرعة 120': { type: 'speed', speed: '120' }, 'لوحة اتجاهات': { type: 'direction' }, 'ممنوع الدخول': { type: 'no_entry' } },
    generate: (p, q) => {
      const P = K.parts(), M = P('metal'), F = P('paint'), n = K.sides(q, 16), H = p.height, z0 = 0.06, t = p.type;
      const disc = (pts, col, dz, rr) => K.extrude(F, pts, 'z', z0 + dz, z0 + dz + 0.02, col, { at: [0, H, 0] });
      let top = H + 0.4;
      if (t === 'direction') { // لوحة خضراء عريضة بعمودين وسهمين
        for (const s of [1, -1]) K.rod(M, [s * 1.0, 0, 0], [s * 1.0, H + 0.6, 0], 0.05, 'steel');
        K.box(F, [0, H + 0.55, z0 + 0.01], [2.8, 1.2, 0.03], 'green'); K.box(F, [0, H + 0.55, z0 + 0.03], [2.66, 1.06, 0.012], 'white'); K.box(F, [0, H + 0.55, z0 + 0.04], [2.58, 0.98, 0.012], 'green');
        for (const [s, y] of [[1, H + 0.8], [-1, H + 0.3]]) { K.box(F, [s * 0.75, y, z0 + 0.05], [0.6, 0.08, 0.012], 'white'); K.tri(F, [s * 1.18, y, z0 + 0.05], [s * 1.0, y + 0.16, z0 + 0.05], [s * 1.0, y - 0.16, z0 + 0.05], 'white', [0, 0, 1]); for (let k = 0; k < 4; k++) K.box(F, [-s * 0.55 + (k - 1.5) * 0.17 * s, y, z0 + 0.05], [0.12, 0.14, 0.012], 'white'); }
        return K.done('sign', P, { collider: K.boxCol(2.8, H + 1.2, 0.2) });
      }
      K.rod(M, [0, 0, 0], [0, H + 0.3, 0], 0.035, 'steel');
      const R = 0.38;
      if (t === 'stop') { disc(K.circle(R, 8, Math.PI / 8), 'white', 0); disc(K.circle(R * 0.9, 8, Math.PI / 8), 'red', 0.02); K.text(F, 'STOP', 0, H, z0 + 0.05, 0.034, 'white'); }
      else if (t === 'yield') { const tri = r => [[0, -r], [r * 0.866, r * 0.5], [-r * 0.866, r * 0.5]]; disc(tri(R * 1.15), 'red', 0); disc(tri(R * 0.78), 'white', 0.02); }
      else if (t === 'speed') { disc(K.circle(R, n), 'red', 0); disc(K.circle(R * 0.8, n), 'white', 0.02); K.text(F, p.speed, 0, H, z0 + 0.05, p.speed.length > 2 ? 0.038 : 0.05, 'black'); }
      else if (t === 'no_entry') { disc(K.circle(R, n), 'red', 0); K.box(F, [0, H, z0 + 0.03], [R * 1.3, R * 0.32, 0.012], 'white'); }
      else if (t === 'parking') { K.box(F, [0, H, z0 + 0.01], [0.66, 0.66, 0.02], 'blue'); K.text(F, 'P', 0, H, z0 + 0.03, 0.08, 'white'); }
      else if (t === 'warning') { K.box(F, [0, H, z0 + 0.01], [0.66, 0.66, 0.02], 'blue'); const tri = [[0, 0.27], [-0.27, -0.2], [0.27, -0.2]]; disc(tri, 'white', 0.02); K.box(F, [0, H - 0.07, z0 + 0.045], [0.05, 0.22, 0.01], 'black'); K.box(F, [0, H + 0.08, z0 + 0.045], [0.06, 0.06, 0.01], 'black'); }
      else if (t === 'bump') { const tri = r => [[0, r], [-r * 0.866, -r * 0.5], [r * 0.866, -r * 0.5]]; disc(tri(R * 1.15), 'red', 0); disc(tri(R * 0.82), 'white', 0.02); K.extrude(F, [[-0.16, -0.08], [0.16, -0.08], [0.1, 0.0], [-0.1, 0.0]], 'z', z0 + 0.045, z0 + 0.055, 'black', { at: [0, H, 0] }); }
      // ظهر اللوحة رمادي
      K.box(M, [0, H, z0 - 0.01], [0.12, 0.5, 0.02], 'steel');
      return K.done('sign', P, { collider: { type: 'capsule', radius: 0.06, height: top, axis: 'y' } });
    } });

  // ---------- أثاث الشارع ----------
  K.def('bench', { name: 'كرسي حديقة', nameEn: 'Bench', group: 'street',
    schema: [{ key: 'length', label: 'الطول', min: 1.2, max: 3, step: 0.1, def: 1.8, unit: 'م' }, { key: 'back', label: 'ظهر', type: 'bool', def: true }, K.color('color', 'لون الخشب', 'wood', [['wood', 'خشب'], ['woodDark', 'خشب غامق']])],
    presets: { 'بدون ظهر': { back: false }, 'طويل': { length: 2.6 } },
    generate: (p, q) => { const P = K.parts(), L = p.length, W = P('wood'), M = P('metal');
      for (const s of [1, -1]) { const x = s * (L / 2 - 0.15); K.box(M, [x, 0.22, 0.05], [0.06, 0.44, 0.06], 'dark'); K.box(M, [x, 0.22, -0.2], [0.06, 0.44, 0.06], 'dark'); K.box(M, [x, 0.42, -0.07], [0.06, 0.05, 0.42], 'dark'); if (p.back) K.box(M, [x, 0.65, -0.24], [0.06, 0.5, 0.05], 'dark', null); }
      for (let k = 0; k < 3; k++) K.box(W, [0, 0.47, 0.08 - k * 0.15], [L, 0.04, 0.12], p.color);
      if (p.back) for (let k = 0; k < 2; k++) K.box(W, [0, 0.62 + k * 0.17, -0.25], [L, 0.12, 0.035], p.color);
      return K.done('bench', P, { collider: K.boxCol(L, 0.9, 0.5), seat: [0, 0.47, 0] }); } });

  K.def('trash_bin', { name: 'سلة مهملات', nameEn: 'Trash bin', group: 'street',
    schema: [{ key: 'kind', label: 'النوع', type: 'enum', options: [['street', 'شارع'], ['wheelie', 'بعجلات'], ['recycle', 'إعادة تدوير']], def: 'street' }, K.color('color', 'اللون', 'green')],
    presets: { 'بعجلات': { kind: 'wheelie', color: 'navy' }, 'إعادة تدوير': { kind: 'recycle', color: 'blue' } },
    generate: (p, q) => { const P = K.parts(), B = P('plastic'), M = P('metal'), D = P('dark'), n = K.sides(q, 10);
      if (p.kind === 'wheelie') { K.extrude(B, [[-0.3, 0.06], [0.3, 0.06], [0.33, 1.0], [-0.33, 1.0]], 'x', -0.29, 0.29, p.color); K.box(B, [0, 1.03, 0.02], [0.62, 0.05, 0.72], p.color); K.box(D, [0, 0.95, -0.38], [0.5, 0.06, 0.06], 'black'); for (const s of [1, -1]) K.cyl(D, [s * 0.24, 0.1, -0.3], [s * 0.3, 0.1, -0.3], 0.1, 0.1, n, 'black'); }
      else if (p.kind === 'recycle') { for (const [k, c] of [[-1, 'blue'], [0, 'green'], [1, 'yellow']]) { K.box(B, [k * 0.5, 0.45, 0], [0.46, 0.9, 0.5], c); K.cyl(D, [k * 0.5, 0.905, 0.05], [k * 0.5, 0.92, 0.05], 0.1, 0.1, n, 'black'); } }
      else { K.cyl(M, [0, 0, 0], [0, 0.08, 0], 0.24, 0.24, n, 'dark'); K.cyl(B, [0, 0.08, 0], [0, 0.85, 0], 0.22, 0.25, n, p.color); K.cyl(M, [0, 0.85, 0], [0, 0.95, 0], 0.27, 0.22, n, 'dark'); K.cyl(D, [0, 0.95, 0], [0, 0.96, 0], 0.12, 0.12, n, 'black'); }
      return K.done('trash_bin', P, { collider: K.boxCol(p.kind === 'recycle' ? 1.5 : 0.6, 1, 0.6) }); } });

  K.def('hydrant', { name: 'حنفية حريق', nameEn: 'Fire hydrant', group: 'street', schema: [K.color('color', 'اللون', 'red')], presets: { 'صفراء': { color: 'yellow' } },
    generate: (p, q) => { const P = K.parts(), B = P('paint'), n = K.sides(q, 10);
      K.cyl(B, [0, 0, 0], [0, 0.08, 0], 0.17, 0.17, n, p.color); K.cyl(B, [0, 0.08, 0], [0, 0.6, 0], 0.12, 0.12, n, p.color); K.cyl(B, [0, 0.6, 0], [0, 0.66, 0], 0.15, 0.15, n, p.color); K.cyl(B, [0, 0.66, 0], [0, 0.78, 0], 0.12, 0.04, n, p.color);
      for (const d of [[1, 0, 0], [-1, 0, 0], [0, 0, 1]]) K.cyl(P('metal'), V.add([0, 0.42, 0], V.scale(d, 0.1)), V.add([0, 0.42, 0], V.scale(d, 0.2)), 0.055, 0.055, 6, 'chrome');
      return K.done('hydrant', P, { collider: K.boxCol(0.4, 0.8, 0.4) }); } });

  K.def('bus_stop', { name: 'موقف باص', nameEn: 'Bus stop', group: 'street',
    schema: [{ key: 'length', label: 'الطول', min: 2.5, max: 6, step: 0.5, def: 4, unit: 'م' }, K.color('color', 'اللون', 'teal'), { key: 'ad', label: 'لوحة إعلان مضيئة', type: 'bool', def: true }],
    presets: { 'قصير': { length: 2.5, ad: false } },
    generate: (p, q) => { const P = K.parts(), L = p.length, M = P('metal'), G = P('glass'), W = P('wood'), H = 2.5, D = 1.5;
      K.box(P('concrete'), [0, 0.06, 0], [L + 0.4, 0.12, D + 0.4], 'concrete');
      for (const s of [1, -1]) for (const z of [-D / 2 + 0.06, D / 2 - 0.1]) K.box(M, [s * (L / 2 - 0.05), H / 2 + 0.1, z], [0.08, H, 0.08], p.color);
      K.extrude(M, [[-D / 2 - 0.15, H + 0.1], [D / 2 + 0.3, H + 0.22], [D / 2 + 0.3, H + 0.3], [-D / 2 - 0.15, H + 0.2]], 'x', -L / 2 - 0.1, L / 2 + 0.1, p.color);
      K.box(G, [0, H / 2 + 0.2, -D / 2 + 0.06], [L - 0.2, H - 0.3, 0.03], 'glass'); for (const s of [1, -1]) K.box(G, [s * (L / 2 - 0.05), H / 2 + 0.2, -0.05], [0.03, H - 0.3, D - 0.4], 'glass');
      K.box(W, [0, 0.55, -D / 2 + 0.35], [L - 0.6, 0.05, 0.38], 'wood'); for (const s of [1, -1]) K.box(M, [s * (L / 2 - 0.5), 0.33, -D / 2 + 0.35], [0.05, 0.42, 0.3], 'dark');
      if (p.ad) { K.box(M, [L / 2 + 0.2, 1.25, 0], [0.16, 2.2, 1.2], 'dark'); for (const s of [1, -1]) K.box(P('neon'), [L / 2 + 0.2 + s * 0.085, 1.3, 0], [0.01, 1.7, 1.0], s > 0 ? 'orange' : 'teal'); }
      K.box(M, [-L / 2 - 0.25, 1.6, D / 2], [0.06, 3.2, 0.06], 'steel'); K.cyl(P('paint'), [-L / 2 - 0.25, 3.0, D / 2 + 0.03], [-L / 2 - 0.25, 3.0, D / 2 + 0.06], 0.25, 0.25, 12, 'blue'); K.text(P('paint'), 'BUS', -L / 2 - 0.25, 3.0, D / 2 + 0.07, 0.03, 'white');
      return K.done('bus_stop', P, { collider: K.boxCol(L + 0.4, H + 0.3, D + 0.4), seat: [0, 0.55, -D / 2 + 0.35] }); } });

  K.def('cone', { name: 'قمع مرور', nameEn: 'Traffic cone', group: 'street', schema: [{ key: 'height', label: 'الارتفاع', min: 0.4, max: 1, step: 0.05, def: 0.7, unit: 'م' }], presets: { 'صغير': { height: 0.45 } },
    generate: (p, q) => { const P = K.parts(), B = P('plastic'), H = p.height, n = K.sides(q, 10);
      K.box(B, [0, 0.02, 0], [H * 0.55, 0.04, H * 0.55], 'orange');
      const bands = [[0.04, 0.35, 'orange'], [0.35, 0.5, 'white'], [0.5, 0.68, 'orange'], [0.68, 0.8, 'white'], [0.8, 1, 'orange']];
      for (const [a, b, c] of bands) K.cyl(B, [0, H * a, 0], [0, H * b, 0], lerp(H * 0.21, H * 0.03, a), lerp(H * 0.21, H * 0.03, b), n, c, null, { noCaps: b < 1 && a > 0.04 });
      return K.done('cone', P, { collider: K.boxCol(H * 0.5, H, H * 0.5) }); } });

  K.def('barrier', { name: 'حاجز', nameEn: 'Barrier', group: 'street',
    schema: [{ key: 'kind', label: 'النوع', type: 'enum', options: [['jersey', 'خرساني'], ['stripes', 'مخطط'], ['water', 'بلاستيك مائي']], def: 'jersey' }, { key: 'length', label: 'الطول', min: 1, max: 4, step: 0.5, def: 2, unit: 'م' }],
    presets: { 'مخطط': { kind: 'stripes', length: 1.5 }, 'بلاستيك': { kind: 'water' } },
    generate: (p, q) => { const P = K.parts(), L = p.length;
      if (p.kind === 'jersey') K.extrude(P('concrete'), [[-0.3, 0], [0.3, 0], [0.28, 0.08], [0.12, 0.3], [0.09, 0.82], [-0.09, 0.82], [-0.12, 0.3], [-0.28, 0.08]], 'z', -L / 2, L / 2, 'concrete');
      else if (p.kind === 'water') { const B = P('plastic'); K.extrude(B, [[-0.25, 0], [0.25, 0], [0.22, 0.2], [0.12, 0.85], [-0.12, 0.85], [-0.22, 0.2]], 'z', -L / 2, L / 2, 'red'); K.box(B, [0, 0.55, 0], [0.3, 0.14, L + 0.01], 'white'); }
      else { const M = P('metal'), B = P('paint'); for (const s of [1, -1]) { K.extrude(M, [[-0.3, 0], [-0.26, 0], [0, 1.0], [0.26, 0], [0.3, 0], [0.02, 1.08], [-0.02, 1.08]], 'x', s * L / 2 - 0.03, s * L / 2 + 0.03, 'grey'); }
        for (const y of [0.85, 0.5]) { const n = Math.round(L / 0.3); for (let k = 0; k < n; k++) K.box(B, [-L / 2 + (k + 0.5) * L / n, y, 0], [L / n, 0.2, 0.03], k % 2 ? 'white' : 'red'); } }
      return K.done('barrier', P, { collider: K.boxCol(p.kind === 'stripes' ? L : 0.6, 1, p.kind === 'stripes' ? 0.6 : L) }); } });

  K.def('guardrail', { name: 'حاجز طريق معدني', nameEn: 'Guardrail', group: 'street', schema: [{ key: 'length', label: 'الطول', min: 2, max: 20, step: 1, def: 8, unit: 'م' }], presets: { 'قصير': { length: 4 } },
    generate: (p, q) => { const P = K.parts(), L = p.length, M = P('metal'), n = Math.max(2, Math.round(L / 2) + 1);
      for (let k = 0; k < n; k++) K.box(M, [0, 0.38, -L / 2 + k * L / (n - 1)], [0.1, 0.76, 0.12], 'steel');
      K.extrude(M, [[0.06, 0.5], [0.14, 0.53], [0.1, 0.6], [0.14, 0.67], [0.06, 0.7]], 'z', -L / 2 - 0.1, L / 2 + 0.1, 'chrome');
      return K.done('guardrail', P, { collider: K.boxCol(0.3, 0.8, L) }); } });

  K.def('billboard', { name: 'لوحة إعلانات', nameEn: 'Billboard', group: 'street',
    schema: [{ key: 'width', label: 'العرض', min: 3, max: 12, step: 0.5, def: 6, unit: 'م' }, { key: 'height', label: 'ارتفاع العمود', min: 2, max: 10, step: 0.5, def: 5, unit: 'م' }, { key: 'poster', label: 'الإعلان', type: 'enum', options: [['sun', 'شمس'], ['bars', 'أشرطة'], ['drink', 'مشروب']], def: 'sun' }, { key: 'lit', label: 'إضاءة', type: 'bool', def: true }],
    presets: { 'صغيرة': { width: 3.5, height: 2.5 }, 'طريق سريع': { width: 10, height: 8, poster: 'bars' } },
    generate: (p, q) => { const P = K.parts(), M = P('metal'), F = P('paint'), W = p.width, H = p.height, h = W * 0.42, z = 0.25;
      K.cyl(M, [0, 0, 0], [0, H, 0], 0.22, 0.18, K.sides(q, 8), 'steel');
      K.box(M, [0, H + h / 2, 0], [W + 0.2, h + 0.2, 0.3], 'dark'); K.box(F, [0, H + h / 2, z - 0.09], [W, h, 0.02], 'white');
      const pz = z - 0.07;
      if (p.poster === 'sun') { K.box(F, [0, H + h * 0.3, pz], [W, h * 0.6, 0.01], 'blue'); K.extrude(F, K.circle(h * 0.22, 12), 'z', pz + 0.005, pz + 0.015, 'yellow', { at: [W * 0.25, H + h * 0.62, 0] }); K.box(F, [0, H + h * 0.12, pz + 0.01], [W, h * 0.24, 0.01], 'sand2'); K.text(F, 'SAUDI', -W * 0.18, H + h * 0.75, pz + 0.02, h * 0.06, 'white'); }
      else if (p.poster === 'bars') { const cs = ['red', 'orange', 'yellow', 'green', 'teal', 'navy']; cs.forEach((c, k) => K.box(F, [-W / 2 + (k + 0.5) * W / 6, H + h / 2, pz + 0.005], [W / 6, h, 0.01], c)); }
      else { K.box(F, [0, H + h / 2, pz + 0.005], [W, h, 0.01], 'red'); K.extrude(F, [[-0.25, 0], [0.25, 0], [0.3, 0.9], [0.15, 1.1], [0.15, 1.3], [-0.15, 1.3], [-0.15, 1.1], [-0.3, 0.9]].map(([x, y]) => [x * h * 0.5, y * h * 0.6]), 'z', pz + 0.01, pz + 0.02, 'white', { at: [W * 0.25, H + h * 0.12, 0] }); K.text(F, 'BAKKA', -W * 0.15, H + h / 2, pz + 0.02, h * 0.07, 'white'); }
      if (p.lit) for (const s of [-1, 0, 1]) { K.rod(M, [s * W / 3, H + 0.05, 0.1], [s * W / 3, H - 0.1, 1.0], 0.03, 'dark'); K.box(P('lamp'), [s * W / 3, H - 0.12, 1.05], [0.35, 0.08, 0.2], 'white'); }
      return K.done('billboard', P, { collider: { type: 'capsule', radius: 0.25, height: H, axis: 'y' }, light: p.lit ? { at: [0, H, 1.2], color: [1, 0.95, 0.85], intensity: 2, distance: W * 1.2 } : null }); } });

  K.def('bollard', { name: 'عمود حماية', nameEn: 'Bollard', group: 'street', schema: [{ key: 'height', label: 'الارتفاع', min: 0.5, max: 1.2, step: 0.05, def: 0.9, unit: 'م' }, K.color('color', 'اللون', 'yellow')], presets: { 'أسود': { color: 'black' } },
    generate: (p, q) => { const P = K.parts(), B = P('paint'), n = K.sides(q, 8), H = p.height; K.cyl(B, [0, 0, 0], [0, H, 0], 0.1, 0.1, n, p.color); K.cyl(B, [0, H, 0], [0, H + 0.05, 0], 0.1, 0.06, n, p.color); K.cyl(P('paint'), [0, H * 0.72, 0], [0, H * 0.8, 0], 0.103, 0.103, n, 'white', null, { noCaps: true }); return K.done('bollard', P, { collider: K.boxCol(0.22, H, 0.22) }); } });

  K.def('power_pole', { name: 'عمود كهرباء', nameEn: 'Power pole', group: 'street', schema: [{ key: 'height', label: 'الارتفاع', min: 6, max: 12, step: 0.5, def: 9, unit: 'م' }, { key: 'kind', label: 'النوع', type: 'enum', options: [['wood', 'خشب'], ['concrete', 'خرسانة']], def: 'wood' }, { key: 'transformer', label: 'محوّل', type: 'bool', def: false }],
    presets: { 'بمحول': { transformer: true }, 'خرساني': { kind: 'concrete' } },
    generate: (p, q) => { const P = K.parts(), H = p.height, Bp = P(p.kind === 'wood' ? 'wood' : 'concrete'), n = K.sides(q, 7);
      K.cyl(Bp, [0, 0, 0], [0, H, 0], 0.16, 0.11, n, p.kind === 'wood' ? 'woodDark' : 'concrete');
      for (const [y, w] of [[H - 0.35, 2.2], [H - 1.1, 1.6]]) { K.box(P('wood'), [0, y, 0.12], [w, 0.12, 0.1], 'woodDark'); for (const x of [-w / 2 + 0.1, -w / 4, w / 4, w / 2 - 0.1]) K.cyl(P('ceramic'), [x, y + 0.06, 0.12], [x, y + 0.24, 0.12], 0.05, 0.04, 6, 'offwhite'); }
      if (p.transformer) { const c = [0, H - 2.6, 0.38]; K.cyl(P('metal'), V.add(c, [0, -0.45, 0]), V.add(c, [0, 0.45, 0]), 0.28, 0.28, n, 'greyLight'); K.box(P('metal'), V.add(c, [0, 0, -0.2]), [0.12, 0.6, 0.2], 'grey'); }
      return K.done('power_pole', P, { collider: { type: 'capsule', radius: 0.18, height: H, axis: 'y' }, wires: [-1.0, -0.55, 0.55, 1.0].map(x => [x, H - 0.11, 0.12]) }); } });
})(typeof window !== 'undefined' ? window : globalThis);
