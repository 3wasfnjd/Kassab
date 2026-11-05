extends Node
## Headless checks of the ground and the car physics (run by tools/run_tests.sh and CI).

var fails := 0
var lines: PackedStringArray = []


func check(ok: bool, what: String) -> void:
	var l := ("PASS " if ok else "FAIL ") + what
	print(l)
	lines.append(l)
	if not ok:
		fails += 1


func _ready() -> void:
	var t := Terrain.new()
	# the ground is finite, smooth and has both dunes and plains
	var lo := 1e9
	var hi := -1e9
	var dunes := 0
	var plains := 0
	for i in 400:
		var x := (i % 20) * 37.0 - 370.0
		var z := (i / 20) * 41.0 - 410.0
		var hh := t.height_at(x, z)
		lo = minf(lo, hh)
		hi = maxf(hi, hh)
		if t.dune_mask(x, z) > 0.8: dunes += 1
		if t.dune_mask(x, z) < 0.05: plains += 1
	check(is_finite(lo) and is_finite(hi) and hi - lo > 8.0 and hi < 40.0, "terrain height range %.1f..%.1f" % [lo, hi])
	check(dunes > 20 and plains > 20, "dunes %d and gravel plains %d both present" % [dunes, plains])
	var p := _find(t, false)
	var car := Car.new(t, p, 0.0)
	car.h = _flat_dir(t, p)
	for i in 72 * 6:
		car.update(1.0 / 72.0, 1.0, 0.0, 0.0)
	check(car.speed() > 18.0, "accelerates on the gravel plain: %.1f m/s after 6 s" % car.speed())
	var vmin := 99.0
	for i in 72 * 3:
		car.update(1.0 / 72.0, 0.0, 1.0, 0.0)
		vmin = minf(vmin, car.speed())
	check(vmin < 0.7, "brakes to a stop (then reverses): min %.2f m/s" % vmin)
	check(car.vF < -2.0, "keeps the brake and it reverses: %.1f m/s" % car.vF)
	# steering right turns right (heading towards -X side)
	car.place(p, car.h)
	for i in 72 * 2:
		car.update(1.0 / 72.0, 1.0, 0.0, 0.0)
	var h0 := car.h
	for i in 72 * 2:
		car.update(1.0 / 72.0, 0.6, 0.0, 1.0)
	var turned := wrapf(car.h - h0, -PI, PI)
	check(turned < -0.2, "steer right turns right: %.2f rad" % turned)
	# soft sand, 2WD, crawling: bogs down; 4x4 frees it
	var q := _find(t, true)
	var c2 := Car.new(t, q, 0.0)
	for i in 72 * 8:
		c2.update(1.0 / 72.0, 0.35 if i % 72 < 40 else 0.0, 0.0, 0.0)
	check(c2.sink > 0.6, "bogs down on soft sand in 2WD: sink %.2f" % c2.sink)
	c2.awd = true
	for i in 72 * 6:
		c2.update(1.0 / 72.0, 1.0, 0.0, 0.0)
	check(c2.sink < 0.3, "4x4 digs it out: sink %.2f" % c2.sink)
	# fast over a dune crest: it leaves the ground
	var c3 := Car.new(t, _find(t, false), 0.0)
	var flew := false
	var crest := _crest(t)
	var across := atan2(t.ridge_dir.x, t.ridge_dir.y)
	c3.place(crest - Vector3(sin(across), 0, cos(across)) * 40.0, across)   # up the gentle windward side
	c3.vel = c3.fwd() * 30.0
	c3.awd = true
	var mvy := 0.0
	for i in 72 * 4:
		c3.update(1.0 / 72.0, 1.0, 0.0, 0.0)
		mvy = maxf(mvy, c3.vy)
		if c3.air and c3.air_t > 0.2:
			flew = true
			break
	check(flew, "jumps off a dune crest at speed (%.1f m/s near the crest)" % c3.speed())
	# never falls through the ground
	var under := false
	for i in 72 * 20:
		c3.update(1.0 / 72.0, 1.0, 0.0, sin(i * 0.01))
		if c3.pos.y < t.height_at(c3.pos.x, c3.pos.z) - 0.05:
			under = true
	check(not under, "stays on or above the ground for 20 s")
	print("TOTAL ", "OK" if fails == 0 else "%d FAILED" % fails)
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--report="):
			var f := FileAccess.open(a.substr(9), FileAccess.WRITE)
			f.store_string("\n".join(lines) + "\n")
	get_tree().quit(1 if fails else 0)


func _find(t: Terrain, soft: bool, off := 0.0) -> Vector3:
	for r in range(0, 4000, 23):
		for a in 16:
			var x := cos(a * 0.39) * r + off
			var z := sin(a * 0.39) * r - off * 0.5
			if soft and t.soft_at(x, z) > 0.7 and t.normal_at(x, z).y > 0.97:
				return Vector3(x, 0, z)
			if not soft and t.dune_mask(x, z) < 0.01:
				var ok := true
				for k in 8:
					var a2 := k * TAU / 8.0
					if t.dune_mask(x + sin(a2) * 90.0, z + cos(a2) * 90.0) > 0.05:
						ok = false
				if ok or off > 0.0:
					return Vector3(x, 0, z)
	return Vector3.ZERO


func _crest(t: Terrain) -> Vector3:
	var best := Vector3.ZERO
	var bh := -1e9
	for i in 2000:
		var x := (i % 50) * 9.0 - 225.0
		var z := (i / 50) * 9.0 - 180.0
		var hh := t.height_at(x, z)
		if hh > bh and t.dune_mask(x, z) > 0.9:
			bh = hh
			best = Vector3(x, 0, z)
	return best


func _flat_dir(t: Terrain, p: Vector3) -> float:
	var best := 0.0
	var bm := 1e9
	for b in 16:
		var a := b * TAU / 16.0
		var m := t.dune_mask(p.x + sin(a) * 120.0, p.z + cos(a) * 120.0)
		if m < bm:
			bm = m
			best = a
	return best


func _toward_dunes(t: Terrain, p: Vector3) -> float:
	var best := 0.0
	var bm := -1.0
	for b in 16:
		var a := b * TAU / 16.0
		var m := t.dune_mask(p.x + sin(a) * 80.0, p.z + cos(a) * 80.0)
		if m > bm:
			bm = m
			best = a
	return best
