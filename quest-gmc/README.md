# كساب GMC — AR (Meta Quest 3)

The owner's GMC pickup (their model, `models/gmc.glb`, built from `tools/model/source/`) in free
room mode, like Hajwala's: it drives on your real floor through passthrough — nothing is drawn
under it but a soft contact shade and its skid marks (which fade after 9 s). Furniture from the
headset's Space Setup (tables, sofa, bed, storage…) are solid, invisible obstacles when the
headset has them (`OpenXRFbSceneManager`, permission `com.oculus.permission.USE_SCENE`); walls,
doors and windows are not. No text on screen; toggles answer with a controller buzz.

Mods (from the owner's photos): a hard folding bed cover (four black panels flush on the rails)
and warm LED strips under each fender lip, and a supercharger tune (+40 % torque, 230 km/h).

Godot 4.6.3 (GL Compatibility), OpenXR Vendors 5.1.0, package `com.abodengames.kassab.gmcar`
(installs next to the other Kassab Quest app). The Aboden Games logo appears once, as the Quest
system splash (`vr_splash.png`); there is no second logo card in the app.

## Controls (Quest Touch)

| | |
| --- | --- |
| Right trigger | gas |
| Left trigger | brake; held when stopped: reverse |
| Left stick (or right stick sideways) | steer |
| Right grip | handbrake (locks the rear wheels: drift) |
| Y | 4x4 on/off |
| X | traction control on/off (off = drift mode) |
| B | put the truck back on its wheels |
| A | bring the truck in front of you |
| Right stick up/down | bigger / smaller (1/40 … 1/5 scale; starts at 1/14 = 36 cm long) |
| Left grip | horn |
| Left stick click | wheel-well LED lights on/off |

## Driving model (`scripts/truck.gd`)

A rigid body with all six degrees of freedom on the floor (`floor_ground.gd`), fixed 180 Hz
steps: four spring-damper wheels with anti-roll bars and suspension geometry (anti-squat/anti-dive,
roll centres), tyres with combined-slip grip curves inside a friction circle, a supercharged V8 torque curve (~870 N·m)
with torque converter and 6-speed automatic, open diffs with brake traction control, a rear
auto-locker below 32 km/h, 4x4 transfer case, ABS, handbrake, body contacts (roll-overs) and
furniture boxes (impulse at the contact point). Numbers are typical for the class, not factory data.

## Build and tests

- `.github/workflows/quest-gmc-apk.yml` (branch `quest-gmc-ar`) builds, tests and verifies the APK
  and publishes it at the `gmc-ar-latest` pre-release:
  `https://github.com/3wasfnjd/Kassab/releases/download/gmc-ar-latest/kassab-gmc-ar.apk`
  (signed with the public TEST key — sideload only).
- `tools/run_tests.sh` — headless checks: model file (wheels round, straight, on their hubs),
  standing, 0-100, braking, drift, furniture hits, stability at 72/90/120 fps, frame-rate independence.
