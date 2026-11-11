class_name CarFx
extends Node3D
## Tyre smoke and skid marks on your real floor, driven by Truck. Marks fade away after a few
## seconds (they are drawn on the room floor, so they don't stay forever).

const TRACK_N := 1600
const FADE := 9.0              # seconds a skid mark lasts
var smoke: CPUParticles3D
var tracks: MultiMeshInstance3D
var mm: MultiMesh
var head := 0
var last := [null, null, null, null]
var _time := 0.0


static func soft_disc(size := 64) -> ImageTexture:
	var img := Image.create(size, size, false, Image.FORMAT_RGBA8)
	for y in size:
		for x in size:
			var d := Vector2(x + 0.5 - size * 0.5, y + 0.5 - size * 0.5).length() / (size * 0.5)
			var a := clampf(1.0 - d, 0.0, 1.0)
			img.set_pixel(x, y, Color(1, 1, 1, a * a))
	return ImageTexture.create_from_image(img)


func _init() -> void:
	smoke = _particles(soft_disc(), 120, 1.6, Color(0.82, 0.82, 0.84, 0.42), 0.6, 2.6)
	# skid marks: black rubber, each mark remembers when it was laid (custom data) and fades
	var q := QuadMesh.new()
	q.size = Vector2(0.32, 1.0)
	q.orientation = PlaneMesh.FACE_Y
	var sh := Shader.new()
	sh.code = """shader_type spatial;
render_mode unshaded, depth_draw_never, shadows_disabled, cull_disabled;
uniform float now = 0.0;
uniform float fade = 9.0;
varying float a;
void vertex() { a = INSTANCE_CUSTOM.y * clamp(1.0 - (now - INSTANCE_CUSTOM.x) / fade, 0.0, 1.0); }
void fragment() {
	if (a <= 0.003) { discard; }
	ALBEDO = vec3(0.03, 0.028, 0.026);
	ALPHA = a;
}
"""
	var m := ShaderMaterial.new()
	m.shader = sh
	m.set_shader_parameter("fade", FADE)
	q.material = m
	mm = MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_custom_data = true
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
	p.local_coords = true   # particles live in the truck's (scaled) space
	p.emitting = false
	var q := QuadMesh.new()
	q.size = Vector2.ONE
	var m := StandardMaterial3D.new()
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	m.billboard_keep_scale = true
	m.albedo_texture = tex
	m.vertex_color_use_as_albedo = true
	m.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	q.material = m
	p.mesh = q
	p.emission_shape = CPUParticles3D.EMISSION_SHAPE_POINTS
	p.emission_points = PackedVector3Array([Vector3.ZERO])
	p.direction = Vector3(0, 1, -1)
	p.spread = 40.0
	p.initial_velocity_min = 0.8
	p.initial_velocity_max = 2.2
	p.gravity = Vector3(0, 0.5, 0)
	p.damping_min = 1.5
	p.damping_max = 2.5
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


func update(tr: Truck, dt: float) -> void:
	_time += dt
	(mm.mesh.surface_get_material(0) as ShaderMaterial).set_shader_parameter("now", _time)
	var f := tr.fwd()
	# smoke only where a tyre really slides or spins (rubber on the floor)
	var pts := PackedVector3Array()
	var hard := 0.0
	for i in 4:
		if not tr.contact[i]:
			continue
		var sl: float = absf(tr.slip_y[i]) + absf(tr.slip_x[i]) * 0.7
		if sl > 3.0:
			pts.append(tr.cpos[i] + Vector3.UP * 0.25)
			hard = maxf(hard, sl)
	smoke.emitting = pts.size() > 0
	if pts.size() > 0:
		smoke.emission_points = pts
	smoke.direction = (-f + Vector3.UP * 0.8).normalized()
	smoke.speed_scale = clampf(0.7 + hard / 20.0, 0.7, 1.6)
	# skid marks: laid while a tyre slides, darker the harder it slides
	for k in 4:
		var sl: float = absf(tr.slip_y[k]) + absf(tr.slip_x[k]) * 0.6
		if not tr.contact[k] or sl < 1.6:
			last[k] = null
			continue
		var p: Vector3 = tr.cpos[k]
		var lp = last[k]
		if lp == null:
			last[k] = p
			continue
		var d: float = (p - lp).length()
		if d < 0.5:
			continue
		if d < 3.0:
			var mid: Vector3 = (p + lp) * 0.5
			var dir: Vector3 = (p - lp).normalized()
			var b := Basis(Vector3.UP.cross(dir).normalized(), Vector3.UP, dir * d)
			mm.set_instance_transform(head, Transform3D(b, Vector3(mid.x, 0.02, mid.z)))
			mm.set_instance_custom_data(head, Color(_time, clampf(0.25 + sl / 14.0, 0.25, 0.8), 0, 0))
			head = (head + 1) % TRACK_N
			mm.visible_instance_count = mini(TRACK_N, mm.visible_instance_count + 1)
		last[k] = p
