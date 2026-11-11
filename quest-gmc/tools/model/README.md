# GMC model pipeline

`source/gmc_pickup_tripo.glb` is the GMC pickup model supplied by the owner (Tripo export: one mesh,
511,050 triangles, one 2048² base-colour JPEG). `models/gmc.glb` is made from it, reproducibly
:

1. `python3 split.py source/gmc_pickup_tripo.glb /tmp/m/gmc_split.glb`
   - the rear wheels are separate pieces in the source: taken exactly as they are;
   - the front wheels are fused into the body **and modelled steered** (turned), which made them
     wobble when spun and left torn bits when cut out: the old front tyres are removed and
     replaced by exact copies of the rear wheels, straight, at the front hubs;
   - the source has no inner liner in the front wheel wells (the fused tyre closed them), so each
     gets a plain dark liner (`WellLiner`, unlit);
   - each wheel is centred on its hub (hubs ±0.943 / 0.457 / +1.660 & −1.276 m, tyre radius
     0.457 m), everything scaled to metres (5.0 m long).
2. `godot --headless --path /tmp/m -s bake.gd -- 0` (any Godot 4.6.3 project folder holding
   `gmc_split.glb` and `bake.gd`) runs Godot's meshoptimizer LOD generator on the textured parts
   and keeps LOD 0 (half the triangles): 254,638 triangles.
3. `python3 write_lod_glb.py /tmp/m /tmp/m/gmc_split.glb ../../models/gmc.glb`
   writes the final GLB with the original JPEG byte for byte.

Godot then builds further automatic LODs on import, so the truck costs less when it is small in view.
This folder is ignored by Godot (`.gdignore`) and excluded from the APK.
