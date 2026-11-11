class_name EngineAudio
extends AudioStreamPlayer
## A synthesized V8 (no sound files), driven by the truck's real engine speed: the uneven
## cross-plane burble (4 firings per turn, alternating strength), a throttle growl, wind that rises
## with speed, tyre hiss when sliding or spinning, a thump on landings and a two-tone horn.

const RATE := 22050.0
var gen: AudioStreamGeneratorPlayback
var ph := 0.0
var ph_h := 0.0
var rpm := 750.0
var throttle := 0.0
var wind := 0.0
var hiss := 0.0
var horn := false
var thump := 0.0
var _fire := 0
var _lp := 0.0
var _lp2 := 0.0
var _env := 0.0
var _rng := RandomNumberGenerator.new()


func _ready() -> void:
	var s := AudioStreamGenerator.new()
	s.mix_rate = RATE
	s.buffer_length = 0.1
	stream = s
	volume_db = -8.0
	play()
	gen = get_stream_playback()


func drive(engine_rpm: float, thr: float, speed: float, slip: float) -> void:
	rpm = lerpf(rpm, engine_rpm, 0.35)
	throttle = lerpf(throttle, thr, 0.2)
	wind = clampf(speed / 40.0, 0.0, 1.0)
	hiss = clampf((slip - 1.0) / 8.0, 0.0, 1.0)


func land(strength: float) -> void:
	thump = maxf(thump, strength)


func _process(_dt: float) -> void:
	if gen == null:
		return
	var n := gen.get_frames_available()
	var fire_hz := rpm / 60.0 * 4.0            # a V8 fires 4 times per crank turn
	var inc := fire_hz / RATE
	var amp := 0.16 + 0.24 * throttle
	for i in n:
		ph += inc
		if ph >= 1.0:
			ph -= 1.0
			_fire = (_fire + 1) % 8
			# cross-plane V8: each bank fires unevenly, the burble
			_env = 1.0 if (_fire == 0 or _fire == 3 or _fire == 4 or _fire == 6) else 0.72
		var pulse := (pow(maxf(0.0, sin(TAU * ph)), 2.0) * 1.7 - 0.5) * _env
		var body := sin(TAU * ph * 0.5) * 0.45                 # half-order rumble
		var noise := _rng.randf_range(-1.0, 1.0)
		_lp += (noise - _lp) * (0.03 + 0.18 * wind)
		_lp2 += (noise - _lp2) * 0.55
		var s := (pulse + body) * amp * (1.0 + 0.4 * throttle * _lp2 * 0.3)
		s += _lp * wind * 0.5 + (_lp2 - _lp) * hiss * 0.25
		if thump > 0.01:
			s += sin(TAU * 55.0 * float(i) / RATE) * thump * 0.8
		if horn:
			ph_h = fposmod(ph_h + 410.0 / RATE, 1.0)
			s += (0.5 if fposmod(ph_h * 2.0, 1.0) < 0.5 else -0.5) * 0.16 + (0.5 if fposmod(ph_h * 1.26, 1.0) < 0.5 else -0.5) * 0.12
		gen.push_frame(Vector2(s, s) * 0.5)
	thump *= 0.86
