class_name Truck
extends RefCounted
## The GMC's driving — the same physics as Hajwala's free room mode (Kenney's Starter Kit Racing
## model, as ported in 3wasfnjd/hajwala js/Vehicle.js + js/Physics.js createSphereBody):
## an invisible ball rolls on the floor and carries the truck. The throttle eases a target speed
## in and spins the ball about the truck's side axis; the steering turns the truck itself. The
## ball keeps its own momentum, so when you turn hard (or pull the handbrake) the truck points
## one way while the ball still rolls the other — that's the slide/drift.
##
## Hajwala's numbers are used as they are, in Hajwala's own units (its truck at size 1 is
## about 1.4 m long on a 0.5 m ball), then scaled up to the 5 m GMC (×K) so the GMC handles like
## Hajwala's truck relative to its size. SPEED_BOOST makes it faster than Hajwala's (asked for).
## Fixed 90 Hz steps, drawn smoothly between steps.

const STEP := 1.0 / 90.0
const K := 5.0 / 1.4             # Hajwala truck units → GMC metres
const SPEED_BOOST := 1.5         # faster than Hajwala's truck (the owner asked for more speed)

# Hajwala Vehicle.js
const MAX_SPEED := 1.5
const LINEAR_DAMP := 0.1
const REVERSE_SPEED_SCALE := 0.6
# Hajwala Physics.js createSphereBody (radius 0.5) + ARManager floor (friction 5)
const BALL_R := 0.5
const BALL_M := 1000.0
const BALL_I := 0.4 * 1000.0 * 0.25
const GRAVITY := 9.81 * 1.5      # gravityFactor 1.5
const MU := 5.0                  # sqrt(ball 5 × floor 5)
const BALL_LIN_DAMP := 0.1
const BALL_ANG_DAMP := 4.0
const MAX_ANG_VEL := 0.25 * PI * 60.0 * SPEED_BOOST
const FURNITURE_E := 0.2         # furniture restitution in Hajwala's room mode

# the GMC model (for wheels and effects)
const R := 0.457                                  # tyre radius
const COM := Vector3(0.0, 0.85, 0.40)
const HUBS := [Vector3(0.943, 0.457, 1.66), Vector3(-0.943, 0.457, 1.66),
		Vector3(0.943, 0.457, -1.276), Vector3(-0.943, 0.457, -1.276)]
const BODY_PIVOT := 0.9                           # height the body leans and pitches about

var terrain                       # (kept for compatibility: the floor)
var boxes: Array = []             # furniture in GMC space: [{xf: Transform3D, half: Vector3}]

# ball (Hajwala units, floor plane): centre, velocity, spin
var bp := Vector3.ZERO
var bv := Vector3.ZERO
var bw := Vector3.ZERO
# truck (Hajwala Vehicle.js state)
var yaw := 0.0
var linear_speed := 0.0
var angular_speed := 0.0
var acceleration := 0.0
var input_x := 0.0
var input_z := 0.0
var hand := false
var awd := false                  # 4x4: pulls away harder
var tcs := true                   # (unused now)
var body_pitch := 0.0
var body_roll := 0.0
var steer_vis := 0.0
var drift := 0.0                  # Hajwala's driftIntensity

# outputs used by the model, effects, sound and tests (GMC metres)
var p := Vector3.ZERO             # ground point under the truck
var b := Basis.IDENTITY           # truck heading
var prev_xf := Transform3D.IDENTITY
var acc_t := 0.0
var ext := [0.0, 0.0, 0.0, 0.0]
var spin := [0.0, 0.0, 0.0, 0.0]
var angle := [0.0, 0.0, 0.0, 0.0]
var contact := [true, true, true, true]
var slip_x := [0.0, 0.0, 0.0, 0.0]
var slip_y := [0.0, 0.0, 0.0, 0.0]
var cpos := [Vector3.ZERO, Vector3.ZERO, Vector3.ZERO, Vector3.ZERO]
var rpm := 800.0
var throttle := 0.0
var gear := 1
var air := false
var landed := 0.0
var events: Array[String] = []


func _init(t, at: Vector3, heading := 0.0) -> void:
	terrain = t
	place(at, heading)


func place(at: Vector3, heading: float) -> void:
	bp = Vector3(at.x / K, BALL_R, at.z / K)
	bv = Vector3.ZERO
	bw = Vector3.ZERO
	yaw = heading
	linear_speed = 0.0
	angular_speed = 0.0
	acceleration = 0.0
	_sync()
	prev_xf = Transform3D(b, p)


func fwd() -> Vector3:
	return b.z


func heading() -> float:
	return yaw


func speed() -> float:
	return Vector2(bv.x, bv.z).length() * K


func v_long() -> float:
	return Vector3(bv.x, 0, bv.z).dot(b.z) * K


## How far the truck's heading is from where it is actually going (degrees).
func drift_deg() -> float:
	var hv := Vector3(bv.x, 0, bv.z)
	if hv.length() * K < 2.0:
		return 0.0
	return rad_to_deg(absf(b.z.signed_angle_to(hv.normalized(), Vector3.UP)))


func alpha() -> float:
	return acc_t / STEP


## Ground point under the truck, with its heading (the body's lean is drawn by the model).
func model_xf(a := 1.0) -> Transform3D:
	return prev_xf.interpolate_with(Transform3D(b, p), clampf(a, 0.0, 1.0))


func update(dt: float, gas: float, brake: float, steer_in: float) -> void:
	acc_t += minf(dt, 0.1)
	while acc_t >= STEP:
		acc_t -= STEP
		prev_xf = Transform3D(b, p)
		_step(STEP, gas, brake, steer_in)


func _step(dt: float, gas: float, brake: float, steer_in: float) -> void:
	input_x = clampf(steer_in, -1.0, 1.0)
	input_z = clampf(gas - brake, -1.0, 1.0)
	throttle = absf(input_z)
	# --- Hajwala Vehicle.update (keyboard / gamepad branch) ---
	var direction := signf(linear_speed)
	if direction == 0.0:
		direction = signf(input_z) if absf(input_z) > 0.1 else 1.0
	var steering_grip := clampf(absf(linear_speed), 0.2, 1.0)
	var effective_grip := 1.0 if hand else steering_grip
	var turn_mult := 6.5 if hand else 4.0
	var target_ang := -input_x * effective_grip * turn_mult * direction
	angular_speed = lerpf(angular_speed, target_ang, minf(1.0, dt * 4.0))
	yaw += angular_speed * dt
	var target := input_z
	var accel_rate := 2.2 if awd else 1.5
	if target < 0.0 and linear_speed > 0.01:
		linear_speed = lerpf(linear_speed, 0.0, minf(1.0, dt * 8.0))
	elif target < 0.0:
		linear_speed = lerpf(linear_speed, target * MAX_SPEED * REVERSE_SPEED_SCALE, minf(1.0, dt * 2.0))
	else:
		linear_speed = lerpf(linear_speed, target * MAX_SPEED, minf(1.0, dt * accel_rate))
	linear_speed *= maxf(0.0, 1.0 - LINEAR_DAMP * dt)
	if hand:
		linear_speed *= maxf(0.0, 1.0 - 1.2 * dt)
	b = Basis(Vector3.UP, yaw)
	# spinning the ball about the truck's side axis rolls it forward
	bw += b.x * (linear_speed * 100.0 * dt * SPEED_BOOST)
	# --- the ball (Hajwala's crashcat sphere on the room floor) ---
	bv *= maxf(0.0, 1.0 - BALL_LIN_DAMP * dt)
	bw *= maxf(0.0, 1.0 - BALL_ANG_DAMP * dt)
	if bw.length() > MAX_ANG_VEL:
		bw = bw.normalized() * MAX_ANG_VEL
	var rc := Vector3(0, -BALL_R, 0)
	var vc := bv + bw.cross(rc)
	vc.y = 0.0
	var j := -vc * BALL_M / (1.0 + BALL_M * BALL_R * BALL_R / BALL_I)   # friction impulse that makes it roll
	var cap := MU * BALL_M * GRAVITY * dt
	if j.length() > cap:
		j = j.normalized() * cap
	bv += j / BALL_M
	bw += rc.cross(j) / BALL_I
	bv.y = 0.0
	bp += bv * dt
	bp.y = BALL_R
	_furniture()
	acceleration = lerpf(acceleration, linear_speed + 0.25 * linear_speed * absf(linear_speed), minf(1.0, dt))
	# --- Hajwala updateBody / updateWheels (look) ---
	body_pitch = lerp_angle(body_pitch, -(linear_speed - acceleration) / 6.0, minf(1.0, dt * 10.0))
	body_roll = lerp_angle(body_roll, -(input_x / 5.0) * linear_speed, minf(1.0, dt * 5.0))
	steer_vis = lerp_angle(steer_vis, -input_x / 1.5, minf(1.0, dt * 10.0))
	drift = absf(linear_speed - acceleration) + absf(body_roll) * 2.0 + (0.7 if hand else 0.0) + absf(input_x) * absf(linear_speed) * 0.6
	_sync()
	var roll := v_long() / R * dt
	for i in 4:
		spin[i] += roll
		angle[i] = steer_vis * 0.6 if i < 2 else 0.0
	# sound: a 5-speed box made up from the road speed
	var f := clampf(speed() / (23.4 * K), 0.0, 1.0)
	gear = mini(5, int(f * 5.0) + 1)
	var in_gear := f * 5.0 - float(gear - 1)
	if linear_speed < -0.02:
		gear = -1
		in_gear = f * 5.0
	rpm = lerpf(rpm, 900.0 + clampf(in_gear, 0.0, 1.0) * 4800.0 + throttle * 600.0, minf(1.0, dt * 6.0))


## Furniture: the ball is kept out of each box (closest-point push-out) and bounces off it like
## Hajwala's furniture colliders (restitution 0.2).
func _furniture() -> void:
	for bx in boxes:
		var xf: Transform3D = bx.xf
		var half: Vector3 = bx.half / K
		var origin := xf.origin / K
		var lp := xf.basis.transposed() * (bp - origin)
		if absf(lp.y) > half.y + BALL_R:
			continue
		var cl := Vector3(clampf(lp.x, -half.x, half.x), lp.y, clampf(lp.z, -half.z, half.z))
		var d := lp - cl
		var dist := d.length()
		var n: Vector3
		var depth: float
		if dist > 1e-5:
			if dist >= BALL_R:
				continue
			n = xf.basis * (d / dist)
			depth = BALL_R - dist
		else:   # centre inside the box: out through the nearest side
			var ex := half.x - absf(lp.x)
			var ez := half.z - absf(lp.z)
			n = xf.basis * (Vector3(signf(lp.x), 0, 0) if ex < ez else Vector3(0, 0, signf(lp.z)))
			depth = minf(ex, ez) + BALL_R
		n.y = 0.0
		if n.length() < 0.1:
			continue
		n = n.normalized()
		bp += n * depth
		var vn := bv.dot(n)
		if vn < 0.0:
			if vn * K < -3.0:
				events.append("crash")
			bv -= n * vn * (1.0 + FURNITURE_E)


func _sync() -> void:
	p = Vector3(bp.x * K, 0.0, bp.z * K)
	b = Basis(Vector3.UP, yaw)
	# tyre slip for smoke and skid marks: how sideways the truck is sliding
	var hv := Vector3(bv.x, 0, bv.z) * K
	var lat := hv.dot(b.x)
	var lon := hv.dot(b.z)
	for i in 4:
		var h: Vector3 = HUBS[i]
		cpos[i] = p + b * Vector3(h.x, 0.0, h.z)
		slip_y[i] = lat * (1.25 if i >= 2 else 0.8) + (6.0 if hand and i >= 2 and absf(lon) > 3.0 else 0.0)
		slip_x[i] = 0.0
		contact[i] = true
