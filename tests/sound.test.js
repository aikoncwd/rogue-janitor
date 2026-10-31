const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless } = require('./harness');

function fakeAudioContext(counter) {
    const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
    const node = () => ({ connect() { return this; }, disconnect() {}, start() {}, stop() {}, gain: param(), frequency: param(), Q: param(), type: '' });
    return {
        currentTime: 0, sampleRate: 44100, state: 'running', destination: {},
        resume() {},
        createOscillator() { counter.osc++; return node(); },
        createGain() { return node(); },
        createBiquadFilter() { return node(); },
        createBufferSource() { counter.noise++; const n = node(); n.buffer = null; return n; },
        createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len) }; },
    };
}

function boot({ storageThrows = false, stored = null } = {}) {
    const ctx = bootHeadless({ files: [], game: false });
    if (stored) ctx.__storage['rj-sound'] = stored;
    if (storageThrows) {
        const thrower = { get() { throw new Error('SecurityError'); } };
        Object.defineProperty(ctx, 'localStorage', thrower);
        Object.defineProperty(ctx.window, 'localStorage', thrower);
    }
    require('./harness').load(ctx, 'script/sound.js');
    const counter = { osc: 0, noise: 0 };
    let now = 0;
    ctx.Sfx.createContext = () => fakeAudioContext(counter);
    ctx.Sfx.now = () => now;
    return { ctx, counter, setNow: t => { now = t; } };
}

test('no sound before unlock', () => {
    const { ctx } = boot();
    assert.equal(ctx.Sfx.play('hit'), false);
});

test('plays after unlock', () => {
    const { ctx, counter } = boot();
    ctx.Sfx.unlock();
    assert.equal(ctx.Sfx.play('hit'), true);
    assert.ok(counter.osc + counter.noise > 0);
});

test('every listed sound plays', () => {
    const { ctx, setNow } = boot();
    ctx.Sfx.unlock();
    ctx.Sfx.names.forEach((n, i) => { setNow(i * 200); assert.equal(ctx.Sfx.play(n), true, n); });
});

test('unknown sound is ignored', () => {
    const { ctx } = boot();
    ctx.Sfx.unlock();
    assert.equal(ctx.Sfx.play('kazoo'), false);
});

test('same sound within 70ms is throttled', () => {
    const { ctx, setNow } = boot();
    ctx.Sfx.unlock();
    setNow(0); assert.equal(ctx.Sfx.play('hit'), true);
    setNow(50); assert.equal(ctx.Sfx.play('hit'), false);
    setNow(80); assert.equal(ctx.Sfx.play('hit'), true);
});

test('global cap of 12 per second', () => {
    const { ctx, setNow } = boot();
    ctx.Sfx.unlock();
    const names = ['hit', 'yelp', 'faint', 'door'];
    for (let i = 0; i < 12; i++) { setNow(i * 75); assert.equal(ctx.Sfx.play(names[i % 4]), true, 'play ' + i); }
    setNow(12 * 75); // 900ms: still inside the 1s window
    assert.equal(ctx.Sfx.play('smash'), false);
    setNow(1100);
    assert.equal(ctx.Sfx.play('smash'), true);
});

test('toggle persists and mutes', () => {
    const { ctx } = boot();
    ctx.Sfx.unlock();
    assert.equal(ctx.Sfx.toggle(), false);
    assert.equal(ctx.__storage['rj-sound'], 'off');
    assert.equal(ctx.Sfx.play('hit'), false);
    assert.equal(ctx.Sfx.toggle(), true);
    assert.equal(ctx.__storage['rj-sound'], 'on');
});

test('stored off preference is honoured', () => {
    const { ctx } = boot({ stored: 'off' });
    assert.equal(ctx.Sfx.enabled, false);
});

test('throwing localStorage does not break', () => {
    const { ctx } = boot({ storageThrows: true });
    assert.equal(ctx.Sfx.enabled, true);
    assert.equal(ctx.Sfx.toggle(), false);
});

test('unlock without Web Audio support stays silent', () => {
    const { ctx } = boot();
    ctx.Sfx.createContext = () => { throw new Error('no audio'); };
    ctx.Sfx.unlock();
    assert.equal(ctx.Sfx.play('hit'), false);
});
