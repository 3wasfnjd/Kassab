# كساب GMC — AR (Meta Quest 3)

The owner's GMC pickup (their model, `models/gmc.glb`, built from `tools/model/source/`) in free
room mode, like Hajwala's: it drives on your real floor through passthrough — nothing is drawn
under it but a soft contact shade and its skid marks (which fade after 9 s). Furniture from the
headset's Space Setup (tables, sofa, bed, storage…) are solid, invisible obstacles when the
headset has them (`OpenXRFbSceneManager`, permission `com.oculus.permission.USE_SCENE`); walls,
doors and windows are not. No text on screen; toggles answer with a controller buzz.

Mods (from the owner's photos): a hard folding bed cover (four black panels flush on the rails)
and warm LED strips under each fender lip.

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
| Y | 4x4 on/off (pulls away harder) |
| X | wheel-well LED lights on/off |
| B | straighten the truck up where it stands |
| A | bring the truck in front of you |
| Right stick up/down | bigger / smaller (1/40 … 1/5 scale; starts at 1/14 = 36 cm long) |
| Left grip | horn |
| Left stick click | wheel-well LED lights on/off (same as X) |

## Driving (`scripts/truck.gd`)

The same physics as Hajwala's free room mode (Kenney's Starter Kit Racing model as ported in
3wasfnjd/hajwala `js/Vehicle.js` + `js/Physics.js`): an invisible ball rolls on the floor and
carries the truck; the throttle eases a target speed in and spins the ball, the steering turns
the truck itself, and the ball's own momentum makes the slides and drifts. Hajwala's numbers are
used unchanged in Hajwala's units and scaled up to the 5 m GMC, ×1.5 faster (asked for). The body
pitches and leans like Hajwala's. Furniture boxes push the ball back (restitution 0.2).

Plates: the same Saudi plate as the GMC in the Kassab web game (`saudiPlate()` in `index.html`,
٥٤٥٢ ب ك ك / 5452 B K K), rendered from that code into `textures/plate_gmc.png`.

## Build and tests

- `.github/workflows/quest-gmc-apk.yml` (branch `quest-gmc-ar`) builds, tests and verifies the APK
  and publishes it at the `gmc-ar-latest` pre-release:
  `https://github.com/3wasfnjd/Kassab/releases/download/gmc-ar-latest/kassab-gmc-ar.apk`
  (signed with the public TEST key — sideload only).
- `tools/run_tests.sh` — headless checks: model file (wheels round, straight, on their hubs),
  bed cover, LEDs and plate, standing, pull-away, top speed, braking, reverse, slides and handbrake
  turns, furniture hits, stability at 72/90/120 fps, frame-rate independence.
