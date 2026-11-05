extends Node3D
## Kassab Quest — phase 1: the drive. A desert of dunes and gravel plains, one code-built 4x4,
## driven with the Touch controllers from the driver's seat or from a chase view.
##
## Controls (Quest Touch): right trigger gas · left trigger brake / reverse · left stick steer
## A switch view (seat / chase) · Y 4x4 on/off · B put the car back on its wheels
## Desktop (for development): W/S gas/brake · A/D steer · C view · F 4x4 · R reset.

var terrain: Terrain
var model: CarModel
var car: Car
var fx: CarFx
var font: FontFile
var sun: DirectionalLight3D
var env: Environment

# player rig
var xr_on := false
var origin: XROrigin3D
var xr_cam: XRCamera3D
var left: XRController3D
var right: XRController3D
var cam: Camera3D           # desktop camera
var view := "in"            # "in" = driver's seat, "out" = chase
var chase_yaw := 0.0
var vignette: MeshInstance3D
var vig_mat: ShaderMaterial
var tip: Label3D
var tip_t := 0.0
var prev := {}
var vig_now := 0.0
var shot := {}              # development: --shot=<png> --view=in|out --drive=<s>


func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--"):
			var kv: PackedStringArray = a.substr(2).split("=", true, 1)
			shot[kv[0]] = kv[1] if kv.size() > 1 else "1"
	font = _font()
	_world()
	terrain = Terrain.new()
	add_child(terrain)
	var start := _start_point()
	model = CarModel.new(font)
	add_child(model)
	car = Car.new(terrain, start, 0.0)
	car.h = _face_dunes(start)
	fx = CarFx.new()
	add_child(fx)
	terrain.update_around(start.x, start.z, 999)
	_rig()
	view = shot.get("view", "in")
	if shot.has("notip"):
		tip.visible = false
	chase_yaw = car.h
	_say("أهلاً في كساب — الزناد اليمين بنزين، اليسار فرامل، والعصا دركسون", 7.0)


# ---------------------------------------------------------------- world look
func _font() -> FontFile:
	var ar := FontFile.new()
	ar.load_dynamic_font("res://fonts/baloo-arabic.woff2")
	var la := FontFile.new()
	la.load_dynamic_font("res://fonts/baloo-latin.woff2")
	la.fallbacks = [ar]
	return la


func _world() -> void:
	var we := WorldEnvironment.new()
	env = Environment.new()
	var sky := Sky.new()
	var sm := ProceduralSkyMaterial.new()
	sm.sky_top_color = Color(0.36, 0.58, 0.82)
	sm.sky_horizon_color = Color(0.93, 0.82, 0.66)
	sm.ground_horizon_color = Color(0.9, 0.78, 0.62)
	sm.ground_bottom_color = Color(0.7, 0.56, 0.4)
	sm.sun_angle_max = 18.0
	sm.sky_curve = 0.12
	sky.sky_material = sm
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.78, 0.72, 0.68)
	env.ambient_light_energy = 0.55
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_exposure = 0.92
	env.tonemap_white = 1.4
	env.fog_enabled = true
	env.fog_mode = Environment.FOG_MODE_DEPTH
	env.fog_light_color = Color(0.9, 0.8, 0.66)
	env.fog_depth_begin = 70.0
	env.fog_depth_end = 185.0
	env.fog_density = 1.0
	env.fog_sky_affect = 0.0
	we.environment = env
	add_child(we)
	sun = DirectionalLight3D.new()
	sun.light_color = Color(1.0, 0.9, 0.76)
	sun.light_energy = 0.95
	sun.rotation = Vector3(deg_to_rad(-48), deg_to_rad(-62), 0)
	sun.shadow_opacity = 0.75
	sun.shadow_enabled = true
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_ORTHOGONAL
	sun.directional_shadow_max_distance = 30.0
	sun.shadow_bias = 0.04
	add_child(sun)


func _start_point() -> Vector3:
	# a hard gravel plain next to a dune field
	var best := Vector3.ZERO
	for r in range(0, 2000, 40):
		for a in 12:
			var p := Vector3(cos(a * 0.52) * r, 0, sin(a * 0.52) * r)
			if terrain.dune_mask(p.x, p.z) < 0.02:
				for b in 12:
					var q := p + Vector3(cos(b * 0.52), 0, sin(b * 0.52)) * 70.0
					if terrain.dune_mask(q.x, q.z) > 0.8:
						return p
	return best


func _face_dunes(p: Vector3) -> float:
	var best := 0.0
	var bm := -1.0
	for b in 24:
		var a := b * TAU / 24.0
		var m := terrain.dune_mask(p.x + sin(a) * 70.0, p.z + cos(a) * 70.0)
		if m > bm:
			bm = m
			best = a
	return best


# ---------------------------------------------------------------- player rig
func _rig() -> void:
	var xri := XRServer.find_interface("OpenXR")
	if xri and xri.is_initialized() and not shot.has("shot"):
		xr_on = true
		get_viewport().use_xr = true
		DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
		if xri.has_signal("pose_recentered"):
			xri.connect("pose_recentered", func(): XRServer.center_on_hmd(XRServer.RESET_BUT_KEEP_TILT, true))
		if xri.has_signal("session_begun"):
			xri.connect("session_begun", func(): XRServer.center_on_hmd(XRServer.RESET_BUT_KEEP_TILT, true))
		if xri.has_method("set_display_refresh_rate"):
			xri.set_display_refresh_rate(90.0)
	origin = XROrigin3D.new()
	add_child(origin)
	xr_cam = XRCamera3D.new()
	xr_cam.near = 0.05
	xr_cam.far = 400.0
	origin.add_child(xr_cam)
	left = XRController3D.new()
	left.tracker = "left_hand"
	origin.add_child(left)
	right = XRController3D.new()
	right.tracker = "right_hand"
	origin.add_child(right)
	if not xr_on:
		cam = Camera3D.new()
		cam.near = 0.05
		cam.far = 400.0
		cam.fov = 70.0
		add_child(cam)
		cam.make_current()
	# comfort vignette and the tip line ride on the head
	var head: Node3D = xr_cam if xr_on else cam
	var sh := Shader.new()
	sh.code = """shader_type spatial;
render_mode unshaded, depth_test_disabled, cull_disabled, blend_mix;
uniform float strength = 0.0;
void fragment(){ vec2 d = UV - 0.5; float r = length(d) * 2.0;
	ALBEDO = vec3(0.0); ALPHA = smoothstep(1.0 - strength * 0.75, 1.25 - strength * 0.6, r) * strength; }"""
	vig_mat = ShaderMaterial.new()
	vig_mat.shader = sh
	vig_mat.render_priority = 10
	var q := QuadMesh.new()
	q.size = Vector2(1.2, 1.2)
	vignette = MeshInstance3D.new()
	vignette.mesh = q
	vignette.material_override = vig_mat
	vignette.position = Vector3(0, 0, -0.3)
	vignette.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	head.add_child(vignette)
	tip = Label3D.new()
	tip.font = font
	tip.font_size = 44
	tip.pixel_size = 0.0009
	tip.outline_size = 10
	tip.outline_modulate = Color(0.15, 0.09, 0.03, 0.9)
	tip.modulate = Color(1, 0.95, 0.85)
	tip.no_depth_test = true
	tip.render_priority = 11
	tip.width = 900
	tip.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	tip.position = Vector3(0, -0.16, -0.75)
	head.add_child(tip)


func _say(t: String, sec := 3.5) -> void:
	tip.text = t
	tip_t = sec


# ---------------------------------------------------------------- input
func _pressed(name: String, now: bool) -> bool:
	var was: bool = prev.get(name, false)
	prev[name] = now
	return now and not was


func _read_input() -> Dictionary:
	var gas := 0.0
	var brake := 0.0
	var st := 0.0
	var b_view := false
	var b_awd := false
	var b_reset := false
	if xr_on:
		gas = right.get_float("trigger")
		brake = left.get_float("trigger")
		var v := left.get_vector2("primary")
		st = v.x if absf(v.x) > 0.08 else 0.0
		var v2 := right.get_vector2("primary")
		if absf(v2.x) > absf(st):
			st = v2.x
		b_view = right.is_button_pressed("ax_button")
		b_awd = left.is_button_pressed("by_button")
		b_reset = right.is_button_pressed("by_button")
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP):
		gas = 1.0
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN):
		brake = 1.0
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		st = -1.0
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		st = 1.0
	b_view = b_view or Input.is_key_pressed(KEY_C)
	b_awd = b_awd or Input.is_key_pressed(KEY_F)
	b_reset = b_reset or Input.is_key_pressed(KEY_R)
	if shot.has("drive"):
		gas = 1.0
		st = float(shot.get("steer", "0"))
	return {gas = gas, brake = brake, steer = st, view = _pressed("view", b_view), awd = _pressed("awd", b_awd), reset = _pressed("reset", b_reset)}


func _pulse(ctrl: XRController3D, amp: float, dur: float) -> void:
	if xr_on and ctrl:
		ctrl.trigger_haptic_pulse("haptic", 0.0, amp, dur, 0.0)


# ---------------------------------------------------------------- frame
func _process(dt: float) -> void:
	var inp := _read_input()
	if inp.view:
		view = "out" if view == "in" else "in"
		chase_yaw = car.h
		_say("من برّا" if view == "out" else "ورا الدركسون", 1.2)
	if inp.awd:
		car.awd = not car.awd
		_say("الدبل شغّال 4×4" if car.awd else "الدبل طافي", 1.6)
		_pulse(left, 0.4, 0.08)
	if inp.reset:
		car.place(car.pos + Vector3.UP * 0.2, car.h)
		_say("رجّعنا السيارة على كفراتها", 1.6)
	car.update(dt, inp.gas, inp.brake, inp.steer)
	for e in car.events:
		match e:
			"stuck":
				_say("غرّزت! شغّل الدبل بزر Y", 4.0)
				_pulse(left, 0.6, 0.25)
			"land":
				_pulse(left, 0.3 + car.landed * 0.7, 0.12)
				_pulse(right, 0.3 + car.landed * 0.7, 0.12)
	car.events.clear()
	if inp.gas > 0.1 and car.sink > 0.4:
		_pulse(right, 0.15, 0.05)
	car.apply(model)
	model.set_lamps(0.0, inp.brake > 0.1 and car.vF > 0.3)
	fx.update(car, terrain)
	terrain.update_around(car.pos.x, car.pos.z, 1)
	sun.global_position = car.pos
	if not _shot_done:
		_place_view(dt)
	if tip_t > 0.0:
		tip_t -= dt
		tip.modulate.a = clampf(tip_t * 2.0, 0.0, 1.0)
	if shot.has("shot"):
		_shot_tick(dt)


func _place_view(dt: float) -> void:
	var vig := 0.0
	var t: Transform3D
	if view == "in":
		# the driver's eye; the car's pitch and roll reach you at half strength (comfort)
		var b := Basis.from_euler(Vector3(-car.pitch * 0.5, car.h, car.roll * 0.5), EULER_ORDER_YXZ)
		var eye := car.pos - Vector3.UP * car.sink * 0.28 + Basis.from_euler(Vector3(-car.pitch, car.h, car.roll), EULER_ORDER_YXZ) * CarModel.EYE
		t = Transform3D(b * Basis(Vector3.UP, PI), eye)   # the camera looks down its -Z
		vig = clampf((absf(car.yaw_rate) - 0.45) * 0.5, 0.0, 0.6) + (0.3 if car.air else 0.0)
	else:
		var dh := wrapf(car.h - chase_yaw, -PI, PI)
		chase_yaw += dh * minf(1.0, dt * 2.2)
		var back := Vector3(sin(chase_yaw), 0, cos(chase_yaw))
		var p := car.pos - back * 7.5 + Vector3.UP * 2.9
		var gy := terrain.height_at(p.x, p.z) + 1.4
		p.y = maxf(p.y, gy)
		t = Transform3D(Basis(Vector3.UP, chase_yaw + PI), p)
		vig = clampf(absf(dh) * 1.2, 0.0, 0.5)
	if xr_on:
		origin.global_transform = t
	else:
		cam.global_transform = t
		if view == "out":
			cam.look_at(car.pos + Vector3.UP * 1.2 + car.fwd() * 3.0)
	vig_now = lerpf(vig_now, vig, minf(1.0, dt * 6.0))
	vig_mat.set_shader_parameter("strength", vig_now)


# ---------------------------------------------------------------- development screenshots
var _shot_t := 0.0
var _shot_done := false
func _shot_tick(dt: float) -> void:
	_shot_t += dt
	var wait := float(shot.get("drive", "0")) + 0.5
	if _shot_t > wait and not _shot_done:
		if shot.has("cam"):
			_shot_done = true   # --cam=dx,dy,dz relative to the car (car space), looking at the car
			var c: PackedStringArray = str(shot["cam"]).split(",")
			var off := Vector3(float(c[0]), float(c[1]), float(c[2]))
			var b := Basis.from_euler(Vector3(0, car.h, 0))
			cam.global_position = car.pos + b * off
			cam.look_at(car.pos + Vector3.UP * float(shot.get("look_y", "1.0")))
		_shot_done = true
		await RenderingServer.frame_post_draw
		await RenderingServer.frame_post_draw
		var img := get_viewport().get_texture().get_image()
		img.save_png(str(shot["shot"]))
		print("SHOT ", shot["shot"], " speed ", int(car.speed() * 3.6), " air ", car.air, " pos ", car.pos)
		get_tree().quit()
