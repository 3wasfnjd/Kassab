class_name MeshKit
extends RefCounted
## Builds flat-shaded low-poly meshes from code: every triangle carries its own colour and
## normal, so faces read crisp in the "clean low-poly" style. Triangles of convex parts are
## turned to face away from the part's centre, so a part never needs hand-checked winding.

var verts := PackedVector3Array()
var norms := PackedVector3Array()
var cols := PackedColorArray()
## optional transform applied to everything added (car parts are placed in car space)
var xf := Transform3D.IDENTITY


func tri(a: Vector3, b: Vector3, c: Vector3, col: Color, out_from = null) -> void:
	a = xf * a
	b = xf * b
	c = xf * c
	var n := (b - a).cross(c - a)
	if n.length_squared() < 1e-12:
		return
	if out_from != null:
		var ctr: Vector3 = xf * (out_from as Vector3)
		if n.dot((a + b + c) / 3.0 - ctr) < 0.0:
			var t := b
			b = c
			c = t
			n = -n
	# Godot's front faces wind clockwise
	n = n.normalized()
	verts.append_array([a, c, b])
	norms.append_array([n, n, n])
	cols.append_array([col, col, col])


## A triangle with its own vertex normals (smooth curved surfaces); wound to face along `out`.
func tri_n(a: Vector3, b: Vector3, c: Vector3, na: Vector3, nb: Vector3, nc: Vector3, col: Color) -> void:
	a = xf * a
	b = xf * b
	c = xf * c
	na = (xf.basis * na).normalized()
	nb = (xf.basis * nb).normalized()
	nc = (xf.basis * nc).normalized()
	if (b - a).cross(c - a).dot(na + nb + nc) < 0.0:
		verts.append_array([a, b, c])
		norms.append_array([na, nb, nc])
	else:
		verts.append_array([a, c, b])
		norms.append_array([na, nc, nb])
	cols.append_array([col, col, col])


func quad(a: Vector3, b: Vector3, c: Vector3, d: Vector3, col: Color, out_from = null) -> void:
	tri(a, b, c, col, out_from)
	tri(a, c, d, col, out_from)


## A box with chamfered edges (c = chamfer size). `basis` turns it about its centre.
func box(center: Vector3, size: Vector3, col: Color, c := 0.0, basis := Basis.IDENTITY, col_top = null) -> void:
	var h := size * 0.5
	c = minf(c, minf(h.x, minf(h.y, h.z)) * 0.95)
	var P := func(p: Vector3) -> Vector3: return center + basis * p
	var top: Color = col if col_top == null else col_top
	if c <= 0.0:
		var p := []
		for i in 8:
			p.append(P.call(Vector3(h.x if i & 1 else -h.x, h.y if i & 2 else -h.y, h.z if i & 4 else -h.z)))
		var faces := [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]]
		for fi in faces.size():
			var f: Array = faces[fi]
			quad(p[f[0]], p[f[1]], p[f[2]], p[f[3]], top if fi == 3 else col, center)
		return
	# six faces
	for ax in 3:
		for sg in [-1.0, 1.0]:
			var u := (ax + 1) % 3
			var v := (ax + 2) % 3
			var q := []
			for k in 4:
				var p := Vector3.ZERO
				p[ax] = sg * h[ax]
				p[u] = (h[u] - c) * (1.0 if k == 1 or k == 2 else -1.0)
				p[v] = (h[v] - c) * (1.0 if k >= 2 else -1.0)
				q.append(P.call(p))
			quad(q[0], q[1], q[2], q[3], top if (ax == 1 and sg > 0) else col, center)
	# twelve edge bevels
	for ax in 3:
		var u := (ax + 1) % 3
		var v := (ax + 2) % 3
		for su in [-1.0, 1.0]:
			for sv in [-1.0, 1.0]:
				var a := Vector3.ZERO
				var b := Vector3.ZERO
				a[u] = su * h[u]
				a[v] = sv * (h[v] - c)
				b[u] = su * (h[u] - c)
				b[v] = sv * h[v]
				var a0 := a
				var a1 := a
				var b0 := b
				var b1 := b
				a0[ax] = -(h[ax] - c)
				a1[ax] = h[ax] - c
				b0[ax] = -(h[ax] - c)
				b1[ax] = h[ax] - c
				var bc: Color = top if ((u == 1 and su > 0) or (v == 1 and sv > 0)) else col
				quad(P.call(a0), P.call(a1), P.call(b1), P.call(b0), bc, center)
	# eight corners
	for sx in [-1.0, 1.0]:
		for sy in [-1.0, 1.0]:
			for sz in [-1.0, 1.0]:
				var a: Vector3 = P.call(Vector3(sx * h.x, sy * (h.y - c), sz * (h.z - c)))
				var b: Vector3 = P.call(Vector3(sx * (h.x - c), sy * h.y, sz * (h.z - c)))
				var d: Vector3 = P.call(Vector3(sx * (h.x - c), sy * (h.y - c), sz * h.z))
				tri(a, b, d, top if sy > 0 else col, center)


## A box stretched between two points (pillars, rails, spokes).
func beam(p0: Vector3, p1: Vector3, w: float, t: float, col: Color, c := 0.0, up := Vector3.UP) -> void:
	var d := p1 - p0
	var L := d.length()
	if L < 1e-5:
		return
	var z := d / L
	var x := up.cross(z)
	if x.length_squared() < 1e-6:
		x = Vector3.RIGHT.cross(z)
	x = x.normalized()
	var y := z.cross(x).normalized()
	box((p0 + p1) * 0.5, Vector3(w, t, L), col, c, Basis(x, y, z))


## A prism with any convex cross-section `pts` (Vector2 in the x/y plane) extruded along z.
func prism(pts: Array, z0: float, z1: float, col: Color, cap_col = null, basis := Basis.IDENTITY, origin := Vector3.ZERO) -> void:
	var n := pts.size()
	var ctr := Vector2.ZERO
	for p in pts:
		ctr += p
	ctr /= n
	var center := origin + basis * Vector3(ctr.x, ctr.y, (z0 + z1) * 0.5)
	var capc: Color = col if cap_col == null else cap_col
	for i in n:
		var a: Vector2 = pts[i]
		var b: Vector2 = pts[(i + 1) % n]
		quad(origin + basis * Vector3(a.x, a.y, z0), origin + basis * Vector3(b.x, b.y, z0),
			origin + basis * Vector3(b.x, b.y, z1), origin + basis * Vector3(a.x, a.y, z1), col, center)
	for i in range(1, n - 1):
		for z in [z0, z1]:
			tri(origin + basis * Vector3(pts[0].x, pts[0].y, z), origin + basis * Vector3(pts[i].x, pts[i].y, z),
				origin + basis * Vector3(pts[i + 1].x, pts[i + 1].y, z), capc, center)


## A cylinder along `axis` (wheels, lamps, pipes). r1 != r0 gives a cone or a taper.
## smooth: the sides get round normals (tyres, lamps) instead of facets. `stripes` alternates
## a darker colour every other side (tyre tread) without extra geometry.
func cyl(center: Vector3, axis: Vector3, r0: float, r1: float, length: float, sides: int, col: Color, cap_col = null, caps := true, smooth := false, stripes = null) -> void:
	var z := axis.normalized()
	var x := (Vector3.UP if absf(z.y) < 0.9 else Vector3.RIGHT).cross(z).normalized()
	var y := z.cross(x)
	var a0 := center - z * length * 0.5
	var a1 := center + z * length * 0.5
	var capc: Color = col if cap_col == null else cap_col
	var slope := (r0 - r1) / maxf(length, 1e-4)
	for i in sides:
		var t0 := TAU * i / sides
		var t1 := TAU * (i + 1) / sides
		var d0 := x * cos(t0) + y * sin(t0)
		var d1 := x * cos(t1) + y * sin(t1)
		var sc: Color = col if (stripes == null or i % 2 == 0) else stripes
		if smooth:
			var n0 := (d0 + z * slope).normalized()
			var n1 := (d1 + z * slope).normalized()
			tri_n(a0 + d0 * r0, a0 + d1 * r0, a1 + d1 * r1, n0, n1, n1, sc)
			tri_n(a0 + d0 * r0, a1 + d1 * r1, a1 + d0 * r1, n0, n1, n0, sc)
		else:
			quad(a0 + d0 * r0, a0 + d1 * r0, a1 + d1 * r1, a1 + d0 * r1, sc, center)
		if caps:
			tri(a0, a0 + d0 * r0, a0 + d1 * r0, capc, center)
			tri(a1, a1 + d1 * r1, a1 + d0 * r1, capc, center)


## A ring (torus) made of `seg` straight pieces — steering wheels, tyres' sidewalls.
func ring(center: Vector3, axis: Vector3, R: float, r: float, seg: int, sides: int, col: Color) -> void:
	var z := axis.normalized()
	var x := (Vector3.UP if absf(z.y) < 0.9 else Vector3.RIGHT).cross(z).normalized()
	var y := z.cross(x)
	for i in seg:
		for j in sides:
			var p := []
			for k in 4:
				var ti := TAU * (i + (1 if k == 1 or k == 2 else 0)) / seg
				var tj := TAU * (j + (1 if k >= 2 else 0)) / sides
				var dir := x * cos(ti) + y * sin(ti)
				p.append(center + dir * (R + r * cos(tj)) + z * (r * sin(tj)))
			var mid := center + (x * cos(TAU * (i + 0.5) / seg) + y * sin(TAU * (i + 0.5) / seg)) * R
			quad(p[0], p[1], p[2], p[3], col, mid)


func is_empty() -> bool:
	return verts.is_empty()


func commit(mesh: ArrayMesh = null, mat: Material = null) -> ArrayMesh:
	if mesh == null:
		mesh = ArrayMesh.new()
	if verts.is_empty():
		return mesh
	var arr := []
	arr.resize(Mesh.ARRAY_MAX)
	arr[Mesh.ARRAY_VERTEX] = verts
	arr[Mesh.ARRAY_NORMAL] = norms
	arr[Mesh.ARRAY_COLOR] = cols
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
	if mat:
		mesh.surface_set_material(mesh.get_surface_count() - 1, mat)
	return mesh


static func vc_material(rough := 0.85, metal := 0.0, emit := 0.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.vertex_color_use_as_albedo = true
	m.roughness = rough
	m.metallic = metal
	if emit > 0.0:
		m.emission_enabled = true
		m.emission_energy_multiplier = emit
	return m
