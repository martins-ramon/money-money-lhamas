// A room shares presence and avatar poses only. Financial progress stays on this device.
export class Multiplayer {
  constructor({ onChange = () => {}, onPeers = () => {}, onError = () => {}, baseUrl = '', fetch: fetchRequest = globalThis.fetch.bind(globalThis), sendBeacon = globalThis.navigator?.sendBeacon?.bind(globalThis.navigator), updateMs = 100, heartbeatMs = 5000 } = {}) {
    this.onChange = onChange; this.onPeers = onPeers; this.onError = onError;
    this.baseUrl = baseUrl; this.fetch = fetchRequest; this.updateMs = Math.max(100, updateMs); this.heartbeatMs = heartbeatMs;
    this.sendBeacon = sendBeacon;
    this.status = 'disconnected'; this.playerId = null; this.peers = [];
    this._session = null; this._pending = null; this._generation = 0; this._latest = null; this._serialized = '';
    this._pagehide = () => this._leavePage();
    this._visibility = () => { if (!globalThis.document?.hidden && this._session) void this._ping(this._session); };
    globalThis.window?.addEventListener('pagehide', this._pagehide);
    globalThis.document?.addEventListener('visibilitychange', this._visibility);
  }

  get room() { return this._session?.code || null; }
  get hostId() { return this._session?.hostId || null; }
  get isHost() { return this.status === 'connected' && this.hostId === this.playerId; }
  create(name) { return this._connect('/api/rooms', name); }
  join(code, name) {
    const normalized = typeof code === 'string' ? code.trim().toUpperCase() : '';
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(normalized)) return Promise.reject(new Error('Enter a six-character room code.'));
    return this._connect(`/api/rooms/${normalized}/join`, name);
  }

  _changed() { this.onChange({ status: this.status, room: this.room, playerId: this.playerId, hostId: this.hostId, isHost: this.isHost, players: this._session ? this.peers.length + 1 : 0 }); }
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

  _leavePage() {
    this._generation++; const session = this._clear(); this._changed();
    if (!session) return;
    try {
      const payload = new Blob([JSON.stringify({ token: session.token })], { type: 'application/json' });
      if (this.sendBeacon?.(`${this.baseUrl}/api/rooms/${session.code}/leave`, payload)) return;
    } catch { /* Fall back when beacon is unavailable or its queue is full. */ }
    void this._notifyLeave(session);
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
      // Complete HTTP responses also work through hosts that buffer event streams.
      // Verify the authenticated room before announcing a successful connection.
      await this._exchange(session);
      if (generation !== this._generation) { void this._notifyLeave(session); return null; }
      this.status = 'connected'; this._changed();
      session.updateTimer = setInterval(() => { void this._sync(session); }, this.updateMs);
      session.pingTimer = setInterval(() => { void this._ping(session); }, this.heartbeatMs);
      session.watchdog = setInterval(() => { if (Date.now() - session.lastMessage > 60000) this._failed(session, new Error('The room connection was lost. Please join again.')); }, 10000);
      session.updateTimer.unref?.(); session.pingTimer.unref?.(); session.watchdog.unref?.();
      return session.code;
    } catch (err) {
      if (generation !== this._generation) return null;
      const message = err.name === 'AbortError' ? new Error('The room connection timed out. Please try again.') : err;
      if (session && this._session === session) this._failed(session, message);
      else { this._clear(); this._changed(); this.onError(message); }
      throw message;
    }
  }

  async _exchange(session) {
    const serialized = this._serialized;
    const removalVersion = session.removalVersion || 0;
    const body = this._latest && session.sent !== serialized ? { snapshot: this._latest } : {};
    const data = await this._json(`/api/rooms/${session.code}/sync`, { token: session.token, body, signal: session.controller.signal });
    if (this._session !== session || removalVersion !== (session.removalVersion || 0)) return;
    this._acceptPlayers(session, data);
    session.lastMessage = Date.now(); session.sent = serialized;
  }

  _acceptPlayers(session, data) {
    if (!Array.isArray(data.players) || !data.players.every(player => player && typeof player.id === 'string') || !data.players.some(player => player.id === session.playerId)) throw new Error('The room sent an invalid player list.');
    const previousHost = session.hostId;
    if (typeof data.hostId === 'string') session.hostId = data.hostId;
    const count = this.peers.length;
    this.peers = data.players.filter(player => player.id !== session.playerId);
    this.onPeers(this.peers);
    if (count !== this.peers.length || previousHost !== session.hostId) this._changed();
  }

  async kick(playerId) {
    const session = this._session;
    if (!session || !this.isHost) throw new Error('Only the room creator can remove players.');
    if (playerId === this.playerId) throw new Error('Choose another player to remove.');
    const data = await this._json(`/api/rooms/${session.code}/kick`, { token: session.token, body: { playerId }, signal: session.controller.signal });
    if (this._session !== session) return;
    // Ignore a poll started before the removal, even if its response arrives later.
    session.removalVersion = (session.removalVersion || 0) + 1;
    this._acceptPlayers(session, data);
  }

  update(snapshot) {
    this._latest = { x: snapshot.x, y: snapshot.y, z: snapshot.z, heading: snapshot.heading, costume: snapshot.costume, character: snapshot.character, location: snapshot.location, vehicle: snapshot.vehicle, dancing: snapshot.dancing, flying: snapshot.flying };
    this._serialized = JSON.stringify(this._latest);
  }

  async _sync(session) {
    if (this._session !== session || this.status !== 'connected' || session.sending) return;
    // One request at a time, combining pose updates and reception even when idle.
    session.sending = true;
    try { await this._exchange(session); }
    catch (err) {
      if (err.status === 429) session.sent = '';
      else if (this._session === session) this._failed(session, new Error(`Multiplayer disconnected: ${err.message}`));
    } finally { session.sending = false; }
  }

  async _ping(session) {
    if (this._session !== session || this.status !== 'connected' || session.pinging) return;
    session.pinging = true;
    try { await this._json(`/api/rooms/${session.code}/ping`, { token: session.token, signal: session.controller.signal }); }
    catch (err) { if (this._session === session && err.status !== 429) this._failed(session, err.status === 403 ? err : new Error('The room connection was lost. Please join again.')); }
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
