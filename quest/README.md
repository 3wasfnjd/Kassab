# كساب — Kassab Quest

Native Meta Quest app of Kassab (Godot 4.6.3, OpenXR Vendors 5.1.0). Everything in the world is built
in code (`scripts/`): the desert (`terrain.gd`), the 4x4 «الربع» (`car_model.gd`), its physics (`car.gd`),
dust and tracks (`fx.gd`); `main.gd` wires the VR rig and the controls.

Phase 1 — the drive. Controls: right trigger gas · left trigger brake/reverse · left stick steer ·
A seat / chase view · Y 4x4 · B put the car back on its wheels.

Build: `.github/workflows/quest-apk.yml` (APK artifact, test-signed for sideloading).
Tests: `tools/run_tests.sh` (headless physics checks).
