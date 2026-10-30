// Kassab online: one public world split into shards of up to MAX players. Each shard is a Durable Object
// that relays player state and chat over WebSockets (hibernation API: idle shards cost nothing).
const MAX = 24;
// strong words only (matched as whole words for the short ones) so normal chat like «زبون» or «حمار» in the badia is not starred out
const BAD = ['منيوك','قحبه','قحبة','شرموط','شرموطه','طيز','fuck','shit','bitch','pussy','nigg'];
const BAD_WORD = ['زب','كس','زق'];
const clean = (s, n) => {
  s = String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
  for (const w of BAD) s = s.split(w).join('*'.repeat(w.length));
  for (const w of BAD_WORD) s = s.replace(new RegExp('(^|\\s)' + w + '(?=\\s|$)', 'g'), (m, p) => p + '*'.repeat(w.length));
  return s;
};
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = { 'Access-Control-Allow-Origin': '*' };
    if (url.pathname === '/ws') {
      const w = Math.max(1, Math.min(20, parseInt(url.searchParams.get('w') || '1', 10) || 1));
      return env.WORLD.get(env.WORLD.idFromName('public-' + w)).fetch(req);
    }
    if (url.pathname === '/count') {
      const out = [];
      for (let w = 1; w <= 3; w++) { const r = await env.WORLD.get(env.WORLD.idFromName('public-' + w)).fetch('https://x/count'); out.push(+(await r.text())); }
      return new Response(JSON.stringify(out), { headers: { ...cors, 'content-type': 'application/json' } });
    }
    return new Response('kassab online', { headers: cors });
  }
};
export class World {
  constructor(state) {
    this.state = state;
    state.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  async fetch(req) {
    const socks = this.state.getWebSockets();
    if (new URL(req.url).pathname === '/count') return new Response(String(socks.length));
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
    if (socks.length >= MAX) return new Response('full', { status: 503 });
    const [client, server] = Object.values(new WebSocketPair());
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ id, name: '', car: 'gmc', d: null, chatT: 0, n: 0 });
    return new Response(null, { status: 101, webSocket: client });
  }
  others(ws) { return this.state.getWebSockets().filter(s => s !== ws); }
  send(s, o) { try { s.send(typeof o === 'string' ? o : JSON.stringify(o)); } catch (e) {} }
  webSocketMessage(ws, msg) {
    if (typeof msg !== 'string' || msg.length > 600) return;
    let m; try { m = JSON.parse(msg); } catch (e) { return; }
    const a = ws.deserializeAttachment() || {};
    if (m.t === 'hi') {
      a.name = clean(m.name, 16) || ('كساب ' + a.id.slice(0, 3));
      a.car = /^[a-z0-9_]{1,16}$/.test(m.car || '') ? m.car : 'gmc';
      ws.serializeAttachment(a);
      const players = this.others(ws).map(s => s.deserializeAttachment()).filter(p => p && p.name).map(p => ({ i: p.id, n: p.name, c: p.car, d: p.d }));
      this.send(ws, { t: 'welcome', i: a.id, n: a.name, players, max: MAX });
      const j = JSON.stringify({ t: 'join', i: a.id, n: a.name, c: a.car });
      for (const s of this.others(ws)) this.send(s, j);
      return;
    }
    if (!a.name) return;
    if (m.t === 's' && Array.isArray(m.d) && m.d.length <= 12) {
      const d = m.d.map(v => (typeof v === 'number' && isFinite(v)) ? Math.round(v * 100) / 100 : 0);
      a.d = d; ws.serializeAttachment(a);   // newcomers get the latest position
      const out = JSON.stringify({ t: 's', i: a.id, d });
      for (const s of this.others(ws)) this.send(s, out);
      return;
    }
    if (m.t === 'horn') { const out = JSON.stringify({ t: 'horn', i: a.id }); for (const s of this.others(ws)) this.send(s, out); return; }
    if (m.t === 'chat') {
      const now = Date.now(); if (now - (a.chatT || 0) < 2000) return;   // one message every 2 s
      a.chatT = now; ws.serializeAttachment(a);
      const text = clean(m.m, 120); if (!text) return;
      const out = JSON.stringify({ t: 'chat', i: a.id, n: a.name, m: text });
      for (const s of this.state.getWebSockets()) this.send(s, out);
      return;
    }
  }
  webSocketClose(ws) { this.bye(ws); }
  webSocketError(ws) { this.bye(ws); }
  bye(ws) { const a = ws.deserializeAttachment(); if (!a) return; const out = JSON.stringify({ t: 'leave', i: a.id }); for (const s of this.others(ws)) this.send(s, out); try { ws.close(); } catch (e) {} }
}
