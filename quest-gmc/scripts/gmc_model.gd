class_name GmcModel
extends Node3D
## The GMC from models/gmc.glb (the user's model: body + four wheels split at their hubs by
## tools/model/split.py), placed and animated from the Truck simulation.

const NAMES := ["FL", "FR", "RL", "RR"]
var body: MeshInstance3D
var wheels: Array[Node3D] = []
var rest: Array[Vector3] = []
var brake_glow: Array[MeshInstance3D] = []
var _glow_mat: StandardMaterial3D
var well_lights: Array[Node3D] = []
var lights_on := true


func _init() -> void:
	var scene: PackedScene = load("res://models/gmc.glb")
	var s := scene.instantiate()
	add_child(s)
	for n in NAMES:
		var w: Node3D = s.find_child(n, true, false)
		wheels.append(w)
		rest.append(w.position)
	body = s.find_child("Body", true, false)
	# paint: the source texture already carries its shading; a little sheen reads as car paint
	for mi in s.find_children("*", "MeshInstance3D", true, false):
		var m := (mi as MeshInstance3D).get_active_material(0)
		if m is StandardMaterial3D and (m as StandardMaterial3D).albedo_texture != null:
			var sm := (m as StandardMaterial3D).duplicate() as StandardMaterial3D
			sm.roughness = 0.62 if mi == body else 0.85
			sm.metallic_specular = 0.55 if mi == body else 0.3
			sm.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
			(mi as MeshInstance3D).material_override = sm
	# brake lights: a soft red glow over each tail lamp, lit while braking
	_glow_mat = StandardMaterial3D.new()
	_glow_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_glow_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_glow_mat.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	_glow_mat.albedo_color = Color(1.0, 0.12, 0.08, 0.0)
	_glow_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	for sx in [1.0, -1.0]:
		var q := QuadMesh.new()
		q.size = Vector2(0.15, 0.36)
		var g := MeshInstance3D.new()
		g.mesh = q
		g.material_override = _glow_mat
		g.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		g.position = Vector3(0.955 * sx, 1.225, -2.47)   # over the tail lamps (from the texture)
		g.rotation.y = PI
		add_child(g)
		brake_glow.append(g)


	_bed_cover()
	_well_leds()


## Hard folding bed cover (tri-fold style, like the owner's photo): four matte black panels lying
## flush on the bed rails, thin seams across, an aluminium edge frame and a rear latch.
## Measured from the model: rails x ±0.955, top y 1.497 (front) … 1.528 (tailgate), bed opening
## from the cab wall z −0.235 to the tailgate top z −2.40.
func _bed_cover() -> void:
	var cover := Node3D.new()
	cover.name = "BedCover"
	var z0 := -0.235
	var z1 := -2.40
	var y0 := 1.505
	var y1 := 1.536
	var blen := z0 - z1
	cover.position = Vector3(0, (y0 + y1) * 0.5 + 0.012, (z0 + z1) * 0.5)
	cover.rotation.x = atan2(y1 - y0, blen)           # follows the rails' slight rise to the back
	add_child(cover)
	var panel_m := StandardMaterial3D.new()
	panel_m.albedo_color = Color(0.045, 0.045, 0.05)
	panel_m.roughness = 0.5
	panel_m.metallic_specular = 0.6
	var frame_m := StandardMaterial3D.new()
	frame_m.albedo_color = Color(0.11, 0.11, 0.12)
	frame_m.roughness = 0.35
	frame_m.metallic = 0.6
	var n := 4
	var gap := 0.012
	var pl := (blen - gap * (n - 1)) / n
	for i in n:
		var b := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = Vector3(1.86, 0.03, pl)
		b.mesh = bm
		b.material_override = panel_m
		b.position = Vector3(0, 0, blen * 0.5 - pl * 0.5 - i * (pl + gap))
		cover.add_child(b)
		# a faint ridge along each panel's front edge (the hinge)
		if i > 0:
			var h := MeshInstance3D.new()
			var hm := BoxMesh.new()
			hm.size = Vector3(1.8, 0.012, 0.02)
			h.mesh = hm
			h.material_override = frame_m
			h.position = Vector3(0, 0.012, blen * 0.5 - i * (pl + gap) + gap * 0.5)
			cover.add_child(h)
	for sx in [-1.0, 1.0]:
		var r := MeshInstance3D.new()
		var rm := BoxMesh.new()
		rm.size = Vector3(0.05, 0.04, blen + 0.02)
		r.mesh = rm
		r.material_override = frame_m
		r.position = Vector3(0.93 * sx, -0.004, 0)
		cover.add_child(r)
	var latch := MeshInstance3D.new()
	var lm := BoxMesh.new()
	lm.size = Vector3(0.16, 0.018, 0.05)
	latch.mesh = lm
	latch.material_override = frame_m
	latch.position = Vector3(0, 0.02, -blen * 0.5 + 0.09)
	cover.add_child(latch)


## Warm LED strips tucked under each fender lip (like the owner's photo), lighting the tyre.
## The arc hugs the wheel arch: radius ~0.53 m at the sides, ~0.63 m at the top, 0.96 m out.
func _well_leds() -> void:
	var led_m := StandardMaterial3D.new()
	led_m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	led_m.albedo_color = Color(1.0, 0.93, 0.72)
	for i in 4:
		var hub: Vector3 = Truck.HUBS[i]
		var sx := signf(hub.x)
		var holder := Node3D.new()
		holder.position = Vector3(0.985 * sx, hub.y, hub.z)
		add_child(holder)
		var st := SurfaceTool.new()
		st.begin(Mesh.PRIMITIVE_TRIANGLES)
		var seg := 28
		for k in seg + 1:
			var a := deg_to_rad(lerpf(28.0, 152.0, float(k) / seg))
			var r := 0.53 + 0.10 * sin(a)
			var p := Vector3(0, sin(a) * r, cos(a) * r)
			var inward := -Vector3(0, sin(a), cos(a)) * 0.03     # strip width, toward the tyre
			st.add_vertex(p)
			st.add_vertex(p + inward + Vector3(-0.012 * sx, 0, 0))
		for k in seg:
			var a0 := k * 2
			st.add_index(a0); st.add_index(a0 + 1); st.add_index(a0 + 2)
			st.add_index(a0 + 1); st.add_index(a0 + 3); st.add_index(a0 + 2)
		var strip := MeshInstance3D.new()
		strip.mesh = st.commit()
		strip.material_override = led_m
		strip.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		holder.add_child(strip)
		# the light it throws: a soft additive glow fanning down from the strip toward the tyre
		# (real lights don't work at toy scale: inverse-square light blows out at a few cm)
		var gs := SurfaceTool.new()
		gs.begin(Mesh.PRIMITIVE_TRIANGLES)
		for k in seg + 1:
			var a := deg_to_rad(lerpf(28.0, 152.0, float(k) / seg))
			var r := 0.53 + 0.10 * sin(a)
			var dir := Vector3(0, sin(a), cos(a))
			var fade := sin(a)
			gs.set_color(Color(1.0, 0.85, 0.55, 0.85 * fade))
			gs.add_vertex(dir * (r - 0.02) + Vector3(0.004 * sx, 0, 0))
			gs.set_color(Color(1.0, 0.85, 0.55, 0.0))
			gs.add_vertex(dir * (r - 0.17) + Vector3(-0.02 * sx, 0, 0))
		for k in seg:
			var a0 := k * 2
			gs.add_index(a0); gs.add_index(a0 + 1); gs.add_index(a0 + 2)
			gs.add_index(a0 + 1); gs.add_index(a0 + 3); gs.add_index(a0 + 2)
		var glow := MeshInstance3D.new()
		glow.mesh = gs.commit()
		var gm := StandardMaterial3D.new()
		gm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		gm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		gm.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
		gm.vertex_color_use_as_albedo = true
		gm.cull_mode = BaseMaterial3D.CULL_DISABLED
		gm.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
		glow.material_override = gm
		glow.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		holder.add_child(glow)
		well_lights.append(holder)


func set_world_scale(_z: float) -> void:
	pass   # (kept for main.gd; the glow needs no scale)


func set_lights(on: bool) -> void:
	lights_on = on
	for h in well_lights:
		h.visible = on


func apply(tr: Truck, braking: bool) -> void:
	transform = tr.model_xf(tr.alpha())
	for i in 4:
		var w := wheels[i]
		w.position = rest[i] - Vector3.UP * clampf(tr.ext[i], Truck.BUMP, Truck.DROOP - 0.03)
		w.basis = Basis(Vector3.UP, tr.angle[i]) * Basis(Vector3.RIGHT, tr.spin[i])
	_glow_mat.albedo_color.a = move_toward(_glow_mat.albedo_color.a, 0.85 if braking else 0.0, 0.2)
