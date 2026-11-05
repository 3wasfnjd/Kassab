class_name EngineAudio
extends AudioStreamPlayer
## A synthesized engine (no sound files): a low six-cylinder rumble whose pitch follows the
## revs through the gears, a throttle growl, wind that rises with speed and sand hiss when the
## tyres slide or dig in.

const RATE := 16000.0
var gen: AudioStreamGeneratorPlayback
var ph := 0.0
var ph2 := 0.0
var rpm := 800.0
var throttle := 0.0
var wind := 0.0
var hiss := 0.0
var gear := 1
var _lp := 0.0
var _lp2 := 0.0
var _rng := RandomNumberGenerator.new()
const GEARS := [0.0, 4.2, 8.5, 14.0, 21.0, 29.0, 40.0]   # m/s where each gear tops out


func _ready() -> void:
	var s := AudioStreamGenerator.new()
	s.mix_rate = RATE
	s.buffer_length = 0.12
	stream = s
	volume_db = -6.0
	play()
	gen = get_stream_playback()


## speed m/s (signed), throttle 0..1, slip (m/s sideways or spinning), in the air or not
func drive(speed: float, gas: float, slip: float, air: bool, sink: float) -> void:
	var v := absf(speed)
	gear = 1
	while gear < GEARS.size() - 1 and v > GEARS[gear]:
		gear += 1
	var lo: float = GEARS[gear - 1]
	var hi: float = GEARS[gear]
	var k := clampf((v - lo) / maxf(hi - lo, 0.1), 0.0, 1.0)
	var target := 900.0 + k * 3600.0
	if gear == 1 and v < 0.5:
		target = 850.0 + gas * 1400.0
	if air or sink > 0.5:
		target = 1200.0 + gas * 3400.0   # wheels free or digging: the engine races
	rpm = lerpf(rpm, target, 0.12)
	throttle = lerpf(throttle, gas, 0.15)
	wind = clampf(v / 33.0, 0.0, 1.0)
	hiss = clampf(slip / 8.0 + sink * gas * 0.8, 0.0, 1.0)


func _process(_dt: float) -> void:
	if gen == null:
		return
	var n := gen.get_frames_available()
	var f := rpm / 60.0 * 3.0       # firing frequency of a six (3 per revolution)
	var inc := f / RATE
	var amp := 0.18 + 0.22 * throttle
	for i in n:
		ph = fposmod(ph + inc, 1.0)
		ph2 = fposmod(ph2 + inc * 0.5, 1.0)
		var pulse := pow(maxf(0.0, sin(TAU * ph)), 3.0) * 1.6 - 0.45          # combustion pulses
		var sub := sin(TAU * ph2) * 0.6                                        # half-order rumble
		var noise := _rng.randf_range(-1.0, 1.0)
		_lp += (noise - _lp) * (0.04 + 0.2 * wind)                              # wind: low-passed noise
		_lp2 += (noise - _lp2) * 0.6                                           # sand: brighter hiss
		var s := (pulse + sub) * amp + _lp * wind * 0.55 + (_lp2 - _lp) * hiss * 0.22
		gen.push_frame(Vector2(s, s) * 0.5)
