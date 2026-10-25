// Aboden Assets — core/mud.js
// أدوات بناء الطين: جدار بفتحات حقيقية، كتلة طين مستديرة الحواف، فتحات تهوية مثلثة، صناديق خشب.
// الواجهة الأمامية = +Z، الأصل على الأرض في منتصف القطعة، المتر وحدة القياس.
(function (g) {
  'use strict';
  const AA = g.AA;
  const V = AA.v, clamp = AA.clamp, lerp = AA.lerp, smooth = AA.smooth;

  // ---------- ضجيج ثلاثي الأبعاد (لتموّج اللياسة) ----------
  function hash3(x, y, z, s) {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1440662683) + Math.imul(s, 144665)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  AA.noise3 = function (x, y, z, s) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const f = t => t * t * (3 - 2 * t);
    const tx = f(x - xi), ty = f(y - yi), tz = f(z - zi);
    let r = 0;
    for (let k = 0; k < 8; k++) {
      const dx = k & 1, dy = (k >> 1) & 1, dz = (k >> 2) & 1;
      r += hash3(xi + dx, yi + dy, zi + dz, s) * (dx ? tx : 1 - tx) * (dy ? ty : 1 - ty) * (dz ? tz : 1 - tz);
    }
    return r;
  };
  AA.fbm3 = (x, y, z, s) => AA.noise3(x, y, z, s) * 0.58 + AA.noise3(x * 2.1, y * 2.1, z * 2.1, s + 7) * 0.29 + AA.noise3(x * 4.3, y * 4.3, z * 4.3, s + 13) * 0.13;

  // موضع + دوران حول Y
  function xform(p, o) {
    let x = p[0], z = p[2];
    if (o.rot) { const c = Math.cos(o.rot), s = Math.sin(o.rot); const nx = x * c + z * s; z = -x * s + z * c; x = nx; }
    const a = o.at || [0, 0, 0];
    return [x + a[0], p[1] + a[1], z + a[2]];
  }
  AA.xform = xform;

  // مربع بلفّ صحيح حسب الاتجاه المطلوب
  function quad(B, p, uv, c, want) {
    const ids = p.map((q, k) => B.v(q, c[k] || c[0], 0, 0, 0, uv[k]));
    const n = V.cross(V.sub(p[1], p[0]), V.sub(p[2], p[0]));
    if (V.dot(n, want) >= 0) { B.t(ids[0], ids[1], ids[2]); B.t(ids[0], ids[2], ids[3]); }
    else { B.t(ids[0], ids[2], ids[1]); B.t(ids[0], ids[3], ids[2]); }
  }
  AA.quad = quad;
  function tri(B, p, uv, c, want) {
    const ids = p.map((q, k) => B.v(q, c, 0, 0, 0, uv[k]));
    const n = V.cross(V.sub(p[1], p[0]), V.sub(p[2], p[0]));
    if (V.dot(n, want) >= 0) B.t(ids[0], ids[1], ids[2]); else B.t(ids[0], ids[2], ids[1]);
  }

  // تعتيم عند الأرض (رطوبة وغبار) + ظل داخلي
  const groundAO = (y, k) => { const s = 0.62 + 0.38 * smooth(0, 0.7, y); return [s * k, s * k, s * k]; };

  /*
   جدار طين بفتحات حقيقية
   o = { L, H, T, taper, top(x)->ارتفاع, openings:[{x0,x1,y0,y1,blind}], flat:[{x,y,r}],
         r (تدوير الحواف), topRound, disp, step, seed, tile, tileTop, at, rot, noTop, noEnds }
   P = { wall, top, dark } (Builders)
   يرجع faceZ(y): بُعد الوجه الأمامي عن المنتصف عند الارتفاع y
  */
  AA.mudPanel = function (P, o) {
    const L = o.L, H = o.H, hT = o.T / 2, taper = o.taper || 0, step = o.step, s = o.seed || 1;
    const r = o.r == null ? 0.08 : o.r, tile = o.tile || 4, tileTop = o.tileTop || 2, disp = o.disp == null ? 0.03 : o.disp;
    const top = o.top || (() => H), flat = o.flat || [];
    const rnd = v => +v.toFixed(5);
    const ops = (o.openings || []).map(p => Object.assign({}, p, { x0: rnd(p.x0), x1: rnd(p.x1), y0: rnd(p.y0), y1: rnd(p.y1) }));
    const faceZ = y => hT - taper * y / H;
    // أعمدة الشبكة: منتظمة + حواف الفتحات + أعمدة تدوير الأطراف
    const must = [-L / 2, L / 2]; ops.forEach(p => must.push(p.x0, p.x1));
    const soft = [-L / 2 + r * 0.35, -L / 2 + r, L / 2 - r, L / 2 - r * 0.35];
    for (let x = -L / 2 + step; x < L / 2 - 1e-6; x += step) soft.push(x);
    const xs = merge(must, soft, step * 0.3);
    let topMin = Infinity, topMax = -Infinity;
    for (const x of xs) { topMin = Math.min(topMin, top(x)); topMax = Math.max(topMax, top(x)); }
    const mustY = [0]; ops.forEach(p => { if (p.y0 > 0) mustY.push(p.y0); mustY.push(p.y1); });
    const softY = []; for (let y = step; y < topMin - step * 0.5; y += step) softY.push(y);
    const ys = merge(mustY, softY, step * 0.3).filter(y => y < topMin - 0.02);
    const K = Math.max(1, Math.ceil((topMax - ys[ys.length - 1]) / step));
    const NY = ys.length + K, NX = xs.length;
    const yAt = (i, j) => j < ys.length ? ys[j] : lerp(ys[ys.length - 1], top(xs[i]), (j - ys.length + 1) / K);
    const inOpen = (x, y) => ops.find(p => x > p.x0 && x < p.x1 && y > p.y0 && y < p.y1);
    const distOpen = (x, y) => {
      let d = 9;
      for (const p of ops) { const dx = Math.max(p.x0 - x, 0, x - p.x1), dy = Math.max(p.y0 - y, 0, y - p.y1); d = Math.min(d, Math.hypot(dx, dy)); }
      for (const f of flat) d = Math.min(d, Math.max(0, Math.hypot(x - f.x, y - f.y) - f.r));
      return d;
    };
    function pos(i, j, side) {
      const x = xs[i], y = yAt(i, j), e = L / 2 - Math.abs(x);
      let hz = faceZ(y);
      if (e < r) hz -= r - Math.sqrt(Math.max(0, r * r - (r - e) * (r - e)));
      const fade = smooth(0, 0.14, distOpen(x, y)) * smooth(0, 0.1, e);
      const d = disp * (AA.fbm3(x * 1.7, y * 1.7, side * 3.1, s) - 0.5) * 2 * fade;
      return [x, y, side * (hz + d)];
    }
    // الوجهان
    for (const side of [1, -1]) {
      const id = [];
      for (let i = 0; i < NX; i++) {
        id.push([]);
        for (let j = 0; j < NY; j++) {
          const p = pos(i, j, side);
          id[i].push(P.wall.v(xform(p, o), groundAO(p[1], 1), 0, 0, 0, [(side > 0 ? p[0] : -p[0]) / tile + 0.5, p[1] / tile]));
        }
      }
      for (let i = 0; i < NX - 1; i++) for (let j = 0; j < NY - 1; j++) {
        const cx = (xs[i] + xs[i + 1]) / 2, cy = (yAt(i, j) + yAt(i, j + 1)) / 2;
        if (inOpen(cx, cy)) continue;
        if (side < 0 && o.backMinY != null && cy < o.backMinY) continue; // الوجه الداخلي المخفي تحت السقف لا يُرسم
        const a = id[i][j], b = id[i + 1][j], c = id[i + 1][j + 1], d = id[i][j + 1];
        if (side > 0) { P.wall.t(a, b, c); P.wall.t(a, c, d); } else { P.wall.t(a, c, b); P.wall.t(a, d, c); }
      }
    }
    // جوانب الفتحات (السماكة الداخلية)
    const rc = [0.62, 0.62, 0.62];
    for (const op of ops) {
      const i0 = xs.indexOf(op.x0), i1 = xs.indexOf(op.x1);
      const j0 = ys.indexOf(op.y0 > 0 ? op.y0 : 0), j1 = ys.indexOf(op.y1);
      const W = p => xform(p, o);
      const R = (p, u) => [u / tile, p[1] / tile];
      for (let j = j0; j < j1; j++) {
        for (const [ii, nx] of [[i0, 1], [i1, -1]]) {
          const a = pos(ii, j, 1), b = pos(ii, j + 1, 1), c = pos(ii, j + 1, -1), d = pos(ii, j, -1);
          quad(P.wall, [a, b, c, d].map(W), [R(a, a[2]), R(b, b[2]), R(c, c[2]), R(d, d[2])], [rc], xdir(o, [nx, 0, 0]));
        }
      }
      for (let i = i0; i < i1; i++) {
        const rows = op.y0 > 0 ? [[j1, -1], [j0, 1]] : [[j1, -1]];
        for (const [jj, ny] of rows) {
          const a = pos(i, jj, 1), b = pos(i + 1, jj, 1), c = pos(i + 1, jj, -1), d = pos(i, jj, -1);
          quad(jj === j1 ? P.wall : P.top, [a, b, c, d].map(W), [[a[0] / tile, a[2] / tile], [b[0] / tile, b[2] / tile], [c[0] / tile, c[2] / tile], [d[0] / tile, d[2] / tile]], [rc], xdir(o, [0, ny, 0]));
        }
      }
      if (op.blind) { // نافذة مغلقة من الداخل: عتمة
        const y = (op.y0 + op.y1) / 2, z = -faceZ(y) * 0.2;
        quad(P.dark, [[op.x0, op.y0, z], [op.x1, op.y0, z], [op.x1, op.y1, z], [op.x0, op.y1, z]].map(W), [[0, 0], [1, 0], [1, 1], [0, 1]], [[0.07, 0.045, 0.03]], xdir(o, [0, 0, 1]));
      }
    }
    // الحافة العلوية المدوّرة
    if (!o.noTop) {
      const tr = o.topRound == null ? 0.06 : o.topRound;
      for (let i = 0; i < NX - 1; i++) {
        const f0 = pos(i, NY - 1, 1), f1 = pos(i + 1, NY - 1, 1), b0 = pos(i, NY - 1, -1), b1 = pos(i + 1, NY - 1, -1);
        const m0 = [f0[0], f0[1] + tr, 0], m1 = [f1[0], f1[1] + tr, 0];
        const T = p => [p[0] / tileTop, p[2] / tileTop];
        const c = [[1.05, 1.05, 1.05]];
        quad(P.top, [f0, f1, m1, m0].map(p => xform(p, o)), [f0, f1, m1, m0].map(T), c, xdir(o, [0, 1, 0.6]));
        quad(P.top, [m0, m1, b1, b0].map(p => xform(p, o)), [m0, m1, b1, b0].map(T), c, xdir(o, [0, 1, -0.6]));
      }
    }
    // الطرفان
    if (!o.noEnds) for (const [i, sx] of [[0, -1], [NX - 1, 1]]) {
      for (let j = 0; j < NY - 1; j++) {
        const a = pos(i, j, 1), b = pos(i, j + 1, 1), c = pos(i, j + 1, -1), d = pos(i, j, -1);
        const U = p => [p[2] / tile, p[1] / tile];
        quad(P.wall, [a, b, c, d].map(p => xform(p, o)), [a, b, c, d].map(U), [groundAO(a[1], 1), groundAO(b[1], 1), groundAO(c[1], 1), groundAO(d[1], 1)], xdir(o, [sx, 0, 0]));
      }
      if (!o.noTop) {
        const f = pos(i, NY - 1, 1), b = pos(i, NY - 1, -1), m = [f[0], f[1] + (o.topRound == null ? 0.06 : o.topRound), 0];
        tri(P.top, [f, m, b].map(p => xform(p, o)), [f, m, b].map(p => [p[2] / 2, p[1] / 2]), [1, 1, 1], xdir(o, [sx, 0, 0]));
      }
    }
    return { faceZ, xs, ys, top };
  };
  function xdir(o, d) { // اتجاه بعد الدوران
    if (!o.rot) return d;
    const c = Math.cos(o.rot), s = Math.sin(o.rot);
    return [d[0] * c + d[2] * s, d[1], -d[0] * s + d[2] * c];
  }
  function merge(must, soft, eps) {
    const m = [...new Set(must.map(v => +v.toFixed(5)))].sort((a, b) => a - b);
    const out = m.slice();
    for (const v of soft) if (!out.some(w => Math.abs(w - v) < eps)) out.push(v);
    return out.sort((a, b) => a - b);
  }

  /*
   كتلة طين: قاعدة مستطيلة مدوّرة، أوجه تميل للداخل، قمة مدوّرة، وقرون اختيارية عند الزوايا
   o = { sx, sz, h, r, taperX, taperZ, topRound, horn(x,z), disp, step, seed, tile, at, rot, y0 }
  */
  AA.mudSolid = function (P, o) {
    const sx = o.sx, sz = o.sz, h = o.h, r = Math.min(o.r == null ? 0.12 : o.r, sx / 2 - 0.01, sz / 2 - 0.01), s = o.seed || 2;
    const step = o.step || 0.25, tile = o.tile || 4, disp = o.disp == null ? 0.025 : o.disp, y0 = o.y0 || 0;
    const tX = o.taperX || 0, tZ = o.taperZ || 0, tr = o.topRound == null ? 0.05 : o.topRound;
    // محيط مستطيل مدوّر
    const hx = sx / 2 - r, hz = sz / 2 - r, ring = [];
    const corners = [[hx, hz, 0], [-hx, hz, 90], [-hx, -hz, 180], [hx, -hz, 270]];
    for (let c = 0; c < 4; c++) {
      const [ox, oz, a0] = corners[c];
      for (let k = 0; k < 4; k++) {
        const a = (a0 + k * 30) * Math.PI / 180;
        ring.push({ p: [ox + r * Math.cos(a), oz + r * Math.sin(a)], n: [Math.cos(a), Math.sin(a)] });
      }
      const [nx, nz] = corners[(c + 1) % 4], a1 = (a0 + 90) * Math.PI / 180;
      const p0 = [ox + r * Math.cos(a1), oz + r * Math.sin(a1)], p1 = [nx + r * Math.cos(a1), nz + r * Math.sin(a1)];
      const seg = Math.max(1, Math.round(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / step));
      for (let k = 0; k < seg; k++) ring.push({ p: [lerp(p0[0], p1[0], k / seg), lerp(p0[1], p1[1], k / seg)], n: [Math.cos(a1), Math.sin(a1)] });
    }
    const lv = Math.max(3, Math.ceil(h / step));
    const levels = []; for (let k = 0; k <= lv; k++) levels.push(k / lv);
    const at = (q, t, extra) => {
      const ix = tX * t + extra, iz = tZ * t + extra;
      const x = q.p[0] - Math.sign(q.p[0]) * Math.min(ix, Math.abs(q.p[0])) * Math.min(1, Math.abs(q.p[0]) / (sx / 2));
      const z = q.p[1] - Math.sign(q.p[1]) * Math.min(iz, Math.abs(q.p[1])) * Math.min(1, Math.abs(q.p[1]) / (sz / 2));
      return [x, z];
    };
    const n = ring.length, rows = [];
    for (const t of levels) {
      const row = [];
      for (const q of ring) {
        const [x, z] = at(q, t, 0);
        const y = y0 + t * h + (o.horn ? o.horn(x, z) * Math.pow(t, 4) : 0);
        const d = disp * (AA.fbm3(x * 1.7 + (o.at ? o.at[0] : 0), y * 1.7, z * 1.7 + (o.at ? o.at[2] : 0), s) - 0.5) * 2 * (t < 0.999 ? 1 : 0.3);
        const p = [x + q.n[0] * d, y, z + q.n[1] * d];
        const u = Math.abs(q.n[0]) > Math.abs(q.n[1]) ? p[2] * Math.sign(q.n[0]) : -p[0] * Math.sign(q.n[1]);
        row.push(P.wall.v(xform(p, o), groundAO(y, 1), 0, 0, 0, [u / tile + 0.5 + (o.uvOff || 0), y / tile + (o.uvOff || 0) * 0.7]));
      }
      rows.push(row);
    }
    for (let k = 0; k < lv; k++) for (let i = 0; i < n; i++) {
      const a = rows[k][i], b = rows[k][(i + 1) % n], c = rows[k + 1][(i + 1) % n], d = rows[k + 1][i];
      P.wall.t(a, c, b); P.wall.t(a, d, c);
    }
    // القمة: حلقة داخلية مرفوعة ثم مركز
    const cap = [], ctr = [0, 0];
    for (const q of ring) {
      const [x, z] = at(q, 1, tr * 1.2);
      const y = y0 + h + tr + (o.horn ? o.horn(x, z) : 0);
      cap.push([x, y, z]);
    }
    let cy = 0; cap.forEach(p => cy += p[1]); cy /= n;
    const C = P.top, T = p => [p[0] / 2, p[2] / 2];
    const topRing = ring.map((q, i) => {
      const [x, z] = at(q, 1, 0);
      const y = y0 + h + (o.horn ? o.horn(x, z) : 0);
      return [x, y, z];
    });
    const idA = topRing.map(p => C.v(xform(p, o), [1.05, 1.05, 1.05], 0, 0, 0, T(p)));
    const idB = cap.map(p => C.v(xform(p, o), [1.05, 1.05, 1.05], 0, 0, 0, T(p)));
    const idC = C.v(xform([ctr[0], cy + tr * 0.3, ctr[1]], o), [1.05, 1.05, 1.05], 0, 0, 0, [0, 0]);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      C.t(idA[i], idB[j], idA[j]); C.t(idA[i], idB[i], idB[j]);
      C.t(idB[i], idC, idB[j]);
    }
    return { faceAt: y => sz / 2 - tZ * (y - y0) / h, faceXAt: y => sx / 2 - tX * (y - y0) / h };
  };

  // رأس مدبّب (هرم أو منشور مثلث) لقمم الشرفات
  AA.mudTip = function (P, o, w, d, h, y0, pyramid) {
    const B = P.top, c = [1.03, 1.03, 1.03];
    const apex = pyramid ? [[0, y0 + h, 0]] : [[0, y0 + h, -d / 2], [0, y0 + h, d / 2]];
    const b = [[-w / 2, y0, d / 2], [w / 2, y0, d / 2], [w / 2, y0, -d / 2], [-w / 2, y0, -d / 2]];
    const U = p => [p[0] / 2 + p[2] / 2, p[1] / 2];
    if (pyramid) {
      for (let i = 0; i < 4; i++) {
        const p0 = b[i], p1 = b[(i + 1) % 4], a = apex[0];
        const n = V.cross(V.sub(p1, p0), V.sub(a, p0)), mid = [(p0[0] + p1[0]) / 2, 0, (p0[2] + p1[2]) / 2];
        tri(B, [p0, p1, a].map(p => xform(p, o)), [p0, p1, a].map(U), c, xdir(o, [mid[0], 0.5, mid[2]]));
      }
    } else {
      const [a0, a1] = apex; // a0 خلفي، a1 أمامي
      tri(B, [b[0], b[1], a1].map(p => xform(p, o)), [b[0], b[1], a1].map(U), c, xdir(o, [0, 0, 1]));
      tri(B, [b[2], b[3], a0].map(p => xform(p, o)), [b[2], b[3], a0].map(U), c, xdir(o, [0, 0, -1]));
      quad(B, [b[1], b[2], a0, a1].map(p => xform(p, o)), [b[1], b[2], a0, a1].map(U), [c], xdir(o, [1, 0.5, 0]));
      quad(B, [b[3], b[0], a1, a0].map(p => xform(p, o)), [b[3], b[0], a1, a0].map(U), [c], xdir(o, [-1, 0.5, 0]));
    }
  };

  // لوح بمقطع جانبي (شُرفة مدرّجة مثلاً): مضلع في المستوى XY نجمي الشكل من نقطة المنتصف السفلي، بسماكة d
  AA.profileSlab = function (P, o, prof, d, tile, color, smooth) {
    tile = tile || 4; const c = color || [1, 1, 1], n = prof.length, F = smooth ? P.top : P.wall;
    for (const sz of [1, -1]) {
      const z = sz * d / 2, ctr = F.v(xform([0, 0, z], o), c, 0, 0, 0, [0.5, 0]);
      const ids = prof.map(([x, y]) => F.v(xform([x, y, z], o), c, 0, 0, 0, [(sz > 0 ? x : -x) / tile + 0.5, y / tile]));
      for (let i = 0; i < n - 1; i++) { if (sz > 0) F.t(ctr, ids[i], ids[i + 1]); else F.t(ctr, ids[i + 1], ids[i]); }
    }
    let run = 0;
    for (let i = 0; i < n - 1; i++) {
      const [x0, y0] = prof[i], [x1, y1] = prof[i + 1], len = Math.hypot(x1 - x0, y1 - y0);
      const nrm = [y1 - y0, -(x1 - x0), 0];
      const B = smooth || nrm[1] > Math.abs(nrm[0]) * 0.8 ? P.top : P.wall;
      const ps = [[x0, y0, d / 2], [x1, y1, d / 2], [x1, y1, -d / 2], [x0, y0, -d / 2]];
      quad(B, ps.map(p => xform(p, o)), [[run / tile, d / tile], [(run + len) / tile, d / tile], [(run + len) / tile, 0], [run / tile, 0]], [c], xdir(o, V.norm([nrm[0] || 1e-6, nrm[1], 0])));
      run += len;
    }
  };

  // فتحة تهوية مثلثة: مثلث غائر داكن بإطار رفيع (على وجه أمامي عند z)
  AA.triVent = function (P, o, x, y, size, z, inverted) {
    const pts = inverted ? [[-size / 2, size * 1.1], [size / 2, size * 1.1], [0, 0]] : [[-size / 2, 0], [size / 2, 0], [0, size * 1.1]];
    const f = pts.map(([px, py]) => [x + px, y + py, z + 0.004]);
    const ids = f.map(p => P.dark.v(xform(p, o), [0.06, 0.04, 0.028], 0, 0, 0, [0, 0]));
    const n = V.cross(V.sub(f[1], f[0]), V.sub(f[2], f[0]));
    if (V.dot(n, xdir(o, [0, 0, 1])) >= 0) P.dark.t(ids[0], ids[1], ids[2]); else P.dark.t(ids[0], ids[2], ids[1]);
  };
  // معيّن من مثلثات (واجهة p8)
  AA.diamondVents = function (P, o, cx, cy, rows, size, z) {
    for (let r = 0; r < rows * 2 - 1; r++) {
      const cnt = r < rows ? r + 1 : rows * 2 - 1 - r;
      for (let k = 0; k < cnt; k++) AA.triVent(P, o, cx + (k - (cnt - 1) / 2) * size * 1.6, cy - r * size * 1.5, size, z, false);
    }
  };

  // صندوق خشب/مادة بإسقاط UV حسب الوجه
  AA.box = function (B, c, size, color, tile, o, rotZ) {
    const [hx, hy, hz] = size.map(v => v / 2);
    const faces = [
      [[1, 0, 0], [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz]]],
      [[-1, 0, 0], [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]]],
      [[0, 1, 0], [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz]]],
      [[0, -1, 0], [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz]]],
      [[0, 0, 1], [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]]],
      [[0, 0, -1], [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]]]
    ];
    const rz = p => { if (!rotZ) return p; const cs = Math.cos(rotZ), sn = Math.sin(rotZ); return [p[0] * cs - p[1] * sn, p[0] * sn + p[1] * cs, p[2]]; };
    for (const [n, ps] of faces) {
      const uv = ps.map(p => Math.abs(n[0]) ? [p[2] / tile, p[1] / tile] : Math.abs(n[1]) ? [p[0] / tile, p[2] / tile] : [p[0] / tile, p[1] / tile]);
      quad(B, ps.map(p => xform(V.add(c, rz(p)), o || {})), uv, [color], xdir(o || {}, rz(n)));
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
