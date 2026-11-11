class_name FloorGround
extends RefCounted
## The ground the truck drives on: your real room floor (flat, height 0 in the truck's space),
## grippy like a smooth hard floor. Furniture comes in as boxes (see Truck.boxes).

var trees: Array[Vector3] = []   # (no round obstacles on a room floor)


func height_at(_x: float, _z: float) -> float:
	return 0.0


func normal_at(_x: float, _z: float) -> Vector3:
	return Vector3.UP


func soft_at(_x: float, _z: float) -> float:
	return 0.0
