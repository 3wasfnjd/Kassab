# Split the user's Tripo GMC mesh (one mesh, 511k triangles) into body + 4 wheels, each wheel
# re-centred on its hub so it can spin and steer; scale to metres; write a GLB with the original
# texture untouched. Hubs/radius were measured from the mesh (circle fits of the tyre profiles).
# Usage: python3 split.py source.glb out_split.glb
import numpy as np, json, struct, sys
src, out = sys.argv[1], sys.argv[2]
R = float(sys.argv[3]) if len(sys.argv) > 3 else 0.099   # cut radius around each hub (model units)
S = 5.0  # model units -> metres (the Tripo model is 1.0 long; the truck is 5.0 m)
f = open(src, 'rb'); f.read(12); l, _ = struct.unpack('<II', f.read(8)); j = json.loads(f.read(l))
bl, _ = struct.unpack('<II', f.read(8)); buf = f.read(bl)
def acc(i):
    a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]
    n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[a['type']]
    dt = {5126: np.float32, 5125: np.uint32, 5123: np.uint16}[a['componentType']]
    o = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    r = np.frombuffer(buf, dt, a['count'] * n, o)
    return r.reshape(-1, n) if n > 1 else r
prim = j['meshes'][0]['primitives'][0]
P = acc(prim['attributes']['POSITION']).astype(np.float64); N = acc(prim['attributes']['NORMAL'])
UV = acc(prim['attributes']['TEXCOORD_0']); T = acc(prim['indices']).reshape(-1, 3)
ib = j['bufferViews'][j['images'][0]['bufferView']]
img = buf[ib.get('byteOffset', 0):ib.get('byteOffset', 0) + ib['byteLength']]
YC = 0.097
W = {'FL': (+1, 0.333, 0.142, 0.252), 'FR': (-1, 0.333, 0.142, 0.252),
     'RL': (+1, -0.2545, 0.146, 0.232), 'RR': (-1, -0.2545, 0.146, 0.232)}
# NB: +X in the model is the car's left (front is +Z, up +Y -> +X is the driver's... left side seen from behind)
taken = np.zeros(len(T), bool); parts = {}
for k, (sx, zc, x0, x1) in W.items():
    x = sx * P[:, 0]; dd = np.hypot(P[:, 2] - zc, P[:, 1] - YC)
    vin = (x > x0) & (x < x1) & (dd < R)
    tin = vin[T].all(1) & ~taken
    taken |= tin
    hub = np.array([sx * (x0 + x1) / 2, YC, zc])
    parts[k] = (T[tin], hub)
parts['Body'] = (T[~taken], np.zeros(3))
print({k: len(v[0]) for k, v in parts.items()})
bins = bytearray(); views = []; accs = []; meshes = []; nodes = []
def add(arr, target=None):
    global bins
    while len(bins) % 4: bins += b'\0'
    off = len(bins); b = arr.tobytes(); bins += b
    v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(b)}
    if target: v['target'] = target
    views.append(v); return len(views) - 1
for name, (tris, hub) in parts.items():
    used, inv = np.unique(tris.reshape(-1), return_inverse=True)
    pos = ((P[used] - hub) * S).astype(np.float32); nor = N[used].astype(np.float32); uv = UV[used].astype(np.float32)
    idx = inv.astype(np.uint32)
    a0 = len(accs)
    accs.append({'bufferView': add(pos, 34962), 'componentType': 5126, 'count': len(pos), 'type': 'VEC3', 'min': pos.min(0).tolist(), 'max': pos.max(0).tolist()})
    accs.append({'bufferView': add(nor, 34962), 'componentType': 5126, 'count': len(nor), 'type': 'VEC3'})
    accs.append({'bufferView': add(uv, 34962), 'componentType': 5126, 'count': len(uv), 'type': 'VEC2'})
    accs.append({'bufferView': add(idx, 34963), 'componentType': 5125, 'count': len(idx), 'type': 'SCALAR'})
    meshes.append({'name': name, 'primitives': [{'attributes': {'POSITION': a0, 'NORMAL': a0+1, 'TEXCOORD_0': a0+2}, 'indices': a0+3, 'material': 0}]})
    nodes.append({'name': name, 'mesh': len(meshes)-1, 'translation': (hub * S).tolist()})
iv = add(np.frombuffer(img, np.uint8))
gl = {'asset': {'version': '2.0', 'generator': 'Aboden split.py (from Tripo GMC)'}, 'scene': 0,
      'scenes': [{'nodes': [len(nodes)]}],
      'nodes': nodes + [{'name': 'GMC', 'children': list(range(len(nodes)))}],
      'meshes': meshes, 'accessors': accs, 'bufferViews': views,
      'buffers': [{'byteLength': 0}],
      'images': [{'bufferView': iv, 'mimeType': 'image/jpeg', 'name': 'gmc_basecolor'}],
      'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}],
      'textures': [{'source': 0, 'sampler': 0}],
      'materials': [{'name': 'gmc', 'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicFactor': 0.0, 'roughnessFactor': 0.9}}]}
while len(bins) % 4: bins += b'\0'
gl['buffers'][0]['byteLength'] = len(bins)
js = json.dumps(gl, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
with open(out, 'wb') as f:
    f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bins)))
    f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
    f.write(struct.pack('<II', len(bins), 0x004E4942)); f.write(bins)
print('wrote', out)
