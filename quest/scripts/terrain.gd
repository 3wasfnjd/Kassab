class_name Terrain
extends Node3D
## The desert: long dune ridges («عروق») of soft sand crossing hard gravel plains («صلب»).
## The ground is a height function (height_at) shared by the car physics and the drawn chunks,
## so wheels always sit on what you see. Chunks are built around the player as he drives.

const CHUNK := 48.0
const SEG := 24            # 2 m triangles: the low-poly facets
const RADIUS := 4          # chunks around the player (about 200 m, fog hides the edge)

var n_big := FastNoiseLite.new()
var n_mid := FastNoiseLite.new()
var n_fine := FastNoiseLite.new()
var chunks := {}
var queue: Array = []
var mat: StandardMaterial3D
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
	mat = MeshKit.vc_material(0.95)
	_make_props()


## How much of a dune field is here: 0 on the gravel plains, 1 in the dunes.
func dune_mask(x: float, z: float) -> float:
	return smoothstep(-0.12, 0.3, n_big.get_noise_2d(x, z))


func _ridge(x: float, z: float) -> float:
	var u := x * ridge_dir.x + z * ridge_dir.y
	var wob := n_mid.get_noise_2d(x * 0.6, z * 0.6) * 2.4
	var r := 0.5 + 0.5 * cos(u * TAU / 96.0 + wob)
	return r * r * r


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


func _face_color(a: Vector3, b: Vector3, c: Vector3) -> Color:
	var ctr := (a + b + c) / 3.0
	var n := (b - a).cross(c - a).normalized()
	if n.y < 0.0:
		n = -n
	var m := dune_mask(ctr.x, ctr.z)
	var slope := 1.0 - n.y
	# light comes from the late sun in the west-south-west: faces turned to it are pale
	var sun := Vector3(-0.55, 0.62, 0.35).normalized()
	var lit := clampf(n.dot(sun) * 1.2, 0.0, 1.0)
	var sand := C_SLOPE.lerp(C_SAND, lit).lerp(C_CREST, smoothstep(0.55, 0.95, lit) * 0.6)
	var hv := _hash(ctr.x, ctr.z)
	var gravel := C_GRAVEL.lerp(C_GRAVEL2, hv)
	var col := gravel.lerp(sand, smoothstep(0.15, 0.55, m + slope * 0.6))
	var v := 0.97 + 0.06 * hv
	return Color(col.r * v, col.g * v, col.b * v)


func _build_chunk(ci: int, cj: int) -> MeshInstance3D:
	var kit := MeshKit.new()
	var x0 := ci * CHUNK
	var z0 := cj * CHUNK
	var st := CHUNK / SEG
	var hs := PackedFloat32Array()
	hs.resize((SEG + 1) * (SEG + 1))
	for j in SEG + 1:
		for i in SEG + 1:
			hs[j * (SEG + 1) + i] = height_at(x0 + i * st, z0 + j * st)
	for j in SEG:
		for i in SEG:
			var p00 := Vector3(x0 + i * st, hs[j * (SEG + 1) + i], z0 + j * st)
			var p10 := Vector3(x0 + (i + 1) * st, hs[j * (SEG + 1) + i + 1], z0 + j * st)
			var p01 := Vector3(x0 + i * st, hs[(j + 1) * (SEG + 1) + i], z0 + (j + 1) * st)
			var p11 := Vector3(x0 + (i + 1) * st, hs[(j + 1) * (SEG + 1) + i + 1], z0 + (j + 1) * st)
			var below := p00 - Vector3.UP * 10.0
			# alternate the diagonal so the facets do not line up in stripes
			if (i + j) % 2 == 0:
				kit.tri(p00, p10, p11, _face_color(p00, p10, p11), below)
				kit.tri(p00, p11, p01, _face_color(p00, p11, p01), below)
			else:
				kit.tri(p00, p10, p01, _face_color(p00, p10, p01), below)
				kit.tri(p10, p11, p01, _face_color(p10, p11, p01), below)
	var mi := MeshInstance3D.new()
	mi.mesh = kit.commit(null, mat)
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
	var top := Vector3(0.08, 0.45, -0.05)
	for i in 10:
		var a: Vector3 = pts[i]
		var b: Vector3 = pts[(i + 1) % 10]
		var mid := (a + b) * 0.5 * 0.75 + Vector3(0, 0.26 + 0.06 * sin(i * 3.1), 0)
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
		k.box(c + Vector3(0, 0.1, 0), Vector3(0.42, 0.3, 0.42), Color(0.55, 0.6, 0.42).lerp(Color(0.62, 0.62, 0.48), i * 0.2), 0.12, Basis(Vector3.UP, a))
	k.box(Vector3(0, 0.45, 0), Vector3(0.5, 0.36, 0.5), Color(0.58, 0.63, 0.45), 0.14, Basis(Vector3.UP, 0.7))
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
	var leaf := Color(0.46, 0.55, 0.3)
	for c in [[Vector3(-1.2, 3.15, 0.3), 2.2], [Vector3(1.4, 3.25, -0.3), 2.4], [Vector3(0.2, 3.35, 1.1), 2.0], [Vector3(0.5, 3.2, -1.2), 2.0], [Vector3(0.2, 3.45, 0.0), 2.6]]:
		k.box(c[0], Vector3(c[1], 0.38, c[1] * 0.8), leaf.lerp(Color(0.54, 0.6, 0.34), randf_range(0, 1) if false else 0.4), 0.15, Basis(Vector3.UP, c[1]), leaf.lightened(0.12))
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
			kind = 0 if r < 0.5 else (1 if r < 0.9 else (3 if r < 0.908 else -1))
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
