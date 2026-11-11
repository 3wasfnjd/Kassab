class_name Truck
extends RefCounted
## The GMC's driving model. A rigid body (all six degrees of freedom) on a ground object
## (height_at / normal_at / soft_at: FloorGround: your room floor; soft_at > 0 would be loose sand), four spring-damper wheels with anti-roll
## bars, tyres whose grip follows Pacejka-shaped slip curves inside a friction circle, a V8 with a
## torque converter and a 6-speed automatic, open differentials, rear-drive or 4x4, ABS brakes and
## a handbrake that locks the rear wheels (drift).
##
## Stability: every tyre force is capped by the force that would cancel that tyre's slip within one
## step, so the model never oscillates, whatever the frame rate. Fixed 180 Hz steps (2 per frame at
## 90 Hz) — the same on the headset and in the headless tests.
## Units: metres, kilograms, seconds, newtons, radians.
##
## Model space (the GLB): origin on the ground under the truck, +Z forward, +Y up, +X the truck's
## left side. Body numbers are typical for a lifted full-size single-cab pickup, not factory data.

const STEP := 1.0 / 180.0
const G := 9.81

const MASS := 2400.0
const INERTIA := Vector3(5450.0, 5800.0, 1250.0)   # about model X (pitch), Y (yaw), Z (roll)
const COM := Vector3(0.0, 0.85, 0.40)             # centre of mass (57 % of the weight on the front axle)
const R := 0.457                                  # tyre radius (measured from the model's tyres)
const IW := 3.2                                   # wheel + tyre + brake disc inertia
# wheel hubs at rest, model space — the same numbers as the wheel nodes in models/gmc.glb
# (tools/model/split.py); a test checks they match. Order: FL, FR, RL, RR.
const HUBS := [Vector3(0.943, 0.457, 1.66), Vector3(-0.943, 0.457, 1.66),
		Vector3(0.943, 0.457, -1.276), Vector3(-0.943, 0.457, -1.276)]
const WB := 2.936                                 # wheelbase
const TRACK := 1.886

# suspension, per axle [front, rear]. ext = how far the wheel hangs below its rest place (+ = droop)
const K := [60700.0, 45800.0]          # spring rate N/m (about 1.5 Hz: soft off-road springs)
const X0 := [0.11, 0.11]               # preload: the spring holds the static load at ext = 0
const C_BUMP := [5600.0, 4200.0]       # damping N·s/m, compression
const C_REB := [8000.0, 6000.0]        # damping, rebound
const K_ARB := [32000.0, 14000.0]      # anti-roll bars N/m of left-right difference
# suspension geometry: tyre forces act on the body through the links, i.e. at these heights above
# the tyre contact — anti-squat / anti-dive for driving and braking, roll centre for cornering
const H_PITCH := [0.30, 0.42]          # front IFS anti-dive, rear leaf-spring anti-squat
const H_ROLL := [0.18, 0.55]           # front independent, rear solid axle
const DROOP := 0.22
const BUMP := -0.10                    # the tyre meets the wheel-well liner here
const K_STOP := 400000.0

# drivetrain (6.2 L V8, supercharged: see engine_torque)
const IDLE := 750.0
const REDLINE := 6000.0
const GEARS := [4.03, 2.36, 1.53, 1.15, 0.85, 0.67]
const REVERSE := 3.6
const FINAL := 3.42
const EFF := 0.86
const VMAX := 63.9                     # governor, 230 km/h (tuned)
const BRAKE_T := [4200.0, 2600.0]      # max brake torque per wheel N·m
const HAND_T := 9000.0
const CDA := 1.53                      # drag area (Cd 0.45 x 3.4 m²)

var terrain                            # the ground (FloorGround)
## furniture in the truck's space: [{xf: Transform3D box→space (unit cube ±1 scaled by half), half: Vector3}]
var boxes: Array = []
# body state (centre of mass)
var p := Vector3.ZERO
var b := Basis.IDENTITY
var v := Vector3.ZERO
var w := Vector3.ZERO
var prev_xf := Transform3D.IDENTITY    # the previous step, for smooth drawing between steps
var acc_t := 0.0

# wheels
var ext := [0.0, 0.0, 0.0, 0.0]        # drawn suspension position
var _e_raw := [0.0, 0.0, 0.0, 0.0]
var omega := [0.0, 0.0, 0.0, 0.0]      # wheel spin rad/s (+ = rolling forward)
var spin := [0.0, 0.0, 0.0, 0.0]       # wheel angle for drawing
var angle := [0.0, 0.0, 0.0, 0.0]      # steer angle of each wheel (+ = to the left)
var contact := [false, false, false, false]
var load := [0.0, 0.0, 0.0, 0.0]
var slip_x := [0.0, 0.0, 0.0, 0.0]     # m/s: tyre surface speed - ground speed
var slip_y := [0.0, 0.0, 0.0, 0.0]     # m/s sideways
var cpos := [Vector3.ZERO, Vector3.ZERO, Vector3.ZERO, Vector3.ZERO]
var soft := [0.0, 0.0, 0.0, 0.0]
var _drive := [0.0, 0.0, 0.0, 0.0]
var _brake := [0.0, 0.0, 0.0, 0.0]

# driver and drivetrain
var steer := 0.0                       # -1..1 (+ = right), rate-limited like a steering rack
var awd := false
var tcs := true                        # traction control (off = drift mode: the tail is yours)
var _tcs_k := 1.0
var _spin_f := 0.0
var hand := false
var gear := 1                          # -1 reverse, 1..6
var rpm := IDLE
var throttle := 0.0
var _shift_t := 0.0
var _dir_t := 0.0
var _since_shift := 0.0

# for sound, effects and haptics
var air := true
var air_t := 0.0
var landed := 0.0
var scrape := 0.0                      # body touching the ground (0..1)
var events: Array[String] = []


func _init(t, at: Vector3, heading := 0.0) -> void:
	terrain = t
	place(at, heading)


## Upright on the ground at a point, facing a heading (forward = (sin h, 0, cos h)).
func place(at: Vector3, heading: float) -> void:
	# lie on the ground's slope: the plane through the ground under the four tyres
	var yaw := Basis(Vector3.UP, heading)
	var hs := []
	for i in 4:
		var q: Vector3 = at + yaw * Vector3(HUBS[i].x, 0, HUBS[i].z)
		hs.append(terrain.height_at(q.x, q.z))
	var pitch := atan2((hs[0] + hs[1]) * 0.5 - (hs[2] + hs[3]) * 0.5, WB)
	var roll := atan2((hs[0] + hs[2]) * 0.5 - (hs[1] + hs[3]) * 0.5, TRACK)
	b = Basis.from_euler(Vector3(-pitch, heading, roll), EULER_ORDER_YXZ)
	var g := maxf(maxf(hs[0], hs[1]), maxf(hs[2], hs[3]))
	p = Vector3(at.x, g + 0.015, at.z) + b * COM
	v = Vector3.ZERO
	w = Vector3.ZERO
	for i in 4:
		ext[i] = 0.0
		_e_raw[i] = 0.0
		omega[i] = 0.0
	gear = 1
	rpm = IDLE
	prev_xf = Transform3D(b, p)


func fwd() -> Vector3:
	return b.z


func heading() -> float:
	return atan2(b.z.x, b.z.z)


func speed() -> float:
	return v.length()


func v_long() -> float:
	return v.dot(b.z)


## Sideways slide of the body in degrees (0 = going where it points).
func drift_deg() -> float:
	var hv := Vector3(v.x, 0, v.z)
	if hv.length() < 2.0:
		return 0.0
	var f := Vector3(b.z.x, 0, b.z.z).normalized()
	return rad_to_deg(absf(f.signed_angle_to(hv.normalized(), Vector3.UP)))


## Ground point under the truck (model origin) — where the model is drawn from.
func model_xf(alpha := 1.0) -> Transform3D:
	var cur := Transform3D(b, p)
	var t := prev_xf.interpolate_with(cur, clampf(alpha, 0.0, 1.0))
	return t * Transform3D(Basis.IDENTITY, -COM)


func update(dt: float, gas: float, brake: float, steer_in: float) -> void:
	acc_t += minf(dt, 0.1)
	while acc_t >= STEP:
		acc_t -= STEP
		prev_xf = Transform3D(b, p)
		_step(STEP, gas, brake, steer_in)


## 0..1 between the last two steps (draw at model_xf(alpha()))
func alpha() -> float:
	return acc_t / STEP


# ------------------------------------------------------------------ one step
func _step(dt: float, gas: float, brake: float, steer_in: float) -> void:
	var up := b.y
	var vl := v.dot(b.z)
	steer = move_toward(steer, clampf(steer_in, -1.0, 1.0), dt * 2.6)
	_steer_angles(vl)
	_drivetrain(dt, gas, brake, vl)

	var force := Vector3(0, -MASS * G, 0)
	var torque := Vector3.ZERO
	# pass 1: where each tyre meets the ground
	var e := [0.0, 0.0, 0.0, 0.0]
	var nrm := [Vector3.UP, Vector3.UP, Vector3.UP, Vector3.UP]
	var on := [false, false, false, false]
	for i in 4:
		var mount: Vector3 = p + b * (HUBS[i] - COM)
		var c := mount - up * R
		var gh := 0.0
		var n := Vector3.UP
		var ei := DROOP + 1.0
		for it in 2:   # second pass re-samples the ground where the tyre actually touches
			gh = terrain.height_at(c.x, c.z)
			n = terrain.normal_at(c.x, c.z)
			var un := up.dot(n)
			if un < 0.25:
				ei = DROOP + 1.0
				break
			ei = ((mount - Vector3(c.x, gh, c.z)).dot(n) - R) / un
			c = mount - up * ei - n * R
		e[i] = ei
		nrm[i] = n
		on[i] = ei < DROOP
		cpos[i] = c
	# pass 2: springs, anti-roll bars, tyres
	var n_on := 0
	var inv_i := b * Basis.from_scale(Vector3(1.0 / INERTIA.x, 1.0 / INERTIA.y, 1.0 / INERTIA.z)) * b.transposed()
	# the four tyres push on one body at once: each corrects only its share (Jacobi), or their
	# combined push through the body's roll would overshoot and chatter
	var n_ground := 0
	for i in 4:
		if on[i]:
			n_ground += 1
	var kj := minf(0.85, 1.8 / maxf(1.0, float(n_ground)))
	for i in 4:
		var ax := i / 2
		var ei: float = e[i]
		if not on[i]:
			contact[i] = false
			load[i] = 0.0
			ext[i] = move_toward(ext[i], DROOP, dt * 2.5)   # the wheel drops to full droop
			_e_raw[i] = ext[i]
			# a free wheel still turns with the engine and the brakes
			var om0: float = omega[i] + _drive[i] / IW * dt
			var dw0: float = (_brake[i] + 8.0) / IW * dt
			omega[i] = om0 - signf(om0) * dw0 if absf(om0) > dw0 else 0.0
			slip_x[i] = 0.0
			slip_y[i] = 0.0
			spin[i] += omega[i] * dt
			continue
		n_on += 1
		# suspension speed; a wheel just landing starts from rest (it was hanging free, not
		# rammed in from full droop), and is capped like a real damper's velocity range
		var rate: float = clampf((ei - _e_raw[i]) / dt, -3.0, 3.0) if contact[i] else 0.0
		_e_raw[i] = ei
		contact[i] = true
		ext[i] = maxf(ei, BUMP)
		var fs: float = K[ax] * (X0[ax] - ei) - (C_BUMP[ax] if rate < 0.0 else C_REB[ax]) * rate
		if ei < BUMP:
			fs += K_STOP * minf(BUMP - ei, 0.12) - 8000.0 * maxf(minf(rate, 0.0), -12.0)
		var o := i ^ 1   # the other wheel on the axle
		var eo: float = e[o] if on[o] else DROOP
		fs += K_ARB[ax] * (eo - ei)
		fs = clampf(fs, 0.0, 120000.0)   # (a wheel driven deep into a dune face can't fling the truck)
		var n: Vector3 = nrm[i]
		var fz := fs * maxf(up.dot(n), 0.0)
		load[i] = fz
		# tyre frame on the ground
		var wd := b.z.rotated(up, angle[i])
		var fw := (wd - n * wd.dot(n)).normalized()
		var lw := n.cross(fw)
		var r: Vector3 = cpos[i] - p
		var vc := v + w.cross(r)
		var vx := vc.dot(fw)
		var vy := vc.dot(lw)
		var sf: float = terrain.soft_at(cpos[i].x, cpos[i].z)
		soft[i] = sf
		var mu := lerpf(0.95, 0.74, sf)        # gravel → soft dune sand
		var crr := lerpf(0.02, 0.085, sf)      # rolling resistance (sand pushes back)
		var lim := mu * fz
		# wheel: the engine turns it, the ground pushes back, then the brake holds it
		var om: float = omega[i] + _drive[i] / IW * dt
		var tb: float = _brake[i]
		if tb > 0.0 and absf(vx) > 2.5 and not (hand and ax == 1):
			tb = minf(tb, lim * R * 0.9)        # ABS: keeps the tyre just under its peak (it can still steer)
			if slip_x[i] * signf(vx) < -0.18 * absf(vx):
				tb *= 0.15                      # ... and lets go of a wheel that has started to lock
		var r_lon: Vector3 = r + up * float(H_PITCH[ax])
		var r_lat: Vector3 = r + up * float(H_ROLL[ax])
		var rl := r_lat.cross(lw)
		var rf := r_lon.cross(fw)
		var m_lat := 1.0 / (1.0 / MASS + rl.dot(inv_i * rl))   # mass felt by the tyre sideways
		var m_lon := 1.0 / (1.0 / MASS + rf.dot(inv_i * rf))
		var vref := maxf(absf(vx), 2.5)
		var kp := lerpf(0.11, 0.2, sf)         # slip ratio at peak grip (sand: later, softer peak)
		var ap := lerpf(0.14, 0.22, sf)        # slip angle at peak grip (rad)
		var sy := atan2(absf(vy), vref) / ap
		var still := absf(vx) < 0.6 and absf(vy) < 0.6
		var cw := R * R / IW * dt               # how much one newton on the tyre slows its surface
		var sv := om * R - vx
		var fx := _fx(sv, sv / ((1.0 / m_lon + R * R / IW) * dt) * 0.85, cw, sy, vref, kp, lim, still)
		var om2 := om - fx * R / IW * dt
		var dw := tb / IW * dt
		if absf(om2) > dw:
			om2 -= signf(om2) * dw              # the brake slips: the wheel keeps turning
			sv = om2 * R - vx                   # slip left after this step
		else:
			om2 = 0.0                            # the brake holds the wheel: the tyre slides or sticks
			sv = -vx
			fx = _fx(sv, -vx * m_lon / dt * kj, 0.0, sy, vref, kp, lim, still)
		om = om2
		# sideways
		var sx := (sv / vref) / kp
		var sn := sqrt(sx * sx + sy * sy)
		var fy_cap := lim * _curve(sn) * sy / sn if sn > 1e-6 else 0.0
		if still:
			fy_cap = lim                        # standing: static friction holds it on a slope
		var fy := clampf(-vy * m_lat / dt * kj, -fy_cap, fy_cap)
		# friction circle (both directions together never exceed the grip)
		if lim > 1.0:
			var u := sqrt(fx * fx + fy * fy) / lim
			if u > 1.0:
				if om != 0.0:
					om += fx * (1.0 - 1.0 / u) * R / IW * dt   # the wheel feels the trimmed force
				fx /= u
				fy /= u
		omega[i] = om
		spin[i] += om * dt
		slip_x[i] = sv
		slip_y[i] = vy
		fx -= crr * fz * clampf(vx / 0.5, -1.0, 1.0)   # rolling resistance (sand pushes back)
		force += up * fs + fw * fx + lw * fy
		torque += r.cross(up * fs) + r_lon.cross(fw * fx) + r_lat.cross(lw * fy)
	var bc := _body_contacts()
	force += bc[0]
	torque += bc[1]
	# air drag
	force -= v * v.length() * 0.5 * 1.2 * CDA
	# integrate (semi-implicit Euler)
	v += force / MASS * dt
	var ii := b * Basis.from_scale(INERTIA) * b.transposed()
	w += inv_i * (torque - w.cross(ii * w)) * dt
	w *= 1.0 - 0.05 * dt
	if w.length() > 12.0:
		w = w.normalized() * 12.0
	p += v * dt
	var wl := w.length()
	if wl > 1e-6:
		b = b.rotated(w / wl, wl * dt).orthonormalized()
	_trees()
	_boxes()
	# air time and landings
	if n_on == 0:
		air_t += dt
		air = air_t > 0.08
	else:
		if air and air_t > 0.3:
			landed = clampf(air_t / 1.2, 0.2, 1.0)
			events.append("land")
		air = false
		air_t = 0.0


## Ackermann: the inside front wheel turns more than the outside one.
func _steer_angles(vl: float) -> void:
	var dmax := deg_to_rad(34.0) / (1.0 + vl * vl / 700.0)   # less lock at speed (rack + driver)
	var d := -steer * dmax
	if absf(d) < 1e-4:
		angle[0] = 0.0
		angle[1] = 0.0
		return
	var rt := WB / tan(absf(d))
	var inner := atan(WB / maxf(rt - TRACK * 0.5, 0.5))
	var outer := atan(WB / (rt + TRACK * 0.5))
	angle[0] = signf(d) * (inner if d > 0.0 else outer)   # FL is on the inside of a left turn
	angle[1] = signf(d) * (outer if d > 0.0 else inner)
	angle[2] = 0.0
	angle[3] = 0.0


## Engine torque curve (N·m at full throttle).
static func engine_torque(r: float) -> float:
	# the 6.2 V8 with a supercharger tune (+40 % torque, ~870 N·m / ~440 kW)
	var pts := [[600.0, 530.0], [1000.0, 600.0], [2000.0, 760.0], [3000.0, 840.0], [4100.0, 873.0], [5600.0, 745.0], [6200.0, 630.0]]
	if r <= pts[0][0]:
		return pts[0][1]
	for k in range(1, pts.size()):
		if r <= pts[k][0]:
			var t: float = (r - pts[k - 1][0]) / (pts[k][0] - pts[k - 1][0])
			return lerpf(pts[k - 1][1], pts[k][1], t)
	return pts[-1][1]


func _drivetrain(dt: float, gas: float, brake: float, vl: float) -> void:
	# an automatic: the left trigger brakes, and backs up once stopped; the right trigger drives
	var thr := 0.0
	var brk := 0.0
	if gear > 0:
		thr = gas
		brk = brake
		if brake > 0.3 and gas < 0.05 and vl < 0.6:
			_dir_t += dt
			if _dir_t > 0.25:
				gear = -1
				_dir_t = 0.0
		else:
			_dir_t = 0.0
	else:
		thr = brake
		brk = gas
		if gas > 0.3 and brake < 0.05 and vl > -0.6:
			_dir_t += dt
			if _dir_t > 0.25:
				gear = 1
				_dir_t = 0.0
		else:
			_dir_t = 0.0
	throttle = thr
	var driven := [0, 1, 2, 3] if awd else [2, 3]
	var wavg := 0.0
	var grounded := 0
	for i in driven:
		wavg += omega[i]
		if contact[i]:
			grounded += 1
	wavg /= driven.size()
	var ratio: float = (GEARS[gear - 1] if gear > 0 else REVERSE) * FINAL
	var wheel_rpm := absf(wavg) * ratio * 60.0 / TAU
	# torque converter: the engine can run ahead of the wheels up to its stall speed, and
	# multiplies torque while it slips
	var conv := IDLE + thr * (2400.0 - IDLE)
	var target := maxf(wheel_rpm, conv)
	rpm += (minf(target, REDLINE + 300.0) - rpm) * minf(1.0, dt * (14.0 if target > rpm else 9.0))
	var mult := 1.0 + 0.9 * clampf(1.0 - wheel_rpm / maxf(rpm, 1.0), 0.0, 1.0)
	var te := engine_torque(rpm) * thr
	if rpm > REDLINE or speed() > VMAX:
		te = 0.0
	if _shift_t > 0.0:
		_shift_t -= dt
		te *= 0.3
	# traction control: trims the engine while a driven tyre spins (slip ratio above ~15-25 %)
	var spin_now := 0.0
	for i in driven:
		if contact[i]:
			spin_now += slip_x[i] * signf(float(gear)) / driven.size()
	_spin_f += (spin_now - _spin_f) * minf(1.0, dt * 12.0)   # filtered: the sensor sees wheel speeds, not single steps
	var spin_max := _spin_f
	var thr_s := maxf(1.6, absf(vl) * lerpf(0.15, 0.25, soft[2]))
	if tcs and not hand:
		_tcs_k = clampf(_tcs_k - (spin_max - thr_s) * dt * 0.45, 0.3, 1.0)   # smooth both ways
	else:
		_tcs_k = minf(1.0, _tcs_k + dt * 1.2)
	if te > 0.0:
		te *= _tcs_k
	if thr < 0.05 and wheel_rpm > IDLE * 1.3:
		te = -(35.0 + rpm * 0.011)              # engine braking when coasting
	var tw := te * mult * ratio * EFF * (1.0 if gear > 0 else -1.0)
	var hold := 0.0
	if gas < 0.05 and brake < 0.05 and speed() < 0.5:
		hold = 0.35                              # foot resting on the brake when stopped
	for i in 4:
		_drive[i] = 0.0
		_brake[i] = BRAKE_T[i / 2] * maxf(brk, hold)
	for i in driven:
		_drive[i] = tw / driven.size()
	# differentials. Open diffs pass equal torque, so a light wheel would spin: traction control
	# brakes a spinning wheel (that pushes the torque across to its partner), and below 32 km/h
	# the rear auto-locker (like the truck's G80) locks the axle once one wheel runs away.
	# In 4x4 the transfer case ties the front and rear axles together.
	var slow := speed() < 9.0
	for pr in ([[2, 3], [0, 1]] if awd else [[2, 3]]):
		var dwh: float = omega[pr[0]] - omega[pr[1]]
		var k := 40.0
		if slow and pr[0] == 2:
			k += 260.0 * smoothstep(0.8, 2.5, absf(dwh))
		var tt := clampf(k * dwh, -3500.0, 3500.0)
		_drive[pr[0]] -= tt
		_drive[pr[1]] += tt
		if tcs and not hand and thr > 0.1:
			var ds: float = (slip_x[pr[0]] - slip_x[pr[1]]) * signf(float(gear))
			if absf(ds) > 1.0:
				var spinner: int = pr[0] if ds > 0.0 else pr[1]
				_brake[spinner] += minf(1800.0, (absf(ds) - 1.0) * 600.0)
	if awd:
		var dfr: float = (omega[0] + omega[1] - omega[2] - omega[3]) * 0.5
		var tt2 := clampf(250.0 * dfr, -5000.0, 5000.0)
		_drive[0] -= tt2 * 0.5
		_drive[1] -= tt2 * 0.5
		_drive[2] += tt2 * 0.5
		_drive[3] += tt2 * 0.5
	if hand:
		_brake[2] = HAND_T
		_brake[3] = HAND_T
		_drive[2] = 0.0                          # (the rear axle is held; the clutch-less auto just slips)
		_drive[3] = 0.0
	# gear changes (up early when cruising, late when flat out; never mid-air)
	# gear changes on road speed (not on a spinning wheel): up early when cruising, late when flat
	# out; never mid-air, and not again straight after a change
	_since_shift += dt
	var road_rpm := absf(v.dot(b.z)) / R * ratio * 60.0 / TAU
	if gear > 0 and _since_shift > 0.9 and grounded > 0:
		var up_rpm := lerpf(2300.0, 5300.0, thr)
		if gear < GEARS.size() and (road_rpm > up_rpm or (rpm > REDLINE - 150.0 and road_rpm > up_rpm * 0.75)):
			gear += 1
			_shift_t = 0.25
			_since_shift = 0.0
		elif gear > 1:
			var lower: float = road_rpm * GEARS[gear - 2] / GEARS[gear - 1]
			if road_rpm < lerpf(1100.0, 2400.0, thr) and lower < up_rpm * 0.85:
				gear -= 1
				_shift_t = 0.18
				_since_shift = 0.0


## The body itself on the ground: bumpers, sills, bed and roof corners (rolling over, high-centring).
const BODY_PTS := [
	Vector3(0.95, 0.72, 2.5), Vector3(-0.95, 0.72, 2.5), Vector3(0.95, 0.62, -2.55), Vector3(-0.95, 0.62, -2.55),
	Vector3(0.9, 0.5, 0.2), Vector3(-0.9, 0.5, 0.2), Vector3(0.0, 0.45, 0.2),
	Vector3(1.05, 1.4, 1.9), Vector3(-1.05, 1.4, 1.9), Vector3(1.05, 1.35, -2.45), Vector3(-1.05, 1.35, -2.45),
	Vector3(0.8, 2.05, 0.75), Vector3(-0.8, 2.05, 0.75), Vector3(0.8, 2.05, -0.25), Vector3(-0.8, 2.05, -0.25)]


func _body_contacts() -> Array:
	var force := Vector3.ZERO
	var torque := Vector3.ZERO
	var s := 0.0
	for q in BODY_PTS:
		var wp: Vector3 = p + b * (q - COM)
		var gh: float = terrain.height_at(wp.x, wp.z)
		if wp.y > gh + 0.02:
			continue
		var n: Vector3 = terrain.normal_at(wp.x, wp.z)
		var depth := (gh - wp.y) * n.y
		var r := wp - p
		var vp := v + w.cross(r)
		var vn := vp.dot(n)
		var fn := maxf(0.0, 260000.0 * depth - 22000.0 * vn)
		var vt := vp - n * vn
		var ft := Vector3.ZERO
		if vt.length() > 0.01:
			ft = -vt.normalized() * minf(0.55 * fn, vt.length() * MASS * 0.25 / STEP)
		var f := n * fn + ft
		force += f
		torque += r.cross(f)
		s = maxf(s, clampf(depth * 8.0, 0.0, 1.0))
	scrape = s
	return [force, torque]


## Acacia trunks, houses, rocks and wells (circles x, z, radius) stop the truck.
func _trees() -> void:
	for k in 3:
		var c := p + b.z * (1.9 - k * 1.9)   # three circles along the truck
		c.y = 0.0
		for tr in terrain.trees:
			var dx: float = c.x - tr.x
			var dz: float = c.z - tr.y
			var rr: float = tr.z + 1.05
			if absf(dx) > rr or absf(dz) > rr:
				continue
			var d := sqrt(dx * dx + dz * dz)
			if d < rr and d > 0.001:
				var nn := Vector3(dx / d, 0, dz / d)
				p += nn * (rr - d)
				var vn := v.dot(nn)
				if vn < 0.0:
					if vn < -4.0:
						events.append("crash")
					v -= nn * vn * 1.3
					v *= 0.7
					w *= 0.6


## Furniture (oriented boxes): the body's corners and sides are kept out of them; a hit is an
## impulse at the contact point (so a glancing blow turns the truck), restitution 0.25.
const HIT_PTS := [
	Vector3(0.98, 0.7, 2.52), Vector3(-0.98, 0.7, 2.52), Vector3(0.98, 0.7, -2.55), Vector3(-0.98, 0.7, -2.55),
	Vector3(0.0, 0.7, 2.58), Vector3(0.0, 0.7, -2.6), Vector3(1.05, 0.9, 1.0), Vector3(-1.05, 0.9, 1.0),
	Vector3(1.05, 0.9, -0.6), Vector3(-1.05, 0.9, -0.6), Vector3(1.0, 1.9, 0.3), Vector3(-1.0, 1.9, 0.3),
	Vector3(1.0, 0.5, 1.66), Vector3(-1.0, 0.5, 1.66), Vector3(1.0, 0.5, -1.276), Vector3(-1.0, 0.5, -1.276)]


func _boxes() -> void:
	if boxes.is_empty():
		return
	var inv_i := b * Basis.from_scale(Vector3(1.0 / INERTIA.x, 1.0 / INERTIA.y, 1.0 / INERTIA.z)) * b.transposed()
	for bx in boxes:
		var xf: Transform3D = bx.xf
		var half: Vector3 = bx.half
		# quick reject: box centre far from the truck
		if xf.origin.distance_to(p) > half.length() + 4.0:
			continue
		var ixf := xf.affine_inverse()
		for q in HIT_PTS:
			var wp: Vector3 = p + b * (q - COM)
			var lp := ixf * wp
			var d := half - lp.abs()
			if d.x <= 0.0 or d.y <= 0.0 or d.z <= 0.0:
				continue
			# push out through the nearest side face (furniture is entered from the side)
			var nl := Vector3(signf(lp.x), 0, 0) if d.x < d.z else Vector3(0, 0, signf(lp.z))
			var depth := minf(d.x, d.z)
			var n := (xf.basis * nl).normalized()
			n.y = 0.0
			if n.length() < 0.1:
				continue
			n = n.normalized()
			p += n * depth
			var r := wp - p
			var vp := v + w.cross(r)
			var vn := vp.dot(n)
			if vn < 0.0:
				if vn < -3.0:
					events.append("crash")
				var rn := r.cross(n)
				var j := -(1.25) * vn / (1.0 / MASS + rn.dot(inv_i * rn))
				var vt := vp - n * vn
				var jt := Vector3.ZERO
				if vt.length() > 0.01:
					jt = -vt.normalized() * minf(0.4 * j, vt.length() * MASS * 0.3)
				var imp := n * j + jt
				v += imp / MASS
				w += inv_i * r.cross(imp)


## Longitudinal tyre force. need = the force that would cancel the slip this step. The force
## the tyre can give depends on the slip that is left once it pushes (a tyre that grips ends the
## step with little slip, a spinning one keeps slipping): find the largest force not above that
## grip (bisection). cw = slip removed per newton (0 for a wheel the brake holds).
func _fx(sv: float, need: float, cw: float, sy: float, vref: float, kp: float, lim: float, still: bool) -> float:
	if still:
		return clampf(need, -lim, lim)
	var hi := absf(need)
	var s0 := absf(sv)
	if _cap_x(s0 - hi * cw, sy, vref, kp, lim) >= hi:
		return need
	var lo := 0.0
	for k in 10:
		var mid := (lo + hi) * 0.5
		if _cap_x(s0 - mid * cw, sy, vref, kp, lim) >= mid:
			lo = mid
		else:
			hi = mid
	return lo * signf(need)


static func _cap_x(s: float, sy: float, vref: float, kp: float, lim: float) -> float:
	var sx := maxf(s, 0.0) / vref / kp
	var sn := sqrt(sx * sx + sy * sy)
	return lim * _curve(sn) * sx / sn if sn > 1e-6 else 0.0


## Tyre grip against combined normalised slip (1 = peak): rises steeply, peaks, then falls to
## the sliding level (78 %) — the drop past the peak is what lets a drift hold.
static func _curve(sn: float) -> float:
	if sn < 1.0:
		return sn * (2.0 - sn)
	return 1.0 - 0.22 * (1.0 - exp(-(sn - 1.0) * 1.6))
