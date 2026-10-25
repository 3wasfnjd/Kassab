// Aboden Assets — core/texture.js
// خامات مولّدة بالكود (بدون صور): لياسة طين بطوب ظاهر، أعلى الجدار، خشب، باب نجدي ملوّن، جص أبيض.
// كل خامة تُخرج: { size, albedo: Uint8Array RGBA, normal: Uint8Array RGBA } — قابلة للتكرار (tileable).
// منقولة من house_textures.py في مستودع مفاتيح، بعد إعادة كتابتها بدون مكتبات.
(function (g) {
  'use strict';
  const AA = g.AA;
  const clamp = AA.clamp;

  // ضجيج قابل للتكرار عند الحواف (fbm)
  function tileNoise(n, seed, octaves, falloff) {
    const rng = AA.rng(seed), acc = new Float32Array(n * n);
    let amp = 1;
    for (const s of octaves) {
      const grid = new Float32Array(s * s);
      for (let i = 0; i < grid.length; i++) grid[i] = rng();
      for (let y = 0; y < n; y++) {
        const fy = y / n * s, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty);
        const r0 = (y0 % s) * s, r1 = ((y0 + 1) % s) * s;
        for (let x = 0; x < n; x++) {
          const fx = x / n * s, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx);
          const c0 = x0 % s, c1 = (x0 + 1) % s;
          const a = grid[r0 + c0] + (grid[r0 + c1] - grid[r0 + c0]) * sx;
          const b = grid[r1 + c0] + (grid[r1 + c1] - grid[r1 + c0]) * sx;
          acc[y * n + x] += (a + (b - a) * sy) * amp;
        }
      }
      amp /= falloff;
    }
    let mn = Infinity, mx = -Infinity;
    for (const v of acc) { if (v < mn) mn = v; if (v > mx) mx = v; }
    for (let i = 0; i < acc.length; i++) acc[i] = (acc[i] - mn) / (mx - mn || 1);
    return acc;
  }
  // تنعيم يلتف عند الحواف
  function blur(a, n, r, passes) {
    let src = a, tmp = new Float32Array(n * n);
    for (let p = 0; p < (passes || 2); p++) {
      for (let y = 0; y < n; y++) {
        let s = 0;
        for (let k = -r; k <= r; k++) s += src[y * n + ((k % n) + n) % n];
        for (let x = 0; x < n; x++) {
          tmp[y * n + x] = s / (2 * r + 1);
          s += src[y * n + (x + r + 1) % n] - src[y * n + ((x - r) % n + n) % n];
        }
      }
      const out = new Float32Array(n * n);
      for (let x = 0; x < n; x++) {
        let s = 0;
        for (let k = -r; k <= r; k++) s += tmp[(((k % n) + n) % n) * n + x];
        for (let y = 0; y < n; y++) {
          out[y * n + x] = s / (2 * r + 1);
          s += tmp[((y + r + 1) % n) * n + x] - tmp[(((y - r) % n + n) % n) * n + x];
        }
      }
      src = out;
    }
    return src;
  }
  // تنعيم أفقي فقط (يجعل بقع الطوب الظاهر عريضة مثل المراجع)
  function blurX(a, n, r) {
    const out = new Float32Array(n * n);
    for (let y = 0; y < n; y++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += a[y * n + ((k % n) + n) % n];
      for (let x = 0; x < n; x++) { out[y * n + x] = s / (2 * r + 1); s += a[y * n + (x + r + 1) % n] - a[y * n + ((x - r) % n + n) % n]; }
    }
    return out;
  }
  const at = (a, n, x, y) => a[(((y % n) + n) % n) * n + (((x % n) + n) % n)];

  // خريطة اتجاهات السطح من خريطة الارتفاع
  function normalFrom(h, n, strength) {
    const out = new Uint8Array(n * n * 4);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const dx = (at(h, n, x + 1, y) - at(h, n, x - 1, y)) * strength;
      const dy = (at(h, n, x, y + 1) - at(h, n, x, y - 1)) * strength;
      // الصف 0 = v=0 (أسفل الخامة) — y في الصورة يزيد مع الارتفاع
      const nx = -dx, ny = -dy, nz = 1, l = Math.hypot(nx, ny, nz);
      const i = (y * n + x) * 4;
      out[i] = (nx / l * 0.5 + 0.5) * 255; out[i + 1] = (ny / l * 0.5 + 0.5) * 255; out[i + 2] = (nz / l * 0.5 + 0.5) * 255; out[i + 3] = 255;
    }
    return out;
  }
  function pack(rgb, n) {
    const out = new Uint8Array(n * n * 4);
    for (let i = 0; i < n * n; i++) { out[i * 4] = clamp(rgb[i * 3], 0, 255); out[i * 4 + 1] = clamp(rgb[i * 3 + 1], 0, 255); out[i * 4 + 2] = clamp(rgb[i * 3 + 2], 0, 255); out[i * 4 + 3] = 255; }
    return out;
  }

  // ألوان مأخوذة من برج الطين في مفاتيح (sRGB)
  const PLASTER = [200, 124, 60], PLASTER_HI = [214, 140, 74], BRICK = [168, 94, 40], SHADOW = [112, 56, 20];

  // لياسة طين سقطت في أماكن فظهر الطوب تحتها. الخامة تغطي 4 أمتار، والطوب نحو 28 × 9 سم
  function mudWall(n, seed, o) {
    o = o || {};
    const metres = 4, px = n / metres, rng = AA.rng(seed);
    const bh = Math.max(3, Math.round(0.09 * px)), bw = Math.max(6, Math.round(0.28 * px)), mt = Math.max(1, Math.round(n / 512));
    const fine = tileNoise(n, seed + 7, [32, 64, 128, Math.min(256, n / 2)], 1.3);
    const big = tileNoise(n, seed + 1, [4, 8, 16, 32, 64], 1.7);
    const mid = tileNoise(n, seed + 2, [16, 32, 64, 128], 1.4);
    const pits = tileNoise(n, seed + 11, [Math.min(128, n / 4), Math.min(256, n / 2)], 1.1);
    const lumps = blur(tileNoise(n, seed + 13, [8, 16, 32, 64], 1.45), n, Math.max(1, Math.round(n / 340)));
    let mask = tileNoise(n, seed + 3, [8, 16, 32, 64, 128], 1.35);
    mask = blurX(mask, n, Math.round(n / 50));
    { let mn = 1, mx = 0; for (const v of mask) { mn = Math.min(mn, v); mx = Math.max(mx, v); } for (let i = 0; i < mask.length; i++) mask[i] = (mask[i] - mn) / (mx - mn); }
    const tints = []; for (let i = 0; i < 4096; i++) tints.push(rng());
    const rgb = new Float32Array(n * n * 3), hgt = new Float32Array(n * n), hole = new Uint8Array(n * n);
    const exposure = o.exposure == null ? 1 : o.exposure;
    for (let y = 0; y < n; y++) {
      const row = Math.floor(y / bh), off = (row % 2) * (bw >> 1) + (row * 37) % 11;
      const ly = y % bh, v = y / n, foot = Math.pow(clamp(1 - v / 0.22, 0, 1), 1.5);
      for (let x = 0; x < n; x++) {
        const i = y * n + x, col = Math.floor((x + off) / bw), lx = (x + off) % bw;
        const isHole = mask[i] < (0.33 + 0.2 * foot) * exposure;
        hole[i] = isHole ? 1 : 0;
        let r, gg, b, h;
        if (isHole) {
          const mortar = ly < mt || lx < mt;
          if (mortar) { r = SHADOW[0]; gg = SHADOW[1]; b = SHADOW[2]; h = 0.15; }
          else {
            const bt = tints[(row * 131 + col * 17) & 4095];
            const k = (0.86 + 0.2 * bt) * (0.9 + 0.14 * fine[i]) * (ly > bh - mt * 2 ? 1.12 : 1) * (ly < mt * 2 ? 0.82 : 1);
            r = (BRICK[0] + 22) * k; gg = (BRICK[1] + 22) * k; b = (BRICK[2] + 22) * k;
            h = 0.35 + 0.08 * fine[i];
          }
        } else {
          const lit = lumps[i] - at(lumps, n, x, y + Math.round(n / 200));
          const k = (0.9 + 0.14 * big[i]) * (0.95 + 0.08 * mid[i]) * (1 + 1.5 * lit) * (pits[i] > 0.78 ? 0.92 : 1);
          r = PLASTER[0] * k + 6 * (fine[i] - 0.5); gg = PLASTER[1] * k + 6 * (fine[i] - 0.5); b = PLASTER[2] * k + 6 * (fine[i] - 0.5);
          h = 0.8 + 0.25 * lumps[i] + 0.03 * fine[i] - (pits[i] > 0.78 ? 0.04 : 0);
        }
        rgb[i * 3] = r; rgb[i * 3 + 1] = gg; rgb[i * 3 + 2] = b; hgt[i] = h;
      }
    }
    // حواف اللياسة: ظل على الطوب تحت الحافة
    const sd = Math.max(1, Math.round(n / 500));
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x;
      if (hole[i] && !at(hole, n, x, y + sd * 2)) for (let k = 0; k < 3; k++) rgb[i * 3 + k] *= 0.68;
      if (!hole[i] && at(hole, n, x, y - sd)) for (let k = 0; k < 3; k++) rgb[i * 3 + k] += 22;
    }
    // شقوق دقيقة
    for (let c = 0; c < Math.round(22 * n / 1024) + 6; c++) {
      let x = rng() * n, y = rng() * n, a = rng() * Math.PI;
      const steps = 6 + Math.floor(rng() * 9), seg = n / 140;
      for (let s = 0; s < steps; s++) {
        a += (rng() - 0.5) * 1.0;
        for (let t = 0; t < seg; t++) {
          x += Math.cos(a); y += Math.sin(a);
          const i = (((Math.round(y) % n) + n) % n) * n + (((Math.round(x) % n) + n) % n);
          if (hole[i]) continue;
          rgb[i * 3] = SHADOW[0]; rgb[i * 3 + 1] = SHADOW[1]; rgb[i * 3 + 2] = SHADOW[2]; hgt[i] -= 0.08;
        }
      }
    }
    return { size: n, albedo: pack(rgb, n), normal: normalFrom(hgt, n, n / 64), repeat: metres };
  }

  // لياسة ناعمة لأعلى الجدران والسلالم
  function mudTop(n, seed) {
    const big = tileNoise(n, seed, [4, 8, 16, 32, 64], 1.7), fine = tileNoise(n, seed + 1, [32, 64, 128], 1.3);
    const rgb = new Float32Array(n * n * 3), h = new Float32Array(n * n);
    for (let i = 0; i < n * n; i++) {
      const k = (0.86 + 0.14 * big[i]) * (0.95 + 0.07 * fine[i]);
      rgb[i * 3] = PLASTER_HI[0] * k; rgb[i * 3 + 1] = PLASTER_HI[1] * k; rgb[i * 3 + 2] = PLASTER_HI[2] * k;
      h[i] = big[i] * 0.6 + fine[i] * 0.2;
    }
    return { size: n, albedo: pack(rgb, n), normal: normalFrom(h, n, n / 160), repeat: 2 };
  }

  // جص أبيض (الشرفات البيضاء)
  function gypsum(n, seed) {
    const big = tileNoise(n, seed, [4, 8, 16, 32], 1.6), fine = tileNoise(n, seed + 1, [32, 64, 128], 1.3);
    const rgb = new Float32Array(n * n * 3), h = new Float32Array(n * n);
    for (let i = 0; i < n * n; i++) {
      const k = (0.9 + 0.08 * big[i]) * (0.97 + 0.05 * fine[i]);
      rgb[i * 3] = 238 * k; rgb[i * 3 + 1] = 230 * k; rgb[i * 3 + 2] = 216 * k;
      h[i] = big[i] * 0.5 + fine[i] * 0.3;
    }
    return { size: n, albedo: pack(rgb, n), normal: normalFrom(h, n, n / 180), repeat: 2 };
  }

  // خشب أثل: عروق طولية (الخامة تغطي متراً)
  function wood(n, seed) {
    // عروق طولية شبه مستقيمة (مع تموّج خفيف) + ألياف دقيقة
    const g0 = tileNoise(n, seed, [2, 4, 8], 1.5), f = tileNoise(n, seed + 3, [64, 128], 1.2), fib = tileNoise(n, seed + 5, [4, Math.min(256, n / 2)], 1.0);
    const rgb = new Float32Array(n * n * 3), h = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x;
      const grain = 0.5 + 0.5 * Math.sin((x / n * 18 + g0[i] * 2.2) * Math.PI * 2);
      const k = (0.8 + 0.2 * Math.pow(grain, 3)) * (0.94 + 0.12 * f[i]) * (0.95 + 0.08 * fib[i]);
      rgb[i * 3] = 118 * k; rgb[i * 3 + 1] = 80 * k; rgb[i * 3 + 2] = 50 * k;
      h[i] = grain * 0.6 + f[i] * 0.4;
    }
    return { size: n, albedo: pack(rgb, n), normal: normalFrom(h, n, n / 200), repeat: 1 };
  }

  // باب نجدي ملوّن: ألواح، صفوف مثلثات، معيّنات ونقاط بيضاء (الخامة تغطي الباب كاملاً)
  function najdiDoor(n, seed) {
    const W = n >> 1, H = n; // نصف عرض: الباب أطول من عرضه
    const nz = tileNoise(n, seed, [4, 8, 16, 32], 1.6);
    const rgb = new Float32Array(n * n * 3), h = new Float32Array(n * n);
    const sx = n / 256, sy = n / 512; // مقياس رسم النسخة الأصلية 256×512 إلى مربع n×n
    const RED = [196, 64, 52], YEL = [232, 184, 75], TEAL = [42, 140, 135], WHITE = [244, 237, 224];
    const put = (i, c) => { rgb[i * 3] = c[0]; rgb[i * 3 + 1] = c[1]; rgb[i * 3 + 2] = c[2]; h[i] += 0.15; };
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x, k = 0.85 + 0.2 * nz[i];
      const plank = (x / sx) % 32 < 2;
      const c = plank ? [86, 58, 38] : [126 * k, 86 * k, 56 * k];
      rgb[i * 3] = c[0]; rgb[i * 3 + 1] = c[1]; rgb[i * 3 + 2] = c[2]; h[i] = plank ? 0 : 0.5;
    }
    const inTri = (px, py, ax, ay, bx, by, cx, cy) => {
      const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      const l1 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / d, l2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / d;
      return l1 >= 0 && l2 >= 0 && l1 + l2 <= 1;
    };
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const X = x / sx, Y = (n - 1 - y) / sy, i = y * n + x;
      for (const [ty, col] of [[30, RED], [150, YEL], [330, TEAL], [460, RED]]) {
        if (Y < ty || Y > ty + 14) continue;
        const k = Math.floor((X - 6) / 24), x0 = 6 + k * 24;
        if (k >= 0 && x0 < 246 && inTri(X, Y, x0, ty + 14, x0 + 10, ty, x0 + 20, ty + 14)) put(i, col);
      }
      for (const cy of [100, 250, 400]) for (const cx of [64, 192]) {
        const d = Math.abs(X - cx) / 30 + Math.abs(Y - cy) / 36;
        if (d <= 1 && d > 0.85) put(i, YEL);
        if (Math.abs(X - cx) / 13 + Math.abs(Y - cy) / 16 <= 1) put(i, TEAL);
        if (Math.hypot(X - cx, Y - cy) < 4) put(i, WHITE);
      }
      for (const dy of [192, 372]) { const cx = 12 + Math.round((X - 12) / 20) * 20; if (Math.hypot(X - cx, Y - dy) < 3.2) put(i, WHITE); }
    }
    return { size: n, albedo: pack(rgb, n), normal: normalFrom(h, n, n / 100), repeat: 1, aspect: [W, H] };
  }

  // حجر جيري/رملي مشذّب: مسامات، ضربات أزميل، بقع (منقول من sandstone() في مفاتيح)
  function sandstone(n, seed) {
    const rng = AA.rng(seed), big = tileNoise(n, seed, [4, 8, 16], 1.5), fine = tileNoise(n, seed + 1, [64, 128, Math.min(256, n / 2)], 1.15);
    const chis = tileNoise(n, seed + 5, [8, 32], 1.3);
    const rgb = new Float32Array(n * n * 3), h = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x;
      const stroke = 0.5 + 0.5 * Math.sin((x + y * 0.35) / n * 90 + chis[i] * 9);
      const pore = rng() > 0.995 ? 0.55 : 1;
      const k = (0.9 + 0.14 * big[i]) * (0.93 + 0.12 * fine[i]) * pore * (0.97 + 0.04 * stroke);
      rgb[i * 3] = 214 * k; rgb[i * 3 + 1] = 176 * k; rgb[i * 3 + 2] = 132 * k;
      h[i] = big[i] * 0.4 + fine[i] * 0.4 + stroke * 0.12 - (pore < 1 ? 0.4 : 0);
    }
    return { size: n, albedo: pack(rgb, n), normal: normalFrom(h, n, n / 110), repeat: 1 };
  }

  // ماء صافٍ بشبكة انكسار الضوء (كاوستكس) — خلايا فورونوي قابلة للتكرار
  function water(n, seed) {
    const rng = AA.rng(seed), G = 6, pts = [];
    for (let i = 0; i < G * G; i++) pts.push([rng(), rng()]);
    const rgb = new Float32Array(n * n * 3), h = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const u = x / n * G, v = y / n * G, cx = Math.floor(u), cy = Math.floor(v);
      let f1 = 9, f2 = 9;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const gx = cx + dx, gy = cy + dy, p = pts[(((gy % G) + G) % G) * G + (((gx % G) + G) % G)];
        const d = Math.hypot(gx + p[0] - u, gy + p[1] - v);
        if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
      }
      const line = Math.exp(-Math.pow((f2 - f1) / 0.07, 2)), i = y * n + x;
      rgb[i * 3] = 58 + 110 * line; rgb[i * 3 + 1] = 112 + 95 * line; rgb[i * 3 + 2] = 108 + 80 * line;
      h[i] = f1 * 0.6;
    }
    return { size: n, albedo: pack(rgb, n), normal: normalFrom(h, n, n / 300), repeat: 1 };
  }

  // شعر/وبر: خطوط دقيقة باتجاه v — فاتحة لتلوّنها ألوان النقاط (جمال، ماعز)
  function fur(n, seed) {
    const a = tileNoise(n, seed, [8, 16, Math.min(256, n / 2)], 1.2), b = tileNoise(n, seed + 1, [32, 64], 1.3);
    const rgb = new Float32Array(n * n * 3), h = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x, st = 0.5 + 0.5 * Math.sin(x / n * Math.PI * 2 * 70 + a[i] * 14 + y / n * 6);
      const k = 0.82 + 0.16 * st + 0.08 * b[i];
      rgb[i * 3] = rgb[i * 3 + 1] = rgb[i * 3 + 2] = 230 * k; h[i] = st * 0.5 + b[i] * 0.5;
    }
    return { size: n, albedo: pack(rgb, n), normal: normalFrom(h, n, n / 260), repeat: 1 };
  }
  // صوف مجعّد (أغنام)
  function wool(n, seed) {
    const rng = AA.rng(seed), h = new Float32Array(n * n), base = tileNoise(n, seed, [8, 16, 32], 1.3);
    const r = Math.max(2, Math.round(n / 40));
    for (let c = 0; c < n * n / (r * r) * 1.6; c++) {
      const cx = rng() * n, cy = rng() * n, rr = r * (0.7 + rng() * 0.6);
      for (let y = -rr; y <= rr; y++) for (let x = -rr; x <= rr; x++) {
        const d = Math.hypot(x, y) / rr; if (d > 1) continue;
        const i = ((((Math.round(cy + y)) % n) + n) % n) * n + ((((Math.round(cx + x)) % n) + n) % n);
        h[i] = Math.max(h[i], Math.sqrt(1 - d * d));
      }
    }
    const rgb = new Float32Array(n * n * 3);
    for (let i = 0; i < n * n; i++) { const k = 0.62 + 0.38 * h[i] * (0.85 + 0.15 * base[i]); rgb[i * 3] = rgb[i * 3 + 1] = rgb[i * 3 + 2] = 240 * k; }
    return { size: n, albedo: pack(rgb, n), normal: normalFrom(h, n, n / 90), repeat: 1 };
  }
  // سدو: خطوط حمراء وسوداء وبيضاء بمثلثات ومعيّنات (الخامة تغطي البطانية كاملة عرضاً)
  function sadu(n, seed) {
    const rgb = new Float32Array(n * n * 3), h = new Float32Array(n * n), nz = tileNoise(n, seed, [16, 64], 1.3);
    const RED = [168, 34, 30], BLK = [32, 24, 22], WHT = [236, 226, 206], ORG = [214, 120, 40];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x, v = y / n, u = x / n;
      const band = Math.floor(v * 10), bv = v * 10 - band;
      let c;
      if (band % 5 === 0) c = bv < 0.18 || bv > 0.82 ? WHT : BLK;
      else if (band % 5 === 2) { // شريط مثلثات
        const tu = (u * 16) % 1, tri = bv < (1 - Math.abs(tu - 0.5) * 2);
        c = tri ? WHT : BLK;
      } else if (band % 5 === 3) { const tu = (u * 10) % 1; c = Math.abs(tu - 0.5) + Math.abs(bv - 0.5) < 0.32 ? ORG : RED; }
      else c = (Math.floor(u * 64) % 2 === 0 && bv > 0.45 && bv < 0.55) ? WHT : RED;
      const k = 0.9 + 0.12 * nz[i] + 0.06 * ((x + y) % 2);
      rgb[i * 3] = c[0] * k; rgb[i * 3 + 1] = c[1] * k; rgb[i * 3 + 2] = c[2] * k;
      h[i] = 0.5 + 0.5 * Math.sin(x / n * Math.PI * 2 * 96) * Math.sin(y / n * Math.PI * 2 * 96);
    }
    return { size: n, albedo: pack(rgb, n), normal: normalFrom(h, n, n / 220), repeat: 1 };
  }
  // شماغ أحمر بمربعات بيضاء صغيرة (نقشة الشماغ)
  function shemagh(n, seed) {
    const rgb = new Float32Array(n * n * 3), h = new Float32Array(n * n), nz = tileNoise(n, seed, [8, 32], 1.4);
    const cells = 24;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x, u = x / n * cells, v = y / n * cells, cu = u % 1, cv = v % 1;
      const diamond = Math.abs(cu - 0.5) + Math.abs(cv - 0.5) < 0.36, white = diamond && ((Math.floor(u) + Math.floor(v)) % 2 === 0);
      const k = 0.92 + 0.1 * nz[i];
      if (white) { rgb[i * 3] = 238 * k; rgb[i * 3 + 1] = 232 * k; rgb[i * 3 + 2] = 228 * k; } else { rgb[i * 3] = 196 * k; rgb[i * 3 + 1] = 26 * k; rgb[i * 3 + 2] = 34 * k; }
      h[i] = 0.5 + 0.5 * Math.sin(x / n * Math.PI * 2 * 128) * Math.sin(y / n * Math.PI * 2 * 128) * 0.6 + nz[i] * 0.4;
    }
    return { size: n, albedo: pack(rgb, n), normal: normalFrom(h, n, n / 300), repeat: 1 };
  }
  // شماغ فاتح (للحزمة اللو-بولي): أرضية بيضاء ومعيّنات حمراء صغيرة متقاربة — يقرأ من بعيد أحمر وأبيض بالتساوي
  function shemaghLight(n, seed) {
    const rgb = new Float32Array(n * n * 3), h = new Float32Array(n * n), nz = tileNoise(n, seed, [8, 32], 1.4), cells = 24;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x, u = x / n * cells, v = y / n * cells, cu = u % 1, cv = v % 1, k = 0.94 + 0.08 * nz[i];
      const red = Math.abs(cu - 0.5) + Math.abs(cv - 0.5) < 0.4 || (Math.abs(cu - 0.5) < 0.1 && cv > 0.5) || (Math.abs(cv - 0.5) < 0.1 && cu > 0.5);
      if (red) { rgb[i * 3] = 200 * k; rgb[i * 3 + 1] = 30 * k; rgb[i * 3 + 2] = 40 * k; } else { rgb[i * 3] = 244 * k; rgb[i * 3 + 1] = 240 * k; rgb[i * 3 + 2] = 236 * k; }
      h[i] = 0.5 + 0.3 * Math.sin(x / n * Math.PI * 2 * 128) * Math.sin(y / n * Math.PI * 2 * 128) + nz[i] * 0.4;
    }
    return { size: n, albedo: pack(rgb, n), normal: normalFrom(h, n, n / 300), repeat: 1 };
  }
  // قماش الثوب: نسيج ناعم مع ثنيات خفيفة طولية
  function cloth(n, seed) {
    const a = tileNoise(n, seed, [4, 8, 16], 1.5), rgb = new Float32Array(n * n * 3), h = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x, weave = 0.5 + 0.5 * Math.sin(x / n * Math.PI * 2 * 160) * Math.sin(y / n * Math.PI * 2 * 160);
      const fold = 0.5 + 0.5 * Math.sin(x / n * Math.PI * 2 * 9 + a[i] * 4);
      const k = 0.9 + 0.06 * weave + 0.06 * fold;
      rgb[i * 3] = rgb[i * 3 + 1] = rgb[i * 3 + 2] = 245 * k; h[i] = weave * 0.15 + fold * 0.85;
    }
    return { size: n, albedo: pack(rgb, n), normal: normalFrom(h, n, n / 300), repeat: 1 };
  }

  // خيش (أكياس): نسيج سادة خشن بألياف
  function burlap(n, seed) {
    const nz = tileNoise(n, seed, [8, 32, Math.min(128, n / 4)], 1.25), f = tileNoise(n, seed + 3, [Math.min(256, n / 2)], 1);
    const rgb = new Float32Array(n * n * 3), h = new Float32Array(n * n), cells = 48;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x, u = x / n * cells, v = y / n * cells, cu = u % 1, cv = v % 1, over = (Math.floor(u) + Math.floor(v)) % 2;
      const th = over ? Math.sin(Math.PI * cu) : Math.sin(Math.PI * cv), gap = Math.min(Math.sin(Math.PI * cu), Math.sin(Math.PI * cv)) < 0.18 ? 0.55 : 1;
      const k = (0.72 + 0.28 * th) * gap * (0.88 + 0.2 * nz[i]) * (0.94 + 0.1 * f[i]);
      rgb[i * 3] = 196 * k; rgb[i * 3 + 1] = 160 * k; rgb[i * 3 + 2] = 108 * k; h[i] = th * gap;
    }
    return { size: n, albedo: pack(rgb, n), normal: normalFrom(h, n, n / 120), repeat: 1 };
  }
  // خوص مجدول (سلال، حصير، سعف العريش): شرائح مائلة متشابكة
  function weave(n, seed) {
    const nz = tileNoise(n, seed, [8, 32], 1.3), rgb = new Float32Array(n * n * 3), h = new Float32Array(n * n), cells = 16;
    const rng = AA.rng(seed), tints = []; for (let i = 0; i < 64; i++) tints.push(0.82 + rng() * 0.3);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x, a = (x + y) / n * cells, b = (x - y + n) / n * cells, ca = a % 1, cb = b % 1;
      const over = (Math.floor(a) + Math.floor(b)) % 2 === 0, t = over ? Math.sin(Math.PI * ca) : Math.sin(Math.PI * cb);
      const strand = tints[(over ? Math.floor(a) : Math.floor(b) + 31) & 63], edge = Math.min(Math.sin(Math.PI * ca), Math.sin(Math.PI * cb)) < 0.1 ? 0.6 : 1;
      const k = (0.68 + 0.32 * t) * strand * edge * (0.92 + 0.12 * nz[i]);
      rgb[i * 3] = 205 * k; rgb[i * 3 + 1] = 172 * k; rgb[i * 3 + 2] = 112 * k; h[i] = t * edge;
    }
    return { size: n, albedo: pack(rgb, n), normal: normalFrom(h, n, n / 150), repeat: 1 };
  }
  // قماش مخطط للمظلات
  function stripes(n, seed, c1, c2) {
    const nz = tileNoise(n, seed, [8, 32, 128], 1.3), rgb = new Float32Array(n * n * 3), h = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x, band = Math.floor(x / n * 8) % 2, c = band ? c1 : c2, k = 0.92 + 0.1 * nz[i] + 0.04 * Math.sin(y / n * Math.PI * 2 * 160);
      rgb[i * 3] = c[0] * k; rgb[i * 3 + 1] = c[1] * k; rgb[i * 3 + 2] = c[2] * k; h[i] = nz[i];
    }
    return { size: n, albedo: pack(rgb, n), normal: normalFrom(h, n, n / 400), repeat: 1 };
  }

  // رمل الأرض: حبيبات دقيقة + تموّجات ريح خفيفة + حصى متناثرة (الخامة تغطي 4 أمتار)
  function sand(n, seed) {
    const rng = AA.rng(seed), fine = tileNoise(n, seed, [Math.min(256, n / 2), Math.min(512, n)], 1.1), mid = tileNoise(n, seed + 1, [8, 16, 32], 1.5);
    const rip = tileNoise(n, seed + 2, [4, 8], 1.4), rgb = new Float32Array(n * n * 3), h = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x, w = 0.5 + 0.5 * Math.sin((y / n * 26 + rip[i] * 5 + x / n * 3) * Math.PI * 2);
      const k = (0.9 + 0.1 * mid[i]) * (0.92 + 0.14 * fine[i]) * (0.97 + 0.05 * w);
      rgb[i * 3] = 236 * k; rgb[i * 3 + 1] = 222 * k; rgb[i * 3 + 2] = 200 * k; h[i] = w * 0.5 + fine[i] * 0.5;
    }
    for (let c = 0; c < n * n / 900; c++) { // حصى صغيرة
      const cx = rng() * n, cy = rng() * n, r = 1 + rng() * Math.max(1, n / 300), tone = 0.62 + rng() * 0.3;
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
        const d = Math.hypot(x, y) / r; if (d > 1) continue;
        const i = (((Math.round(cy + y) % n) + n) % n) * n + (((Math.round(cx + x) % n) + n) % n);
        for (let k = 0; k < 3; k++) rgb[i * 3 + k] *= tone; h[i] = 1 + (1 - d);
      }
    }
    return { size: n, albedo: pack(rgb, n), normal: normalFrom(h, n, n / 220), repeat: 4 };
  }
  // فخار: طين محروق ناعم بخطوط دولاب أفقية وبقع
  function clay(n, seed) {
    const a = tileNoise(n, seed, [4, 8, 16], 1.5), f = tileNoise(n, seed + 1, [64, 128], 1.2);
    const rgb = new Float32Array(n * n * 3), h = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x, ring = 0.5 + 0.5 * Math.sin((y / n * 40 + a[i] * 1.5) * Math.PI * 2);
      const k = (0.86 + 0.16 * a[i]) * (0.95 + 0.06 * f[i]) * (0.97 + 0.04 * ring);
      rgb[i * 3] = 255 * k; rgb[i * 3 + 1] = 250 * k; rgb[i * 3 + 2] = 244 * k; h[i] = ring * 0.6 + f[i] * 0.4;
    }
    return { size: n, albedo: pack(rgb, n), normal: normalFrom(h, n, n / 260), repeat: 1 };
  }
  // زولية (سجادة): أرضية حمراء، إطار بأشرطة، ومعيّنات وسطى (الخامة تغطي السجادة كاملة)
  function rug(n, seed) {
    const nz = tileNoise(n, seed, [16, 64], 1.3), rgb = new Float32Array(n * n * 3), h = new Float32Array(n * n);
    const RED = [150, 28, 30], DRK = [44, 26, 40], CRM = [226, 206, 168], BLU = [38, 58, 104], GLD = [196, 140, 58];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x, u = x / n, v = y / n, e = Math.min(u, 1 - u, v, 1 - v);
      let c = RED;
      if (e < 0.03) c = DRK; else if (e < 0.045) c = CRM; else if (e < 0.11) { const t = ((u + v) * 40) % 1; c = Math.abs(t - 0.5) < 0.18 ? GLD : BLU; } else if (e < 0.125) c = CRM;
      else {
        const cu = Math.abs(u - 0.5) / 0.37, cv = Math.abs(v - 0.5) / 0.37, d = cu + cv;
        if (d < 0.55) c = d < 0.3 ? CRM : (d < 0.36 ? GLD : BLU);
        else if (d > 0.62 && d < 0.68) c = GLD;
        else { const gu = (u * 12) % 1, gv = (v * 12) % 1; if (Math.abs(gu - 0.5) + Math.abs(gv - 0.5) < 0.16) c = DRK; }
      }
      const k = 0.88 + 0.16 * nz[i] + 0.05 * ((x + y) % 2);
      rgb[i * 3] = c[0] * k; rgb[i * 3 + 1] = c[1] * k; rgb[i * 3 + 2] = c[2] * k;
      h[i] = 0.5 + 0.5 * Math.sin(x / n * Math.PI * 2 * 128) * Math.sin(y / n * Math.PI * 2 * 128);
    }
    return { size: n, albedo: pack(rgb, n), normal: normalFrom(h, n, n / 300), repeat: 1 };
  }

  // شعر الماعز (بيت الشعر): نسيج خشن داكن من شقاق (أشرطة منسوجة عرضها نحو 60 سم) بخيط فاتح أحياناً — الخامة تغطي مترين
  function hairTent(n, seed) {
    const nz = tileNoise(n, seed, [16, 64, Math.min(256, n / 2)], 1.2), f = tileNoise(n, seed + 1, [Math.min(512, n)], 1);
    const rgb = new Float32Array(n * n * 3), h = new Float32Array(n * n), strips = 3, rng = AA.rng(seed), tone = [0.8 + rng() * 0.3, 0.8 + rng() * 0.3, 0.8 + rng() * 0.3];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x, sv = y / n * strips, st = Math.floor(sv), lv = sv - st, seam = lv < 0.03 || lv > 0.97 ? 0.6 : 1;
      const weave = 0.5 + 0.5 * Math.sin(x / n * Math.PI * 2 * 90) * Math.sin(y / n * Math.PI * 2 * 260), light = st === 1 && Math.abs(lv - 0.5) < 0.02 ? 2.1 : 1;
      const k = (0.75 + 0.35 * nz[i]) * (0.9 + 0.15 * weave) * seam * tone[st % 3] * (0.95 + 0.1 * f[i]);
      rgb[i * 3] = 30 * k * light; rgb[i * 3 + 1] = 25 * k * light; rgb[i * 3 + 2] = 22 * k * light; h[i] = weave * 0.6 + nz[i] * 0.4 - (seam < 1 ? 0.4 : 0);
    }
    return { size: n, albedo: pack(rgb, n), normal: normalFrom(h, n, n / 120), repeat: 2 };
  }
  // قماش خيمة (كانفس) فاتح بنسيج واضح ودرزات
  function canvas(n, seed) {
    const nz = tileNoise(n, seed, [8, 32, 128], 1.3), rgb = new Float32Array(n * n * 3), h = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x, w = 0.5 + 0.5 * Math.sin(x / n * Math.PI * 2 * 200) * Math.sin(y / n * Math.PI * 2 * 200), seam = (x % (n / 2)) < Math.max(1, n / 256) ? 0.82 : 1;
      const k = (0.9 + 0.08 * nz[i]) * (0.95 + 0.06 * w) * seam; rgb[i * 3] = 250 * k; rgb[i * 3 + 1] = 246 * k; rgb[i * 3 + 2] = 236 * k; h[i] = w * 0.5 + nz[i] * 0.5;
    }
    return { size: n, albedo: pack(rgb, n), normal: normalFrom(h, n, n / 300), repeat: 2 };
  }

  // قماش أحمر بورد صغير (ثوب البدوية): وردة وردية بلفّة داكنة وورقتان خضراوان، موزّعة بإزاحة صف عن صف
  function floralRed(n, seed) {
    const rgb = new Float32Array(n * n * 3), h = new Float32Array(n * n), nz = tileNoise(n, seed, [8, 32], 1.4), cells = 4, rng = AA.rng(seed), J = [];
    for (let i = 0; i < cells * cells; i++) J.push([0.5 + (rng() - 0.5) * 0.3, 0.5 + (rng() - 0.5) * 0.3, rng() * Math.PI * 2, 0.85 + rng() * 0.3]);
    const BASE = [146, 22, 30], ROSE = [214, 78, 98], DEEP = [112, 14, 28], LEAF = [38, 66, 44], LEAF2 = [70, 104, 66], DOT = [236, 214, 196];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x, U = x / n * cells, Vv = y / n * cells, cx = Math.floor(U), cy = Math.floor(Vv);
      let c = BASE, hh = 0.3;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const gx = cx + dx, gy = cy + dy, wx = ((gx % cells) + cells) % cells, wy = ((gy % cells) + cells) % cells, j = J[wy * cells + wx];
        const px = U - (gx + j[0] + ((wy % 2) ? 0.25 : -0.25)), py = Vv - (gy + j[1]), r = 0.17 * j[3];
        const d = Math.hypot(px, py), ang = Math.atan2(py, px);
        for (const la of [j[2], j[2] + 2.3]) { // ورقتان
          const lx = px - Math.cos(la) * r * 1.35, ly = py - Math.sin(la) * r * 1.35, ca = Math.cos(la), sa = Math.sin(la);
          const a = (lx * ca + ly * sa) / (r * 0.85), b2 = (-lx * sa + ly * ca) / (r * 0.38);
          if (a * a + b2 * b2 < 1) { c = Math.abs(b2) < 0.15 ? LEAF2 : LEAF; hh = 0.6; }
        }
        if (d < r) { c = Math.sin(d / r * 9 - ang * 1.0 + j[2]) > 0.55 && d > r * 0.25 ? DEEP : ROSE; hh = 0.9 - 0.4 * d / r; }
        const dd = Math.hypot(px + Math.cos(j[2] + 1.1) * r * 1.6, py + Math.sin(j[2] + 1.1) * r * 1.6); // نقطة صغيرة
        if (dd < r * 0.22) { c = DOT; hh = 0.7; }
      }
      const k = 0.93 + 0.09 * nz[i] + 0.03 * Math.sin(x / n * Math.PI * 2 * 140) * Math.sin(y / n * Math.PI * 2 * 140);
      rgb[i * 3] = c[0] * k; rgb[i * 3 + 1] = c[1] * k; rgb[i * 3 + 2] = c[2] * k; h[i] = hh + 0.2 * nz[i];
    }
    return { size: n, albedo: pack(rgb, n), normal: normalFrom(h, n, n / 300), repeat: 1 };
  }

  const GEN = { hair_tent: hairTent, canvas, sand, clay, rug, mud_wall: mudWall, mud_wall_worn: (n, s) => mudWall(n, s, { exposure: 1.5 }), mud_top: mudTop, gypsum, wood, najdi_door: najdiDoor, sandstone, water, fur, wool, sadu, shemagh, shemagh_light: shemaghLight, floral_red: floralRed, cloth, burlap, weave, stripes_red: (n, s) => stripes(n, s, [176, 44, 36], [236, 224, 196]), stripes_green: (n, s) => stripes(n, s, [46, 110, 74], [236, 224, 196]), stripes_blue: (n, s) => stripes(n, s, [40, 84, 140], [236, 224, 196]) };
  const SIZES = { high: 1024, med: 512, low: 256 };
  const cache = {};
  // AA.texture('mud_wall', 'med') — تُبنى مرة واحدة وتُشارك
  AA.texture = function (id, quality, seed) {
    const n = SIZES[quality] || 512, key = id + ':' + n + ':' + (seed || 0);
    if (!cache[key]) cache[key] = Object.assign({ id }, GEN[id](n, seed || 3));
    return cache[key];
  };
  AA.TEXTURES = Object.keys(GEN);
})(typeof window !== 'undefined' ? window : globalThis);
