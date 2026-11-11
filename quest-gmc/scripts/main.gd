extends Node3D
## Kassab GMC AR (Meta Quest 3, passthrough) — free room mode, like Hajwala's: the GMC drives
## on your real floor, nothing drawn under it but its shadow and its skid marks. Your furniture
## from the headset's Space Setup (tables, sofa, bed, …) are solid obstacles when available.
## No text on screen.
##
## Controls (Quest Touch):
##   right trigger gas · left trigger brake, and reverse once stopped · left stick steer
##   right grip handbrake · Y 4x4 · X traction control (off = drift mode) · B back on its wheels
##   A bring the truck in front of you · right stick up/down: bigger / smaller · left grip horn
## Desktop (development): W/S gas/brake · A/D steer · Space handbrake · F 4x4 · T traction ·
##   R reset · G bring back · Q/E size · H horn.

const SKIP_LABELS := ["floor", "ceiling", "wall_face", "invisible_wall_face", "global_mesh",
		"window_frame", "door_frame", "wall_art", "inner_wall_face"]

var ground: FloorGround
var truck: Truck
var model: GmcModel
var fx: CarFx
var engine: EngineAudio
var sun: DirectionalLight3D
var env: Environment
var world: Node3D           # the truck's space, scaled onto your floor
var blob: MeshInstance3D

var xr_on := false
var xri: XRInterface
var origin: XROrigin3D
var xr_cam: XRCamera3D
var left: XRController3D
var right: XRController3D
var cam: Camera3D
var scene_mgr: Node3D       # OpenXRFbSceneManager (Meta room furniture), when the plugin has it
var furniture: Array = []   # [{node: Node3D, aabb: AABB}]

var zoom := 1.0 / 14.0      # world scale (1/14: the 5 m truck is 36 cm long on your floor)
var anchor := Vector3.ZERO  # room point where the truck's space origin sits (on the floor)
var place_t := 1.0          # put the truck in front of you once the headset pose has settled
var prev := {}
var shot := {}              # development: --shot=<png> --drive=<s> --steer= --cam=x,y,z --hand=<s>


func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--"):
			var kv: PackedStringArray = a.substr(2).split("=", true, 1)
			shot[kv[0]] = kv[1] if kv.size() > 1 else "1"
	_environment()
	world = Node3D.new()
	world.name = "World"
	add_child(world)
	ground = FloorGround.new()
	truck = Truck.new(ground, Vector3.ZERO, 0.0)
	model = GmcModel.new()
	world.add_child(model)
	fx = CarFx.new()
	world.add_child(fx)
	_shadows()
	_rig()
	engine = EngineAudio.new()
	add_child(engine)
	if shot.has("zoom"):
		zoom = 1.0 / float(shot.zoom)
	if shot.has("awd"):
		truck.awd = true
	if not xr_on:
		_desktop_room()
	_furniture_start()
	_bring_back()


# ---------------------------------------------------------------- look
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
	sun.light_color = Color(1.0, 0.96, 0.9)
	sun.light_energy = 0.85
	sun.rotation = Vector3(deg_to_rad(-62), deg_to_rad(-30), 0)   # high, like room ceiling light
	sun.shadow_enabled = true
	sun.shadow_opacity = 0.75
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_ORTHOGONAL
	sun.directional_shadow_max_distance = 3.0
	sun.shadow_bias = 0.01
	sun.shadow_normal_bias = 0.6
	add_child(sun)


## Under the truck: only a soft contact shade where it meets your floor — no ground drawn.
## (A shadow-only floor plane was tried: it does not show in the Compatibility renderer.)
func _shadows() -> void:
	blob = MeshInstance3D.new()
	var q := QuadMesh.new()
	q.size = Vector2(2.9, 6.0)
	q.orientation = PlaneMesh.FACE_Y
	blob.mesh = q
	var bm := StandardMaterial3D.new()
	bm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	bm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	bm.albedo_texture = _blob_tex()
	bm.albedo_color = Color(0, 0, 0, 0.68)
	bm.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	blob.material_override = bm
	blob.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	blob.position = Vector3(0, 0.015, 0.2)
	model.add_child(blob)


static func _blob_tex() -> ImageTexture:
	var n := 64
	var img := Image.create(n, n, false, Image.FORMAT_RGBA8)
	for y in n:
		for x in n:
			var d := Vector2(x + 0.5 - n * 0.5, y + 0.5 - n * 0.5).length() / (n * 0.5)
			var a := clampf(1.0 - d, 0.0, 1.0)
			img.set_pixel(x, y, Color(1, 1, 1, a * a * (3.0 - 2.0 * a)))
	return ImageTexture.create_from_image(img)


func _desktop_room() -> void:
	# development only: a grey floor and a box "table" stand in for your room
	var fl := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(14, 14)
	fl.mesh = pm
	var fm := StandardMaterial3D.new()
	fm.albedo_color = Color(0.5, 0.47, 0.44)
	fl.material_override = fm
	fl.position.y = -0.003
	if not shot.has("nofloor"):
		add_child(fl)
	get_viewport().transparent_bg = false
	env.background_color = Color(0.3, 0.3, 0.32, 1.0)
	if shot.has("table"):
		var t := Node3D.new()
		t.position = Vector3(0.45, 0, -1.2)
		add_child(t)
		var mi := MeshInstance3D.new()
		var bx := BoxMesh.new()
		bx.size = Vector3(0.5, 0.45, 0.5)
		mi.mesh = bx
		mi.position.y = 0.225
		t.add_child(mi)
		furniture.append({node = t, aabb = AABB(Vector3(-0.25, 0, -0.25), Vector3(0.5, 0.45, 0.5))})


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
			xri.connect("pose_recentered", func(): place_t = 0.3)
		if xri.has_method("set_display_refresh_rate"):
			xri.set_display_refresh_rate(90.0)
	origin = XROrigin3D.new()
	add_child(origin)
	xr_cam = XRCamera3D.new()
	xr_cam.near = 0.02
	xr_cam.far = 40.0
	origin.add_child(xr_cam)
	left = XRController3D.new()
	left.tracker = "left_hand"
	origin.add_child(left)
	right = XRController3D.new()
	right.tracker = "right_hand"
	origin.add_child(right)
	if not xr_on:
		cam = Camera3D.new()
		cam.near = 0.02
		cam.far = 40.0
		cam.fov = 60.0
		add_child(cam)
		cam.make_current()
		cam.global_position = Vector3(0, 1.3, 0.25)
		cam.look_at(Vector3(0, 0.05, -1.2))


func _pulse(ctrl: XRController3D, amp: float, dur: float) -> void:
	if xr_on and ctrl:
		ctrl.trigger_haptic_pulse("haptic", 0.0, amp, dur, 0.0)


# ---------------------------------------------------------------- your furniture (Space Setup)
func _furniture_start() -> void:
	if not xr_on or not ClassDB.class_exists("OpenXRFbSceneManager"):
		return
	scene_mgr = ClassDB.instantiate("OpenXRFbSceneManager")
	var holder := Node3D.new()
	var ps := PackedScene.new()
	ps.pack(holder)
	holder.free()
	scene_mgr.set("default_scene", ps)
	scene_mgr.set("auto_create", false)
	scene_mgr.connect("openxr_fb_scene_anchor_created", _on_anchor)
	origin.add_child(scene_mgr)
	if OS.get_name() == "Android":
		get_tree().on_request_permissions_result.connect(func(perm: String, ok: bool):
			if ok and perm == "com.oculus.permission.USE_SCENE":
				_create_anchors())
		if OS.request_permission("com.oculus.permission.USE_SCENE"):
			_create_anchors()
	else:
		_create_anchors()


func _create_anchors() -> void:
	if scene_mgr and not scene_mgr.call("are_scene_anchors_created"):
		scene_mgr.call("create_scene_anchors")


func _on_anchor(scene_node: Object, entity: Object) -> void:
	var labels: PackedStringArray = entity.call("get_semantic_labels")
	for l in labels:
		if SKIP_LABELS.has(String(l).to_lower()):
			return
	var aabb: AABB = entity.call("get_bounding_box_3d")
	if aabb.size.x < 0.02 or aabb.size.z < 0.02:
		return
	furniture.append({node = scene_node, aabb = aabb})


## Furniture boxes in the truck's space (they move when you resize the truck's world).
func _update_boxes() -> void:
	var inv := world.global_transform.affine_inverse()
	var list := []
	for f in furniture:
		var n: Node3D = f.node
		if not is_instance_valid(n):
			continue
		var aabb: AABB = f.aabb
		var room := n.global_transform * Transform3D(Basis.IDENTITY, aabb.get_center())
		var xf := Transform3D(inv.basis * room.basis, inv * room.origin)
		xf.basis = xf.basis.orthonormalized()
		list.append({xf = xf, half = aabb.size * 0.5 / zoom})
	truck.boxes = list


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
	var dz := 0.0
	if xr_on:
		gas = right.get_float("trigger")
		brake = left.get_float("trigger")
		var v := left.get_vector2("primary")
		st = v.x if absf(v.x) > 0.06 else 0.0
		var v2 := right.get_vector2("primary")
		if absf(v2.x) > absf(st) and absf(v2.x) > absf(v2.y):
			st = v2.x
		if absf(v2.y) > 0.35 and absf(v2.y) > absf(v2.x):
			dz = v2.y
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
	b_home = b_home or Input.is_key_pressed(KEY_G)
	if Input.is_key_pressed(KEY_Q):
		dz = -1.0
	if Input.is_key_pressed(KEY_E):
		dz = 1.0
	if shot.has("drive"):
		gas = float(shot.get("gas", "1"))
		st = float(shot.get("steer", "0"))
		hand = shot.has("hand") and _shot_t > float(shot.get("hand", "0")) and _shot_t < float(shot.get("hand", "0")) + float(shot.get("hold", "9"))
	return {gas = gas, brake = brake, steer = st, hand = hand, horn = horn, dz = dz,
		awd = _pressed("awd", b_awd), tcs = _pressed("tcs", b_tcs), reset = _pressed("reset", b_reset), home = _pressed("home", b_home)}


# ---------------------------------------------------------------- frame
func _process(dt: float) -> void:
	var inp := _read_input()
	if inp.awd:
		truck.awd = not truck.awd
		_pulse(left, 0.5 if truck.awd else 0.25, 0.08)
	if inp.tcs:
		truck.tcs = not truck.tcs
		_pulse(left, 0.25 if truck.tcs else 0.5, 0.08)
	if inp.reset:
		truck.place(truck.p, truck.heading())
		_pulse(right, 0.4, 0.06)
	if inp.home:
		_bring_back()
	if place_t > 0.0:
		place_t -= dt
		if place_t <= 0.0:
			_bring_back()
	if inp.dz != 0.0:
		_resize(clampf(zoom * exp(inp.dz * 1.2 * dt), 1.0 / 40.0, 1.0 / 5.0))
	truck.hand = inp.hand
	_update_boxes()
	if not _shot_done:
		truck.update(dt, inp.gas, inp.brake, inp.steer)
	for e in truck.events:
		match e:
			"land":
				engine.land(truck.landed)
				_pulse(left, 0.3 + truck.landed * 0.7, 0.12)
				_pulse(right, 0.3 + truck.landed * 0.7, 0.12)
			"crash":
				engine.land(0.8)
				_pulse(left, 0.8, 0.15)
				_pulse(right, 0.8, 0.15)
	truck.events.clear()
	var slip := 0.0
	for i in 4:
		if truck.contact[i]:
			slip = maxf(slip, absf(truck.slip_y[i]) + absf(truck.slip_x[i]) * 0.6)
	if slip > 4.0 and not truck.air:
		_pulse(right, clampf(slip / 30.0, 0.05, 0.25), 0.03)
	engine.drive(truck.rpm, truck.throttle, truck.speed(), slip)
	engine.horn = inp.horn
	var braking: bool = (inp.brake > 0.1 and truck.gear > 0) or (inp.gas > 0.1 and truck.gear < 0) or inp.hand
	model.apply(truck, braking)
	fx.update(truck, dt)
	world.transform = Transform3D(Basis.from_scale(Vector3.ONE * zoom), anchor)
	if shot.has("shot"):
		_shot_tick(dt)


func _head() -> Transform3D:
	return xr_cam.global_transform if xr_on else cam.global_transform


## Put the truck on your floor a little in front of you, pointing away from you.
func _bring_back() -> void:
	var h := _head()
	var f := -h.basis.z
	f.y = 0.0
	f = f.normalized() if f.length() > 0.1 else Vector3.FORWARD
	var room := Vector3(h.origin.x, 0.0, h.origin.z) + f * 1.0
	var at := truck.p
	at.y = 0.0
	anchor = room - at * zoom
	anchor.y = 0.0
	truck.place(at, atan2(f.x, f.z))
	world.transform = Transform3D(Basis.from_scale(Vector3.ONE * zoom), anchor)


## Change the truck's size around where it stands.
func _resize(z: float) -> void:
	var at := Vector3(truck.p.x, 0.0, truck.p.z)
	var room := anchor + at * zoom
	zoom = z
	anchor = room - at * zoom
	anchor.y = 0.0


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
		print("SHOT ", shot["shot"], " speed ", int(truck.speed() * 3.6), " km/h, gear ", truck.gear, " drift ", int(truck.drift_deg()), " boxes ", truck.boxes.size())
		get_tree().quit()
