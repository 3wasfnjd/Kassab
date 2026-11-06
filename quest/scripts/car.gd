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


var hand := false           # handbrake (right grip): the tail steps out for a drift
var slip := 0.0
var spin_k := 0.0
var taut := false           # pulling something on a rope


## Same driving model as the web Kassab (tuoos stepCar): strong pull, low top speed in 4x4,
## grip that lets go once the car is sliding (drift), slopes pull the car down, a heavy truck in
## the air that only real ramps launch, and bogging on soft sand when crawling without 4x4.
func _step(dt: float, gas: float, brake: float, steer_in: float) -> void:
	var f := fwd()
	var s := side()
	vF = vel.x * f.x + vel.z * f.z
	vS = vel.x * s.x + vel.z * s.z
	steer = move_toward(steer, steer_in, dt * 4.0)
	spin_k = 0.0
	if not air:
		soft = terrain.soft_at(pos.x, pos.z)
		var crawl := (gas > 0.05 or (brake > 0.05 and vF < 0.5)) and absf(vF) < 7.0
		if soft > 0.25 and crawl:
			sink = minf(1.0, sink + dt * (0.04 if awd else 0.42) * soft)
		elif absf(vF) > 9.0 or soft < 0.15:
			sink = maxf(0.0, sink - dt * 0.5)
		if awd and (gas > 0.05 or brake > 0.05):
			sink = maxf(0.0, sink - dt * 0.22)
		var bog := 1.0 - sink * (0.35 if awd else 0.97)
		if not awd and sink > 0.8 and not stuck_told:
			stuck_told = true
			events.append("stuck")
		elif sink < 0.2:
			stuck_told = false
		if gas > 0.05:
			var a := 15.0 * maxf(0.15, 1.0 - vF / (30.0 if awd else 58.0)) * (1.15 if awd else 1.0) * bog * gas   # ~120 km/h, slower in 4x4
			vF += a * dt
			if vF < 6.0:
				spin_k = 1.0 - vF / 6.0
		if brake > 0.05:
			if vF > 0.5:
				vF -= 22.0 * brake * dt
			else:
				vF = maxf(-11.0, vF - 7.0 * bog * brake * dt)
		vF -= vF * sink * 2.2 * dt
		vF -= vF * 0.18 * dt + signf(vF) * minf(absf(vF), (0.3 if gas > 0.05 else 1.8) * dt)
		var grip := 1.1 if hand else (2.6 if absf(vS) > 3.5 else 5.5)
		vS *= exp(-grip * dt)
		if hand:
			vF -= signf(vF) * minf(absf(vF), 3.2 * dt)
		if taut:
			vF *= 1.0 - 1.6 * dt
		vel.x = f.x * vF + s.x * vS
		vel.z = f.z * vF + s.z * vS
		# gravity on slopes
		var n := terrain.normal_at(pos.x, pos.z)
		vel.x += n.x * 16.0 * dt
		vel.z += n.z * 16.0 * dt
		var sp := absf(vF)
		var target := -steer * minf(1.0, sp / 5.0) * (2.1 - minf(1.1, sp * 0.03)) * (signf(vF) if absf(vF) > 0.01 else 1.0)
		if hand:
			target *= 1.55
		yaw_rate += (target - yaw_rate) * minf(1.0, 7.0 * dt)
	else:
		yaw_rate *= exp(-0.6 * dt)
	h += yaw_rate * dt
	pos.x += vel.x * dt
	pos.z += vel.z * dt
	# acacia trunks, houses and rocks stop the car (circles: x, z, radius)
	for tr in terrain.trees:
		var dx := pos.x - tr.x
		var dz := pos.z - tr.y
		var rr: float = tr.z + 1.4
		if absf(dx) > rr or absf(dz) > rr:
			continue
		var d := sqrt(dx * dx + dz * dz)
		if d < rr and d > 0.001:
			var nn := Vector3(dx / d, 0, dz / d)
			pos.x += nn.x * (rr - d)
			pos.z += nn.z * (rr - d)
			var vn := vel.dot(nn)
			if vn < 0.0:
				if vn < -4.0:
					events.append("crash")
				vel -= nn * vn * 1.4
				vel *= 0.6
	var gy := terrain.height_at(pos.x, pos.z)
	# heavy truck: strong gravity in the air, only real ramps launch it, the suspension soaks up most of the lift
	if air:
		vy -= 27.0 * dt
		pos.y += vy * dt
		air_t += dt
		pitch = lerpf(pitch, -0.1, dt * 0.8)
		roll = lerpf(roll, 0.0, dt * 1.2)
		if pos.y <= gy:
			var hard := -vy
			landed = clampf(hard / 12.0, 0.0, 1.0)
			if hard > 4.0 or air_t > 0.25:
				events.append("land")
			pos.y = gy
			air = false
			vy = 0.0
	else:
		# look 1/60 s ahead (the web game's step): does the truck's momentum carry it clear of the ground?
		var la := 1.0 / 60.0
		var pred := pos.y + vy * la - 16.0 * la * la
		var gnext := terrain.height_at(pos.x + vel.x * la, pos.z + vel.z * la)
		if pred > gnext + 0.22 and vy > 5.2:
			air = true
			air_t = 0.0
			vy *= 0.78
			pos.y += vy * dt
		else:
			var v := clampf((gy - pos.y) / dt, -30.0, 30.0)
			vy += (v - vy) * 0.5
			pos.y = gy
		f = fwd()
		s = side()
		var hf := terrain.height_at(pos.x + f.x * 1.36, pos.z + f.z * 1.36)
		var hr := terrain.height_at(pos.x - f.x * 1.36, pos.z - f.z * 1.36)
		var hl := terrain.height_at(pos.x + s.x * 0.8, pos.z + s.z * 0.8)
		var hrt := terrain.height_at(pos.x - s.x * 0.8, pos.z - s.z * 0.8)
		pitch = lerpf(pitch, atan2(hf - hr, 2.72), 1.0 - exp(-12.0 * dt))
		roll = lerpf(roll, atan2(hl - hrt, 1.6), 1.0 - exp(-12.0 * dt))
	slip = absf(vS) + (absf(vF) * 0.35 if hand else 0.0) + spin_k * 6.0
	wheel_spin += (vF / CarModel.WR + spin_k * 14.0 * (1.0 if gas > 0.05 else 0.0) + (8.0 if sink > 0.4 and gas > 0.05 else 0.0)) * dt


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
	m.steering_wheel.rotation.z = steer * 2.4
