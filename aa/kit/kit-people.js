// Aboden Assets — kit/kit-people.js — ناس عصريين بأسلوب التشيبي (نفس مولّد شخصيات حزمة اللو-بولي LP.person، ونفس الهيكل والحركات)
// اللبس: تيشيرت وجينز، بدلة، بدلة رياضة، ثوب وشماغ، عباية؛ وغطاء الرأس: شعر، كاب، شماغ، غترة، شيلة.
(function (g) {
  'use strict';
  const AA = g.AA, K = AA.kit, LP = AA.lp;
  const SHIRT = [['#d94c3d', 'أحمر'], ['#3d7fd9', 'أزرق'], ['#f4f2ec', 'أبيض'], ['#2a2a2d', 'أسود'], ['#e9b23a', 'أصفر'], ['#3f9b55', 'أخضر'], ['#8a5fb8', 'بنفسجي'], ['#e7849f', 'وردي']];
  const PANTS = [['#3b5578', 'جينز'], ['#2a2a2d', 'أسود'], ['#c9b48a', 'بيج'], ['#5b6470', 'رمادي'], ['#f4f2ec', 'أبيض']];
  K.def('person', { name: 'شخص', nameEn: 'Person', group: 'people',
    schema: [
      { key: 'outfit', label: 'اللبس', type: 'enum', options: [['tshirt', 'تيشيرت وبنطلون'], ['suit', 'بدلة'], ['sport', 'بدلة رياضة'], ['thobe', 'ثوب'], ['abaya', 'عباية']], def: 'tshirt' },
      { key: 'shirt', label: 'لون القميص', type: 'enum', options: SHIRT, def: '#3d7fd9' }, { key: 'pants', label: 'لون البنطلون', type: 'enum', options: PANTS, def: '#3b5578' },
      { key: 'head', label: 'الرأس', type: 'enum', options: [['hair', 'شعر'], ['cap', 'كاب'], ['shemagh', 'شماغ'], ['ghutra', 'غترة'], ['shayla', 'شيلة'], ['girlHair', 'شعر طويل']], def: 'hair' },
      { key: 'height', label: 'الطول', min: 1.0, max: 1.9, step: 0.01, def: 1.72, unit: 'م' },
      { key: 'skin', label: 'لون البشرة', type: 'enum', options: [['mid', 'حنطي'], ['light', 'فاتح'], ['tan', 'أسمر'], ['dark', 'داكن']], def: 'mid' },
      { key: 'beard', label: 'لحية', type: 'bool', def: false }
    ],
    presets: { 'موظف ببدلة': { outfit: 'suit', shirt: '#2a2a2d', pants: '#2a2a2d' }, 'رياضي': { outfit: 'sport', shirt: '#3f9b55', head: 'cap' }, 'شاب بثوب وشماغ': { outfit: 'thobe', head: 'shemagh' }, 'بنت بشعر طويل': { head: 'girlHair', shirt: '#e7849f', pants: '#2a2a2d', height: 1.5 }, 'امرأة بعباية': { outfit: 'abaya', head: 'shayla', height: 1.62 }, 'طفل': { height: 1.1, shirt: '#e9b23a', head: 'cap' } },
    clips: [['idle', 'وقوف'], ['walk', 'مشي'], ['wave', 'يلوّح'], ['sit', 'جالس'], ['sit_floor', 'متربّع']],
    generate: (p, q) => {
      const o = p.outfit, G = o === 'thobe' ? { type: 'thobe' } : o === 'abaya' ? { type: 'abaya', color: '#1f1b1a', trim: true, trimColor: '#b48a3c' }
        : o === 'suit' ? { type: 'casual', color: p.shirt, pants: p.pants, tie: '#b8322c', belt: false } : o === 'sport' ? { type: 'casual', color: p.shirt, pants: p.shirt, stripe: 'white', belt: false }
        : { type: 'casual', color: p.shirt, pants: p.pants, short: true, print: p.shirt === '#f4f2ec' ? '#3d7fd9' : '#f4f2ec' };
      const head = p.head === 'shayla' ? { type: 'shayla', color: '#1f1b1a' } : p.head === 'shemagh' || p.head === 'ghutra' ? { type: p.head, agal: true } : p.head === 'cap' ? { type: 'cap', color: o === 'sport' ? '#f4f2ec' : '#c23b33' } : { type: p.head };
      const female = p.head === 'shayla' || p.head === 'girlHair';
      const out = LP.person(p, q, { id: 'kit_person', k: LP.chibiScale(p.height), skin: p.skin, garment: G, head, beard: p.beard ? 0.5 : 0, lashes: female, niqabBrows: p.head === 'shayla', shoes: G.type === 'casual' ? (o === 'suit' ? '#2a2420' : '#f4f2ec') : null });
      return out;
    } });
})(typeof window !== 'undefined' ? window : globalThis);
