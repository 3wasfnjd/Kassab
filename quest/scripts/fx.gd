class_name CarFx
extends Node3D
## Sand thrown up behind the wheels and the tracks they leave in the sand.

const TRACK_N := 2400
var dust: CPUParticles3D
var spray: CPUParticles3D
var tracks: MultiMeshInstance3D
var mm: MultiMesh
var head := 0
var last := [null, null]


static func soft_disc(size := 64) -> ImageTexture:
	var img := Image.create(size, size, false, Image.FORMAT_RGBA8)
	for y in size:
		for x in size:
			var d := Vector2(x + 0.5 - size * 0.5, y + 0.5 - size * 0.5).length() / (size * 0.5)
			var a := clampf(1.0 - d, 0.0, 1.0)
			img.set_pixel(x, y, Color(1, 1, 1, a * a))
	return ImageTexture.create_from_image(img)


func _init() -> void:
	var tex := soft_disc()
	dust = _particles(tex, 160, 1.9, Color(0.86, 0.72, 0.55, 0.5), 1.2, 3.6)
	spray = _particles(tex, 90, 0.7, Color(0.78, 0.6, 0.42, 0.9), 0.25, 0.45)
	spray.gravity = Vector3(0, -9.0, 0)
	# tyre tracks
	var q := QuadMesh.new()
	q.size = Vector2(0.34, 1.0)
	q.orientation = PlaneMesh.FACE_Y
	var m := StandardMaterial3D.new()
	m.vertex_color_use_as_albedo = true
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.roughness = 1.0
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	q.material = m
	mm = MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = true
	mm.mesh = q
	mm.instance_count = TRACK_N
	mm.visible_instance_count = 0
	tracks = MultiMeshInstance3D.new()
	tracks.multimesh = mm
	tracks.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(tracks)


func _particles(tex: Texture2D, n: int, life: float, col: Color, s0: float, s1: float) -> CPUParticles3D:
	var p := CPUParticles3D.new()
	p.amount = n
	p.lifetime = life
	p.local_coords = false
	p.emitting = false
	var q := QuadMesh.new()
	q.size = Vector2.ONE
	var m := StandardMaterial3D.new()
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	m.albedo_texture = tex
	m.vertex_color_use_as_albedo = true
	m.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	q.material = m
	p.mesh = q
	p.emission_shape = CPUParticles3D.EMISSION_SHAPE_BOX
	p.emission_box_extents = Vector3(0.9, 0.1, 0.3)
	p.direction = Vector3(0, 1, -1)
	p.spread = 35.0
	p.initial_velocity_min = 1.0
	p.initial_velocity_max = 3.0
	p.gravity = Vector3(0, 0.6, 0)
	p.damping_min = 1.0
	p.damping_max = 2.0
	var sc := Curve.new()
	sc.add_point(Vector2(0, s0 / s1))
	sc.add_point(Vector2(1, 1))
	p.scale_amount_min = s1
	p.scale_amount_max = s1 * 1.3
	p.scale_amount_curve = sc
	var gr := Gradient.new()
	gr.set_color(0, col)
	gr.set_color(1, Color(col.r, col.g, col.b, 0))
	p.color_ramp = gr
	add_child(p)
	return p


func update(car: Car, terrain: Terrain) -> void:
	var f := car.fwd()
	var s := car.side()
	var sp := car.speed()
	var rear := car.pos - f * 1.5 + Vector3.UP * 0.25
	dust.global_position = rear
	dust.direction = (-f + Vector3.UP * 0.9).normalized()
	var on_sand := terrain.dune_mask(car.pos.x, car.pos.z) > 0.15
	var amt := clampf((sp - 2.5) / 18.0 + absf(car.vS) * 0.12, 0.0, 1.0) * (1.0 if not car.air else 0.0)
	dust.emitting = amt > 0.05
	dust.speed_scale = 0.8 + amt * 0.6
	dust.initial_velocity_max = 2.0 + sp * 0.18
	spray.global_position = rear - Vector3.UP * 0.1
	spray.direction = (-f + Vector3.UP * 0.7).normalized()
	spray.emitting = (car.sink > 0.3 and car.vF < 3.0) or (on_sand and absf(car.vS) > 3.0 and not car.air)
	spray.initial_velocity_max = 4.0 + absf(car.vS)
	# tracks from the two rear wheels, every 0.6 m
	if car.air:
		last = [null, null]
		return
	for k in 2:
		var sd := 1.0 if k == 0 else -1.0
		var p := car.pos - f * 1.36 + s * (0.81 * sd)
		p.y = terrain.height_at(p.x, p.z)
		var lp = last[k]
		if lp == null:
			last[k] = p
			continue
		var d: float = (p - lp).length()
		if d < 0.6:
			continue
		if d < 3.0:
			var mid: Vector3 = (p + lp) * 0.5
			var n := terrain.normal_at(mid.x, mid.z)
			var dir: Vector3 = (p - lp).normalized()
			var xb := n.cross(dir).normalized()
			var b := Basis(xb, n, dir.slide(n).normalized() * d)
			var depth := 0.35 + 0.4 * terrain.soft_at(mid.x, mid.z)
			mm.set_instance_transform(head, Transform3D(b, mid + n * 0.03))
			mm.set_instance_color(head, Color(0.52, 0.38, 0.25, depth))
			head = (head + 1) % TRACK_N
			mm.visible_instance_count = mini(TRACK_N, mm.visible_instance_count + 1)
		last[k] = p
