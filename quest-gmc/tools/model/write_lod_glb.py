# Compose models/gmc.glb from Godot's decimated index lists (bake.gd) + the split GLB's original JPEG.
# Usage: python3 write_lod_glb.py <dir with v_*.bin lod_*.bin> split.glb out.glb
import numpy as np, json, struct, sys
vd, split_glb, out = sys.argv[1:4]
f = open(split_glb, 'rb'); f.read(12); l, _ = struct.unpack('<II', f.read(8)); src = json.loads(f.read(l))
names = [n['name'] for n in src['nodes'] if 'mesh' in n]; trans = [n['translation'] for n in src['nodes'] if 'mesh' in n]
bl, _ = struct.unpack('<II', f.read(8)); sbuf = f.read(bl)
ib = src['bufferViews'][src['images'][0]['bufferView']]
img = sbuf[ib.get('byteOffset', 0):ib.get('byteOffset', 0) + ib['byteLength']]   # the original JPEG, byte for byte
bins = bytearray(); views = []; accs = []; meshes = []; nodes = []
def add(arr, target=None):
    global bins
    while len(bins) % 4: bins += b'\0'
    off = len(bins); b = arr.tobytes(); bins += b
    v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(b)}
    if target: v['target'] = target
    views.append(v); return len(views) - 1
tot = 0
for i, (name, t) in enumerate(zip(names, trans)):
    raw = open(f'{vd}/v_{i}.bin', 'rb').read(); idx = np.fromfile(f'{vd}/lod_{i}.bin', np.uint32)
    nv = len(raw) // 32  # 12 + 12 + 8 bytes per vertex
    a = np.frombuffer(raw, np.float32)
    pos = a[:nv*3].reshape(-1, 3); nor = a[nv*3:nv*6].reshape(-1, 3); uv = a[nv*6:].reshape(-1, 2)
    idx = idx.reshape(-1, 3)[:, [0, 2, 1]].reshape(-1)  # Godot stores clockwise triangles; glTF wants CCW
    used, inv = np.unique(idx, return_inverse=True)
    pos, nor, uv, idx = pos[used].copy(), nor[used].copy(), uv[used].copy(), inv.astype(np.uint32)
    tot += len(idx) // 3
    a0 = len(accs)
    accs.append({'bufferView': add(pos, 34962), 'componentType': 5126, 'count': len(pos), 'type': 'VEC3', 'min': pos.min(0).tolist(), 'max': pos.max(0).tolist()})
    accs.append({'bufferView': add(nor, 34962), 'componentType': 5126, 'count': len(nor), 'type': 'VEC3'})
    accs.append({'bufferView': add(uv, 34962), 'componentType': 5126, 'count': len(uv), 'type': 'VEC2'})
    accs.append({'bufferView': add(idx, 34963), 'componentType': 5125, 'count': len(idx), 'type': 'SCALAR'})
    meshes.append({'name': name, 'primitives': [{'attributes': {'POSITION': a0, 'NORMAL': a0+1, 'TEXCOORD_0': a0+2}, 'indices': a0+3, 'material': 0}]})
    nodes.append({'name': name, 'mesh': len(meshes)-1, 'translation': t})
    print(name, len(pos), 'verts', len(idx)//3, 'tris')
print('total tris', tot)
iv = add(np.frombuffer(img, np.uint8))
gl = dict(src); gl.update({'asset': {'version': '2.0', 'generator': 'Aboden GMC pipeline (Tripo source, split + meshoptimizer LOD via Godot 4.6.3)'},
  'scenes': [{'nodes': [len(nodes)]}], 'nodes': nodes + [{'name': 'GMC', 'children': list(range(len(nodes)))}],
  'meshes': meshes, 'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': 0}],
  'images': [{'bufferView': iv, 'mimeType': 'image/jpeg', 'name': 'gmc_basecolor'}]})
while len(bins) % 4: bins += b'\0'
gl['buffers'][0]['byteLength'] = len(bins)
js = json.dumps(gl, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
with open(out, 'wb') as f:
    f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bins)))
    f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
    f.write(struct.pack('<II', len(bins), 0x004E4942)); f.write(bins)
