class_name CarFx
extends Node3D
## Sand thrown up by the GMC's tyres and the tracks they leave (driven by Truck).

const TRACK_N := 2400
var dust: CPUParticles3D
var spray: CPUParticles3D
var tracks: MultiMeshInstance3D
var mm: MultiMesh
var head := 0
var last := [null, null, null, null]


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
	q.size = Vector2(0.36, 1.0)   # 33-inch tyre tread
	q.orientation = PlaneMesh.FACE_Y
	var sh := Shader.new()
	sh.code = "shader_type spatial;\nrender_mode unshaded, depth_draw_never, shadows_disabled;\n" + MeshKit.CLIP + """
void vertex() { clip_wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; }
void fragment() {
	if (clipped(clip_wp, FRAGCOORD.xy)) { discard; }
	ALBEDO = COLOR.rgb;
	ALPHA = COLOR.a;
}
"""
	var m := ShaderMaterial.new()
	m.shader = sh
	MeshKit.register_clip(m)
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
	p.local_coords = true   # particles live in the world's space (the table view scales it)
	p.emitting = false
	var q := QuadMesh.new()
	q.size = Vector2.ONE
	var m := StandardMaterial3D.new()
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	m.billboard_keep_scale = true   # the table view shrinks the world, dust included
	m.albedo_texture = tex
	m.vertex_color_use_as_albedo = true
	m.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	q.material = m
	p.mesh = q
	p.emission_shape = CPUParticles3D.EMISSION_SHAPE_POINTS
	p.emission_points = PackedVector3Array([Vector3.ZERO])
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


func update(tr: Truck, terrain: Terrain) -> void:
	var f := tr.fwd()
	var sp := tr.speed()
	var on_sand: float = (tr.soft[2] + tr.soft[3]) * 0.5
	# dust: rolling speed and sliding; spray: sand flung by spinning or sliding tyres
	var slide := 0.0
	var spin := 0.0
	var pts := PackedVector3Array()
	var spts := PackedVector3Array()
	for i in 4:
		if not tr.contact[i]:
			continue
		var sl: float = absf(tr.slip_y[i]) + absf(tr.slip_x[i]) * 0.5
		slide = maxf(slide, absf(tr.slip_y[i]))
		spin = maxf(spin, absf(tr.slip_x[i]))
		var c: Vector3 = tr.cpos[i] + Vector3.UP * 0.2
		if i >= 2 or sl > 2.0:
			pts.append(c)
		if sl > 1.5:
			spts.append(c - f * 0.3)
	var amt := clampf((sp - 2.5) / 16.0 + slide * 0.15 + spin * 0.05, 0.0, 1.0) * (0.55 + 0.45 * on_sand)
	dust.emitting = amt > 0.05 and pts.size() > 0
	if pts.size() > 0:
		dust.emission_points = pts
	dust.direction = (-f + Vector3.UP * 0.9).normalized()
	dust.speed_scale = 0.8 + amt * 0.6
	dust.initial_velocity_max = 2.0 + sp * 0.18
	spray.emitting = spts.size() > 0 and on_sand > 0.15
	if spts.size() > 0:
		spray.emission_points = spts
	spray.direction = (-f + Vector3.UP * 0.7).normalized()
	spray.initial_velocity_max = 3.0 + slide + spin * 0.3
	# tracks: all four tyres, every 0.6 m, deeper in soft sand
	for k in 4:
		if not tr.contact[k]:
			last[k] = null
			continue
		var p: Vector3 = tr.cpos[k]
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
			var depth := 0.3 + 0.45 * terrain.soft_at(mid.x, mid.z)
			mm.set_instance_transform(head, Transform3D(b, Vector3(mid.x, terrain.height_at(mid.x, mid.z), mid.z) + n * 0.03))
			mm.set_instance_color(head, Color(0.5, 0.36, 0.24, depth))
			head = (head + 1) % TRACK_N
			mm.visible_instance_count = mini(TRACK_N, mm.visible_instance_count + 1)
		last[k] = p


