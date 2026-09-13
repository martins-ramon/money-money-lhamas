import test from 'node:test';
import assert from 'node:assert/strict';
import { activity, movementInput, missionFor, readSettings } from '../src/experience.js';
import { act, initialState, JOBS } from '../src/model.js';

const move = (keys, yaw = 0, joy = { x: 0, y: 0 }) => movementInput(new Set(keys), joy, yaw);
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test('forward/backward and strafe follow the camera across a full orbit', () => {
  for (let yaw = 0; yaw < Math.PI * 2; yaw += Math.PI / 8) {
    for (const [key, sign] of [['KeyW', 1], ['ArrowUp', 1], ['KeyS', -1], ['ArrowDown', -1]]) {
      const v = move([key], yaw);
      near(v.x * -Math.sin(yaw) + v.z * -Math.cos(yaw), sign);
    }
    for (const [key, sign] of [['KeyD', 1], ['ArrowRight', 1], ['KeyA', -1], ['ArrowLeft', -1]]) {
      const v = move([key], yaw);
      near(v.x * Math.cos(yaw) - v.z * Math.sin(yaw), sign);
    }
  }
});

test('diagonals cannot exceed straight-line speed, even with keyboard plus joystick', () => {
  const diagonal = move(['KeyW', 'KeyD'], 0, { x: 1, y: -1 });
  near(Math.hypot(diagonal.x, diagonal.z), 1);
  near(diagonal.amount, 1);
  assert.deepEqual(move(['KeyW', 'KeyS', 'KeyA', 'KeyD']), { x: 0, z: 0, amount: 0 });
});

test('joystick forward matches W and small joystick noise does not move the player', () => {
  assert.deepEqual(move([], 1.2, { x: 0, y: -1 }), move(['KeyW'], 1.2));
  assert.deepEqual(move([], 0, { x: 0.05, y: -0.05 }), { x: 0, z: 0, amount: 0 });
});

test('mission guide follows actual career progress through the first purchase', () => {
  let state = act(initialState(), { type: 'start', character: 'anna' });
  for (const job of JOBS.slice(0, 3)) {
    assert.equal(missionFor(state).id, job.id);
    state = act(state, { type: 'shift', job: job.id });
  }
  assert.equal(missionFor(state).id, 'home');
  state = act(state, { type: 'purchase', asset: 'house' });
  for (const job of JOBS.slice(3)) {
    assert.equal(missionFor(state).id, job.id);
    state = act(state, { type: 'shift', job: job.id });
  }
  assert.equal(state.stage, 'timeskip');
  assert.equal(missionFor(state).progress, 1);
});

test('spending below the purchase goal keeps a repeat job available in the guide', () => {
  const state = { ...initialState(), shifts: { burger: 1, school: 1, cinema: 1 }, wallet: 100 };
  assert.equal(missionFor(state).id, 'burger');
});

test('free-world guide leads through the side missions before the finale', () => {
  let state = { ...initialState(), started: true, stage: 'freeplay' };
  assert.throws(() => act(state, { type: 'celebrate' }), /three side missions/);
  for (const id of ['picnic', 'explorer', 'helper']) {
    assert.equal(missionFor(state).id, id);
    state = act(state, { type: 'quest', id });
  }
  assert.equal(missionFor(state).id, 'bbq');
  state = act(state, { type: 'celebrate' });
  assert.equal(missionFor(state).id, undefined);
});

test('settings handle blocked storage, malformed values and device defaults', () => {
  const blocked = { getItem() { throw new Error('blocked'); } };
  assert.deepEqual(readSettings(blocked, { touch: true, reducedMotion: true }), { quality: 'balanced', reducedMotion: true, showMap: true });
  const storage = { getItem: () => JSON.stringify({ quality: 'ultra', showMap: false, reducedMotion: 'no' }) };
  assert.deepEqual(readSettings(storage), { quality: 'high', showMap: false, reducedMotion: false });
});

test('quitting an activity releases both animation waits and pending player input', async () => {
  const session = activity();
  const animation = session.wait(10000), input = session.until(() => {});
  session.cancel();
  await assert.rejects(animation, { name: 'AbortError' });
  await assert.rejects(input, { name: 'AbortError' });
  await assert.rejects(session.wait(1), { name: 'AbortError' });
  await assert.rejects(session.until(() => assert.fail('Cancelled activity must not register input')), { name: 'AbortError' });
});

test('a finished activity step can advance once and then be safely cancelled', async () => {
  const session = activity(); let finish;
  const done = session.until(resolve => { finish = resolve; });
  finish(); finish(); await done;
  session.cancel();
});
