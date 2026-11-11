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
		if m is StandardMaterial3D:
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


func apply(tr: Truck, braking: bool) -> void:
	transform = tr.model_xf(tr.alpha())
	for i in 4:
		var w := wheels[i]
		w.position = rest[i] - Vector3.UP * clampf(tr.ext[i], Truck.BUMP, Truck.DROOP - 0.03)
		w.basis = Basis(Vector3.UP, tr.angle[i]) * Basis(Vector3.RIGHT, tr.spin[i])
	_glow_mat.albedo_color.a = move_toward(_glow_mat.albedo_color.a, 0.85 if braking else 0.0, 0.2)
