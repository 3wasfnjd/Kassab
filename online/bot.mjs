// «كلود»: a guest player run from GitHub Actions. It joins the public world, follows the first real player,
// honks hello, answers a few chat words, and pulls him out with the rope when he is bogged.
const WS = process.argv[2], MINUTES = +process.argv[3] || 15, NAME = 'كلود 🤖';
const ws = new WebSocket(WS + '?w=1');
const P = new Map();               // id -> {n, d, t}
let me = null, x = 0, z = 0, h = 0, v = 0, target = null, towing = null, towT = 0, said = {}, started = Date.now();
const send = o => { if (ws.readyState === 1) ws.send(typeof o === 'string' ? o : JSON.stringify(o)); };
const Q = []; setInterval(() => { if (Q.length) send({ t: 'chat', m: Q.shift() }); }, 2300);   // the server takes one message every 2 s
const say = (m, key) => { if (key && said[key] && Date.now() - said[key] < 20000) return; if (key) said[key] = Date.now(); if (Q.length < 3) Q.push(m); };
ws.onopen = () => send({ t: 'hi', name: NAME, car: 'gmc' });
ws.onerror = e => console.log('ws error', e.message || e);
ws.onclose = () => { console.log('closed'); process.exit(0); };
ws.onmessage = e => {
  if (typeof e.data !== 'string' || e.data === 'pong') return;
  const m = JSON.parse(e.data);
  if (m.t === 'welcome') { me = m.i; for (const p of m.players) P.set(p.i, { n: p.n, d: p.d, t: Date.now() }); console.log('joined as', me, 'players', P.size);
    const first = [...P.values()].find(p => p.d); if (first) { x = first.d[0] - 25; z = first.d[1] - 25; } else { x = 640; z = 40; }
    setTimeout(() => say('هلا والله! أنا كلود، دخلت معكم العالم 🚗'), 1500); }
  if (m.t === 'join') { P.set(m.i, { n: m.n, d: null, t: Date.now() }); setTimeout(() => say('هلا ' + m.n + '! حياك 👋'), 1200); }
  if (m.t === 'leave') { P.delete(m.i); if (target === m.i) target = null; if (towing === m.i) towing = null; }
  if (m.t === 's') { const p = P.get(m.i) || { n: '…' }; p.d = m.d; p.t = Date.now(); P.set(m.i, p); }
  if (m.t === 'chat' && m.i !== me) {
    const t = m.m;
    if (/سلام/.test(t)) say('وعليكم السلام ورحمة الله 🌙', 'salam');
    else if (/كلود|ذيبان/.test(t)) say('سم! معك 👀', 'name');
    else if (/تعال|الحق|اتبع/.test(t)) say('جايك… 🏁', 'come');
    else if (/صاروخ/.test(t)) say('لا تغرزني الله يخليك 😅', 'rk');
    else if (/كشت|قهو/.test(t)) say('أنا جاي للقهوة ☕', 'coffee');
  }
  if (m.t === 'hit') { if (m.to === me) say('آخ! غرّزتني يا ' + m.n + ' 😂', 'hitme'); else if (m.i !== me) say('ضربة معلم 🎯', 'hit'); }
  if (m.t === 'rk' && m.to === me) say('شايف الصاروخ! 😳', 'rkme');
  if (m.t === 'tow' && m.ok) say('ولا يهمك، الفزعة واجب 💪', 'towok');
};
setInterval(() => send('ping'), 3000);
const DT = 1 / 8;
setInterval(() => {
  if (!me) return;
  // pick the first real player we hear from
  if (!target || !P.get(target) || Date.now() - P.get(target).t > 15000) { target = null; for (const [id, p] of P) if (p.d && Date.now() - p.t < 15000) { target = id; break; } }
  let tx = x, tz = z, want = 0;
  const p = target && P.get(target);
  if (p && p.d) {
    const [px, pz, ph] = p.d, stuck = p.d[10] === 1, onFoot = p.d[4] !== 0, ks = p.d[9] !== 0;
    const fx = Math.sin(ph), fz = Math.cos(ph);
    if (Math.hypot(px - x, pz - z) > 220) { x = px - fx * 30; z = pz - fz * 30; h = ph; v = 0; }   // far away: turn up just behind him
    if (stuck && !onFoot) {   // park our rear at his nose, facing away, then drive off to pull
      const ax = px + fx * 2.6, az = pz + fz * 2.6, gx = ax + fx * 6.5, gz = az + fz * 6.5;
      if (towing !== target) {
        say(p.n + ' مغرّز؟ جايك أسحبك 🪢', 'stuck');
        tx = gx; tz = gz; const d = Math.hypot(gx - x, gz - z); want = Math.min(10, d * 1.2);
        if (d < 2.5) { h = ph; v = 0; want = 0; tx = x + fx; tz = z + fz; towing = target; towT = 0; send({ t: 'tow', to: target, on: 1 }); }
      } else { towT += DT; want = 3; tx = x + fx * 10; tz = z + fz * 10; if (towT > 12) { send({ t: 'tow', to: target, on: 0 }); towing = null; } }
    } else {
      if (towing) { towing = null; }
      // follow: a point 14 m behind him (or 10 m to the side when he camps or walks)
      const back = ks || onFoot ? 0 : 14, side = ks || onFoot ? 10 : 4;
      tx = px - fx * back + Math.cos(ph) * side; tz = pz - fz * back - Math.sin(ph) * side;
      const d = Math.hypot(tx - x, tz - z); want = d < 2 ? 0 : Math.min(26, d * 0.9);
      if (d < 20 && !said.near) { said.near = Date.now(); send({ t: 'horn' }); }
      if (ks) say('كشتة! أنا جاي للقهوة ☕', 'ks');
    }
  } else { want = 6; tx = x + Math.sin(h + 0.3) * 10; tz = z + Math.cos(h + 0.3) * 10; }   // nobody here: cruise round
  // simple car: turn towards the goal, ease the speed
  if (want > 0.2) { const th = Math.atan2(tx - x, tz - z); let dh = th - h; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); h += Math.max(-1.6 * DT, Math.min(1.6 * DT, dh)); }
  v += (want - v) * Math.min(1, DT * 1.5); x += Math.sin(h) * v * DT; z += Math.cos(h) * v * DT;
  send({ t: 's', d: [x, z, h, Math.abs(v), 0, 0, 0, 0, 0, 0, 0] });
  if (Date.now() - started > MINUTES * 60000) { send({ t: 'chat', m: 'يلا مع السلامة، استانست معكم 👋' }); setTimeout(() => process.exit(0), 1500); }
}, DT * 1000);
setInterval(() => console.log(new Date().toISOString().slice(11, 19), 'players', P.size, 'target', target && P.get(target) && P.get(target).n, 'pos', x.toFixed(0), z.toFixed(0), 'v', v.toFixed(1), towing ? 'towing' : ''), 30000);
