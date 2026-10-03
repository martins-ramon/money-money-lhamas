// A room shares presence and avatar poses only. Financial progress stays on this device.
export class Multiplayer {
  constructor({ onChange = () => {}, onPeers = () => {}, onError = () => {}, baseUrl = '', fetch: fetchRequest = globalThis.fetch.bind(globalThis), updateMs = 100, heartbeatMs = 20000 } = {}) {
    this.onChange = onChange; this.onPeers = onPeers; this.onError = onError;
    this.baseUrl = baseUrl; this.fetch = fetchRequest; this.updateMs = updateMs; this.heartbeatMs = heartbeatMs;
    this.status = 'disconnected'; this.playerId = null; this.peers = [];
    this._session = null; this._pending = null; this._generation = 0; this._latest = null; this._serialized = '';
    this._pagehide = () => { void this.leave(); };
    this._visibility = () => { if (!globalThis.document?.hidden && this._session) void this._ping(this._session); };
    globalThis.window?.addEventListener('pagehide', this._pagehide);
    globalThis.document?.addEventListener('visibilitychange', this._visibility);
  }

  get room() { return this._session?.code || null; }
  create(name) { return this._connect('/api/rooms', name); }
  join(code, name) {
    const normalized = typeof code === 'string' ? code.trim().toUpperCase() : '';
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(normalized)) return Promise.reject(new Error('Enter a six-character room code.'));
    return this._connect(`/api/rooms/${normalized}/join`, name);
  }

  _changed() { this.onChange({ status: this.status, room: this.room, playerId: this.playerId, players: this._session ? this.peers.length + 1 : 0 }); }
  _clear() {
    this._pending?.abort(); this._pending = null;
    const session = this._session; this._session = null;
    if (session) {
      clearInterval(session.updateTimer); clearInterval(session.pingTimer); clearInterval(session.watchdog);
      session.controller.abort();
    }
    this.status = 'disconnected'; this.playerId = null; this.peers = []; this.onPeers([]);
    return session;
  }

  async _json(path, { body, token, signal, keepalive = false, timeoutMs = 10000 } = {}) {
    const controller = new AbortController(), abort = () => controller.abort();
    const timeout = setTimeout(abort, timeoutMs); timeout.unref?.();
    if (signal?.aborted) controller.abort(); else signal?.addEventListener('abort', abort, { once: true });
    try {
      const response = await this.fetch(`${this.baseUrl}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body || {}), signal: controller.signal, keepalive, credentials: 'same-origin', cache: 'no-store' });
      let data; try { data = await response.json(); } catch { throw new Error('Multiplayer needs the game server. Start it with npm run dev or npm run serve.'); }
      if (!response.ok) throw Object.assign(new Error(data.error || 'Could not connect to the room.'), { status: response.status });
      return data;
    } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
  }

  async _notifyLeave(session) {
    if (!session) return;
    try { await this._json(`/api/rooms/${session.code}/leave`, { token: session.token, keepalive: true, timeoutMs: 3000 }); } catch { /* A disconnected player also expires on the server. */ }
  }

  async _connect(path, name) {
    const generation = ++this._generation;
    const previous = this._clear(); void this._notifyLeave(previous);
    this.status = 'connecting'; this._changed();
    const pending = new AbortController(); this._pending = pending;
    let session;
    try {
      const credentials = await this._json(path, { body: { name }, signal: pending.signal });
      session = { ...credentials, controller: new AbortController(), lastMessage: Date.now(), sending: false, pinging: false, sent: '' };
      if (generation !== this._generation) { void this._notifyLeave(session); return null; }
      this._pending = null; this._session = session; this.playerId = session.playerId;
      const timeout = setTimeout(() => session.controller.abort(), 10000); timeout.unref?.();
      let response;
      try { response = await this.fetch(`${this.baseUrl}/api/rooms/${session.code}/events`, { headers: { Authorization: `Bearer ${session.token}`, Accept: 'text/event-stream' }, signal: session.controller.signal, credentials: 'same-origin', cache: 'no-store' }); }
      finally { clearTimeout(timeout); }
      if (generation !== this._generation) { void this._notifyLeave(session); return null; }
      if (!response.ok || !response.body || !response.headers.get('content-type')?.startsWith('text/event-stream')) throw new Error('The room connection could not open. Please join again.');
      this.status = 'connected'; this._changed();
      session.updateTimer = setInterval(() => { void this._sendState(session); }, this.updateMs);
      session.pingTimer = setInterval(() => { void this._ping(session); }, this.heartbeatMs);
      session.watchdog = setInterval(() => { if (Date.now() - session.lastMessage > 60000) this._failed(session, new Error('The room connection was lost. Please join again.')); }, 10000);
      session.updateTimer.unref?.(); session.pingTimer.unref?.(); session.watchdog.unref?.();
      void this._readEvents(session, response.body);
      void this._sendState(session);
      return session.code;
    } catch (err) {
      if (generation !== this._generation) return null;
      const message = err.name === 'AbortError' ? new Error('The room connection timed out. Please try again.') : err;
      if (session && this._session === session) this._failed(session, message);
      else { this._clear(); this._changed(); this.onError(message); }
      throw message;
    }
  }

  async _readEvents(session, body) {
    const reader = body.getReader(), decoder = new TextDecoder(); let buffer = '';
    try {
      while (this._session === session) {
        const { value, done } = await reader.read();
        if (this._session !== session) return;
        if (done) throw new Error('The room closed or the connection was lost. Please join again.');
        session.lastMessage = Date.now(); buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '');
        if (buffer.length > 65536) throw new Error('The room sent an invalid update.');
        let boundary;
        while ((boundary = buffer.indexOf('\n\n')) !== -1) {
          const block = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
          if (!block.startsWith('event: peers\n')) continue;
          const data = JSON.parse(block.split('\n').find(line => line.startsWith('data: '))?.slice(6) || '{}');
          if (!Array.isArray(data.players)) throw new Error('The room sent an invalid player list.');
          const count = this.peers.length;
          this.peers = data.players.filter(player => player.id !== session.playerId);
          this.onPeers(this.peers);
          if (count !== this.peers.length) this._changed();
        }
      }
    } catch (err) { if (this._session === session) this._failed(session, err); }
    finally { try { await reader.cancel(); } catch { /* Fetch may have already aborted. */ } reader.releaseLock(); }
  }

  update(snapshot) {
    this._latest = { x: snapshot.x, y: snapshot.y, z: snapshot.z, heading: snapshot.heading, costume: snapshot.costume, character: snapshot.character, location: snapshot.location, vehicle: snapshot.vehicle, dancing: snapshot.dancing, flying: snapshot.flying };
    this._serialized = JSON.stringify(this._latest);
  }

  async _sendState(session) {
    if (this._session !== session || this.status !== 'connected' || session.sending || !this._latest || session.sent === this._serialized) return;
    session.sending = true; session.sent = this._serialized;
    try { await this._json(`/api/rooms/${session.code}/state`, { token: session.token, body: { snapshot: this._latest }, signal: session.controller.signal }); }
    catch (err) {
      if (err.status === 429) session.sent = '';
      else if (this._session === session) this._failed(session, new Error(`Multiplayer disconnected: ${err.message}`));
    } finally { session.sending = false; }
  }

  async _ping(session) {
    if (this._session !== session || this.status !== 'connected' || session.pinging) return;
    session.pinging = true;
    try { await this._json(`/api/rooms/${session.code}/ping`, { token: session.token, signal: session.controller.signal }); }
    catch (err) { if (this._session === session && err.status !== 429) this._failed(session, new Error('The room connection was lost. Please join again.')); }
    finally { session.pinging = false; }
  }

  _failed(session, err) {
    if (this._session !== session) return;
    this._generation++; this._clear(); this._changed(); this.onError(err); void this._notifyLeave(session);
  }

  async leave() {
    this._generation++; const session = this._clear(); this._changed();
    await this._notifyLeave(session);
  }

  async destroy() {
    globalThis.window?.removeEventListener('pagehide', this._pagehide);
    globalThis.document?.removeEventListener('visibilitychange', this._visibility);
    await this.leave();
  }
}
