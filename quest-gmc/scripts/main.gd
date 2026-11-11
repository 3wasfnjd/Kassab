extends Node3D
## Kassab GMC AR (Meta Quest 3, passthrough). Your GMC drives on a patch of desert laid on your
## real floor: gravel plains and dunes, toy-sized, free in every direction. Only the sand around
## the truck is drawn, fading into your room; if it runs far from you the desert quietly slides it
## back within reach, so you can roam forever.
##
## Controls (Quest Touch):
##   right trigger gas · left trigger brake, and reverse once stopped · left stick steer
##   right grip handbrake · Y 4x4 · X traction control (off = drift mode) · B back on its wheels
##   A bring the truck back in front of you · right stick up/down: bigger / smaller · left grip horn
## Desktop (development): W/S gas/brake · A/D steer · Space handbrake · F 4x4 · T traction ·
##   R reset · Q/E size · H horn.

const AR_PATCH := 1.6        # metres of sand drawn around the truck, in your room
const AR_REACH := 2.0        # how far from you the truck may roam before the sand slides

var terrain: Terrain
var truck: Truck
var model: GmcModel
var fx: CarFx
var engine: EngineAudio
var font: FontFile
var sun: DirectionalLight3D
var env: Environment
var world: Node3D           # the desert (scaled into your room)

var xr_on := false
var xri: XRInterface
var origin: XROrigin3D
var xr_cam: XRCamera3D
var left: XRController3D
var right: XRController3D
var cam: Camera3D           # desktop camera
var fake_floor: MeshInstance3D

var zoom := 1.0 / 16.0      # world scale in the room (1/16: the 5 m truck is 31 cm)
var ar_p := Vector3.ZERO    # the room point (on your floor) where view_c sits
var view_c := Vector3.ZERO  # the desert point shown at ar_p
var ar_fix := 1.0           # re-place once the headset pose has settled

var tip: Label3D
var tip_t := 0.0
var gauge: Label3D
var prev := {}
var shot := {}              # development: --shot=<png> --drive=<s> --steer= --cam=x,y,z --hand


func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--"):
			var kv: PackedStringArray = a.substr(2).split("=", true, 1)
			shot[kv[0]] = kv[1] if kv.size() > 1 else "1"
	font = _font()
	_environment()
	world = Node3D.new()
	world.name = "World"
	add_child(world)
	terrain = Terrain.new()
	world.add_child(terrain)
	var start := _start_point()
	truck = Truck.new(terrain, start, _face_dunes(start))
	model = GmcModel.new()
	world.add_child(model)
	fx = CarFx.new()
	world.add_child(fx)
	terrain.update_around(start.x, start.z, 999)
	_rig()
	engine = EngineAudio.new()
	add_child(engine)
	view_c = Vector3(truck.p.x, terrain.height_at(truck.p.x, truck.p.z) - 0.3, truck.p.z)
	if not xr_on:   # development: a grey floor stands in for your room
		fake_floor = MeshInstance3D.new()
		var pm := PlaneMesh.new()
		pm.size = Vector2(14, 14)
		fake_floor.mesh = pm
		var fm := StandardMaterial3D.new()
		fm.albedo_color = Color(0.42, 0.42, 0.44)
		fake_floor.material_override = fm
		fake_floor.position.y = -0.002
		add_child(fake_floor)
		get_viewport().transparent_bg = false
		env.background_color = Color(0.3, 0.3, 0.32, 1.0)
	_anchor()
	if shot.has("zoom"):
		zoom = 1.0 / float(shot.zoom)
	if shot.has("awd"):
		truck.awd = true
	_say("الزناد اليمين بنزين · اليسار فرامل وريوس · العصا دركسون\nالقبضة اليمين هاند بريك · Y دبل · X درفت · B تعديل", 9.0)


# ---------------------------------------------------------------- look
func _font() -> FontFile:
	var ar := FontFile.new()
	ar.load_dynamic_font("res://fonts/baloo-arabic.woff2")
	var la := FontFile.new()
	la.load_dynamic_font("res://fonts/baloo-latin.woff2")
	la.fallbacks = [ar]
	return la


func _environment() -> void:
	var we := WorldEnvironment.new()
	env = Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0, 0, 0, 0)       # passthrough shows through
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.78, 0.76, 0.74)
	env.ambient_light_energy = 0.42
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_exposure = 0.95
	env.tonemap_white = 1.5
	we.environment = env
	add_child(we)
	get_viewport().transparent_bg = true
	sun = DirectionalLight3D.new()
	sun.light_color = Color(1.0, 0.95, 0.86)
	sun.light_energy = 0.85
	sun.rotation = Vector3(deg_to_rad(-55), deg_to_rad(-38), 0)
	sun.shadow_enabled = true
	sun.shadow_opacity = 0.8
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_ORTHOGONAL
	sun.directional_shadow_max_distance = 5.0
	sun.shadow_bias = 0.02
	sun.shadow_normal_bias = 1.0
	add_child(sun)


func _start_point() -> Vector3:
	# a gravel plain with a dune field close by, clear of trees and houses
	for r in range(0, 2000, 40):
		for a in 12:
			var p := Vector3(cos(a * 0.52) * r, 0, sin(a * 0.52) * r)
			if terrain.dune_mask(p.x, p.z) < 0.02 and terrain.normal_at(p.x, p.z).y > 0.995:
				for b in 12:
					var q := p + Vector3(cos(b * 0.52), 0, sin(b * 0.52)) * 60.0
					if terrain.dune_mask(q.x, q.z) > 0.8:
						return p
	return Vector3.ZERO


func _face_dunes(p: Vector3) -> float:
	var best := 0.0
	var bm := -1.0
	for b in 24:
		var a := b * TAU / 24.0
		var m := terrain.dune_mask(p.x + sin(a) * 60.0, p.z + cos(a) * 60.0)
		if m > bm:
			bm = m
			best = a
	return best


# ---------------------------------------------------------------- player rig
func _rig() -> void:
	xri = XRServer.find_interface("OpenXR")
	if xri and xri.is_initialized() and not shot.has("shot"):
		xr_on = true
		get_viewport().use_xr = true
		DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
		if xri.get_supported_environment_blend_modes().has(XRInterface.XR_ENV_BLEND_MODE_ALPHA_BLEND):
			xri.environment_blend_mode = XRInterface.XR_ENV_BLEND_MODE_ALPHA_BLEND
		if xri.has_signal("pose_recentered"):
			xri.connect("pose_recentered", func(): ar_fix = 0.3)
		if xri.has_method("set_display_refresh_rate"):
			xri.set_display_refresh_rate(90.0)
	origin = XROrigin3D.new()
	add_child(origin)
	xr_cam = XRCamera3D.new()
	xr_cam.near = 0.03
	xr_cam.far = 60.0
	origin.add_child(xr_cam)
	left = XRController3D.new()
	left.tracker = "left_hand"
	origin.add_child(left)
	right = XRController3D.new()
	right.tracker = "right_hand"
	origin.add_child(right)
	if not xr_on:
		cam = Camera3D.new()
		cam.near = 0.03
		cam.far = 60.0
		cam.fov = 70.0
		add_child(cam)
		cam.make_current()
	var head: Node3D = xr_cam if xr_on else cam
	tip = Label3D.new()
	tip.font = font
	tip.font_size = 40
	tip.pixel_size = 0.0008
	tip.outline_size = 10
	tip.outline_modulate = Color(0.12, 0.08, 0.04, 0.9)
	tip.modulate = Color(1, 0.96, 0.88)
	tip.no_depth_test = true
	tip.render_priority = 11
	tip.width = 1100
	tip.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	tip.text_direction = TextServer.DIRECTION_RTL
	tip.position = Vector3(0, -0.2, -0.8)
	head.add_child(tip)
	# a small gauge that floats over the truck (speed · gear · 4x4 / drift)
	gauge = Label3D.new()
	gauge.font = font
	gauge.font_size = 36
	gauge.pixel_size = 0.0006
	gauge.outline_size = 8
	gauge.outline_modulate = Color(0.1, 0.07, 0.04, 0.85)
	gauge.modulate = Color(1, 0.97, 0.9, 0.9)
	gauge.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	gauge.text_direction = TextServer.DIRECTION_RTL
	gauge.line_spacing = -6.0
	gauge.no_depth_test = true
	gauge.render_priority = 10
	add_child(gauge)


func _say(t: String, sec := 3.0) -> void:
	tip.text = t
	tip_t = sec


func _pulse(ctrl: XRController3D, amp: float, dur: float) -> void:
	if xr_on and ctrl:
		ctrl.trigger_haptic_pulse("haptic", 0.0, amp, dur, 0.0)


# ---------------------------------------------------------------- input
func _pressed(name: String, now: bool) -> bool:
	var was: bool = prev.get(name, false)
	prev[name] = now
	return now and not was


func _read_input() -> Dictionary:
	var gas := 0.0
	var brake := 0.0
	var st := 0.0
	var hand := false
	var horn := false
	var b_awd := false
	var b_tcs := false
	var b_reset := false
	var b_home := false
	if xr_on:
		gas = right.get_float("trigger")
		brake = left.get_float("trigger")
		var v := left.get_vector2("primary")
		st = v.x if absf(v.x) > 0.06 else 0.0
		var v2 := right.get_vector2("primary")
		if absf(v2.x) > absf(st) and absf(v2.x) > absf(v2.y):
			st = v2.x
		if absf(v2.y) > 0.35 and absf(v2.y) > absf(v2.x):
			zoom = clampf(zoom * exp(v2.y * 0.02), 1.0 / 40.0, 1.0 / 6.0)
		hand = right.get_float("grip") > 0.55
		horn = left.get_float("grip") > 0.6
		b_home = right.is_button_pressed("ax_button")
		b_reset = right.is_button_pressed("by_button")
		b_tcs = left.is_button_pressed("ax_button")
		b_awd = left.is_button_pressed("by_button")
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP):
		gas = 1.0
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN):
		brake = 1.0
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		st = -1.0
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		st = 1.0
	hand = hand or Input.is_key_pressed(KEY_SPACE)
	horn = horn or Input.is_key_pressed(KEY_H)
	b_awd = b_awd or Input.is_key_pressed(KEY_F)
	b_tcs = b_tcs or Input.is_key_pressed(KEY_T)
	b_reset = b_reset or Input.is_key_pressed(KEY_R)
	if Input.is_key_pressed(KEY_Q):
		zoom = clampf(zoom / 1.02, 1.0 / 40.0, 1.0 / 6.0)
	if Input.is_key_pressed(KEY_E):
		zoom = clampf(zoom * 1.02, 1.0 / 40.0, 1.0 / 6.0)
	if shot.has("drive"):
		gas = float(shot.get("gas", "1"))
		st = float(shot.get("steer", "0"))
		hand = shot.has("hand") and _shot_t > float(shot.get("hand", "0"))
	return {gas = gas, brake = brake, steer = st, hand = hand, horn = horn,
		awd = _pressed("awd", b_awd), tcs = _pressed("tcs", b_tcs), reset = _pressed("reset", b_reset), home = _pressed("home", b_home)}


# ---------------------------------------------------------------- frame
func _process(dt: float) -> void:
	var inp := _read_input()
	if inp.awd:
		truck.awd = not truck.awd
		_say("الدبل شغّال 4×4" if truck.awd else "الدبل طافي — دفع خلفي", 1.6)
		_pulse(left, 0.4, 0.08)
	if inp.tcs:
		truck.tcs = not truck.tcs
		_say("التحكم بالانزلاق شغّال" if truck.tcs else "وضع الدرفت — التحكم بالانزلاق طافي", 1.8)
		_pulse(left, 0.4, 0.08)
	if inp.reset:
		truck.place(truck.p, truck.heading())
		_say("رجّعنا الجمس على كفراته", 1.4)
	if inp.home:
		ar_fix = 0.01
	truck.hand = inp.hand
	if not _shot_done:
		truck.update(dt, inp.gas, inp.brake, inp.steer)
	for e in truck.events:
		match e:
			"land":
				engine.land(truck.landed)
				_pulse(left, 0.3 + truck.landed * 0.7, 0.12)
				_pulse(right, 0.3 + truck.landed * 0.7, 0.12)
			"crash":
				engine.land(1.0)
				_pulse(left, 0.9, 0.2)
				_pulse(right, 0.9, 0.2)
	truck.events.clear()
	var slip := 0.0
	for i in 4:
		if truck.contact[i]:
			slip = maxf(slip, absf(truck.slip_y[i]) + absf(truck.slip_x[i]) * 0.6)
	if slip > 4.0 and not truck.air:
		_pulse(right, clampf(slip / 30.0, 0.05, 0.25), 0.03)
	if truck.scrape > 0.3:
		_pulse(left, 0.3, 0.05)
	engine.drive(truck.rpm, truck.throttle, truck.speed(), slip)
	engine.horn = inp.horn
	var braking: bool = (inp.brake > 0.1 and truck.gear > 0) or (inp.gas > 0.1 and truck.gear < 0) or inp.hand
	model.apply(truck, braking)
	fx.update(truck, terrain)
	terrain.update_around(truck.p.x, truck.p.z, 1)
	terrain.show_only_near(truck.p.x, truck.p.z, AR_PATCH / zoom)
	if not _shot_done:
		_update_room(dt)
	_update_gauge()
	if tip_t > 0.0:
		tip_t -= dt
		tip.modulate.a = clampf(tip_t * 2.0, 0.0, 1.0)
	if shot.has("shot"):
		_shot_tick(dt)


# ---------------------------------------------------------------- the desert in your room
func _head() -> Transform3D:
	return xr_cam.global_transform if xr_on else cam.global_transform


## Put the truck on the floor a little in front of you.
func _anchor() -> void:
	var h := Transform3D(Basis.IDENTITY, Vector3(0, 1.5, 0)) if not xr_on else _head()
	var f := -h.basis.z
	f.y = 0.0
	f = f.normalized() if f.length() > 0.1 else Vector3.FORWARD
	ar_p = Vector3(h.origin.x, 0.0, h.origin.z) + f * 1.2
	view_c.x = truck.p.x
	view_c.z = truck.p.z


func _update_room(dt: float) -> void:
	if ar_fix > 0.0:
		ar_fix -= dt
		if ar_fix <= 0.0:
			_anchor()
	var z := zoom
	var cp := truck.model_xf(truck.alpha()).origin
	# the lowest sand around the truck rests on your floor (slowly, so dunes still rise and fall)
	var low := terrain.height_at(cp.x, cp.z)
	var rw := AR_PATCH / z * 0.7
	for i in 8:
		var a := TAU * i / 8.0
		low = minf(low, terrain.height_at(cp.x + cos(a) * rw, cp.z + sin(a) * rw))
	view_c.y += (low - 0.3 - view_c.y) * (1.0 - exp(-dt * 1.2))
	# free to roam; past arm's reach the sand slides it back toward you
	var cs := ar_p + (cp - view_c) * z
	var hp := _head().origin
	var off := Vector2(cs.x - hp.x, cs.z - hp.z)
	if off.length() > AR_REACH:
		var push := off.normalized() * (off.length() - AR_REACH) * (1.0 - exp(-dt * 2.5))
		view_c.x += push.x / z
		view_c.z += push.y / z
	world.transform = Transform3D(Basis.from_scale(Vector3.ONE * z), ar_p - view_c * z)
	terrain.mat.set_shader_parameter("world_inv", world.transform.affine_inverse())
	cs = ar_p + (cp - view_c) * z
	MeshKit.set_clip(cs, AR_PATCH)
	sun.directional_shadow_max_distance = maxf(3.0, AR_PATCH * 2.5)
	if not xr_on and not shot.has("cam"):
		cam.global_position = Vector3(0, 1.35, 0.55)
		cam.look_at(ar_p + Vector3(0, 0.05, 0))


func _update_gauge() -> void:
	var cp := truck.model_xf(truck.alpha()).origin
	gauge.global_position = world.transform * (cp + Vector3.UP * 3.1)
	gauge.pixel_size = 0.0006 * clampf(zoom * 16.0, 0.6, 1.6)
	var tags := "R" if truck.gear < 0 else "غيار %d" % truck.gear
	if truck.awd:
		tags += "  ·  4×4"
	if not truck.tcs:
		tags += "  ·  درفت"
	gauge.text = "%d\n%s" % [int(round(truck.speed() * 3.6)), tags]


# ---------------------------------------------------------------- development screenshots
var _shot_t := 0.0
var _shot_done := false
func _shot_tick(dt: float) -> void:
	_shot_t += dt
	var wait := float(shot.get("drive", "0")) + 0.6
	if _shot_t > wait and not _shot_done:
		_shot_done = true
		if shot.has("cam"):   # --cam=dx,dy,dz in metres of the room, relative to the truck, looking at it
			var c: PackedStringArray = str(shot["cam"]).split(",")
			var cp := world.transform * truck.model_xf().origin
			var yaw := Basis(Vector3.UP, truck.heading())
			cam.global_position = cp + yaw * Vector3(float(c[0]), float(c[1]), float(c[2]))
			cam.look_at(cp + Vector3.UP * float(shot.get("look_y", "0.06")))
			if shot.has("fov"):
				cam.fov = float(shot.fov)
		await RenderingServer.frame_post_draw
		await RenderingServer.frame_post_draw
		var img := get_viewport().get_texture().get_image()
		img.save_png(str(shot["shot"]))
		print("SHOT ", shot["shot"], " speed ", int(truck.speed() * 3.6), " km/h, gear ", truck.gear, " drift ", int(truck.drift_deg()), " air ", truck.air)
		get_tree().quit()
