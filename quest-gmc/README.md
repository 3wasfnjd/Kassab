# كساب GMC — AR (Meta Quest 3)

The owner's GMC pickup (their model, `models/gmc.glb`, built from `tools/model/source/`) drives on a
patch of desert laid on your real room floor through passthrough. Free roaming in every direction:
only the sand around the truck is drawn, fading into the room, and when the truck runs past arm's
reach the desert slides it back toward you.

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
| A | bring the truck back in front of you |
| Right stick up/down | bigger / smaller (1/40 … 1/6 scale) |
| Left grip | horn |

## Driving model (`scripts/truck.gd`)

A rigid body with all six degrees of freedom on the analytic ground (`terrain.gd`), fixed 180 Hz
steps: four spring-damper wheels with anti-roll bars and suspension geometry (anti-squat/anti-dive,
roll centres), tyres with combined-slip grip curves inside a friction circle (sand: less grip, more
rolling resistance), a V8 torque curve with torque converter and 6-speed automatic, open diffs with
brake traction control, a rear auto-locker below 32 km/h, 4x4 transfer case, ABS, handbrake, body
contacts (roll-overs, high-centring). Numbers are typical for the class, not factory data.

Terrain changes for this app (its own copy of `terrain.gd`): rounded dune crests (lee faces ≤ ~27°),
no ripples shorter than the 3 m ground mesh, no props — just the truck on clean sand.

## Build and tests

- `.github/workflows/quest-gmc-apk.yml` (branch `quest-gmc-ar`) builds, tests and verifies the APK
  and publishes it at the `gmc-ar-latest` pre-release:
  `https://github.com/3wasfnjd/Kassab/releases/download/gmc-ar-latest/kassab-gmc-ar.apk`
  (signed with the public TEST key — sideload only).
- `tools/run_tests.sh` — headless checks: model file, standing, 0-100, braking, drift, dunes,
  stability at 72/90/120 fps, frame-rate independence.
