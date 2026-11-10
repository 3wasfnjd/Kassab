extends Node3D
## Kassab Quest. A desert of dunes and gravel plains and one code-built 4x4.
## First view (AR): the car drives on your real floor through passthrough, toy-sized, free in
## every direction; only the sand around it is drawn, fading into your room. If it runs too far
## from you the sand quietly slides it back within reach.
## Second view: you float high above an open desert that reaches the horizon all around you and
## watch the car from above, like a top-down game. The world is shown smaller than life (you are
## a giant) so the land glides slowly under you; the view only slides, it never turns or tilts
## (comfort). Third view: the driver's seat.
##
## Controls (Quest Touch): right trigger gas · left trigger brake / reverse · left stick steer
## right grip handbrake · right stick up/down height (sky) or seat height (seat)
## A switch view (room AR / sky / seat) · Y 4x4 on/off · X photo · B put the car back on its wheels
## Desktop (for development): W/S gas/brake · A/D steer · C view · F 4x4 · R reset · Q/E zoom.

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
var view := "ar"            # "ar" = in your room, "sky" = high above, "in" = driver's seat
var xri: XRInterface
var ar_ok := false          # passthrough available
var eye_h := 0.0            # head height over the floor when a VR view started (stage space)
var ar_p := Vector3.ZERO    # the room point where view_c sits (on the floor)
var ar_zoom := 1.0 / 25.0   # room view scale (1/25: a 4.5 m car is 18 cm)
const AR_PATCH := 1.15      # metres of sand drawn around the car in the room
const AR_REACH := 2.5       # the car may roam this far from you before the sand slides
var fake_floor: MeshInstance3D
var ar_fix := 1.2          # re-place the car once the headset pose has settled
var world: Node3D           # everything of the desert; scaled and slid in the sky view
const ANCHOR := Vector3(0.0, -1.35, -1.25)   # where the car's ground sits, from where your head started
var zoom := 1.0 / 14.0      # world scale in the sky view (1/14: a 4.5 m car is 32 cm)
var zoom_now := 1.0 / 14.0  # pulls back a little at speed so you see further ahead
var view_c := Vector3.ZERO  # the desert point under the anchor
var chase_yaw := 0.0
var vignette: MeshInstance3D
var vig_mat: ShaderMaterial
var tip: Label3D
var tip_t := 0.0
var prev := {}
var engine: EngineAudio
var missions: Missions
var hands := {}            # "left"/"right" -> hand mesh
var grab := {}             # hand -> {a0: angle on the rim when grabbed, s0: steer then}
var wheel_steer := 0.0
var seat_dy := 0.0
var vig_now := 0.0
var shot := {}              # development: --shot=<png> --view=in|out --drive=<s>


func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--"):
			var kv: PackedStringArray = a.substr(2).split("=", true, 1)
			shot[kv[0]] = kv[1] if kv.size() > 1 else "1"
	font = _font()
	_world()
	world = Node3D.new()
	world.name = "World"
	add_child(world)
	terrain = Terrain.new()
	world.add_child(terrain)
	var start := _start_point()
	model = CarModel.new(font)
	world.add_child(model)
	car = Car.new(terrain, start, 0.0)
	car.h = _face_dunes(start)
	fx = CarFx.new()
	world.add_child(fx)
	terrain.update_around(start.x, start.z, 999)
	_rig()
	engine = EngineAudio.new()
	add_child(engine)
	var camp := start + Vector3(sin(car.h + PI / 2), 0, cos(car.h + PI / 2)) * 16.0 - Vector3(sin(car.h), 0, cos(car.h)) * 6.0
	missions = Missions.new(terrain, car, font, camp)
	world.add_child(missions)
	missions.attach_hud(xr_cam if xr_on else cam)
	missions.said.connect(_say)
	view = shot.get("view", "ar")
	view_c = Vector3(car.pos.x, 0, car.pos.z)
	if not xr_on:   # development shots: a grey floor stands in for the room
		fake_floor = MeshInstance3D.new()
		var pm := PlaneMesh.new()
		pm.size = Vector2(12, 12)
		fake_floor.mesh = pm
		var fm := StandardMaterial3D.new()
		fm.albedo_color = Color(0.45, 0.45, 0.47)
		fake_floor.material_override = fm
		fake_floor.position.y = -0.002
		add_child(fake_floor)
	_apply_view_mode()
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
	env.ambient_light_color = Color(0.72, 0.72, 0.76)
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
	sun.light_color = Color(1.0, 0.94, 0.84)
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
	xri = XRServer.find_interface("OpenXR")
	if xri and xri.is_initialized() and not shot.has("shot"):
		ar_ok = xri.get_supported_environment_blend_modes().has(XRInterface.XR_ENV_BLEND_MODE_ALPHA_BLEND)
		xr_on = true
		get_viewport().use_xr = true
		DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
		if xri.has_signal("pose_recentered"):
			xri.connect("pose_recentered", func():
				XRServer.center_on_hmd(XRServer.RESET_BUT_KEEP_TILT, true)
				ar_fix = 0.3)
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
	for c in [left, right]:
		var hm := _hand_mesh(c == left)
		c.add_child(hm)
		hands[c] = hm
	if not xr_on:
		cam = Camera3D.new()
		cam.near = 0.05
		cam.far = 400.0
		cam.fov = 80.0
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
	var b_photo := false
	var hb := false
	if xr_on:
		gas = right.get_float("trigger")
		brake = left.get_float("trigger")
		var v := left.get_vector2("primary")
		st = v.x if absf(v.x) > 0.08 else 0.0
		var v2 := right.get_vector2("primary")
		if absf(v2.x) > absf(st) and absf(v2.x) > absf(v2.y):
			st = v2.x
		hb = right.get_float("grip") > 0.6 and not grab.has(right)
		if view == "in":
			seat_dy = clampf(seat_dy + v2.y * 0.004, -0.2, 0.2)   # right stick up/down: seat height
		elif absf(v2.y) > 0.3 and view == "ar":
			ar_zoom = clampf(ar_zoom * exp(v2.y * 0.02), 1.0 / 60.0, 1.0 / 10.0)
		elif absf(v2.y) > 0.3:
			zoom = clampf(zoom * exp(-v2.y * 0.02), 1.0 / 40.0, 1.0 / 6.0)
		b_view = right.is_button_pressed("ax_button")
		b_awd = left.is_button_pressed("by_button")
		b_reset = right.is_button_pressed("by_button")
		b_photo = left.is_button_pressed("ax_button")
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
	hb = hb or Input.is_key_pressed(KEY_SPACE)
	if Input.is_key_pressed(KEY_Q):
		zoom = clampf(zoom * 1.02, 1.0 / 40.0, 1.0 / 6.0)
	if Input.is_key_pressed(KEY_E):
		zoom = clampf(zoom / 1.02, 1.0 / 40.0, 1.0 / 6.0)
	if shot.has("zoom"):
		zoom = 1.0 / float(shot.zoom)
	b_photo = b_photo or Input.is_key_pressed(KEY_P)
	if shot.has("drive"):
		gas = 1.0
		st = float(shot.get("steer", "0"))
	return {hand = hb, gas = gas, brake = brake, steer = st, view = _pressed("view", b_view), awd = _pressed("awd", b_awd), reset = _pressed("reset", b_reset), photo = _pressed("photo", b_photo)}


func _pulse(ctrl: XRController3D, amp: float, dur: float) -> void:
	if xr_on and ctrl:
		ctrl.trigger_haptic_pulse("haptic", 0.0, amp, dur, 0.0)


# ---------------------------------------------------------------- frame
func _process(dt: float) -> void:
	var inp := _read_input()
	if inp.view:
		var order := ["ar", "sky", "in"] if (ar_ok or not xr_on) else ["sky", "in"]
		view = order[(order.find(view) + 1) % order.size()]
		_apply_view_mode()
		_say({"ar": "في غرفتك", "sky": "من فوق", "in": "ورا الدركسون"}[view], 1.2)
	if inp.awd:
		car.awd = not car.awd
		_say("الدبل شغّال 4×4" if car.awd else "الدبل طافي", 1.6)
		_pulse(left, 0.4, 0.08)
	if inp.reset:
		car.place(car.pos + Vector3.UP * 0.2, car.h)
		if view == "ar":
			ar_fix = 0.05   # and bring it back in front of you
		_say("رجّعنا السيارة على كفراتها", 1.6)
	var st: float = inp.steer
	var ws = _wheel_grab()
	if ws != null:
		st = ws
	car.hand = inp.hand
	if not _shot_done:
		car.update(dt, inp.gas, inp.brake, st)
	engine.drive(car.vF, inp.gas, car.slip, car.air, car.sink)
	model.set_gauges(car.speed() * 3.6, engine.rpm, car.awd)
	for e in car.events:
		match e:
			"stuck":
				_say("غرّزت! شغّل الدبل بزر Y", 4.0)
				_pulse(left, 0.6, 0.25)
			"land":
				missions.on_landing(car.landed)
				_pulse(left, 0.3 + car.landed * 0.7, 0.12)
				_pulse(right, 0.3 + car.landed * 0.7, 0.12)
	car.events.clear()
	if inp.gas > 0.1 and car.sink > 0.4:
		_pulse(right, 0.15, 0.05)
	car.apply(model)
	model.set_lamps(0.0, inp.brake > 0.1 and car.vF > 0.3)
	missions.update(dt, inp.photo, view == "in")
	fx.update(car, terrain)
	terrain.update_around(view_c.x if view == "sky" else car.pos.x, view_c.z if view == "sky" else car.pos.z, 1)
	terrain.show_only_near(car.pos.x, car.pos.z, AR_PATCH / ar_zoom if view == "ar" else 0.0)
	sun.global_position = car.pos
	if not _shot_done:
		_place_view(dt)
	if tip_t > 0.0:
		tip_t -= dt
		tip.modulate.a = clampf(tip_t * 2.0, 0.0, 1.0)
	if shot.has("shot"):
		_shot_tick(dt)


func _place_view(dt: float) -> void:
	if view == "ar":
		_update_ar(dt)
		vig_mat.set_shader_parameter("strength", 0.0)
		return
	if view == "sky":
		_update_sky(dt)
		vig_mat.set_shader_parameter("strength", 0.0)
		return
	# the driver's eye; the car's pitch and roll reach you at half strength (comfort)
	var b := Basis.from_euler(Vector3(-car.pitch * 0.5, car.h, car.roll * 0.5), EULER_ORDER_YXZ)
	var eye := car.pos - Vector3.UP * car.sink * 0.28 + Basis.from_euler(Vector3(-car.pitch, car.h, car.roll), EULER_ORDER_YXZ) * (CarModel.EYE + Vector3.UP * seat_dy)
	var t := Transform3D(b * Basis(Vector3.UP, PI), eye)   # the camera looks down its -Z
	var vig := clampf((absf(car.yaw_rate) - 0.45) * 0.5, 0.0, 0.6) + (0.3 if car.air else 0.0)
	if xr_on:
		origin.global_transform = t * Transform3D(Basis.IDENTITY, Vector3(0, -eye_h, 0))
	else:
		cam.global_transform = t
	vig_now = lerpf(vig_now, vig, minf(1.0, dt * 6.0))
	vig_mat.set_shader_parameter("strength", vig_now)
	missions.table = {}


# ---------------------------------------------------------------- the sky view
func _apply_view_mode() -> void:
	if view == "ar" and xr_on and not ar_ok:
		view = "sky"
	var ar := view == "ar"
	var sky := view == "sky"
	model.speedo.visible = view == "in"
	MeshKit.set_clip(Vector3.ZERO, 1.0e9)
	# passthrough: see-through background, no sky, no haze
	get_viewport().transparent_bg = ar
	env.background_mode = Environment.BG_COLOR if ar else Environment.BG_SKY
	env.background_color = Color(0, 0, 0, 0)
	env.fog_enabled = not ar
	if xr_on and ar_ok:
		xri.environment_blend_mode = XRInterface.XR_ENV_BLEND_MODE_ALPHA_BLEND if ar else XRInterface.XR_ENV_BLEND_MODE_OPAQUE
	if fake_floor:
		fake_floor.visible = ar and not xr_on
	# the VR views put your eyes where the old local space had them
	eye_h = 1.6
	if xr_on and xr_cam.position.y > 0.4:
		eye_h = xr_cam.position.y
	if ar:
		engine.volume_db = -12.0
		env.tonemap_exposure = 0.95
		sun.directional_shadow_max_distance = 6.0
		if xr_on:
			origin.global_transform = Transform3D.IDENTITY
		_ar_anchor()
	elif sky:
		engine.volume_db = -9.0
		env.tonemap_exposure = 0.85
		if xr_on:
			origin.global_transform = Transform3D(Basis.IDENTITY, Vector3(0, -eye_h, 0))
	else:
		world.transform = Transform3D.IDENTITY
		terrain.mat.set_shader_parameter("world_inv", Transform3D.IDENTITY)
		env.fog_depth_begin = 70.0
		env.fog_depth_end = 185.0
		sun.directional_shadow_max_distance = 30.0
		engine.volume_db = -6.0
		env.tonemap_exposure = 0.92


# ---------------------------------------------------------------- the room view (passthrough AR)
func _head() -> Transform3D:
	return xr_cam.global_transform if xr_on else cam.global_transform


## Put the car on the floor a little in front of you.
func _ar_anchor() -> void:
	var h := _head()
	var f := -h.basis.z
	f.y = 0.0
	f = f.normalized() if f.length() > 0.1 else Vector3.FORWARD
	ar_p = Vector3(h.origin.x, 0.0, h.origin.z) + f * 1.3
	view_c = car.pos - Vector3.UP * 0.3


func _update_ar(dt: float) -> void:
	if ar_fix > 0.0:
		ar_fix -= dt
		if ar_fix <= 0.0:
			_ar_anchor()
	var z := ar_zoom
	# the ground under the car settles on your floor (slowly, so dunes still rise and fall)
	# (the lowest sand around the car rests on the floor, so the patch never sinks into it)
	var low := car.pos.y
	var rw := AR_PATCH / z * 0.7
	for i in 8:
		var a := TAU * i / 8.0
		low = minf(low, terrain.height_at(car.pos.x + cos(a) * rw, car.pos.z + sin(a) * rw))
	view_c.y += (low - 0.3 - view_c.y) * (1.0 - exp(-dt * 1.5))
	var cs := ar_p + (car.pos - view_c) * z   # the car in the room
	# free to roam; past arm's reach the sand slides it back toward you
	var hp := _head().origin
	var off := Vector2(cs.x - hp.x, cs.z - hp.z)
	if off.length() > AR_REACH:
		var push := off.normalized() * (off.length() - AR_REACH) * (1.0 - exp(-dt * 2.5))
		view_c.x += push.x / z
		view_c.z += push.y / z
	world.transform = Transform3D(Basis.from_scale(Vector3.ONE * z), ar_p - view_c * z)
	terrain.mat.set_shader_parameter("world_inv", world.transform.affine_inverse())
	cs = ar_p + (car.pos - view_c) * z
	MeshKit.set_clip(cs, AR_PATCH)
	missions.table = {sky = true, s = z * 1.6}
	if not xr_on:
		cam.global_position = Vector3(0, 1.45, 0.3)
		cam.look_at(ar_p + Vector3(0, 0, 0.2))


func _update_sky(dt: float) -> void:
	# the land glides so the car stays below you, a little ahead of where it is going;
	# heights follow slowly so a dune lifts the world gently instead of jolting it
	var look := car.pos + Vector3(car.vel.x, 0, car.vel.z) * 0.7
	var k := 1.0 - exp(-dt * 2.0)
	view_c.x += (look.x - view_c.x) * k
	view_c.z += (look.z - view_c.z) * k
	view_c.y += (car.pos.y - view_c.y) * (1.0 - exp(-dt * 1.2))
	var want := zoom * lerpf(1.0, 0.8, clampf(car.speed() / 28.0, 0.0, 1.0))
	zoom_now = lerpf(zoom_now, want, 1.0 - exp(-dt * 1.2))
	var z := zoom_now
	world.transform = Transform3D(Basis.from_scale(Vector3.ONE * z), ANCHOR - view_c * z)
	terrain.mat.set_shader_parameter("world_inv", world.transform.affine_inverse())
	# the haze sits at the edge of the loaded desert, so the world reaches the horizon
	var reach := Terrain.RADIUS * Terrain.CHUNK * z
	env.fog_depth_begin = reach * 0.45
	env.fog_depth_end = reach * 0.95
	sun.directional_shadow_max_distance = maxf(4.0, 80.0 * z)
	missions.table = {sky = true, s = z}
	if not xr_on:
		cam.global_position = Vector3(0, 0.0, 0.05)
		cam.look_at(ANCHOR + Vector3(0, 0, -0.3))


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


# ---------------------------------------------------------------- hands and the steering wheel
## A simple glove: palm, four fingers, a thumb, in the desert-tan of a driving glove.
func _hand_mesh(is_left: bool) -> MeshInstance3D:
	var k := MeshKit.new()
	var c := Color(0.55, 0.4, 0.28)
	var sx := -1.0 if is_left else 1.0
	k.box(Vector3(0, -0.01, 0.02), Vector3(0.085, 0.03, 0.1), c, 0.012)
	for i in 4:
		k.box(Vector3((-0.03 + i * 0.02), -0.02, -0.06), Vector3(0.017, 0.022, 0.07), c.darkened(0.05), 0.006, Basis(Vector3.RIGHT, -0.5))
	k.box(Vector3(sx * -0.05, -0.015, 0.0), Vector3(0.02, 0.022, 0.06), c, 0.006, Basis(Vector3.UP, sx * 0.7))
	k.box(Vector3(0, -0.005, 0.085), Vector3(0.07, 0.035, 0.05), Color(0.2, 0.18, 0.16), 0.01)   # cuff
	var mi := MeshInstance3D.new()
	mi.mesh = k.commit(null, MeshKit.vc_material(0.8))
	mi.visible = xr_on
	return mi


## Grip a hand on the rim of the steering wheel and turn it like a real wheel (one or two hands).
## Returns the steering from the wheel, or null when no hand holds it.
func _wheel_grab():
	if not xr_on or view != "in":
		for c in hands:
			hands[c].transform = Transform3D.IDENTITY
		grab.clear()
		return null
	var wf := model.wheel_frame()
	var inv := wf.affine_inverse()
	var deltas := []
	for c in [left, right]:
		var g: float = c.get_float("grip")
		var lp: Vector3 = inv * c.global_position
		var on_rim := absf(Vector2(lp.x, lp.y).length() - 0.19) < 0.09 and absf(lp.z) < 0.12
		if g > 0.6 and (grab.has(c) or on_rim):
			var ang := atan2(lp.y, lp.x)
			if not grab.has(c):
				grab[c] = {a0 = ang, s0 = wheel_steer}
				_pulse(c, 0.25, 0.04)
			deltas.append(wrapf(ang - grab[c].a0, -PI, PI))
			# the glove sits on the rim where the hand holds it
			var rimp := wf * (Vector3(cos(ang), sin(ang), 0) * 0.19)
			hands[c].global_transform = Transform3D(wf.basis * Basis(Vector3.BACK, ang - PI / 2), rimp)
		else:
			grab.erase(c)
			hands[c].transform = Transform3D.IDENTITY
	if deltas.is_empty():
		wheel_steer = move_toward(wheel_steer, 0.0, get_process_delta_time() * 0.8)   # self-centres a little when let go
		return null
	var s0: float = 0.0
	var d := 0.0
	for c in grab:
		s0 = grab[c].s0
	for x in deltas:
		d += x
	d /= deltas.size()
	# turning the rim clockwise (seen by the driver) steers right; 2.4 rad of wheel = full lock
	wheel_steer = clampf(s0 - d / 2.4, -1.0, 1.0)
	return wheel_steer
