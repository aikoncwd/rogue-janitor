const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, load } = require('./harness');

function fakeAudioContext(counter) {
    const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
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

function boot({ stored = null, storageThrows = false, unlock = false } = {}) {
    const ctx = bootHeadless({ files: [], game: false });
    if (stored) ctx.__storage['rj-music'] = stored;
    if (storageThrows) {
        const thrower = { get() { throw new Error('SecurityError'); } };
        Object.defineProperty(ctx, 'localStorage', thrower);
        Object.defineProperty(ctx.window, 'localStorage', thrower);
    }
    load(ctx, 'script/sound.js');
    load(ctx, 'script/music.js');
    const counter = { osc: 0, noise: 0 };
    ctx.Sfx.createContext = () => fakeAudioContext(counter);
    // record scheduled notes without losing the real synthesis path
    const notes = [];
    const realNote = ctx.Music.note;
    ctx.Music.note = function (pb, cfg, s, t, dur) {
        notes.push({ t, dur, s, wave: cfg.wave });
        return realNote.call(this, pb, cfg, s, t, dur);
    };
    if (unlock) ctx.Sfx.unlock();
    return { ctx, counter, notes };
}

test('parser handles notes, ties, rests, hits and bar lines', () => {
    const { ctx } = boot();
    const steps = ctx.Music.parse('C4 ~ ~ . | A3 . x X F#3 Bb2');
    assert.equal(steps.length, 10);
    assert.equal(steps[0].note, 'C4');
    assert.equal(steps[0].len, 3);
    assert.ok(Math.abs(steps[0].freq - 261.63) < 0.01);
    assert.equal(steps[1], null);
    assert.equal(steps[2], null);
    assert.equal(steps[3], null);
    assert.equal(steps[4].note, 'A3');
    assert.ok(Math.abs(steps[4].freq - 220) < 1e-9);
    assert.equal(steps[4].len, 1);
    assert.equal(steps[5], null);
    assert.ok(steps[6].hit > 0 && steps[7].hit > steps[6].hit);
    assert.ok(Math.abs(steps[8].freq - 185.0) < 0.01);
    assert.equal(steps[9].note, 'Bb2');
    assert.equal(ctx.Music.parse('C4|D4 |E4').length, 3);
    assert.ok(Math.abs(ctx.Music.noteFreq('Bb2') - 116.54) < 0.01);
});

test('tie after a rest does not resurrect the note', () => {
    const { ctx } = boot();
    const steps = ctx.Music.parse('E4 . ~ ~');
    assert.equal(steps[0].len, 1);
    assert.deepEqual(steps.slice(1), [null, null, null]);
});

test('bad token throws', () => {
    const { ctx } = boot();
    assert.throws(() => ctx.Music.parse('C4 H2'));
});

test('all three tracks exist, parse and loop at least 8 bars', () => {
    const { ctx } = boot();
    for (const name of ['invasion', 'cleaning', 'night']) {
        assert.ok(name in ctx.Music.tracks, name);
        const song = ctx.Music.parsed(name);
        const stepsPerBar = 4 * (ctx.Music.tracks[name].stepsPerBeat || 2);
        assert.ok(song.length >= 8 * stepsPerBar, name + ' too short');
        assert.ok(song.voices.length >= 2, name);
        for (const v of song.voices) {
            assert.equal(v.steps.length % stepsPerBar, 0, name + '.' + v.name + ' not whole bars');
            assert.equal(v.steps.length, song.length, name + '.' + v.name + ' length mismatch');
        }
    }
    assert.ok(ctx.Music.tracks.invasion.bpm > ctx.Music.tracks.cleaning.bpm);
    assert.ok(ctx.Music.tracks.cleaning.bpm > ctx.Music.tracks.night.bpm);
    // cleaning has the longest loop in time
    const secs = n => ctx.Music.parsed(n).length * ctx.Music.parsed(n).stepDur;
    assert.ok(secs('cleaning') > secs('invasion'));
});

test('music is on by default and toggle persists', () => {
    const { ctx } = boot();
    assert.equal(ctx.Music.enabled, true);
    assert.equal(ctx.Music.toggle(), false);
    assert.equal(ctx.__storage['rj-music'], 'off');
    assert.equal(ctx.Music.toggle(), true);
    assert.equal(ctx.__storage['rj-music'], 'on');
});

test('stored off preference is honoured', () => {
    const { ctx } = boot({ stored: 'off' });
    assert.equal(ctx.Music.enabled, false);
});

test('throwing localStorage does not break', () => {
    const { ctx } = boot({ storageThrows: true });
    assert.equal(ctx.Music.enabled, true);
    assert.equal(ctx.Music.toggle(), false);
});

test('play without an audio context remembers the track and does not throw', () => {
    const { ctx, notes } = boot();
    assert.equal(ctx.Music.play('cleaning'), true);
    assert.equal(ctx.Music.current, 'cleaning');
    assert.equal(ctx.Music.playing, false);
    assert.equal(notes.length, 0);
    assert.equal(ctx.__timers.length, 0);
    assert.equal(ctx.Music.play('kazoo'), false);
    assert.equal(ctx.Music.current, 'cleaning');
    ctx.Music.stop();
    assert.equal(ctx.Music.current, null);
});

test('no Web Audio at all: resume stays silent', () => {
    const { ctx, notes } = boot();
    ctx.Sfx.createContext = () => { throw new Error('no audio'); };
    ctx.Music.play('night');
    assert.doesNotThrow(() => ctx.Music.resume());
    assert.equal(ctx.Music.playing, false);
    assert.equal(notes.length, 0);
});

test('resume starts the remembered track after unlock', () => {
    const { ctx, notes } = boot();
    ctx.Music.play('invasion');
    ctx.Music.resume();
    assert.ok(ctx.Sfx.ctx != null);
    assert.equal(ctx.Music.playing, true);
    assert.equal(ctx.Music.current, 'invasion');
    assert.ok(notes.length > 0);
});

test('play/stop bookkeeping and same-track no-op', () => {
    const { ctx } = boot({ unlock: true });
    ctx.Music.play('cleaning');
    assert.equal(ctx.Music.current, 'cleaning');
    assert.equal(ctx.Music.playing, true);
    const pb = ctx.Music.playback;
    ctx.Music.play('cleaning');
    assert.equal(ctx.Music.playback, pb, 'same track restarted');
    ctx.Music.play('night');
    assert.equal(ctx.Music.current, 'night');
    assert.notEqual(ctx.Music.playback, pb);
    assert.equal(ctx.Music.playback.track, 'night');
    // only one scheduler timer running
    assert.equal(ctx.__timers.filter(t => t.ms === ctx.Music.interval).length, 1);
    ctx.Music.stop();
    assert.equal(ctx.Music.current, null);
    assert.equal(ctx.Music.playing, false);
    assert.equal(ctx.Music.timer, null);
    assert.equal(ctx.__timers.filter(t => t.ms === ctx.Music.interval).length, 0);
});

test('scheduler only queues notes inside the look-ahead window', () => {
    const { ctx, notes, counter } = boot({ unlock: true });
    const ac = ctx.Sfx.ctx;
    ac.currentTime = 10;
    ctx.Music.play('invasion');
    assert.ok(notes.length > 0);
    for (const n of notes) assert.ok(n.t >= 10 && n.t < 10 + ctx.Music.lookahead, 'note at ' + n.t);
    assert.ok(ctx.Music.playback.nextTime >= 10 + ctx.Music.lookahead);
    assert.ok(counter.osc > 0 || counter.noise > 0);

    // a tick with no clock movement adds nothing
    const before = notes.length;
    ctx.__runTimers();
    assert.equal(notes.length, before);

    // advance the audio clock by one second and tick
    ac.currentTime = 11;
    ctx.__runTimers();
    const fresh = notes.slice(before);
    assert.ok(fresh.length > 0);
    for (const n of fresh) assert.ok(n.t >= 10 + ctx.Music.lookahead - 1e-9 && n.t < 11 + ctx.Music.lookahead, 'note at ' + n.t);
    // steps are evenly spaced at the track tempo
    const stepDur = ctx.Music.parsed('invasion').stepDur;
    assert.ok(Math.abs(stepDur - 60 / 140 / 2) < 1e-9);
});

test('throttled timer skips ahead instead of bursting', () => {
    const { ctx, notes } = boot({ unlock: true });
    const ac = ctx.Sfx.ctx;
    ctx.Music.play('cleaning');
    ac.currentTime = 60;
    const before = notes.length;
    ctx.__runTimers();
    for (const n of notes.slice(before)) assert.ok(n.t >= 60, 'stale note at ' + n.t);
});

test('music toggled off schedules nothing and toggling on resumes', () => {
    const { ctx, notes } = boot({ unlock: true, stored: 'off' });
    ctx.Music.play('cleaning');
    assert.equal(ctx.Music.playing, false);
    ctx.__runTimers();
    assert.equal(notes.length, 0);
    assert.equal(ctx.Music.toggle(), true);
    assert.equal(ctx.Music.playing, true);
    assert.ok(notes.length > 0);
    ctx.Music.toggle();
    assert.equal(ctx.Music.playing, false);
    assert.equal(ctx.Music.current, 'cleaning');
});

test('sound muted (V) silences music', () => {
    const { ctx, notes } = boot({ unlock: true });
    ctx.Sfx.toggle();
    assert.equal(ctx.Sfx.enabled, false);
    ctx.Music.play('invasion');
    ctx.Sfx.ctx.currentTime = 5;
    ctx.__runTimers();
    assert.equal(notes.length, 0);
    ctx.Sfx.toggle();
    ctx.Sfx.ctx.currentTime = 6;
    ctx.__runTimers();
    assert.ok(notes.length > 0);
});

test('music routes through its own bus into Sfx.master', () => {
    const { ctx } = boot({ unlock: true });
    const connections = [];
    const realCreateGain = ctx.Sfx.ctx.createGain;
    ctx.Sfx.ctx.createGain = function () {
        const n = realCreateGain.call(this);
        n.connect = function (dest) { connections.push({ src: n, dest }); return dest; };
        return n;
    };
    ctx.Music.play('night');
    const bus = ctx.Music.bus;
    assert.ok(connections.some(c => c.src === bus && c.dest === ctx.Sfx.master));
    assert.ok(Math.abs(bus.gain.value - 0.35) < 1e-9);
});

test('a failing node does not break the scheduler', () => {
    const { ctx } = boot({ unlock: true });
    ctx.Sfx.ctx.createOscillator = () => { throw new Error('boom'); };
    assert.doesNotThrow(() => ctx.Music.play('invasion'));
    ctx.Sfx.ctx.currentTime = 2;
    assert.doesNotThrow(() => ctx.__runTimers());
    assert.equal(ctx.Music.playing, true);
});
