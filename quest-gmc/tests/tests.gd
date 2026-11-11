extends Node
## Headless checks of the GMC model file and its driving (Hajwala's free-room physics, scaled to
## the GMC) — tools/run_tests.sh and CI.

var fails := 0
var lines: PackedStringArray = []
const DT := 1.0 / 90.0


func check(ok: bool, what: String) -> void:
	var l := ("PASS " if ok else "FAIL ") + what
	print(l)
	lines.append(l)
	if not ok:
		fails += 1


func info(what: String) -> void:
	print("INFO " + what)
	lines.append("INFO " + what)


func _ready() -> void:
	_test_model()
	_test_rest()
	_test_drive()
	_test_turning()
	_test_furniture()
	_test_stability()
	_test_timestep()
	var rep := ""
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--report="):
			rep = a.substr(9)
	var summary := "%d checks, %d failed" % [lines.size(), fails]
	print(summary)
	if rep != "":
		var f := FileAccess.open(rep, FileAccess.WRITE)
		f.store_string("\n".join(lines) + "\n" + summary + "\n")
	get_tree().quit(1 if fails > 0 else 0)


func _truck() -> Truck:
	return Truck.new(FloorGround.new(), Vector3.ZERO, 0.0)


func _run(tr: Truck, sec: float, gas: float, brake: float, st: float, dt := DT) -> void:
	for i in int(sec / dt):
		tr.update(dt, gas, brake, st)


func _test_model() -> void:
	var ps: PackedScene = load("res://models/gmc.glb")
	check(ps != null, "models/gmc.glb loads")
	if ps == null:
		return
	var s := ps.instantiate()
	var names := ["FL", "FR", "RL", "RR"]
	var ok := true
	var round_ok := true
	for i in 4:
		var n: MeshInstance3D = s.find_child(names[i], true, false)
		if n == null or n.position.distance_to(Truck.HUBS[i]) > 0.002:
			ok = false
			continue
		var bb := n.mesh.get_aabb()
		var c := bb.get_center()
		if absf(c.y) > 0.01 or absf(c.z) > 0.01 or absf(bb.size.y - bb.size.z) > 0.01 or absf(bb.size.y * 0.5 - Truck.R) > 0.01:
			round_ok = false
	check(ok, "wheel nodes in the GLB sit exactly at Truck.HUBS")
	check(round_ok, "each wheel is round, straight and centred on its hub (radius %.3f m)" % Truck.R)
	var tris := 0
	for mi in s.find_children("*", "MeshInstance3D", true, false):
		var m: Mesh = mi.mesh
		for si in m.get_surface_count():
			tris += m.surface_get_array_index_len(si) / 3
	check(tris > 200000 and tris < 300000, "model detail %d triangles (from 511k source)" % tris)
	s.free()
	var g := GmcModel.new()
	check(g.rig.find_child("BedCover", true, false) != null, "bed cover is on the body (leans with it)")
	check(g.well_lights.size() == 4, "four wheel-well LED strips")
	var plate: Texture2D = load("res://textures/plate_gmc.png")
	check(plate != null and plate.get_width() > plate.get_height() * 2, "Saudi plate texture (the Kassab web game's GMC plate)")
	g.free()


func _test_rest() -> void:
	var tr := _truck()
	_run(tr, 3.0, 0, 0, 0)
	check(tr.speed() < 0.01 and tr.p.length() < 0.01, "standing still stays still")


func _test_drive() -> void:
	var tr := _truck()
	var t60 := 0.0
	while tr.speed() < 60.0 / 3.6 and t60 < 10.0:
		tr.update(DT, 1.0, 0.0, 0.0)
		t60 += DT
	check(t60 > 0.3 and t60 < 4.0, "0-60 km/h in %.1f s (Hajwala's pull, scaled to the GMC)" % t60)
	_run(tr, 10.0, 1.0, 0.0, 0.0)
	var top := tr.speed() * 3.6
	check(top > 180.0 and top < 320.0, "top speed %d km/h (Hajwala's ×1.5, the owner asked for more)" % int(top))
	check(absf(rad_to_deg(tr.heading())) < 0.01 and absf(tr.p.x) < 0.01, "drives dead straight")
	var tt := 0.0
	while tr.speed() > 0.5 and tt < 10.0:
		tr.update(DT, 0.0, 1.0, 0.0)
		tt += DT
	check(tt < 3.5, "brakes to a stop in %.1f s" % tt)
	_run(tr, 2.0, 0.0, 1.0, 0.0)
	check(tr.v_long() < -2.0, "holding the brake when stopped reverses (%.1f m/s)" % tr.v_long())
	var t4 := _truck()
	t4.awd = true
	var t60b := 0.0
	while t4.speed() < 60.0 / 3.6 and t60b < 10.0:
		t4.update(DT, 1.0, 0.0, 0.0)
		t60b += DT
	check(t60b < t60, "4x4 pulls away harder (0-60 in %.1f s vs %.1f s)" % [t60b, t60])


func _test_turning() -> void:
	var tr := _truck()
	_run(tr, 3.0, 1.0, 0.0, 0.0)
	var peak := 0.0
	for i in 90:
		tr.update(DT, 1.0, 0.0, 1.0)
		peak = maxf(peak, tr.drift_deg())
	check(peak > 10.0, "full lock at speed: the truck slides (%.0f° between heading and travel)" % peak)
	check(tr.body_roll < -0.05, "the body leans out of a right turn (roll %.2f rad)" % tr.body_roll)
	var th := _truck()
	_run(th, 3.0, 1.0, 0.0, 0.0)
	th.hand = true
	var h0 := th.heading()
	var pk := 0.0
	for i in 60:
		th.update(DT, 0.0, 0.0, 1.0)
		pk = maxf(pk, th.drift_deg())
	check(pk > peak * 0.8 and absf(wrapf(th.heading() - h0, -PI, PI)) > deg_to_rad(90.0), "handbrake turn: snaps round %.0f° and slides %.0f°" % [rad_to_deg(absf(wrapf(th.heading() - h0, -PI, PI))), pk])
	check(th.slip_y[2] != 0.0, "sliding feeds the tyre smoke and skid marks")


func _test_furniture() -> void:
	var tr := _truck()
	var bx := {xf = Transform3D(Basis.IDENTITY, Vector3(0, 3.0, 40.0)), half = Vector3(8.0, 3.0, 2.0)}
	tr.boxes = [bx]
	var crashed := false
	var through := false
	for i in int(8.0 / DT):
		tr.update(DT, 1.0, 0.0, 0.0)
		if tr.events.has("crash"):
			crashed = true
		tr.events.clear()
		if tr.p.z > 38.0:
			through = true
	check(not through, "drives into furniture and stops at it (got to z=%.2f, face at 38)" % tr.p.z)
	check(crashed, "hitting furniture is a crash (sound + rumble)")


func _test_stability() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 42
	for dt in [1.0 / 72.0, 1.0 / 90.0, 1.0 / 120.0]:
		var tr := _truck()
		tr.boxes = [{xf = Transform3D(Basis(Vector3.UP, 0.4), Vector3(20, 2, 25)), half = Vector3(6, 2, 3)}]
		var ok := true
		var gas := 0.0
		var st := 0.0
		var br := 0.0
		for i in int(60.0 / dt):
			if i % 60 == 0:
				gas = rng.randf()
				st = rng.randf_range(-1, 1)
				br = 1.0 if rng.randf() < 0.1 else 0.0
				tr.hand = rng.randf() < 0.15
				tr.awd = rng.randf() < 0.5
			tr.update(dt, gas, br, st)
			if not (is_finite(tr.p.x) and is_finite(tr.p.z) and tr.speed() < 150.0):
				ok = false
				break
		check(ok, "60 s random driving (with furniture) at %d fps stays sane" % int(round(1.0 / dt)))


func _test_timestep() -> void:
	var a := _truck()
	var b := _truck()
	_run(a, 5.0, 0.8, 0.0, 0.3, 1.0 / 72.0)
	_run(b, 5.0, 0.8, 0.0, 0.3, 1.0 / 90.0)
	check(a.p.distance_to(b.p) < 1.0, "same drive at 72 and 90 fps ends %.2f m apart" % a.p.distance_to(b.p))
