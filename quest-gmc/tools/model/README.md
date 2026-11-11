# GMC model pipeline

`source/gmc_pickup_tripo.glb` is the GMC pickup model supplied by the owner (Tripo export: one mesh,
511,050 triangles, one 2048² base-colour JPEG). `models/gmc.glb` is made from it, reproducibly
(the result is byte-identical when re-run):

1. `python3 split.py source/gmc_pickup_tripo.glb /tmp/m/gmc_split.glb`
   cuts the four wheels out at their hubs (centres and radius measured from the tyre profiles),
   re-centres each wheel on its hub so it can spin and steer, scales to metres (5.0 m long).
2. `godot --headless --path /tmp/m -s bake.gd -- 0` (any Godot 4.6.3 project folder holding
   `gmc_split.glb` and `bake.gd`) runs Godot's meshoptimizer LOD generator and keeps LOD 0
   (half the triangles, error ≈ 0.16 % of the model size): 255,522 triangles.
3. `python3 write_lod_glb.py /tmp/m /tmp/m/gmc_split.glb ../../models/gmc.glb`
   writes the final GLB with the original JPEG byte for byte.

Godot then builds further automatic LODs on import, so the truck costs less when it is small in view.
This folder is ignored by Godot (`.gdignore`) and excluded from the APK.
