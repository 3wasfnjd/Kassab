extends SceneTree
# writes res://lod_<name>.bin (uint32 LOD indices into the part's own vertex list) for the chosen LOD
func _init():
	var level := int(OS.get_cmdline_user_args()[0]) if OS.get_cmdline_user_args().size() > 0 else 0
	var d := GLTFDocument.new(); var s := GLTFState.new()
	d.append_from_file(ProjectSettings.globalize_path("res://gmc_split.glb"), s)
	var nodes := s.get_nodes()
	for i in s.get_meshes().size():
		var im: ImporterMesh = s.get_meshes()[i].mesh
		im.generate_lods(25, 60, [])
		var idx: PackedInt32Array = im.get_surface_lod_indices(0, level)
		var f := FileAccess.open(ProjectSettings.globalize_path("res://lod_%d.bin" % i), FileAccess.WRITE)
		f.store_buffer(idx.to_byte_array()); f.close()
		# vertex order check: Godot may reorder vertices on import, so also dump positions
		var pos: PackedVector3Array = im.get_surface_arrays(0)[Mesh.ARRAY_VERTEX]
		var nrm: PackedVector3Array = im.get_surface_arrays(0)[Mesh.ARRAY_NORMAL]
		var uv: PackedVector2Array = im.get_surface_arrays(0)[Mesh.ARRAY_TEX_UV]
		f = FileAccess.open(ProjectSettings.globalize_path("res://v_%d.bin" % i), FileAccess.WRITE)
		f.store_buffer(pos.to_byte_array()); f.store_buffer(nrm.to_byte_array()); f.store_buffer(uv.to_byte_array()); f.close()
		print(i, " ", im.get_surface_name(0), " verts ", pos.size(), " tris ", idx.size() / 3)
	quit()
