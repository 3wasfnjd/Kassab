extends Node
## Headless checks of the GMC model file and its driving model on the room floor
## (tools/run_tests.sh and CI). Numbers are acceptance ranges for a lifted full-size pickup on a
## grippy floor, not factory figures.

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
	_test_accel_brake()
	_test_drift()
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


func _to_speed(tr: Truck, kmh: float) -> void:
	for i in 3000:
		if tr.speed() * 3.6 >= kmh:
			return
		tr.update(DT, 1.0, 0.0, 0.0)


func _test_model() -> void:
	var ps: PackedScene = load("res://models/gmc.glb")
	check(ps != null, "models/gmc.glb loads")
	if ps == null:
		return
	var s := ps.instantiate()
	var names := ["FL", "FR", "RL", "RR"]
	var ok := true
	var tris := 0
	for i in 4:
		var n: Node3D = s.find_child(names[i], true, false)
		if n == null or n.position.distance_to(Truck.HUBS[i]) > 0.002:
			ok = false
	check(ok, "wheel nodes in the GLB sit exactly at Truck.HUBS")
	# wheels are straight and round: each wheel mesh is symmetric about its hub (no steered or
	# torn source tyre left): its bounds are centred on the hub and as tall as they are long
	var round_ok := true
	for i in 4:
		var mi: MeshInstance3D = s.find_child(names[i], true, false)
		var bb := mi.mesh.get_aabb()
		var c := bb.get_center()
		if absf(c.y) > 0.01 or absf(c.z) > 0.01 or absf(bb.size.y - bb.size.z) > 0.01 or absf(bb.size.y * 0.5 - Truck.R) > 0.01:
			round_ok = false
	check(round_ok, "each wheel is round, straight and centred on its hub (radius %.3f m)" % Truck.R)
	for mi in s.find_children("*", "MeshInstance3D", true, false):
		var m: Mesh = mi.mesh
		for si in m.get_surface_count():
			tris += m.surface_get_array_index_len(si) / 3
	check(s.find_child("Body", true, false) != null, "body node present")
	check(tris > 200000 and tris < 300000, "model detail %d triangles (from 511k source)" % tris)
	s.free()


func _test_rest() -> void:
	var tr := _truck()
	_run(tr, 4.0, 0, 0, 0)
	var all_on: bool = tr.contact[0] and tr.contact[1] and tr.contact[2] and tr.contact[3]
	check(all_on, "standing: all four tyres on the floor")
	check(tr.speed() < 0.02, "standing: settles (%.3f m/s)" % tr.speed())
	var e_max := 0.0
	for i in 4:
		e_max = maxf(e_max, absf(tr.ext[i]))
	check(e_max < 0.03, "standing: ride height as modelled (suspension off rest by %.3f m)" % e_max)
	check(absf(tr.model_xf().origin.y) < 0.03, "standing: tyres on the floor, not in it (%.3f m)" % tr.model_xf().origin.y)
	var p0 := tr.p
	_run(tr, 3.0, 0, 0, 0)
	check(p0.distance_to(tr.p) < 0.01, "standing: does not creep (%.3f m in 3 s)" % p0.distance_to(tr.p))


func _test_accel_brake() -> void:
	for awd in [false, true]:
		var tp := _truck()
		tp.awd = awd
		_run(tp, 1.0, 0, 0, 0)
		var t100 := 0.0
		while tp.speed() < 100.0 / 3.6 and t100 < 20.0:
			tp.update(DT, 1.0, 0.0, 0.0)
			t100 += DT
		var lim := 7.5 if awd else 10.5
		check(t100 > 5.0 and t100 < lim, "0-100 km/h in %.1f s (%s, traction control on)" % [t100, "4x4" if awd else "rear-drive"])
	var tr := _truck()
	_to_speed(tr, 100.0)
	var h0 := tr.heading()
	var p0 := tr.p
	var tt := 0.0
	while tr.speed() > 0.3 and tt < 15.0:
		tr.update(DT, 0.0, 1.0, 0.0)
		tt += DT
	var d := p0.distance_to(tr.p)
	check(d > 33.0 and d < 65.0, "100-0 km/h braking distance %.1f m (ABS)" % d)
	check(absf(rad_to_deg(wrapf(tr.heading() - h0, -PI, PI))) < 1.0, "brakes dead straight (%.2f°)" % rad_to_deg(wrapf(tr.heading() - h0, -PI, PI)))
	_run(tr, 2.5, 0.0, 1.0, 0.0)
	check(tr.gear == -1 and tr.v_long() < -1.5, "left trigger held when stopped backs up (%.1f m/s)" % tr.v_long())
	var t2 := _truck()
	_run(t2, 22.0, 1.0, 0.0, 0.0)
	check(t2.speed() * 3.6 > 150.0 and t2.speed() * 3.6 < 182.0, "flat out for 22 s: %d km/h, gear %d (governed at 180)" % [int(t2.speed() * 3.6), t2.gear])


func _test_drift() -> void:
	var tr := _truck()
	_to_speed(tr, 50.0)
	var max_slide := 0.0
	for i in 90:
		tr.update(DT, 0.25, 0.0, 0.35)
		max_slide = maxf(max_slide, tr.drift_deg())
	check(max_slide < 8.0, "gentle turn at 50 km/h grips (slide %.1f°)" % max_slide)
	tr = _truck()
	_to_speed(tr, 60.0)
	var h0 := tr.heading()
	tr.hand = true
	var peak := 0.0
	for i in 110:
		tr.update(DT, 0.0, 0.0, 1.0)
		peak = maxf(peak, tr.drift_deg())
	tr.hand = false
	var turned := absf(rad_to_deg(wrapf(tr.heading() - h0, -PI, PI)))
	check(peak > 20.0, "handbrake + full lock at 60 km/h: slides %.0f°" % peak)
	check(turned > 60.0, "handbrake turn swings the truck %.0f°" % turned)
	# drift mode: traction control off, power on with full lock
	tr = _truck()
	tr.tcs = false
	_to_speed(tr, 35.0)
	var pk := 0.0
	for i in 180:
		tr.update(DT, 1.0, 0.0, -1.0)
		pk = maxf(pk, tr.drift_deg())
	check(pk > 15.0, "drift mode: power-on full lock from 35 km/h breaks the tail loose (%.0f°)" % pk)
	check(tr.b.y.y > 0.8, "drift mode: stays on its wheels")


## A sofa-sized box (in room metres it is whatever the scale makes it): driving into it stops the
## truck at its face; a glancing hit turns it; nothing passes through.
func _test_furniture() -> void:
	var tr := _truck()
	var bx := {xf = Transform3D(Basis.IDENTITY, Vector3(0, 3.0, 30.0)), half = Vector3(8.0, 3.0, 2.0)}
	tr.boxes = [bx]
	var crashed := false
	for i in int(6.0 / DT):
		tr.update(DT, 1.0, 0.0, 0.0)
		if tr.events.has("crash"):
			crashed = true
		tr.events.clear()
	var front: float = tr.p.z + (2.58 - Truck.COM.z)
	check(front < 28.0 + 0.15, "drives into furniture and stops at its face (nose at %.2f, face at 28.00)" % front)
	check(crashed, "hitting furniture is a crash event (sound + rumble)")
	# glancing: aim at the box's corner
	var t2 := _truck()
	t2.place(Vector3(7.5, 0, 0), 0.0)
	t2.boxes = [bx]
	_run(t2, 6.0, 0.8, 0.0, 0.0)
	var inside := false
	var ix: Transform3D = bx.xf.affine_inverse()
	for q in Truck.HIT_PTS:
		var lp: Vector3 = (ix * (t2.p + t2.b * (q - Truck.COM))).abs()
		if lp.x < bx.half.x - 0.05 and lp.y < bx.half.y - 0.05 and lp.z < bx.half.z - 0.05:
			inside = true
	check(not inside, "glancing hit: no part of the truck ends up inside the furniture")
	check(is_finite(t2.p.x) and t2.b.y.y > 0.7, "glancing hit: truck stays sane and upright")


func _test_stability() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 42
	for dt in [1.0 / 72.0, 1.0 / 90.0, 1.0 / 120.0]:
		var tr := _truck()
		tr.boxes = [{xf = Transform3D(Basis(Vector3.UP, 0.4), Vector3(20, 2, 25)), half = Vector3(6, 2, 3)},
				{xf = Transform3D(Basis.IDENTITY, Vector3(-30, 3, -10)), half = Vector3(4, 3, 9)}]
		var ok := true
		var gas := 0.0
		var st := 0.0
		var br := 0.0
		var t0 := Time.get_ticks_usec()
		var steps := 0
		for i in int(60.0 / dt):
			if i % 60 == 0:
				gas = rng.randf()
				st = rng.randf_range(-1, 1)
				br = 1.0 if rng.randf() < 0.1 else 0.0
				tr.hand = rng.randf() < 0.15
				tr.awd = rng.randf() < 0.5
				tr.tcs = rng.randf() < 0.5
				if tr.b.y.y < 0.3:
					tr.place(tr.p, tr.heading())
			tr.update(dt, gas, br, st)
			steps += 1
			if not (is_finite(tr.p.x) and is_finite(tr.p.y) and is_finite(tr.v.x) and tr.v.length() < 90.0):
				ok = false
				break
			if tr.p.y < -0.3:
				ok = false
				break
		var us := float(Time.get_ticks_usec() - t0) / steps
		check(ok, "60 s random driving (with furniture) at %d fps: stays finite and above the floor" % int(round(1.0 / dt)))
		info("cost %.0f µs per frame at %d fps (desktop, headless)" % [us, int(round(1.0 / dt))])


func _test_timestep() -> void:
	var a := _truck()
	var b := _truck()
	_run(a, 6.0, 0.8, 0.0, 0.3, 1.0 / 72.0)
	_run(b, 6.0, 0.8, 0.0, 0.3, 1.0 / 90.0)
	check(a.p.distance_to(b.p) < 0.6, "same drive at 72 and 90 fps ends %.2f m apart" % a.p.distance_to(b.p))
