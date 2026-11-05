# Vendored addons

| Addon | Version | Source | Release AAR SHA-256 |
| --- | --- | --- | --- |
| Godot OpenXR Vendors | 5.1.0-stable (19 May 2026) | https://github.com/GodotVR/godot_openxr_vendors/releases/tag/5.1.0-stable (`godotopenxrvendorsaddon.zip`) | `godotopenxr-meta-release.aar` dad2b601b82c736c4c990357d598d1fb29d124da8c6bc0f3956fc7cdcd5eaf0f |
| Godot Meta Toolkit | not recorded when added (12 Oct 2026, commit 3214da4); the binary declares compatibility_minimum 4.3 | https://github.com/GodotVR/godot_meta_toolkit/releases | `godot_meta_toolkit-release.aar` 7e9df20b10a99f3c4e58dab82378bc472c141373a104bc7d687b0712ed5b3695; `libgodot_meta_toolkit.so` (android arm64 release) 100b10bb9d847daa3a4f3626c07216e013402a13134b9d7eb0d12b6b667477dd |

The OpenXR Vendors Meta release AAR is committed (it used to be ignored by the root
`release/` rule), so release exports no longer depend on fetching it at build time; it is
byte-identical to the official 5.1.0-stable package (its debug AAR matches the one already here).
When updating either addon, update this table and the licenses in `licenses/THIRD_PARTY_LICENSES.txt`.
