extends Node
## Headless checks of the GMC driving model on the desert ground (tools/run_tests.sh and CI).
## Numbers are acceptance ranges for a lifted full-size pickup, not factory figures.

var fails := 0
var lines: PackedStringArray = []
var t: Terrain


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
	t = Terrain.new()
	_test_model()
	_test_rest()
	_test_accel_brake()
	_test_drift()
	_test_dunes()
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


## A flat, open gravel spot with a long flat run ahead; returns [point, heading].
func _flat() -> Array:
	for r in range(0, 4000, 30):
		for a in 16:
			var p := Vector3(cos(a * 0.39) * r, 0, sin(a * 0.39) * r)
			if t.dune_mask(p.x, p.z) > 0.01:
				continue
			for k in 16:
				var hd := k * TAU / 16.0
				var f := Vector3(sin(hd), 0, cos(hd))
				var ok := true
				var h0 := t.height_at(p.x, p.z)
				for s in 30:
					var q := p + f * (s * 8.0)
					if t.dune_mask(q.x, q.z) > 0.02 or absf(t.height_at(q.x, q.z) - h0) > 2.5 or t.normal_at(q.x, q.z).y < 0.996:
						ok = false
						break
					for tr in t.trees:
						if Vector2(q.x - tr.x, q.z - tr.y).length() < tr.z + 4.0:
							ok = false
				if ok:
					return [p, hd]
	return [Vector3.ZERO, 0.0]


func _run(tr: Truck, sec: float, gas: float, brake: float, st: float, dt := 1.0 / 90.0) -> void:
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
	var tris := 0
	for i in 4:
		var n: Node3D = s.find_child(names[i], true, false)
		if n == null or n.position.distance_to(Truck.HUBS[i]) > 0.002:
			ok = false
	for mi in s.find_children("*", "MeshInstance3D", true, false):
		var m: Mesh = mi.mesh
		for si in m.get_surface_count():
			tris += m.surface_get_array_index_len(si) / 3
	check(ok, "wheel nodes in the GLB sit exactly at Truck.HUBS")
	check(s.find_child("Body", true, false) != null, "body node present")
	check(tris > 200000 and tris < 300000, "model detail %d triangles (from 511k source)" % tris)
	s.free()


func _test_rest() -> void:
	var f := _flat()
	var tr := Truck.new(t, f[0], f[1])
	_run(tr, 4.0, 0, 0, 0)
	var all_on: bool = tr.contact[0] and tr.contact[1] and tr.contact[2] and tr.contact[3]
	check(all_on, "standing: all four tyres on the ground")
	check(tr.speed() < 0.05, "standing: settles (%.3f m/s)" % tr.speed())
	var e_max := 0.0
	for i in 4:
		e_max = maxf(e_max, absf(tr.ext[i]))
	check(e_max < 0.05, "standing: ride height as modelled (suspension off rest by %.3f m)" % e_max)
	var g := t.height_at(tr.p.x, tr.p.z)
	check(absf(tr.model_xf().origin.y - g) < 0.08, "standing: truck on the ground (%.3f m)" % (tr.model_xf().origin.y - g))
	var drift := tr.p
	_run(tr, 3.0, 0, 0, 0)
	check(drift.distance_to(tr.p) < 0.02, "standing: does not creep (%.3f m in 3 s)" % drift.distance_to(tr.p))


func _test_accel_brake() -> void:
	# straight-line times on an endless flat gravel plate
	for awd in [false, true]:
		var tp := Truck.new(load("res://tests/flat_terrain.gd").new(), Vector3.ZERO, 0.0)
		tp.awd = awd
		_run(tp, 1.0, 0, 0, 0)
		var t100 := 0.0
		while tp.speed() < 100.0 / 3.6 and t100 < 20.0:
			tp.update(1.0 / 90.0, 1.0, 0.0, 0.0)
			t100 += 1.0 / 90.0
		var lim := 7.5 if awd else 10.5
		check(t100 > 5.0 and t100 < lim, "0-100 km/h in %.1f s (%s, gravel, traction control on)" % [t100, "4x4" if awd else "rear-drive"])
	# braking and backing up on the real ground
	var f := _flat()
	var tr := Truck.new(t, f[0], f[1])
	_run(tr, 1.0, 0, 0, 0)
	var tt := 0.0
	var dt := 1.0 / 90.0
	while tr.speed() < 100.0 / 3.6 and tt < 20.0:
		tr.update(dt, 1.0, 0.0, 0.0)
		tt += dt
	var p0 := tr.p
	tt = 0.0
	while tr.speed() > 0.3 and tt < 15.0:
		tr.update(dt, 0.0, 1.0, 0.0)
		tt += dt
	var d := p0.distance_to(tr.p)
	check(d > 33.0 and d < 65.0, "100-0 km/h braking distance %.1f m (ABS, gravel)" % d)
	# keeps straight under full braking
	check(absf(rad_to_deg(wrapf(tr.heading() - f[1], -PI, PI))) < 15.0, "brakes without spinning on rolling ground (heading change %.1f°, cross-slopes)" % rad_to_deg(wrapf(tr.heading() - f[1], -PI, PI)))
	var tb := Truck.new(load("res://tests/flat_terrain.gd").new(), Vector3.ZERO, 0.0)
	for i in 2000:
		if tb.speed() > 100.0 / 3.6: break
		tb.update(dt, 1.0, 0.0, 0.0)
	var hb := tb.heading()
	var pb := tb.p
	_run(tb, 6.0, 0.0, 1.0, 0.0)
	check(absf(rad_to_deg(wrapf(tb.heading() - hb, -PI, PI))) < 1.0, "brakes dead straight on a flat plate (%.2f°)" % rad_to_deg(wrapf(tb.heading() - hb, -PI, PI)))
	info("100-0 on the flat plate: %.1f m" % pb.distance_to(tb.p))
	# reverse
	_run(tr, 2.5, 0.0, 1.0, 0.0)
	check(tr.gear == -1 and tr.v_long() < -1.5, "left trigger held when stopped backs up (%.1f m/s)" % tr.v_long())
	# top speed (on an endless flat plate)
	var tr2 := Truck.new(load("res://tests/flat_terrain.gd").new(), Vector3.ZERO, 0.0)
	_run(tr2, 22.0, 1.0, 0.0, 0.0)
	check(tr2.speed() * 3.6 > 150.0 and tr2.speed() * 3.6 < 182.0, "flat out for 22 s on a flat plate: %d km/h, gear %d (governed at 180)" % [int(tr2.speed() * 3.6), tr2.gear])


func _test_drift() -> void:
	var f := _flat()
	var dt := 1.0 / 90.0
	# steady cornering at 50 km/h: grips (small slide)
	var tr := Truck.new(t, f[0], f[1])
	for i in 2000:
		if tr.speed() > 50.0 / 3.6: break
		tr.update(dt, 1.0, 0.0, 0.0)
	var max_slide := 0.0
	for i in 90:
		tr.update(dt, 0.25, 0.0, 0.35)
		max_slide = maxf(max_slide, tr.drift_deg())
	check(max_slide < 8.0, "gentle turn at 50 km/h grips (slide %.1f°)" % max_slide)
	# handbrake turn at 60 km/h: the tail comes round
	tr = Truck.new(t, f[0], f[1])
	for i in 2000:
		if tr.speed() > 60.0 / 3.6: break
		tr.update(dt, 1.0, 0.0, 0.0)
	var h0 := tr.heading()
	tr.hand = true
	var peak := 0.0
	for i in 110:
		tr.update(dt, 0.0, 0.0, 1.0)
		peak = maxf(peak, tr.drift_deg())
	tr.hand = false
	var turned := absf(rad_to_deg(wrapf(tr.heading() - h0, -PI, PI)))
	check(peak > 20.0, "handbrake + full lock at 60 km/h: slides %.0f°" % peak)
	check(turned > 60.0, "handbrake turn swings the truck %.0f°" % turned)
	# power slide with traction control off (drift mode): rear-drive, full throttle and lock
	tr = Truck.new(t, f[0], f[1])
	tr.tcs = false
	for i in 2000:
		if tr.speed() > 35.0 / 3.6: break
		tr.update(dt, 1.0, 0.0, 0.0)
	var pk := 0.0
	for i in 180:
		tr.update(dt, 1.0, 0.0, -1.0)
		pk = maxf(pk, tr.drift_deg())
	info("power-on full lock from 35 km/h (rear-drive, gravel): slide %.0f°" % pk)
	check(is_finite(tr.p.x) and tr.p.y > t.height_at(tr.p.x, tr.p.z), "power slide stays on its wheels / finite")


func _test_dunes() -> void:
	# head into the dune field flat out in 4x4 and count air time; nothing explodes
	var dt := 1.0 / 90.0
	var start := Vector3.ZERO
	for r in range(0, 3000, 40):
		var q := Vector3(r, 0, r * 0.3)
		if t.dune_mask(q.x, q.z) > 0.9:
			start = q
			break
	var tr := Truck.new(t, start, 0.42 + PI * 0.5)   # across the ridges
	tr.awd = true
	var air_max := 0.0
	var hmax := -1e9
	var hmin := 1e9
	var landings := 0
	for i in int(40.0 / dt):
		tr.update(dt, 1.0, 0.0, sin(i * 0.004) * 0.3)
		air_max = maxf(air_max, tr.air_t)
		hmax = maxf(hmax, tr.p.y)
		hmin = minf(hmin, tr.p.y)
		landings += tr.events.count("land")
		tr.events.clear()
	var up := tr.b.y.y
	info("40 s in the dunes (4x4): %d m travelled height range, longest air %.2f s, %d landings, %d km/h, upright %.2f" % [int(hmax - hmin), air_max, landings, int(tr.speed() * 3.6), up])
	check(is_finite(tr.p.x) and is_finite(tr.v.length()) and tr.v.length() < 80.0, "dunes: state finite and sane")
	check(tr.p.y - t.height_at(tr.p.x, tr.p.z) > -0.3, "dunes: never sinks through the sand")
	check(hmax - hmin > 6.0, "dunes: climbs the dunes (height range %.1f m)" % (hmax - hmin))


func _test_stability() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 42
	for dt in [1.0 / 72.0, 1.0 / 90.0, 1.0 / 120.0]:
		var tr := Truck.new(t, Vector3(300, 0, -200), 1.0)
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
				if tr.b.y.y < 0.3:
					tr.place(tr.p, tr.heading())
			tr.update(dt, gas, br, st)
			steps += 1
			if not (is_finite(tr.p.x) and is_finite(tr.p.y) and is_finite(tr.v.x) and tr.v.length() < 90.0):
				ok = false
				break
			if tr.p.y < t.height_at(tr.p.x, tr.p.z) - 0.5:
				ok = false
				break
		var us := float(Time.get_ticks_usec() - t0) / steps
		check(ok, "60 s random driving at %d fps: stays finite and above the sand" % int(round(1.0 / dt)))
		info("cost %.0f µs per frame at %d fps (desktop, headless)" % [us, int(round(1.0 / dt))])


func _test_timestep() -> void:
	var f := _flat()
	var a := Truck.new(t, f[0], f[1])
	var b := Truck.new(t, f[0], f[1])
	_run(a, 6.0, 0.8, 0.0, 0.3, 1.0 / 72.0)
	_run(b, 6.0, 0.8, 0.0, 0.3, 1.0 / 90.0)
	check(a.p.distance_to(b.p) < 0.6, "same drive at 72 and 90 fps ends %.2f m apart" % a.p.distance_to(b.p))
