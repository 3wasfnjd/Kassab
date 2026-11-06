class_name Missions
extends Node3D
## The jobs of the desert: a chain of five missions that starts and ends at the camp, then
## repeats with new places. Story is carried by short radio lines from the camp, never menus.
##   1 فزعة   — a friend is bogged behind the dunes: reach him, hook the rope, tow him home
##   2 توصيل  — three jerry cans of water to a tent at the rawdah; every hard landing breaks one
##   3 طعوس   — six flags over the dunes against the clock (gold / silver / bronze)
##   4 تصوير  — find the big rock and take its picture (left X while stopped)
##   5 طيران  — one jump of 18 m or more
## Progress (experience and which mission is next) is saved on the headset.

signal said(text: String, sec: float)

const SAVE := "user://kassab.cfg"
const RANKS := [[0, "مبتدي"], [300, "فزّاع"], [800, "خبير طعوس"], [1600, "ذيب الصحراء"]]

var terrain: Terrain
var car: Car
var font: Font
var camp := Vector3.ZERO
var xp := 0
var idx := 0                  # which mission of the chain
var m := {}                   # the running mission
var wait := 3.0               # seconds before the next mission is offered
var rng := RandomNumberGenerator.new()

var beacon: MeshInstance3D
var arrow: Node3D
var arrow_lbl: Label3D
var hud: Label3D
var rope: MeshInstance3D
var tow_model: CarModel
var props := Node3D.new()     # the current mission's objects (flags, tent, rock)
var round_n := 0


func _init(t: Terrain, c: Car, f: Font, camp_at: Vector3) -> void:
	terrain = t
	car = c
	font = f
	camp = camp_at
	rng.seed = 7
	_load()


func _ready() -> void:
	add_child(props)
	_build_camp()
	beacon = _beacon()
	add_child(beacon)
	arrow = _arrow()
	add_child(arrow)
	arrow.top_level = true
	rope = MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(0.035, 0.035, 1.0)
	rope.mesh = bm
	rope.material_override = MeshKit.flat_material(Color(0.85, 0.55, 0.15))

	rope.visible = false
	add_child(rope)


## The mission line hangs under the view; it is created by main and handed over.
func attach_hud(head: Node3D) -> void:
	hud = Label3D.new()
	hud.font = font
	hud.font_size = 36
	hud.pixel_size = 0.0008
	hud.outline_size = 8
	hud.outline_modulate = Color(0.12, 0.07, 0.02, 0.85)
	hud.modulate = Color(1, 0.88, 0.6)
	hud.no_depth_test = true
	hud.render_priority = 11
	hud.position = Vector3(0, 0.27, -0.85)
	head.add_child(hud)


func rank() -> String:
	var r: String = RANKS[0][1]
	for e in RANKS:
		if xp >= e[0]:
			r = e[1]
	return r


# ---------------------------------------------------------------- every frame
## Table view: where the disc of desert sits in the room (main sets these every frame).
var table := {}   # {c: scene centre, r: radius, s: scale, view: world point at the centre}


func update(dt: float, photo: bool, in_cab: bool) -> void:
	if m.is_empty():
		wait -= dt
		_hud("")
		if wait <= 0.0:
			_start(idx % 5)
		_place_arrow(null, in_cab)
		beacon.visible = false
		return
	m.t += dt
	var target = null
	match m.kind:
		"rescue": target = _rescue(dt)
		"deliver": target = _deliver(dt)
		"flags": target = _flags(dt)
		"photo": target = _photo(dt, photo)
		"jump": target = _jump(dt)
	if m.is_empty():
		_place_arrow(null, in_cab)
		beacon.visible = false
		return
	beacon.visible = target != null
	if target != null:
		beacon.position = Vector3(target.x, terrain.height_at(target.x, target.z), target.z)
	_place_arrow(target, in_cab)


func on_landing(strength: float) -> void:
	if m.get("kind", "") == "deliver" and m.stage == 1 and strength > 0.55:
		m.cans -= 1
		if m.cans <= 0:
			_fail("انكسرت الجوالين كلها… نرجع نعبّي من المخيم")
		else:
			said.emit("انكسر جالون! باقي %d — على هونك في النزلات" % m.cans, 3.0)


# ---------------------------------------------------------------- missions
func _start(k: int) -> void:
	for c in props.get_children():
		c.queue_free()
	match k:
		0:
			var p := _find(220.0, 380.0, func(q: Vector3): return terrain.dune_mask(q.x, q.z) > 0.6)
			tow_model = CarModel.new(font)
			tow_model.tint(Color(1.0, 0.62, 0.5))
			props.add_child(tow_model)
			var hh := rng.randf() * TAU
			tow_model.transform = Transform3D(_ground_basis(p, hh), p - Vector3.UP * 0.35)
			m = {kind = "rescue", stage = 0, at = p, h = hh, hold = 0.0}
			said.emit("المخيم: «أبو فهد غرّز ورا الطعوس، الحقه بالحبل وجيبه» — اتبع السهم", 6.0)
		1:
			var p := _find(260.0, 420.0, func(q: Vector3): return terrain.dune_mask(q.x, q.z) < 0.15)
			props.add_child(_tent(p, 0.75))
			m = {kind = "deliver", stage = 0, at = p, cans = 3, hold = 0.0}
			said.emit("المخيم: «أهل بيت الشعر عند الروضة يبون ماي» — قف عند المخيم نحمّل الجوالين", 6.0)
		2:
			var gates := []
			var h := car.h
			var p := car.pos
			for i in 6:
				h += rng.randf_range(-0.55, 0.55)
				p += Vector3(sin(h), 0, cos(h)) * 70.0
				gates.append(p)
				props.add_child(_gate(p, h, i + 1))
			var length := 70.0 * 6.0
			m = {kind = "flags", stage = 0, gates = gates, i = 0, par = length / 17.0}
			said.emit("تحدي الطعوس: ست رايات — الوقت يبدأ الحين!", 4.0)
		3:
			var p := _find(300.0, 450.0, func(q: Vector3): return terrain.dune_mask(q.x, q.z) < 0.3)
			props.add_child(_big_rock(p))
			m = {kind = "photo", stage = 0, at = p}
			said.emit("المخيم: «يقولون فيه صخرة كبيرة غرب المخيم، صوّرها لنا» — وقف قريب منها واضغط X", 6.0)
		4:
			var p := _find(80.0, 200.0, func(q: Vector3): return terrain.dune_mask(q.x, q.z) > 0.8)
			m = {kind = "jump", stage = 0, at = p, best = 0.0, from = Vector3.ZERO, was_air = false}
			said.emit("تحدي الطيران: نطّة وحدة ١٨ متر أو أكثر من فوق طعس", 5.0)
	m.t = 0.0


func _done(points: int, text: String) -> void:
	xp += points
	idx += 1
	var r := rank()
	said.emit("%s  +%d خبرة — رتبتك: %s" % [text, points, r], 5.0)
	m = {}
	wait = 6.0
	rope.visible = false
	car.taut = false
	_save()


func _fail(text: String) -> void:
	said.emit(text, 4.5)
	m = {}
	wait = 4.0
	rope.visible = false
	car.taut = false


func _rescue(dt: float):
	var p: Vector3 = m.at
	if m.stage == 0:
		var d := Vector2(car.pos.x - p.x, car.pos.z - p.z).length()
		_hud("فزعة: الحق أبو فهد — %d م" % int(d))
		if d < 9.0 and car.speed() < 2.5:
			m.hold += dt
			_hud("فزعة: نربط الحبل…")
			if m.hold > 1.2:
				m.stage = 1
				car.taut = true
				said.emit("ربطنا الحبل! اسحبه للمخيم — الدبل يساعدك", 4.0)
		else:
			m.hold = 0.0
		return p
	# towing: the bogged car follows on a 7 m rope
	var tp: Vector3 = m.at
	var hitch := car.pos - car.fwd() * 2.2
	var dv := Vector3(tp.x - hitch.x, 0, tp.z - hitch.z)
	var L := dv.length()
	if L > 7.0:
		tp = Vector3(hitch.x, 0, hitch.z) + dv / L * 7.0
		m.h = atan2(-dv.x, -dv.z)
	tp.y = terrain.height_at(tp.x, tp.z)
	m.at = tp
	tow_model.transform = Transform3D(_ground_basis(tp, m.h), tp)
	car.taut = L > 6.8
	var front := tp + Vector3(sin(m.h), 0, cos(m.h)) * 2.2 + Vector3.UP * 0.6
	var back := hitch + Vector3.UP * 0.6
	rope.visible = true
	var L2 := front.distance_to(back)
	if L2 > 0.1:
		rope.transform = Transform3D(Basis.looking_at(back - front, Vector3.UP).scaled_local(Vector3(1, 1, L2)), (front + back) * 0.5)
	var dc := Vector2(car.pos.x - camp.x, car.pos.z - camp.z).length()
	_hud("فزعة: اسحبه للمخيم — %d م" % int(dc))
	if dc < 18.0:
		_done(150, "وصّلت أبو فهد سالم! «ما قصّرت يا ذيب»")
	return camp


func _deliver(dt: float):
	var dots := "●".repeat(m.cans) + "○".repeat(3 - m.cans)
	if m.stage == 0:
		var d := Vector2(car.pos.x - camp.x, car.pos.z - camp.z).length()
		_hud("توصيل: ارجع للمخيم نحمّل — %d م" % int(d))
		if d < 14.0 and car.speed() < 2.0:
			m.hold += dt
			if m.hold > 1.0:
				m.stage = 1
				said.emit("حمّلنا ثلاث جوالين ماي — انتبه للنطّات!", 4.0)
		return camp
	var p: Vector3 = m.at
	var d := Vector2(car.pos.x - p.x, car.pos.z - p.z).length()
	_hud("توصيل الماي %s — %d م" % [dots, int(d)])
	if d < 13.0 and car.speed() < 2.0:
		_done(60 * m.cans, "وصل الماي (%d من ٣)" % m.cans)
	return p


func _flags(_dt: float):
	var gates: Array = m.gates
	var g: Vector3 = gates[m.i]
	var d := Vector2(car.pos.x - g.x, car.pos.z - g.z).length()
	_hud("الراية %d من ٦ — %s" % [m.i + 1, _clock(m.t)])
	if d < 8.0:
		var flag := props.get_child(m.i) as Node3D
		if flag:
			flag.visible = false
		m.i += 1
		if m.i >= gates.size():
			var par: float = m.par
			var medal := "ذهبية" if m.t < par else ("فضية" if m.t < par * 1.25 else "برونزية")
			var pts := 200 if m.t < par else (130 if m.t < par * 1.25 else 70)
			_done(pts, "خلّصت الطعوس في %s — ميدالية %s" % [_clock(m.t), medal])
			return null
		said.emit("راية %d ✓" % m.i, 1.0)
	return gates[min(m.i, gates.size() - 1)]


func _photo(_dt: float, photo: bool):
	var p: Vector3 = m.at
	var d := Vector2(car.pos.x - p.x, car.pos.z - p.z).length()
	_hud("تصوير: الصخرة الكبيرة — %d م" % int(d))
	if d < 45.0:
		_hud("قريب! وقّف واضغط X للتصوير")
		if photo and car.speed() < 1.5:
			_done(100, "📷 صورة حلوة للصخرة الكبيرة")
			return null
	return p


func _jump(_dt: float):
	if car.air and not m.was_air:
		m.from = car.pos
	if not car.air and m.was_air and car.air_t >= 0.0:
		var dist := Vector2(car.pos.x - m.from.x, car.pos.z - m.from.z).length()
		if dist > 3.0:
			m.best = maxf(m.best, dist)
			if dist >= 18.0:
				m.was_air = false
				_done(120 + int(dist - 18.0) * 5, "طيران %d متر!" % int(dist))
				return null
			said.emit("نطّة %d م — تحتاج ١٨" % int(dist), 2.0)
	m.was_air = car.air
	_hud("تحدي الطيران: أفضل نطّة %d م من ١٨" % int(m.best))
	return m.at if terrain.dune_mask(car.pos.x, car.pos.z) < 0.5 else null


# ---------------------------------------------------------------- helpers
func _hud(t: String) -> void:
	if hud:
		hud.text = t


func _clock(t: float) -> String:
	return "%d:%02d" % [int(t) / 60, int(t) % 60]


func _find(r0: float, r1: float, ok: Callable) -> Vector3:
	for i in 200:
		var a := rng.randf() * TAU
		var r := rng.randf_range(r0, r1)
		var q := camp + Vector3(cos(a), 0, sin(a)) * r
		if ok.call(q):
			q.y = terrain.height_at(q.x, q.z)
			return q
	var q := camp + Vector3(r0, 0, 0)
	q.y = terrain.height_at(q.x, q.z)
	return q


func _ground_basis(p: Vector3, h: float) -> Basis:
	var n := terrain.normal_at(p.x, p.z)
	var f := Vector3(sin(h), 0, cos(h))
	var z := (f - n * f.dot(n)).normalized()
	return Basis(n.cross(z), n, z)


func _place_arrow(target, in_cab: bool) -> void:
	arrow.visible = target != null
	if target == null:
		return
	var d: Vector3 = target - car.pos
	var dist := Vector2(d.x, d.z).length()
	arrow_lbl.text = "%d م" % int(dist) if dist < 1000.0 else "%.1f كم" % (dist / 1000.0)
	if table.has("sky"):
		# seen from high up: a big arrow floats over the car, pointing the way
		var sc: float = clampf(0.12 / table.s, 6.0, 22.0)
		arrow.top_level = false
		var dir := Vector3(d.x, 0, d.z).normalized()
		arrow.transform = Transform3D(Basis(Vector3.UP, atan2(d.x, d.z)).scaled(Vector3.ONE * sc), car.pos + dir * (3.5 + sc * 0.35) + Vector3.UP * 2.5)
		return
	arrow.top_level = true
	var at := car.pos + Vector3.UP * 3.3
	if in_cab:
		at = car.pos + Basis.from_euler(Vector3(-car.pitch, car.h, car.roll), EULER_ORDER_YXZ) * Vector3(0.0, 1.62, 1.35)
	arrow.global_transform = Transform3D(Basis(Vector3.UP, atan2(d.x, d.z)), at)


func _arrow() -> Node3D:
	var n := Node3D.new()
	var k := MeshKit.new()
	var c := Color(1.0, 0.72, 0.2)
	k.prism([Vector2(0, 0.0), Vector2(0.13, -0.02), Vector2(0.0, 0.2), Vector2(-0.13, -0.02)], -0.012, 0.012, c, c, Basis(Vector3.RIGHT, PI / 2))
	var mi := MeshInstance3D.new()
	mi.mesh = k.commit(null, MeshKit.vc_material(0.6, 0.0, 0.6))
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	mi.rotation.x = -0.5   # tip raised toward the driver so it reads from the seat
	mi.scale = Vector3.ONE * 1.6
	n.add_child(mi)
	arrow_lbl = Label3D.new()
	arrow_lbl.font = font
	arrow_lbl.font_size = 40
	arrow_lbl.pixel_size = 0.0012
	arrow_lbl.outline_size = 8
	arrow_lbl.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	arrow_lbl.position = Vector3(0, 0.12, 0)
	arrow_lbl.modulate = Color(1, 0.92, 0.75)
	n.add_child(arrow_lbl)
	return n


func _beacon() -> MeshInstance3D:
	var cm := CylinderMesh.new()
	cm.top_radius = 0.9
	cm.bottom_radius = 1.6
	cm.height = 30.0
	cm.radial_segments = 12
	cm.cap_top = false
	cm.cap_bottom = false
	var mat := MeshKit.flat_material(Color(1.0, 0.65, 0.2, 0.35), true)
	var mi := MeshInstance3D.new()
	mi.mesh = cm
	mi.material_override = mat
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	mi.position.y = 15.0
	var holder := MeshInstance3D.new()   # the beam rises from the ground point
	holder.add_child(mi)
	holder.visible = false
	return holder


# ---------------------------------------------------------------- places
## A black goat-hair tent (بيت شعر), with a fire, rugs and a flagpole.
func _build_camp() -> void:
	var y := terrain.height_at(camp.x, camp.z)
	var c := Vector3(camp.x, y, camp.z)
	add_child(_tent(c, 1.0))
	var k := MeshKit.new()
	# fire ring and logs
	for i in 8:
		var a := i * TAU / 8.0
		k.box(Vector3(cos(a) * 0.7, 0.1, 6.0 + sin(a) * 0.7), Vector3(0.28, 0.2, 0.24), Color(0.45, 0.4, 0.36), 0.05, Basis(Vector3.UP, a))
	k.beam(Vector3(-0.35, 0.1, 5.8), Vector3(0.35, 0.18, 6.2), 0.12, 0.12, Color(0.3, 0.2, 0.12), 0.02)
	k.beam(Vector3(-0.3, 0.12, 6.25), Vector3(0.3, 0.1, 5.75), 0.12, 0.12, Color(0.3, 0.2, 0.12), 0.02)
	# dallah on the coals
	k.cyl(Vector3(0.9, 0.2, 6.6), Vector3.UP, 0.12, 0.07, 0.3, 8, Color(0.85, 0.7, 0.35), null, true, true)
	# flagpole
	k.cyl(Vector3(-5, 3.0, 2), Vector3.UP, 0.05, 0.04, 6.0, 6, Color(0.8, 0.8, 0.78))
	k.box(Vector3(-4.4, 5.5, 2), Vector3(1.2, 0.7, 0.03), Color(0.85, 0.3, 0.12), 0.0)
	var mi := MeshInstance3D.new()
	mi.mesh = k.commit(null, MeshKit.vc_material(0.85))
	mi.position = c
	add_child(mi)
	var fire := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = 0.32
	sm.height = 0.7
	fire.mesh = sm
	fire.material_override = MeshKit.flat_material(Color(1.0, 0.55, 0.15))
	fire.position = c + Vector3(0, 0.35, 6.0)
	add_child(fire)
	var lamp := OmniLight3D.new()
	lamp.light_color = Color(1.0, 0.6, 0.25)
	lamp.omni_range = 8.0
	lamp.light_energy = 1.2
	lamp.position = c + Vector3(0, 0.8, 6.0)
	add_child(lamp)


func _tent(c: Vector3, s: float) -> Node3D:
	var k := MeshKit.new()
	var black := Color(0.16, 0.14, 0.13)
	var black2 := Color(0.22, 0.19, 0.17)
	var w := 9.0 * s
	var d := 5.0 * s
	var hgt := 2.3 * s
	# roof: two pitched panels and a low back wall; the front is open
	k.quad(Vector3(-w / 2, hgt, 0), Vector3(w / 2, hgt, 0), Vector3(w / 2, hgt * 0.62, d / 2), Vector3(-w / 2, hgt * 0.62, d / 2), black, Vector3(0, 0, 0))
	k.quad(Vector3(-w / 2, hgt, 0), Vector3(w / 2, hgt, 0), Vector3(w / 2, hgt * 0.62, -d / 2), Vector3(-w / 2, hgt * 0.62, -d / 2), black2, Vector3(0, 0, 0))
	k.quad(Vector3(-w / 2, hgt * 0.62, -d / 2), Vector3(w / 2, hgt * 0.62, -d / 2), Vector3(w / 2, 0, -d / 2), Vector3(-w / 2, 0, -d / 2), black2, Vector3(0, 1, 0))
	# sadu stripe along the edge and poles
	k.box(Vector3(0, hgt * 0.6, d / 2), Vector3(w, 0.12, 0.03), Color(0.66, 0.12, 0.1))
	for x in [-w / 2 + 0.2, 0.0, w / 2 - 0.2]:
		k.cyl(Vector3(x, hgt * 0.5, 0), Vector3.UP, 0.05, 0.05, hgt, 6, Color(0.5, 0.36, 0.22))
		k.cyl(Vector3(x, hgt * 0.31, d / 2), Vector3.UP, 0.04, 0.04, hgt * 0.62, 6, Color(0.5, 0.36, 0.22))
	# rugs and cushions
	k.box(Vector3(0, 0.03, 0), Vector3(w * 0.85, 0.05, d * 0.8), Color(0.6, 0.15, 0.12), 0.0)
	for i in 4:
		k.box(Vector3(-w * 0.35 + i * w * 0.23, 0.2, -d * 0.35), Vector3(1.2 * s, 0.35, 0.4), Color(0.25, 0.3, 0.45) if i % 2 else Color(0.75, 0.55, 0.2), 0.08)
	var mi := MeshInstance3D.new()
	var mat := MeshKit.vc_material(0.95, 0.0, 0.0, true)
	mi.mesh = k.commit(null, mat)
	mi.position = c
	return mi


func _gate(p: Vector3, h: float, n: int) -> Node3D:
	var root := Node3D.new()
	var y := terrain.height_at(p.x, p.z)
	root.position = Vector3(p.x, y, p.z)
	root.rotation.y = h
	var k := MeshKit.new()
	for sx in [-5.0, 5.0]:
		var gy := terrain.height_at(p.x + cos(h) * sx, p.z - sin(h) * sx) - y
		k.cyl(Vector3(sx, gy + 2.2, 0), Vector3.UP, 0.06, 0.05, 4.4, 6, Color(0.9, 0.9, 0.88))
		k.prism([Vector2(0, 0), Vector2(1.3, -0.4), Vector2(0, -0.8)], -0.02, 0.02, Color(1.0, 0.45, 0.1), null, Basis(Vector3.UP, PI / 2 if sx > 0 else -PI / 2), Vector3(sx, gy + 4.3, 0))
	var mi := MeshInstance3D.new()
	mi.mesh = k.commit(null, MeshKit.vc_material(0.7, 0.0, 0.25))
	root.add_child(mi)
	var lbl := Label3D.new()
	lbl.font = font
	lbl.text = str(n)
	lbl.font_size = 96
	lbl.pixel_size = 0.012
	lbl.outline_size = 16
	lbl.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	lbl.position = Vector3(0, 5.5, 0)
	root.add_child(lbl)
	return root


## A wind-carved sandstone outcrop: a few big tilted blocks.
func _big_rock(p: Vector3) -> Node3D:
	var k := MeshKit.new()
	var r := RandomNumberGenerator.new()
	r.seed = int(p.x * 13.0 + p.z)
	var cols := [Color(0.62, 0.42, 0.3), Color(0.7, 0.5, 0.36), Color(0.55, 0.37, 0.27)]
	for i in 7:
		var sz := Vector3(r.randf_range(4, 9), r.randf_range(5, 14), r.randf_range(4, 9))
		var off := Vector3(r.randf_range(-6, 6), sz.y * 0.4, r.randf_range(-6, 6))
		k.box(off, sz, cols[i % 3], 1.2, Basis.from_euler(Vector3(r.randf_range(-0.15, 0.15), r.randf() * TAU, r.randf_range(-0.15, 0.15))), cols[(i + 1) % 3].lightened(0.1))
	var mi := MeshInstance3D.new()
	mi.mesh = k.commit(null, MeshKit.vc_material(0.95))
	mi.position = p - Vector3.UP * 1.0
	return mi


# ---------------------------------------------------------------- save
func _save() -> void:
	var cf := ConfigFile.new()
	cf.set_value("p", "xp", xp)
	cf.set_value("p", "idx", idx)
	cf.save(SAVE)


func _load() -> void:
	var cf := ConfigFile.new()
	if cf.load(SAVE) == OK:
		xp = cf.get_value("p", "xp", 0)
		idx = cf.get_value("p", "idx", 0)
