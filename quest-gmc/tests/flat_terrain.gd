extends Terrain
## Test ground: an endless flat gravel plate.
func height_at(x: float, z: float) -> float:
	return 0.0
func normal_at(x: float, z: float) -> Vector3:
	return Vector3.UP
func soft_at(x: float, z: float) -> float:
	return 0.0
