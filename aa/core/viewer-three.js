// Aboden Assets — core/viewer-three.js
// الطبقة الرقيقة الخاصة بـ Three.js فقط: تحوّل بيانات الأصل إلى شبكات، وتضيف الرياح في كرت الشاشة.
// عند النقل لمحرك آخر يُكتب ملف مقابل لهذا (Godot: viewer-godot.gd، Roblox: viewer-roblox.lua).
(function (g) {
  'use strict';
  const AA = g.AA;
  const T = g.THREE;
  const three = AA.three = {};

  three.uniforms = {
    uTime: { value: 0 }, uWind: { value: 0.55 },
    uDir: { value: new T.Vector2(0.95, 0.31).normalize() }
  };

  const WIND_HEAD = `#include <common>
attribute float aSway; attribute float aPhase; attribute float aFlutter; attribute float aBend;
uniform float uTime; uniform float uWind; uniform vec2 uDir;`;
  const WIND_BODY = `vec3 transformed = vec3(position);
vec3 wdW = vec3(uDir.x, 0.0, uDir.y);
vec3 wdO = normalize(vec3(dot(modelMatrix[0].xyz, wdW), dot(modelMatrix[1].xyz, wdW), dot(modelMatrix[2].xyz, wdW)));
float gust = 0.65 + 0.35*sin(uTime*0.41)*sin(uTime*0.17+1.3);
float w = uWind*gust;
transformed += wdO * aBend * w * (0.55 + 0.45*sin(uTime*0.8));
float sw = aSway*w;
transformed += wdO * sw * (0.45 + 0.35*sin(uTime*1.6 + aPhase));
transformed.y += sw*0.18*sin(uTime*2.1 + aPhase*1.7);
transformed.y += aFlutter*w*0.035*sin(uTime*9.0 + aPhase*5.0 + position.x*4.0 + position.z*3.0);`;

  three.addWind = function (mat) {
    mat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, three.uniforms);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', WIND_HEAD).replace('#include <begin_vertex>', WIND_BODY);
    };
    return mat;
  };
  let depthMat = null;
  three.depthMaterial = function () {
    if (!depthMat) depthMat = three.addWind(new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, side: T.DoubleSide }));
    return depthMat;
  };

  const toLinear = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  // يبني الشبكات من بيانات الأصل (مرة واحدة) — يمكن مشاركتها بين نسخ كثيرة
  // خامات الكود → خامات Three (تُبنى مرة وتُشارك)
  const texCache = {};
  three.anisotropy = 4;
  three.texture = function (id, q) {
    const key = id + ':' + q;
    if (texCache[key]) return texCache[key];
    const t = AA.texture(id, q);
    const mk = (data, srgb) => {
      const tx = new T.DataTexture(data, t.size, t.size, T.RGBAFormat);
      tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.generateMipmaps = true;
      tx.minFilter = T.LinearMipmapLinearFilter; tx.magFilter = T.LinearFilter; tx.anisotropy = three.anisotropy;
      if (srgb) tx.encoding = T.sRGBEncoding;
      tx.needsUpdate = true; return tx;
    };
    return (texCache[key] = { map: mk(t.albedo, true), normal: mk(t.normal, false) });
  };

  // المواد المضيئة (فوانيس، جمر): شدتها تتبع الوقت — خافتة في النهار وقوية في الليل
  const glowing = [];
  three.glowLevel = 0.35;
  three.setGlow = function (k) { three.glowLevel = k; for (const g2 of glowing) g2.mat.emissiveIntensity = k * g2.k; };
  // خامات متحركة (جريان الماء)
  const flowing = [];
  const mixers = new Set();
  three.tick = function (t, dt) {
    for (const f of flowing) for (const m of f.maps) m.offset.set(f.v[0] * t, f.v[1] * t);
    if (dt) for (const m of mixers) m.update(dt);
  };
  // مقاطع الحركة → AnimationClip (مرة لكل شكل)
  function toClips(out) {
    const res = {};
    if (!out.clips) return res;
    const root = out.skeleton.bones.find(b => b.parent < 0);
    for (const [name, c] of Object.entries(out.clips)) {
      const times = new Float32Array(c.frames); for (let f = 0; f < c.frames; f++) times[f] = f / (c.frames - 1) * c.duration;
      const tracks = [];
      for (const [bn, tr] of Object.entries(c.tracks)) tracks.push(new T.QuaternionKeyframeTrack(bn + '.quaternion', times, tr.rot));
      const pos = new Float32Array(c.frames * 3);
      for (let f = 0; f < c.frames; f++) for (let k = 0; k < 3; k++) pos[f * 3 + k] = root.head[k] + c.root[f * 3 + k];
      tracks.push(new T.VectorKeyframeTrack(root.name + '.position', times, pos));
      res[name] = new T.AnimationClip(name, c.duration, tracks);
    }
    return res;
  }
  // يشغّل حركة على نسخة (مع مزج ناعم)
  three.play = function (grp, name, fade) {
    const st = grp.userData.anim; if (!st || !st.clips[name]) return;
    const next = st.mixer.clipAction(st.clips[name]);
    if (st.current === next) return;
    next.reset().play();
    if (st.current) st.current.crossFadeTo(next, fade == null ? 0.35 : fade, false);
    st.current = next; st.name = name;
  };

  // ---------- الأسلوب الكرتوني ----------
  // three.style = 'toon': تظليل بطبقات (MeshToonMaterial)، ألوان مسطحة بدل الخامات المزدحمة، وخط داكن حول الحواف بعرض ثابت بالبكسل
  three.style = 'real';
  const PATTERN = { sadu: 1, rug: 1, stripes_red: 1, stripes_green: 1, stripes_blue: 1, najdi_door: 1, shemagh: 1, shemagh_light: 1, floral_red: 1, water: 1 }; // خامات نقوش تبقى
  let gradTex = null;
  three.toonGradient = function () {
    if (gradTex) return gradTex;
    const d = new Uint8Array([120, 120, 120, 255, 190, 190, 190, 255, 255, 255, 255, 255]);
    gradTex = new T.DataTexture(d, 3, 1, T.RGBAFormat); gradTex.minFilter = gradTex.magFilter = T.NearestFilter; gradTex.generateMipmaps = false; gradTex.needsUpdate = true;
    return gradTex;
  };
  const flatCache = {};
  // ألوان كرتونية مختارة يدوياً للخامات الأساسية (أهدأ من متوسط الخامة)
  const TOON = { mud_wall: '#dcb894', mud_wall_worn: '#d6b08a', mud_top: '#e8cca6', wood: '#9a6840', weave: '#d8b77c', burlap: '#cfa974', cloth: '#f6f3ec', canvas: '#f7f2e6', clay: '#d48e5c', sandstone: '#ddc49c', hair_tent: '#2e2622', gypsum: '#f2ece0' };
  three.flatColor = function (id) { // متوسط لون الخامة (أو لون مختار) للأسلوب الكرتوني
    if (flatCache[id]) return flatCache[id];
    if (TOON[id]) { const c = new T.Color(TOON[id]); return (flatCache[id] = T.ColorManagement && T.ColorManagement.enabled ? c : c.convertSRGBToLinear()); } // النسخ الأحدث من Three تحوّل ألوان hex تلقائياً
    const t = AA.texture(id, 'low'), a = t.albedo; let r = 0, g2 = 0, b = 0; const n = a.length / 4;
    for (let i = 0; i < a.length; i += 4) { r += a[i]; g2 += a[i + 1]; b += a[i + 2]; }
    const c = new T.Color(r / n / 255, g2 / n / 255, b / n / 255), hsl = {}; c.getHSL(hsl); c.setHSL(hsl.h, Math.min(1, hsl.s * 0.92), Math.min(0.9, hsl.l * 1.12));
    return (flatCache[id] = c.convertSRGBToLinear());
  };
  three.outline = { px: 2.2, color: new T.Color('#24170e'), uRes: { value: new T.Vector2(1 / 800, 1 / 600) } };
  const outlineMats = {};
  three.outlineMaterial = function (skinned) {
    const k = skinned ? 's' : 'n'; if (outlineMats[k]) return outlineMats[k];
    const mat = new T.MeshBasicMaterial({ color: three.outline.color, side: T.BackSide });
    mat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, three.uniforms, { uInvRes: three.outline.uRes, uPx: { value: three.outline.px } });
      sh.vertexShader = sh.vertexShader.replace('#include <common>', WIND_HEAD + '\nuniform vec2 uInvRes; uniform float uPx;').replace('#include <begin_vertex>', WIND_BODY)
        .replace('#include <fog_vertex>', 'vec4 cn = projectionMatrix * modelViewMatrix * vec4(normal, 0.0); gl_Position.xy += normalize(cn.xy + 1e-6) * uPx * uInvRes * 2.0 * gl_Position.w;\n#include <fog_vertex>');
    };
    return (outlineMats[k] = mat);
  };
  const NO_OUTLINE = { water: 1, glass: 1, flame: 1, smoke: 1, fruit: 1, rope: 1, leaves: 1, flower: 1, eye: 1, lamp: 1 };

  three.build = function (out, quality) {
    const parts = [];
    for (const name in out.parts) {
      const d = out.parts[name];
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(d.positions, 3));
      geo.setAttribute('normal', new T.BufferAttribute(d.normals, 3));
      const lin = new Float32Array(d.colors.length);
      for (let i = 0; i < lin.length; i++) lin[i] = toLinear(d.colors[i]);
      geo.setAttribute('color', new T.BufferAttribute(lin, 3));
      geo.setAttribute('aSway', new T.BufferAttribute(d.sway, 1));
      geo.setAttribute('aPhase', new T.BufferAttribute(d.phase, 1));
      geo.setAttribute('aFlutter', new T.BufferAttribute(d.flutter, 1));
      geo.setAttribute('aBend', new T.BufferAttribute(d.bend, 1));
      if (d.uvs) geo.setAttribute('uv', new T.BufferAttribute(d.uvs, 2));
      if (d.skinIndex) { geo.setAttribute('skinIndex', new T.BufferAttribute(d.skinIndex, 4)); geo.setAttribute('skinWeight', new T.BufferAttribute(d.skinWeight, 4)); }
      geo.setIndex(new T.BufferAttribute(d.indices, 1));
      const m0 = d.material || {};
      if (m0.spin) geo.translate(-m0.spin.pivot[0], -m0.spin.pivot[1], -m0.spin.pivot[2]); // العجلات تدور حول محورها
      else if (m0.hinge) geo.translate(-m0.hinge.pivot[0], -m0.hinge.pivot[1], -m0.hinge.pivot[2]); // الأبواب تدور حول مفصّلها
      geo.computeBoundingSphere();
      geo.boundingSphere.radius += 1.2; // هامش لحركة الريح حتى لا يختفي الشكل عند حافة الشاشة
      const m = d.material || {};
      const opts = { vertexColors: true, roughness: m.roughness == null ? 0.8 : m.roughness, side: m.doubleSided ? T.DoubleSide : T.FrontSide };
      // (Three r149: skinning is automatic for SkinnedMesh)
      if (m.color) opts.color = new T.Color(m.color[0], m.color[1], m.color[2]);
      if (m.texture) {
        const tx = three.texture(m.texture, quality || 'med');
        opts.map = tx.map; opts.normalMap = tx.normal;
        if (m.flow) { opts.map = tx.map.clone(); opts.normalMap = tx.normal.clone(); opts.map.needsUpdate = opts.normalMap.needsUpdate = true; flowing.push({ maps: [opts.map, opts.normalMap], v: m.flow }); }
      }
      if (m.opacity != null) { opts.transparent = true; opts.opacity = m.opacity; opts.depthWrite = false; opts.metalness = 0.1; }
      if (m.metalness != null) opts.metalness = m.metalness;
      if (m.emissive) { opts.emissive = new T.Color(m.emissive[0], m.emissive[1], m.emissive[2]); opts.emissiveIntensity = three.glowLevel * (m.glow || 1); }
      let mat;
      if (three.style === 'toon') {
        const to = Object.assign({}, opts); delete to.roughness; delete to.metalness; delete to.normalMap; to.gradientMap = three.toonGradient();
        if (m.texture && !PATTERN[m.texture]) { delete to.map; const fc = three.flatColor(m.texture).clone(); if (to.color) fc.multiply(to.color); to.color = fc; }
        mat = three.addWind(new T.MeshToonMaterial(to));
      } else mat = three.addWind(new T.MeshStandardMaterial(opts));
      if (m.emissive) glowing.push({ mat, k: m.glow || 1 });
      const outline = three.style === 'toon' && !m.doubleSided && !NO_OUTLINE[m.kind] && m.opacity == null;
      parts.push({ name, geo, mat, kind: m.kind, spin: m.spin || null, hinge: m.hinge || null, outline });
    }
    return { parts, triangles: out.triangles, meta: out.meta, skeleton: out.skeleton || null, clips: out.skeleton ? toClips(out) : null, clipNames: out.clips ? Object.keys(out.clips) : [] };
  };
  let skinDepth = null;
  const NOSHADOW = { water: 1, flame: 1, glass: 1, smoke: 1 };

  three.instance = function (built) {
    const grp = new T.Group();
    if (built.skeleton) { // هيكل عظمي خاص بكل نسخة حتى تتحرك كل واحدة وحدها
      const bones = built.skeleton.bones.map(b => { const o = new T.Bone(); o.name = b.name; return o; });
      built.skeleton.bones.forEach((b, i) => {
        if (b.parent < 0) { bones[i].position.set(b.head[0], b.head[1], b.head[2]); grp.add(bones[i]); }
        else { const P = built.skeleton.bones[b.parent]; bones[i].position.set(b.head[0] - P.head[0], b.head[1] - P.head[1], b.head[2] - P.head[2]); bones[b.parent].add(bones[i]); }
      });
      grp.updateMatrixWorld(true);
      const skel = new T.Skeleton(bones);
      if (!skinDepth) skinDepth = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, side: T.DoubleSide });
      for (const p of built.parts) {
        const mesh = new T.SkinnedMesh(p.geo, p.mat); mesh.name = p.name;
        mesh.bind(skel); mesh.castShadow = !NOSHADOW[p.kind]; mesh.receiveShadow = true;
        mesh.customDepthMaterial = skinDepth; mesh.frustumCulled = false;
        grp.add(mesh);
        if (p.outline) { const ol = new T.SkinnedMesh(p.geo, three.outlineMaterial(true)); ol.bind(skel); ol.frustumCulled = false; grp.add(ol); }
      }
      const mixer = new T.AnimationMixer(grp);
      grp.userData.anim = { mixer, clips: built.clips, current: null };
      mixers.add(mixer);
      three.play(grp, built.clipNames.includes('idle') ? 'idle' : built.clipNames[0], 0);
      if (grp.userData.anim.current) grp.userData.anim.current.time = Math.random() * 3;
      return grp;
    }
    grp.userData.spin = []; grp.userData.steer = []; grp.userData.hinges = {};
    for (const p of built.parts) {
      const mesh = new T.Mesh(p.geo, p.mat); mesh.name = p.name;
      if (p.outline) { const ol = new T.Mesh(p.geo, three.outlineMaterial(false)); ol.name = p.name + '_outline'; mesh.add(ol); }
      mesh.castShadow = !NOSHADOW[p.kind]; mesh.receiveShadow = p.kind !== 'fruit' && p.kind !== 'flower' && p.kind !== 'flame';
      mesh.customDepthMaterial = three.depthMaterial();
      if (p.spin && p.spin.steer) { // عجلة أمامية: محور توجيه عمودي، وداخله دوران العجلة
        const k = new T.Object3D(); k.position.set(p.spin.pivot[0], p.spin.pivot[1], p.spin.pivot[2]); k.add(mesh); grp.add(k);
        grp.userData.steer.push(k); grp.userData.spin.push({ mesh, r: p.spin.radius }); continue;
      }
      if (p.spin) { mesh.position.set(p.spin.pivot[0], p.spin.pivot[1], p.spin.pivot[2]); grp.userData.spin.push({ mesh, r: p.spin.radius }); }
      if (p.hinge) {
        let h = grp.userData.hinges[p.hinge.id];
        if (!h) { h = new T.Object3D(); h.position.set(p.hinge.pivot[0], p.hinge.pivot[1], p.hinge.pivot[2]); h.userData.hinge = p.hinge; grp.userData.hinges[p.hinge.id] = h; grp.add(h); }
        h.add(mesh); continue;
      }
      grp.add(mesh);
    }
    const pose = built.meta && built.meta.pose;
    if (pose) { three.steer(grp, pose.steer || 0); three.doors(grp, pose.doors || 0); }
    return grp;
  };
  // لفّ الكفرات الأمامية (بالدرجات، + لليسار) وفتح الأبواب (0..1)
  three.steer = function (grp, deg) { for (const k of grp.userData.steer || []) k.rotation.y = deg * Math.PI / 180; };
  three.doors = function (grp, f) { for (const h of Object.values(grp.userData.hinges || {})) h.rotation.y = h.userData.hinge.sign * h.userData.hinge.max * f; };

  three.release = function (grp) { if (!grp) return; grp.traverse(o => { if (o.userData && o.userData.anim) mixers.delete(o.userData.anim.mixer); }); };
  // تدوير العجلات بعد قطع مسافة d
  three.roll = function (grp, d) { for (const w of grp.userData.spin || []) w.mesh.rotation.x += d / w.r; };
  three.dispose = function (built) {
    for (const p of built.parts) {
      p.geo.dispose(); p.mat.dispose();
      for (let i = flowing.length - 1; i >= 0; i--) if (flowing[i].maps[0] === p.mat.map) flowing.splice(i, 1);
      for (let i = glowing.length - 1; i >= 0; i--) if (glowing[i].mat === p.mat) glowing.splice(i, 1);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
