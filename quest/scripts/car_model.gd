class_name CarModel
extends Node3D
## «الربع»: an original boxy desert 4x4 built from code (no real brand): two-tone sand and
## cream paint, black flares and bumpers, round lamps, snorkel, roof rack with a jerry can and
## sand ladder, spare wheel on the back door. A full cabin inside (dashboard with a speedo,
## steering wheel, sadu-striped seats) because in VR you sit in it.
## Car space: +Z forward, +Y up, +X is the driver's (left) side, origin on the ground at the centre.

const WB := 2.72          # wheelbase
const TRACK := 1.62
const WR := 0.43          # wheel radius
const EYE := Vector3(0.42, 1.68, -0.32)

var wheels: Array[Node3D] = []      # [front-left, front-right, rear-left, rear-right]: pivots at the hubs
var spins: Array[Node3D] = []
var steering_wheel: Node3D
var speedo: Label3D
var fuel: Label3D
var lamps_mat: StandardMaterial3D
var tail_mat: StandardMaterial3D
var body_root: Node3D             # tilts with the suspension; wheels stay under it

# palette
const PAINT := Color(0.86, 0.74, 0.55)
const PAINT_D := Color(0.74, 0.62, 0.45)
const ROOF := Color(0.95, 0.93, 0.88)
const BLACK := Color(0.12, 0.115, 0.11)
const TRIM := Color(0.22, 0.21, 0.2)
const CHROME := Color(0.78, 0.78, 0.76)
const TYRE := Color(0.13, 0.125, 0.12)
const RIM := Color(0.93, 0.92, 0.88)
const DASH := Color(0.2, 0.18, 0.16)
const SEAT := Color(0.42, 0.18, 0.13)
const SADU_R := Color(0.66, 0.12, 0.1)
const SADU_W := Color(0.92, 0.88, 0.8)
const SADU_K := Color(0.1, 0.09, 0.08)


func _init(font: Font = null) -> void:
	body_root = Node3D.new()
	body_root.name = "Body"
	add_child(body_root)
	var mat := MeshKit.vc_material(0.62, 0.08)
	var mat_matte := MeshKit.vc_material(0.9)
	var k := MeshKit.new()
	var km := MeshKit.new()      # matte parts (plastics, tyres, fabric)
	_build_body(k, km)
	_build_interior(km, k)
	var mesh := k.commit(null, mat)
	km.commit(mesh, mat_matte)
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	body_root.add_child(mi)
	# glass: tinted, a little reflective
	var g := MeshKit.new()
	_build_glass(g)
	var gm := StandardMaterial3D.new()
	gm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	gm.albedo_color = Color(0.55, 0.68, 0.72, 0.28)
	gm.roughness = 0.05
	gm.metallic = 0.4
	gm.cull_mode = BaseMaterial3D.CULL_DISABLED
	gm.vertex_color_use_as_albedo = false
	var gi := MeshInstance3D.new()
	gi.mesh = g.commit(null, gm)
	gi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	body_root.add_child(gi)
	# lamps (emissive at night, bright when braking)
	lamps_mat = StandardMaterial3D.new()
	lamps_mat.albedo_color = Color(1, 0.97, 0.88)
	lamps_mat.emission_enabled = true
	lamps_mat.emission = Color(1, 0.93, 0.78)
	lamps_mat.emission_energy_multiplier = 0.4
	tail_mat = StandardMaterial3D.new()
	tail_mat.albedo_color = Color(0.7, 0.06, 0.05)
	tail_mat.emission_enabled = true
	tail_mat.emission = Color(1, 0.12, 0.08)
	tail_mat.emission_energy_multiplier = 0.3
	var lk := MeshKit.new()
	var tk := MeshKit.new()
	for s in [-1.0, 1.0]:
		lk.cyl(Vector3(s * 0.66, 1.0, 2.31), Vector3.FORWARD, 0.115, 0.115, 0.05, 14, Color.WHITE)
		tk.box(Vector3(s * 0.86, 1.02, -2.27), Vector3(0.12, 0.28, 0.05), Color.WHITE, 0.015)
	var lmi := MeshInstance3D.new()
	lmi.mesh = lk.commit(null, lamps_mat)
	body_root.add_child(lmi)
	var tmi := MeshInstance3D.new()
	tmi.mesh = tk.commit(null, tail_mat)
	body_root.add_child(tmi)
	_build_wheels()
	_build_steering(mat_matte)
	# speedo on the dash, in front of the driver (Arabic-Indic digits like a Gulf dash)
	speedo = Label3D.new()
	speedo.text = "0"
	speedo.font_size = 64
	speedo.pixel_size = 0.0011
	speedo.modulate = Color(1, 0.86, 0.55)
	speedo.outline_size = 0
	speedo.no_depth_test = false
	speedo.double_sided = false
	if font:
		speedo.font = font
	speedo.position = Vector3(0.42, 1.43, 0.47)
	speedo.rotation = Vector3(-0.35, PI, 0)
	body_root.add_child(speedo)
	fuel = Label3D.new()
	fuel.text = "2WD"
	fuel.font_size = 32
	fuel.pixel_size = 0.0011
	fuel.modulate = Color(0.6, 1, 0.65)
	if font:
		fuel.font = font
	fuel.position = Vector3(0.42, 1.385, 0.475)
	fuel.rotation = Vector3(-0.35, PI, 0)
	body_root.add_child(fuel)


func _build_body(k: MeshKit, km: MeshKit) -> void:
	# lower body: one tub from the front bumper line to the rear
	k.box(Vector3(0, 0.86, 0.02), Vector3(1.84, 0.6, 4.36), PAINT, 0.07)
	# a darker belt line strip along the sides
	for s in [-1.0, 1.0]:
		km.box(Vector3(s * 0.925, 0.82, 0.0), Vector3(0.03, 0.06, 4.2), TRIM, 0.01)
	# hood with a soft bulge
	k.box(Vector3(0, 1.19, 1.45), Vector3(1.76, 0.1, 1.5), PAINT, 0.04)
	k.box(Vector3(0, 1.255, 1.42), Vector3(0.9, 0.05, 1.2), PAINT_D, 0.02)
	# cowl under the windscreen
	km.box(Vector3(0, 1.27, 0.7), Vector3(1.78, 0.06, 0.12), TRIM, 0.02)
	# cabin sides up to the window line, door seams
	for s in [-1.0, 1.0]:
		k.box(Vector3(s * 0.89, 1.3, -0.62), Vector3(0.07, 0.28, 2.76), PAINT, 0.025)
		km.box(Vector3(s * 0.93, 1.05, -0.05), Vector3(0.012, 0.52, 0.012), TRIM)
		km.box(Vector3(s * 0.93, 1.05, -1.1), Vector3(0.012, 0.52, 0.012), TRIM)
		# door handles
		km.box(Vector3(s * 0.94, 1.2, -0.22), Vector3(0.025, 0.035, 0.16), CHROME, 0.008)
		km.box(Vector3(s * 0.94, 1.2, -1.27), Vector3(0.025, 0.035, 0.16), CHROME, 0.008)
	# back panel with the spare wheel door
	k.box(Vector3(0, 1.3, -2.0), Vector3(1.78, 0.28, 0.06), PAINT, 0.02)
	# pillars (A slanted with the windscreen, B, C, D)
	for s in [-1.0, 1.0]:
		k.beam(Vector3(s * 0.86, 1.42, 0.72), Vector3(s * 0.8, 1.93, 0.36), 0.08, 0.08, PAINT, 0.02)
		k.beam(Vector3(s * 0.88, 1.42, -0.42), Vector3(s * 0.82, 1.93, -0.42), 0.08, 0.09, PAINT, 0.02)
		k.beam(Vector3(s * 0.88, 1.42, -1.4), Vector3(s * 0.82, 1.93, -1.4), 0.08, 0.09, PAINT, 0.02)
		k.beam(Vector3(s * 0.88, 1.42, -1.98), Vector3(s * 0.82, 1.93, -1.96), 0.09, 0.1, PAINT, 0.02)
	k.beam(Vector3(-0.86, 1.43, 0.72), Vector3(0.86, 1.43, 0.72), 0.06, 0.06, PAINT, 0.015)
	k.beam(Vector3(-0.8, 1.93, -1.97), Vector3(0.8, 1.93, -1.97), 0.07, 0.07, PAINT, 0.015)
	k.beam(Vector3(-0.86, 1.43, -1.99), Vector3(0.86, 1.43, -1.99), 0.07, 0.07, PAINT, 0.015)
	# white roof, a little proud of the pillars
	k.box(Vector3(0, 1.97, -0.8), Vector3(1.74, 0.08, 2.42), ROOF, 0.035)
	# front: grille with slats, bumper, winch, fog lamps
	km.box(Vector3(0, 1.0, 2.215), Vector3(1.2, 0.34, 0.05), BLACK, 0.015)
	for i in 6:
		km.box(Vector3(0, 0.88 + i * 0.048, 2.245), Vector3(1.0, 0.018, 0.02), TRIM)
	for s in [-1.0, 1.0]:
		km.cyl(Vector3(s * 0.66, 1.0, 2.255), Vector3.FORWARD, 0.15, 0.15, 0.06, 16, CHROME)
		km.box(Vector3(s * 0.88, 1.0, 2.24), Vector3(0.1, 0.06, 0.03), Color(1, 0.6, 0.15), 0.01)
	km.box(Vector3(0, 0.58, 2.29), Vector3(1.96, 0.24, 0.22), BLACK, 0.05)
	km.box(Vector3(0, 0.6, 2.42), Vector3(0.46, 0.16, 0.12), TRIM, 0.02)
	for s in [-1.0, 1.0]:
		km.cyl(Vector3(s * 0.7, 0.58, 2.41), Vector3.FORWARD, 0.06, 0.06, 0.04, 10, Color(1, 0.95, 0.75))
	km.box(Vector3(0, 0.6, -2.27), Vector3(1.96, 0.22, 0.2), BLACK, 0.05)
	# fender flares over the wheels and side steps
	for s in [-1.0, 1.0]:
		for zf in [WB * 0.5 + 0.03, -WB * 0.5 + 0.03]:
			km.prism([Vector2(-0.62, 0.0), Vector2(-0.5, 0.22), Vector2(-0.24, 0.36), Vector2(0.24, 0.36), Vector2(0.5, 0.22), Vector2(0.62, 0.0)],
				0.0, 0.16, BLACK, null, Basis(Vector3(0, 0, 1), Vector3(0, 1, 0), Vector3(s, 0, 0)), Vector3(s * 0.83, 0.74, zf))
		km.box(Vector3(s * 0.96, 0.5, -0.07), Vector3(0.16, 0.05, 1.5), BLACK, 0.015)
	# mirrors on stalks
	for s in [-1.0, 1.0]:
		km.beam(Vector3(s * 0.9, 1.46, 0.6), Vector3(s * 1.07, 1.52, 0.6), 0.025, 0.025, BLACK)
		km.box(Vector3(s * 1.1, 1.55, 0.58), Vector3(0.05, 0.17, 0.24), BLACK, 0.02)
		km.box(Vector3(s * 1.075, 1.55, 0.58), Vector3(0.008, 0.14, 0.2), Color(0.55, 0.65, 0.7))
	# snorkel on the right A-pillar (the passenger side)
	km.cyl(Vector3(-0.95, 1.05, 0.78), Vector3.UP, 0.055, 0.055, 0.5, 10, BLACK)
	km.beam(Vector3(-0.95, 1.3, 0.78), Vector3(-0.9, 2.02, 0.42), 0.1, 0.1, BLACK, 0.03)
	km.box(Vector3(-0.9, 2.08, 0.46), Vector3(0.13, 0.12, 0.2), BLACK, 0.03)
	# roof rack: rails, cross bars, jerry can, sand ladders
	for s in [-1.0, 1.0]:
		km.beam(Vector3(s * 0.78, 2.1, 0.25), Vector3(s * 0.78, 2.1, -1.9), 0.04, 0.04, BLACK)
		for zz in [0.2, -0.85, -1.85]:
			km.beam(Vector3(s * 0.78, 2.02, zz), Vector3(s * 0.78, 2.1, zz), 0.03, 0.03, BLACK)
	for zz in [0.1, -0.6, -1.3, -1.85]:
		km.beam(Vector3(-0.78, 2.1, zz), Vector3(0.78, 2.1, zz), 0.035, 0.035, BLACK)
	k.box(Vector3(0.38, 2.29, -1.45), Vector3(0.22, 0.34, 0.46), Color(0.72, 0.16, 0.1), 0.03)
	km.box(Vector3(0.38, 2.47, -1.37), Vector3(0.05, 0.05, 0.08), BLACK)
	for s in [-1.0, 1.0]:
		km.box(Vector3(-0.3 + s * 0.17, 2.14, -0.35), Vector3(0.3, 0.04, 1.2), Color(0.95, 0.5, 0.1), 0.01)
	# spare wheel on the back door
	km.cyl(Vector3(-0.3, 1.18, -2.18), Vector3.BACK, 0.4, 0.4, 0.27, 16, TYRE)
	k.cyl(Vector3(-0.3, 1.18, -2.33), Vector3.BACK, 0.25, 0.22, 0.04, 12, PAINT)
	# rear lamps' black housings and a ladder
	for s in [-1.0, 1.0]:
		km.box(Vector3(s * 0.86, 1.02, -2.25), Vector3(0.16, 0.34, 0.04), BLACK, 0.01)
	# underbody shadow catcher
	km.box(Vector3(0, 0.5, 0), Vector3(1.5, 0.12, 3.9), BLACK)


func _build_interior(km: MeshKit, k: MeshKit) -> void:
	# floor and inner door cards
	km.box(Vector3(0, 0.98, -0.65), Vector3(1.7, 0.06, 2.5), Color(0.18, 0.16, 0.14))
	for s in [-1.0, 1.0]:
		km.box(Vector3(s * 0.84, 1.24, -0.62), Vector3(0.04, 0.3, 2.7), Color(0.55, 0.47, 0.38), 0.01)
		km.box(Vector3(s * 0.81, 1.36, -0.25), Vector3(0.06, 0.04, 0.5), DASH, 0.01)   # arm rest
	# dashboard: a long padded top and a lower panel, gauge pod in front of the driver
	km.box(Vector3(0, 1.36, 0.6), Vector3(1.7, 0.16, 0.36), DASH, 0.04)
	km.box(Vector3(0, 1.18, 0.52), Vector3(1.66, 0.22, 0.2), Color(0.28, 0.25, 0.22), 0.02)
	km.box(Vector3(0.42, 1.44, 0.5), Vector3(0.42, 0.12, 0.16), Color(0.08, 0.075, 0.07), 0.03)
	km.box(Vector3(-0.42, 1.25, 0.43), Vector3(0.4, 0.14, 0.04), Color(0.3, 0.27, 0.23), 0.01)   # glove box
	km.box(Vector3(0, 1.28, 0.44), Vector3(0.22, 0.22, 0.03), Color(0.1, 0.1, 0.1), 0.01)       # radio
	# centre console, gear and transfer levers
	km.box(Vector3(0, 1.08, 0.05), Vector3(0.24, 0.16, 0.6), DASH, 0.02)
	km.beam(Vector3(0.0, 1.14, 0.1), Vector3(0.02, 1.36, 0.06), 0.02, 0.02, Color(0.15, 0.15, 0.15))
	km.cyl(Vector3(0.02, 1.37, 0.06), Vector3.UP, 0.03, 0.03, 0.05, 8, Color(0.1, 0.1, 0.1))
	km.beam(Vector3(-0.07, 1.14, 0.0), Vector3(-0.08, 1.3, -0.02), 0.015, 0.015, Color(0.15, 0.15, 0.15))
	# front seats with sadu-striped covers, a rear bench
	for sx in [0.42, -0.42]:
		_seat(km, Vector3(sx, 1.0, -0.32))
	km.box(Vector3(0, 1.12, -1.45), Vector3(1.5, 0.16, 0.5), SEAT, 0.04)
	km.box(Vector3(0, 1.42, -1.72), Vector3(1.5, 0.5, 0.12), SEAT, 0.04)
	for i in 5:
		km.box(Vector3(0, 1.22 + i * 0.09, -1.665), Vector3(1.4, 0.03, 0.01), SADU_R if i % 2 == 0 else SADU_W)
	# headliner and a misbaha hanging from the mirror
	km.box(Vector3(0, 1.915, -0.8), Vector3(1.6, 0.02, 2.3), Color(0.82, 0.78, 0.7))
	km.box(Vector3(0, 1.87, 0.33), Vector3(0.24, 0.07, 0.03), BLACK, 0.01)
	km.beam(Vector3(0, 1.84, 0.33), Vector3(0, 1.66, 0.34), 0.008, 0.008, Color(0.4, 0.25, 0.1))
	for i in 7:
		var a := TAU * i / 7.0
		km.box(Vector3(0.04 * sin(a), 1.62 + 0.04 * cos(a), 0.34), Vector3(0.018, 0.018, 0.018), Color(0.3, 0.55, 0.45))
	# sun visors
	for sx in [0.42, -0.42]:
		km.box(Vector3(sx, 1.87, 0.25), Vector3(0.4, 0.02, 0.18), Color(0.75, 0.7, 0.6), 0.008)


func _seat(km: MeshKit, at: Vector3) -> void:
	km.box(at + Vector3(0, 0.12, 0.02), Vector3(0.52, 0.14, 0.52), SEAT, 0.05)
	km.box(at + Vector3(0, 0.48, -0.25), Vector3(0.52, 0.6, 0.12), SEAT, 0.05)
	km.box(at + Vector3(0, 0.86, -0.27), Vector3(0.3, 0.16, 0.1), SEAT, 0.04)
	# sadu bands: red, white, black, white, red
	var cols := [SADU_R, SADU_W, SADU_K, SADU_W, SADU_R]
	for i in cols.size():
		km.box(at + Vector3(0, 0.3 + i * 0.07, -0.188), Vector3(0.44, 0.035, 0.01), cols[i])
		km.box(at + Vector3(-0.16 + i * 0.08, 0.193, 0.02), Vector3(0.035, 0.01, 0.44), cols[i])


func _build_glass(g: MeshKit) -> void:
	# windscreen
	g.quad(Vector3(-0.82, 1.45, 0.71), Vector3(0.82, 1.45, 0.71), Vector3(0.77, 1.91, 0.38), Vector3(-0.77, 1.91, 0.38), Color.WHITE)
	# side windows: front door (its top follows the A-pillar), rear door, back quarter
	for s in [-1.0, 1.0]:
		for seg in [[0.68, 0.38, -0.38], [-0.46, -0.46, -1.36], [-1.44, -1.44, -1.94]]:
			g.quad(Vector3(s * 0.885, 1.44, seg[0]), Vector3(s * 0.885, 1.44, seg[2]), Vector3(s * 0.83, 1.92, seg[2]), Vector3(s * 0.83, 1.92, seg[1]), Color.WHITE)
	# rear glass
	g.quad(Vector3(-0.8, 1.44, -1.99), Vector3(0.8, 1.44, -1.99), Vector3(0.78, 1.92, -1.97), Vector3(-0.78, 1.92, -1.97), Color.WHITE)


func _build_wheels() -> void:
	var tm := MeshKit.vc_material(0.95)
	var rm := MeshKit.vc_material(0.45, 0.35)
	for i in 4:
		var front := i < 2
		var left := i % 2 == 0
		var pivot := Node3D.new()
		pivot.position = Vector3((TRACK * 0.5) * (1.0 if left else -1.0), WR, (WB * 0.5) * (1.0 if front else -1.0))
		add_child(pivot)
		var spin := Node3D.new()
		pivot.add_child(spin)
		var t := MeshKit.new()
		var r := MeshKit.new()
		var side := 1.0 if left else -1.0
		# tyre: a chunky drum with a rounded shoulder and tread blocks
		t.cyl(Vector3.ZERO, Vector3.RIGHT, WR - 0.03, WR - 0.03, 0.3, 18, TYRE, TYRE)
		t.cyl(Vector3(side * 0.16, 0, 0), Vector3.RIGHT, WR - 0.03, WR - 0.09, 0.03, 18, TYRE, null, false)
		t.cyl(Vector3(-side * 0.16, 0, 0), Vector3.RIGHT, WR - 0.09, WR - 0.03, 0.03, 18, TYRE, null, false)
		for b in 18:
			var a := TAU * (b + 0.5) / 18.0
			var d := Vector3(0, cos(a), sin(a))
			t.box(d * (WR - 0.015), Vector3(0.26, 0.03, 0.09), Color(0.16, 0.155, 0.15), 0.0, Basis(Vector3.RIGHT, a))
		# white steel rim with a hub and lug nuts, on the outer face
		r.cyl(Vector3(side * 0.13, 0, 0), Vector3.RIGHT, 0.26, 0.26, 0.05, 14, RIM)
		r.cyl(Vector3(side * 0.16, 0, 0), Vector3.RIGHT, 0.09, 0.07, 0.04, 10, Color(0.6, 0.6, 0.58))
		for b in 6:
			var a := TAU * b / 6.0
			r.cyl(Vector3(side * 0.165, cos(a) * 0.16, sin(a) * 0.16), Vector3.RIGHT, 0.018, 0.018, 0.03, 6, Color(0.55, 0.55, 0.52))
			r.box(Vector3(side * 0.158, cos(a + 0.52) * 0.19, sin(a + 0.52) * 0.19), Vector3(0.01, 0.05, 0.05), Color(0.8, 0.8, 0.76), 0.0, Basis(Vector3.RIGHT, a))
		var mi := MeshInstance3D.new()
		var mesh := t.commit(null, tm)
		r.commit(mesh, rm)
		mi.mesh = mesh
		spin.add_child(mi)
		wheels.append(pivot)
		spins.append(spin)


func _build_steering(mat: Material) -> void:
	steering_wheel = Node3D.new()
	steering_wheel.position = Vector3(0.42, 1.43, 0.3)
	steering_wheel.rotation.x = -0.42
	body_root.add_child(steering_wheel)
	var s := MeshKit.new()
	s.ring(Vector3.ZERO, Vector3.FORWARD, 0.19, 0.022, 20, 6, Color(0.1, 0.09, 0.085))
	s.beam(Vector3(-0.18, 0, 0), Vector3(0.18, 0, 0), 0.05, 0.02, Color(0.15, 0.14, 0.13))
	s.beam(Vector3(0, 0, 0), Vector3(0, -0.18, 0), 0.05, 0.02, Color(0.15, 0.14, 0.13))
	s.cyl(Vector3(0, 0, -0.01), Vector3.FORWARD, 0.06, 0.06, 0.04, 10, Color(0.2, 0.19, 0.18))
	s.cyl(Vector3(0, 0, 0.12), Vector3.FORWARD, 0.03, 0.03, 0.22, 8, Color(0.12, 0.12, 0.12), null, false)
	var mi := MeshInstance3D.new()
	mi.mesh = s.commit(null, mat)
	steering_wheel.add_child(mi)


func set_lamps(night: float, brake: bool) -> void:
	lamps_mat.emission_energy_multiplier = 0.25 + night * 3.0
	tail_mat.emission_energy_multiplier = 0.25 + night * 1.2 + (2.5 if brake else 0.0)
