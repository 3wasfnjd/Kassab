class_name Car
extends RefCounted
## Arcade desert-truck physics on the analytic ground (Terrain.height_at): no physics engine,
## fixed small steps, so it is the same on the headset and in the headless tests.
## Grip falls on soft sand (the tail slides), dune faces slow you climbing, crests throw you in
## the air, and stopping on soft sand in 2WD bogs you down until you engage 4x4.

const VMAX := 33.4         # 120 km/h
const ACC := 8.5
const BRAKE := 15.0
const VREV := 8.0
const G := 15.5            # a little heavier than real: big jumps stay readable
const STEP := 1.0 / 120.0

var terrain: Terrain
var pos := Vector3.ZERO    # ground point under the car centre (y = body base)
var h := 0.0               # heading: forward = (sin h, 0, cos h)
var vel := Vector3.ZERO    # horizontal velocity (x, z); y is vertical speed
var vy := 0.0
var air := false
var air_t := 0.0
var pitch := 0.0
var roll := 0.0
var yaw_rate := 0.0
var sink := 0.0            # 0..1 how deep it is bogged
var awd := false
var steer := 0.0           # -1..1 (smoothed)
var vF := 0.0
var vS := 0.0
var soft := 0.0
var wheel_spin := 0.0
var landed := 0.0          # impact strength of the last landing (for haptics / camera)
var stuck_told := false
var events: Array[String] = []
var acc_t := 0.0


func _init(t: Terrain, at: Vector3, heading := 0.0) -> void:
	terrain = t
	place(at, heading)


func place(at: Vector3, heading: float) -> void:
	pos = Vector3(at.x, terrain.height_at(at.x, at.z), at.z)
	h = heading
	vel = Vector3.ZERO
	vy = 0.0
	air = false
	sink = 0.0
	pitch = 0.0
	roll = 0.0


func fwd() -> Vector3:
	return Vector3(sin(h), 0, cos(h))


func side() -> Vector3:   # car local +X (the driver's side)
	return Vector3(cos(h), 0, -sin(h))


func speed() -> float:
	return Vector2(vel.x, vel.z).length()


func update(dt: float, gas: float, brake: float, steer_in: float) -> void:
	acc_t += minf(dt, 0.1)
	while acc_t >= STEP:
		acc_t -= STEP
		_step(STEP, gas, brake, steer_in)


func _ground(x: float, z: float) -> float:
	return terrain.height_at(x, z)


func _step(dt: float, gas: float, brake: float, steer_in: float) -> void:
	var f := fwd()
	var s := side()
	vF = vel.x * f.x + vel.z * f.z
	vS = vel.x * s.x + vel.z * s.z
	soft = terrain.soft_at(pos.x, pos.z)
	steer = move_toward(steer, steer_in, dt * 3.2)
	var grounded := not air
	var bogk := 1.0 - sink * (0.35 if awd else 0.97)
	var traction := (1.0 - 0.42 * soft * (0.35 if awd else 1.0)) * bogk if grounded else 0.0

	if grounded:
		if gas > 0.05:
			if vF < -0.6:
				vF = move_toward(vF, 0.0, BRAKE * dt * gas)
			else:
				vF += ACC * gas * traction * (1.0 - clampf(vF / VMAX, 0.0, 1.0)) * dt
		if brake > 0.05:
			if vF > 0.6:
				vF = move_toward(vF, 0.0, BRAKE * brake * dt)
			else:
				vF = maxf(vF - 5.5 * brake * traction * dt, -VREV)
		# rolling drag (more on soft sand), slope pull along the car
		var drag := 0.06 + soft * 0.22 * (0.45 if awd else 1.0) + sink * 1.8
		vF -= vF * drag * dt
		if gas < 0.05 and brake < 0.05:
			vF = move_toward(vF, 0.0, 0.8 * dt)
		var hf := _ground(pos.x + f.x * 1.4, pos.z + f.z * 1.4)
		var hr := _ground(pos.x - f.x * 1.4, pos.z - f.z * 1.4)
		var slope := (hf - hr) / 2.8
		vF -= G * 0.62 * slope / sqrt(1.0 + slope * slope) * dt
		# lateral grip: the tail slides on sand at speed
		var grip := lerpf(10.0, 3.2, soft) * (1.15 if awd else 1.0)
		vS *= exp(-grip * dt)
		# steering: less lock at speed, yaw from the bicycle model
		var lock := 0.62 / (1.0 + absf(vF) / 16.0)
		var ang := steer * lock
		var target_rate := -vF * tan(ang) / CarModel.WB   # steer right (+) turns towards -X
		yaw_rate = lerpf(yaw_rate, target_rate, 1.0 - exp(-8.0 * dt))
		h += yaw_rate * dt
		# bogging down: slow and on soft sand without 4x4
		if soft > 0.35 and absf(vF) < 3.5 and (gas > 0.05 or absf(vF) < 0.5):
			sink = minf(1.0, sink + dt * (0.03 if awd else 0.32) * soft * (1.0 if gas > 0.05 else 0.25))
		elif absf(vF) > 8.0 or soft < 0.2:
			sink = maxf(0.0, sink - dt * 0.5)
		if awd and (gas > 0.05 or brake > 0.05):
			sink = maxf(0.0, sink - dt * 0.24)
		if sink > 0.8 and not awd and not stuck_told:
			stuck_told = true
			events.append("stuck")
		elif sink < 0.2:
			stuck_told = false
	else:
		yaw_rate *= exp(-1.5 * dt)
		h += yaw_rate * dt

	f = fwd()
	s = side()
	vel.x = f.x * vF + s.x * vS
	vel.z = f.z * vF + s.z * vS
	pos.x += vel.x * dt
	pos.z += vel.z * dt

	# vertical: follow the ground, or fly off a crest when the ground falls away faster than gravity
	var g := _ground(pos.x, pos.z)
	if air:
		air_t += dt
		vy -= G * dt
		pos.y += vy * dt
		pitch = lerpf(pitch, -0.12, dt * 0.8)
		roll = lerpf(roll, 0.0, dt * 1.2)
		if pos.y <= g:
			landed = clampf(-vy / 12.0, 0.0, 1.0)
			if landed > 0.25:
				events.append("land")
			pos.y = g
			vy = 0.0
			air = false
			vF *= 0.94
	else:
		var ballistic := pos.y + vy * dt - G * dt * dt
		if g < ballistic - 0.04 and speed() > 7.0:
			air = true
			air_t = 0.0
			vy -= G * dt
			pos.y = ballistic
		else:
			vy = clampf((g - pos.y) / dt, -30.0, 30.0)
			pos.y = g
		# body attitude from the four contact points
		var hf := _ground(pos.x + f.x * 1.36, pos.z + f.z * 1.36)
		var hr := _ground(pos.x - f.x * 1.36, pos.z - f.z * 1.36)
		var hl := _ground(pos.x + s.x * 0.8, pos.z + s.z * 0.8)
		var hrt := _ground(pos.x - s.x * 0.8, pos.z - s.z * 0.8)
		pitch = lerpf(pitch, atan2(hf - hr, 2.72), 1.0 - exp(-14.0 * dt))
		roll = lerpf(roll, atan2(hl - hrt, 1.6), 1.0 - exp(-14.0 * dt))
	wheel_spin += vF / CarModel.WR * dt * (1.0 + (2.5 if sink > 0.4 and gas > 0.05 else 0.0))


## Puts the model where the simulation says (and turns wheels, steering, speedo).
func apply(m: CarModel) -> void:
	m.position = pos - Vector3.UP * sink * 0.28
	m.basis = Basis.from_euler(Vector3(-pitch, h, roll), EULER_ORDER_YXZ)
	m.body_root.position.y = sin(Time.get_ticks_msec() * 0.031) * 0.006 * clampf(speed() / 10.0, 0.0, 1.0)
	for i in 4:
		var w: Node3D = m.wheels[i]
		if i < 2:
			w.rotation.y = -steer * 0.55 / (1.0 + absf(vF) / 16.0)
		m.spins[i].rotation.x = wheel_spin
	m.steering_wheel.rotation.z = steer * 2.4
	m.speedo.text = str(int(round(speed() * 3.6)))
	m.fuel.text = "4×4" if awd else "2WD"
