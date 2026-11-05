class_name Terrain
extends Node3D
## The desert: long dune ridges («عروق») of soft sand crossing hard gravel plains («صلب»).
## The ground is a height function (height_at) shared by the car physics and the drawn chunks,
## so wheels always sit on what you see. Chunks are built around the player as he drives.

const CHUNK := 48.0
const SEG := 16            # 3 m grid, smooth shaded: soft dunes, few triangles
const RADIUS := 4          # chunks around the player (about 200 m, fog hides the edge)

var n_big := FastNoiseLite.new()
var n_mid := FastNoiseLite.new()
var n_fine := FastNoiseLite.new()
var chunks := {}
var queue: Array = []
var mat: ShaderMaterial
var ridge_dir := Vector2(cos(0.42), sin(0.42))
var props: Array[Mesh] = []   # rock, shrub, tuft, acacia
var trees: Array[Vector2] = []

# palette (warm late-afternoon desert)
const C_CREST := Color(0.9, 0.74, 0.52)
const C_SAND := Color(0.85, 0.66, 0.45)
const C_SLOPE := Color(0.8, 0.6, 0.41)
const C_GRAVEL := Color(0.6, 0.51, 0.43)
const C_GRAVEL2 := Color(0.5, 0.42, 0.36)


func _init() -> void:
	n_big.seed = 7
	n_big.noise_type = FastNoiseLite.TYPE_SIMPLEX
	n_big.frequency = 0.0022
	n_mid.seed = 11
	n_mid.noise_type = FastNoiseLite.TYPE_SIMPLEX
	n_mid.frequency = 0.011
	n_fine.seed = 23
	n_fine.noise_type = FastNoiseLite.TYPE_SIMPLEX
	n_fine.frequency = 0.05
	mat = _sand_material()
	_make_props()


## How much of a dune field is here: 0 on the gravel plains, 1 in the dunes.
func dune_mask(x: float, z: float) -> float:
	return smoothstep(-0.12, 0.3, n_big.get_noise_2d(x, z))


func _ridge(x: float, z: float) -> float:
	# real dunes: a long gentle windward climb and a short steep slip face (the jump)
	var u := x * ridge_dir.x + z * ridge_dir.y
	var wob := n_mid.get_noise_2d(x * 0.6, z * 0.6) * 2.4
	var t := fposmod(u / 96.0 + wob / TAU, 1.0)
	var r := 0.0
	if t < 0.74:
		var k := t / 0.74
		r = k * k * (1.6 - 0.6 * k)   # steepest right at the lip, so a fast climb takes off
	else:
		var k2 := (t - 0.74) / 0.26
		r = pow(1.0 - k2, 1.5) * (1.0 - 0.3 * k2 * (1.0 - k2))   # the slip face drops away right at the lip
	return r


func height_at(x: float, z: float) -> float:
	var m := dune_mask(x, z)
	var big := n_big.get_noise_2d(x, z)
	var amp := 9.0 + 9.0 * clampf(big, 0.0, 1.0)
	var h := m * amp * _ridge(x, z)
	h += n_mid.get_noise_2d(x, z) * (1.2 + 1.6 * m)
	h += n_fine.get_noise_2d(x, z) * 0.18 * (1.0 - m)
	return h


## Soft sand where the tyres sink (dunes), hard on the gravel plains.
func soft_at(x: float, z: float) -> float:
	var m := dune_mask(x, z)
	return clampf(m * (0.45 + 0.55 * _ridge(x, z) + 0.25), 0.0, 1.0)


func normal_at(x: float, z: float) -> Vector3:
	var e := 0.6
	var dx := height_at(x + e, z) - height_at(x - e, z)
	var dz := height_at(x, z + e) - height_at(x, z - e)
	return Vector3(-dx, 2.0 * e, -dz).normalized()


func _hash(x: float, z: float) -> float:
	return fposmod(sin(x * 12.9898 + z * 78.233) * 43758.5453, 1.0)


func _vertex_color(x: float, z: float, n: Vector3) -> Color:
	var m := dune_mask(x, z)
	var hv := n_fine.get_noise_2d(x * 0.7, z * 0.7) * 0.5 + 0.5
	var slope := 1.0 - n.y
	var sand := C_SAND.lerp(C_CREST, clampf(_ridge(x, z) * 1.2, 0.0, 1.0) * 0.5).lerp(C_SLOPE, clampf(slope * 2.0, 0.0, 1.0) * 0.5)
	var gravel := C_GRAVEL.lerp(C_GRAVEL2, hv)
	var col := gravel.lerp(sand, smoothstep(0.1, 0.5, m + slope * 0.4))
	var v := 0.96 + 0.08 * hv
	return Color(col.r * v, col.g * v, col.b * v)


## Sand: vertex colours times a fine grain, with wind ripples in the normal map (world-space, triplanar).
func _sand_material() -> ShaderMaterial:
	var N := 256
	var grain := Image.create(N, N, false, Image.FORMAT_RGB8)
	var nrm := Image.create(N, N, false, Image.FORMAT_RGB8)
	var gn := FastNoiseLite.new()
	gn.seed = 5
	gn.frequency = 0.08
	var hgt := PackedFloat32Array()
	hgt.resize(N * N)
	for y in N:
		for x in N:
			# seamless: noise on a torus
			var a := TAU * x / N
			var b := TAU * y / N
			var w := gn.get_noise_3d(cos(a) * 40.0, sin(a) * 40.0, cos(b) * 40.0 + sin(b) * 13.0)
			var rip := sin(TAU * 7.0 * (float(y) / N) + w * 2.2)   # 7 ripples across the tile
			hgt[y * N + x] = rip * 0.5 + w * 0.5
			var g := 0.88 + 0.12 * (0.5 + 0.5 * gn.get_noise_3d(cos(a) * 160.0, sin(a) * 160.0, cos(b) * 160.0))
			grain.set_pixel(x, y, Color(g, g, g))
	for y in N:
		for x in N:
			var dx := hgt[y * N + (x + 1) % N] - hgt[y * N + (x - 1 + N) % N]
			var dy := hgt[((y + 1) % N) * N + x] - hgt[((y - 1 + N) % N) * N + x]
			var n := Vector3(-dx * 1.2, -dy * 1.2, 1.0).normalized()
			nrm.set_pixel(x, y, Color(n.x * 0.5 + 0.5, n.y * 0.5 + 0.5, n.z * 0.5 + 0.5))
	grain.generate_mipmaps()
	nrm.generate_mipmaps()
	var sh := Shader.new()
	sh.code = """shader_type spatial;
render_mode cull_back;
uniform sampler2D grain : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D ripples : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform mat4 world_inv;     // scene -> game world (the table view scales and moves the world)
uniform vec3 clip_c;
uniform float clip_r = 1.0e9;
varying vec3 clip_wp;
varying vec3 gw;
void vertex() {
	clip_wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	gw = (world_inv * vec4(clip_wp, 1.0)).xyz;
}
void fragment() {
	if (length(clip_wp.xz - clip_c.xz) > clip_r) { discard; }
	vec2 uv = gw.xz * 0.22;
	float g = texture(grain, uv).r;
	ALBEDO = COLOR.rgb * g;
	ROUGHNESS = 0.97;
	SPECULAR = 0.15;
	// wind ripples: the tile's normal tilts the world normal (top projection; the sand is mostly up)
	vec3 t = texture(ripples, uv).xyz * 2.0 - 1.0;
	vec3 nw = normalize((INV_VIEW_MATRIX * vec4(NORMAL, 0.0)).xyz);
	nw = normalize(nw + vec3(t.x, 0.0, t.y) * 0.55 * nw.y);
	NORMAL = normalize((VIEW_MATRIX * vec4(nw, 0.0)).xyz);
}
"""
	var m := ShaderMaterial.new()
	m.shader = sh
	m.set_shader_parameter("grain", ImageTexture.create_from_image(grain))
	m.set_shader_parameter("ripples", ImageTexture.create_from_image(nrm))
	m.set_shader_parameter("world_inv", Transform3D.IDENTITY)
	MeshKit.register_clip(m)
	return m


func _build_chunk(ci: int, cj: int) -> MeshInstance3D:
	var x0 := ci * CHUNK
	var z0 := cj * CHUNK
	var st := CHUNK / SEG
	var V := PackedVector3Array()
	var Nn := PackedVector3Array()
	var C := PackedColorArray()
	var I := PackedInt32Array()
	for j in SEG + 1:
		for i in SEG + 1:
			var x := x0 + i * st
			var z := z0 + j * st
			var n := normal_at(x, z)
			V.append(Vector3(x, height_at(x, z), z))
			Nn.append(n)
			C.append(_vertex_color(x, z, n))
	for j in SEG:
		for i in SEG:
			var a := j * (SEG + 1) + i
			var b := a + 1
			var c := a + SEG + 1
			var d := c + 1
			# clockwise = front face in Godot
			I.append_array([a, b, d, a, d, c])
	var arr := []
	arr.resize(Mesh.ARRAY_MAX)
	arr[Mesh.ARRAY_VERTEX] = V
	arr[Mesh.ARRAY_NORMAL] = Nn
	arr[Mesh.ARRAY_COLOR] = C
	arr[Mesh.ARRAY_INDEX] = I
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
	mesh.surface_set_material(0, mat)
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mi)
	mi.set_meta("x0", x0)
	mi.set_meta("z0", z0)
	_scatter(mi, x0, z0)
	return mi


## Keep the chunks around (x, z) built; at most `budget` new chunks this call.
func update_around(x: float, z: float, budget := 1) -> void:
	var ci := int(floor(x / CHUNK))
	var cj := int(floor(z / CHUNK))
	var want := {}
	for dj in range(-RADIUS, RADIUS + 1):
		for di in range(-RADIUS, RADIUS + 1):
			if di * di + dj * dj > (RADIUS + 0.5) * (RADIUS + 0.5):
				continue
			want[Vector2i(ci + di, cj + dj)] = di * di + dj * dj
	for k in chunks.keys():
		if not want.has(k):
			_drop_trees(chunks[k])
			chunks[k].queue_free()
			chunks.erase(k)
	var missing := []
	for k in want.keys():
		if not chunks.has(k):
			missing.append(k)
	missing.sort_custom(func(a, b): return want[a] < want[b])
	for i in mini(budget, missing.size()):
		var k: Vector2i = missing[i]
		chunks[k] = _build_chunk(k.x, k.y)


func pending_around(x: float, z: float) -> int:
	var before := chunks.size()
	update_around(x, z, 0)
	var ci := int(floor(x / CHUNK))
	var cj := int(floor(z / CHUNK))
	var n := 0
	for dj in range(-RADIUS, RADIUS + 1):
		for di in range(-RADIUS, RADIUS + 1):
			if di * di + dj * dj <= (RADIUS + 0.5) * (RADIUS + 0.5) and not chunks.has(Vector2i(ci + di, cj + dj)):
				n += 1
	return n


# ---------------------------------------------------------------- props: stones, shrubs, grass, acacias
func _make_props() -> void:
	var pm := MeshKit.vc_material(0.9)
	# a faceted stone
	var k := MeshKit.new()
	var pts := []
	for i in 10:
		var a := TAU * i / 10.0
		pts.append(Vector3(cos(a) * (0.5 + 0.18 * sin(i * 2.3)), 0.0, sin(a) * (0.42 + 0.15 * cos(i * 1.7))))
	var top := Vector3(0.08, 0.32, -0.05)
	for i in 10:
		var a: Vector3 = pts[i]
		var b: Vector3 = pts[(i + 1) % 10]
		var mid := (a + b) * 0.5 * 0.85 + Vector3(0, 0.2 + 0.05 * sin(i * 3.1), 0)
		var c := Color(0.55, 0.47, 0.41).lerp(Color(0.45, 0.39, 0.35), fposmod(i * 0.37, 1.0))
		k.tri(a, b, mid, c, Vector3(0, 0.15, 0))
		k.tri(mid, b, top, c.lightened(0.08), Vector3(0, 0.15, 0))
		k.tri(a, mid, top, c.lightened(0.05), Vector3(0, 0.15, 0))
	props.append(k.commit(null, pm))
	# a shrub («رمث»): a few grey-green clumps on short woody stems
	k = MeshKit.new()
	for i in 5:
		var a := TAU * i / 5.0 + 0.4
		var c := Vector3(cos(a) * 0.32, 0.32 + 0.1 * sin(i * 2.0), sin(a) * 0.32)
		k.beam(Vector3(0, 0, 0), c, 0.05, 0.05, Color(0.42, 0.33, 0.24))
		k.box(c + Vector3(0, 0.1, 0), Vector3(0.42, 0.3, 0.42), Color(0.42, 0.45, 0.32).lerp(Color(0.5, 0.5, 0.38), i * 0.2), 0.12, Basis(Vector3.UP, a))
	k.box(Vector3(0, 0.45, 0), Vector3(0.5, 0.36, 0.5), Color(0.46, 0.49, 0.35), 0.14, Basis(Vector3.UP, 0.7))
	props.append(k.commit(null, pm))
	# a grass tuft («ثمام») on the dunes
	k = MeshKit.new()
	for i in 7:
		var a := TAU * i / 7.0
		var tip := Vector3(cos(a) * 0.35, 0.7 + 0.15 * sin(i * 1.9), sin(a) * 0.35)
		var base := Vector3(cos(a + 1.2) * 0.06, 0, sin(a + 1.2) * 0.06)
		var w := Vector3(-sin(a), 0, cos(a)) * 0.05
		k.tri(base - w, base + w, tip, Color(0.76, 0.72, 0.5).lerp(Color(0.62, 0.66, 0.42), i / 7.0), Vector3(0, 0.3, 0) - Vector3(cos(a), 0, sin(a)) * 0.3)
		k.tri(base + w, base - w, tip, Color(0.7, 0.66, 0.46), Vector3(0, 0.3, 0) + Vector3(cos(a), 0, sin(a)) * 0.3)
	props.append(k.commit(null, pm))
	# an acacia («طلحة»): a leaning trunk, forked branches and a flat umbrella crown
	k = MeshKit.new()
	var bark := Color(0.32, 0.25, 0.2)
	k.beam(Vector3(0, 0, 0), Vector3(0.3, 1.6, 0.1), 0.22, 0.22, bark, 0.05)
	for b in [[Vector3(-1.4, 2.9, 0.3)], [Vector3(1.6, 3.0, -0.4)], [Vector3(0.2, 3.1, 1.3)], [Vector3(0.5, 3.0, -1.3)]]:
		k.beam(Vector3(0.3, 1.6, 0.1), b[0], 0.12, 0.12, bark, 0.03)
	var leaf := Color(0.34, 0.41, 0.24)
	for c in [[Vector3(-1.2, 3.15, 0.3), 2.2], [Vector3(1.4, 3.25, -0.3), 2.4], [Vector3(0.2, 3.35, 1.1), 2.0], [Vector3(0.5, 3.2, -1.2), 2.0], [Vector3(0.2, 3.45, 0.0), 2.6]]:
		k.box(c[0], Vector3(c[1], 0.38, c[1] * 0.8), leaf.lerp(Color(0.42, 0.47, 0.28), 0.4), 0.15, Basis(Vector3.UP, c[1]), leaf.lightened(0.08))
	props.append(k.commit(null, pm))


func _scatter(parent: Node3D, x0: float, z0: float) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(Vector2i(int(x0), int(z0)))
	var lists := [[], [], [], []]
	for i in 70:
		var x := x0 + rng.randf() * CHUNK
		var z := z0 + rng.randf() * CHUNK
		var m := dune_mask(x, z)
		var r := rng.randf()
		var kind := -1
		if m < 0.25:
			kind = 0 if r < 0.22 else (1 if r < 0.55 else (3 if r < 0.562 else -1))   # sparse: reads clean from above
		elif m > 0.6 and r < 0.18 and normal_at(x, z).y > 0.93:
			kind = 2
		if kind < 0:
			continue
		var sc := rng.randf_range(0.5, 1.3) if kind != 3 else rng.randf_range(0.9, 1.3)
		if kind == 0 and rng.randf() < 0.25:
			sc *= 2.2
		var b := Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3(sc, sc * rng.randf_range(0.8, 1.2), sc))
		lists[kind].append(Transform3D(b, Vector3(x, height_at(x, z) - 0.05 * sc, z)))
	for kind in 4:
		if lists[kind].is_empty():
			continue
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.mesh = props[kind]
		mm.instance_count = lists[kind].size()
		for i in lists[kind].size():
			mm.set_instance_transform(i, lists[kind][i])
		var mi := MultiMeshInstance3D.new()
		mi.multimesh = mm
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if kind == 3 else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		parent.add_child(mi)
	# remember where the acacias stand (the car bumps into them)
	for t in lists[3]:
		trees.append(Vector2(t.origin.x, t.origin.z))


func _drop_trees(chunk: Node3D) -> void:
	var x0 := chunk.get_meta("x0", 0.0) as float
	trees = trees.filter(func(t): return t.x < x0 or t.x >= x0 + CHUNK or t.y < chunk.get_meta("z0", 0.0) or t.y >= chunk.get_meta("z0", 0.0) + CHUNK)
