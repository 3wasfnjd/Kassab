# Clean split of the user's Tripo GMC (one mesh, 511k tris, one 2048² texture):
#  - the rear wheels are separate pieces in the source: taken as they are (exact, clean)
#  - the front wheels are fused into the body AND modelled steered (turned), which made them wobble
#    when spun and left torn bits when cut out: they are removed from the body and replaced with
#    exact copies of the rear wheels (same tyre, rim and size) placed at the front hubs, straight
#  - each wheel re-centred on its hub so it can spin and steer; everything scaled to metres
# Usage: python3 split.py source.glb out_split.glb
import numpy as np, json, struct, sys
from collections import defaultdict
src, out = sys.argv[1], sys.argv[2]
S = 5.0
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
P = acc(prim['attributes']['POSITION']).astype(np.float64); N = acc(prim['attributes']['NORMAL']).astype(np.float64)
UV = acc(prim['attributes']['TEXCOORD_0']); T = acc(prim['indices']).reshape(-1, 3).astype(np.int64)
ib = j['bufferViews'][j['images'][0]['bufferView']]
img = buf[ib.get('byteOffset', 0):ib.get('byteOffset', 0) + ib['byteLength']]

# connected pieces (vertices welded by position)
q = np.round(P * 1e5).astype(np.int64); _, wv = np.unique(q, axis=0, return_inverse=True); wv = wv.ravel()
par = np.arange(wv.max() + 1)
def find(a):
    while par[a] != a:
        par[a] = par[par[a]]; a = par[a]
    return a
Tw = wv[T]
for a, b in np.r_[Tw[:, [0, 1]], Tw[:, [1, 2]]]:
    ra, rb = find(a), find(b)
    if ra != rb: par[ra] = rb
root = np.array([find(a) for a in Tw[:, 0]])
ids, cnt = np.unique(root, return_counts=True)
order = ids[np.argsort(-cnt)]
body_t = T[root == order[0]]
rear = {}
for cid in order[1:3]:
    t = T[root == cid]; v = P[np.unique(t)]
    side = 'RL' if v[:, 0].mean() > 0 else 'RR'          # +X is the truck's left
    lo, hi = v.min(0), v.max(0)
    rear[side] = (t, (lo + hi) / 2)
print('rear wheels', {k: (len(v[0]), np.round(v[1], 4).tolist()) for k, v in rear.items()})
ZF = 0.332                                               # front hub (circle fits of both front tyres)
# the front wheels: the source has them fused into the body and modelled steered (turned), so a
# cut-out one wobbles when it spins and leaves torn bits — remove the old tyre and rim entirely
c = P[body_t].mean(1)
rm = np.zeros(len(body_t), bool)
for k, sx in [('RL', 1), ('RR', -1)]:
    hub = rear[k][1]
    dfr = np.hypot(c[:, 2] - ZF, c[:, 1] - hub[1])
    rm |= (sx * c[:, 0] > 0.11) & (sx * c[:, 0] < 0.28) & (dfr < 0.104)
body_t = body_t[~rm]
print('front: removed the old steered tyres', rm.sum(), 'triangles')
parts = [('Body', body_t, np.zeros(3), np.zeros(3))]
# the source's front wheel wells have no inner liner (the fused tyre closed them): give each one
# a plain dark liner — a half-cylinder over the tyre out to the flare, and an inner wall
def shell(sx):
    rr, x0, x1 = 0.112, 0.118, 0.236
    yc = rear['RL'][1][1]
    angs = np.radians(np.linspace(22, 158, 36))
    verts = []; tris = []
    for i, a_ in enumerate(angs):
        y = yc + np.sin(a_) * rr; z = ZF + np.cos(a_) * rr
        verts += [[sx * x0, y, z], [sx * x1, y, z]]
        if i:
            k = 2 * i
            tris += [[k - 2, k - 1, k + 1], [k - 2, k + 1, k]]
    ci = len(verts); verts.append([sx * x0, yc, ZF])          # inner wall (fan)
    for i in range(1, len(angs)):
        tris.append([ci, 2 * (i - 1), 2 * i])
    return np.array(verts) * S, np.array(tris)
liner = [shell(1), shell(-1)]
lv = np.concatenate([liner[0][0], liner[1][0]]); lt = np.concatenate([liner[0][1], liner[1][1] + len(liner[0][0])])
HX = round((rear['RL'][1][0] - rear['RR'][1][0]) / 2 * S, 3)
HY = round((rear['RL'][1][1] + rear['RR'][1][1]) / 2 * S, 3)
ZR = round((rear['RL'][1][2] + rear['RR'][1][2]) / 2 * S, 3)
print('hubs: x ±%.3f  y %.3f  z front %.3f rear %.3f  tyre radius %.3f' % (HX, HY, ZF * S, ZR, HY))
for k in ['FL', 'FR', 'RL', 'RR']:
    t, hub = rear['R' + k[1]]
    shift = np.zeros(3)
    if k[0] == 'F':
        shift = np.array([0.0, 0.0, ZF - hub[2]])
    parts.append((k, t, hub, shift))           # mesh centred on its hub; node at hub + shift
bins = bytearray(); views = []; accs = []; meshes = []; nodes = []
def add(arr, target=None):
    global bins
    while len(bins) % 4: bins += b'\0'
    off = len(bins); b = arr.tobytes(); bins += b
    v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(b)}
    if target: v['target'] = target
    views.append(v); return len(views) - 1
for name, tris, hub, shift in parts:
    used, inv = np.unique(tris.reshape(-1), return_inverse=True)
    pos = ((P[used] - hub) * S).astype(np.float32); nor = N[used].astype(np.float32); uv = UV[used].astype(np.float32)
    idx = inv.astype(np.uint32)
    a0 = len(accs)
    accs.append({'bufferView': add(pos, 34962), 'componentType': 5126, 'count': len(pos), 'type': 'VEC3', 'min': pos.min(0).tolist(), 'max': pos.max(0).tolist()})
    accs.append({'bufferView': add(nor, 34962), 'componentType': 5126, 'count': len(nor), 'type': 'VEC3'})
    accs.append({'bufferView': add(uv, 34962), 'componentType': 5126, 'count': len(uv), 'type': 'VEC2'})
    accs.append({'bufferView': add(idx, 34963), 'componentType': 5125, 'count': len(idx), 'type': 'SCALAR'})
    meshes.append({'name': name, 'primitives': [{'attributes': {'POSITION': a0, 'NORMAL': a0+1, 'TEXCOORD_0': a0+2}, 'indices': a0+3, 'material': 0}]})
    at = (hub + shift) * S
    if name != 'Body':   # symmetric hub places (the two rear pieces differ by ~1 mm)
        at = np.array([HX if name[1] == 'L' else -HX, HY, ZF * S if name[0] == 'F' else ZR])
    nodes.append({'name': name, 'mesh': len(meshes)-1, 'translation': at.round(4).tolist()})
    print(name, len(idx) // 3, 'tris, node at', nodes[-1]['translation'])
# liner: double-sided dark material
pos = lv.astype(np.float32); a0 = len(accs)
accs.append({'bufferView': add(pos, 34962), 'componentType': 5126, 'count': len(pos), 'type': 'VEC3', 'min': pos.min(0).tolist(), 'max': pos.max(0).tolist()})
accs.append({'bufferView': add(lt.astype(np.uint32).reshape(-1), 34963), 'componentType': 5125, 'count': lt.size, 'type': 'SCALAR'})
meshes.append({'name': 'WellLiner', 'primitives': [{'attributes': {'POSITION': a0}, 'indices': a0 + 1, 'material': 1}]})
nodes.append({'name': 'WellLiner', 'mesh': len(meshes) - 1})
iv = add(np.frombuffer(img, np.uint8))
gl = {'asset': {'version': '2.0', 'generator': 'Aboden split.py (from Tripo GMC)'}, 'scene': 0,
      'scenes': [{'nodes': [len(nodes)]}],
      'nodes': nodes + [{'name': 'GMC', 'children': list(range(len(nodes)))}],
      'meshes': meshes, 'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': 0}],
      'images': [{'bufferView': iv, 'mimeType': 'image/jpeg', 'name': 'gmc_basecolor'}],
      'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}],
      'textures': [{'source': 0, 'sampler': 0}],
      'materials': [{'name': 'gmc', 'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicFactor': 0.0, 'roughnessFactor': 0.9}},
                    {'name': 'well', 'doubleSided': True, 'extensions': {'KHR_materials_unlit': {}}, 'pbrMetallicRoughness': {'baseColorFactor': [0.008, 0.008, 0.009, 1.0], 'metallicFactor': 0.0, 'roughnessFactor': 1.0}}],
      'extensionsUsed': ['KHR_materials_unlit']}
while len(bins) % 4: bins += b'\0'
gl['buffers'][0]['byteLength'] = len(bins)
js = json.dumps(gl, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
with open(out, 'wb') as fo:
    fo.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bins)))
    fo.write(struct.pack('<II', len(js), 0x4E4F534A)); fo.write(js)
    fo.write(struct.pack('<II', len(bins), 0x004E4942)); fo.write(bins)
