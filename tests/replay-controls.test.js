const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro } = require('./harness');

const KEY = { ENTER: 13, SPACE: 32, ESC: 27, RIGHT: 39, F: 70, R: 82 };
const plain = s => s.replace(/%c\{[^}]*\}/g, '');

// Into the invasion on day 1, paused on the first frame.
function invading(seed = 1234) {
    const ctx = toIntro(bootHeadless({ seed, begin: true, paused: true }));
    ctx.__press(KEY.ENTER);
    assert.equal(ctx.Game.phase, 'invasion');
    return ctx;
}

// What the player will clean, plus the invasion stats.
function fingerprint(ctx) {
    const messes = [];
    for (const k in ctx.Game.map) {
        const m = ctx.Game.map[k].mess;
        if (m != null) messes.push(k + ':' + m.name + ':' + m.char);
    }
    messes.sort();
    const stats = Object.assign({}, ctx.Invasion.stats);
    delete stats.bloodPuddles;
    return { messes, stats: JSON.stringify(stats) };
}

// Lets the hand-over (linger, curtain, card) run out.
function finishHandover(ctx) {
    for (let i = 0; i < 20 && ctx.Game.phase != 'cleaning'; i++) ctx.__press(KEY.ENTER);
}

function skipToCleaning(ctx) {
    ctx.__press(KEY.ESC);
    finishHandover(ctx);
    assert.equal(ctx.Game.phase, 'cleaning');
}

function instantRun(seed) {
    const ctx = toIntro(bootHeadless({ seed, begin: true, paused: true }));
    ctx.Invasion.instant = true;
    ctx.__press(KEY.ENTER);
    finishHandover(ctx);
    return ctx;
}

test('starts paused before the hero\'s first turn', () => {
    const ctx = invading();
    assert.equal(ctx.Invasion.paused, true);
    assert.equal(ctx.Invasion.turn, 0);
    assert.equal(ctx.Game.adventurer.turns, -1);
    assert.equal(ctx.Invasion.timer, null);
    assert.equal(ctx.__timers.length, 0);
});

test('→ steps one hero turn while paused', () => {
    const ctx = invading();
    for (let i = 0; i < 3; i++) ctx.__press(KEY.RIGHT);
    assert.equal(ctx.Invasion.turn, 3);
    assert.equal(ctx.Invasion.paused, true);
    assert.equal(ctx.Invasion.timer, null);
});

test('Space plays at normal speed, Space again pauses', () => {
    const ctx = invading();
    ctx.__press(KEY.SPACE);
    assert.equal(ctx.Invasion.paused, false);
    assert.equal(ctx.Invasion.fast, false);
    assert.equal(ctx.__timers.length, 1);
    assert.ok(ctx.__timers[0].ms >= 90 && ctx.__timers[0].ms <= 350, String(ctx.__timers[0].ms));
    ctx.__runTimers();
    const turn = ctx.Invasion.turn;
    assert.ok(turn >= 2);
    ctx.__press(KEY.SPACE);
    assert.equal(ctx.Invasion.paused, true);
    assert.equal(ctx.__timers.length, 0);
    ctx.__runTimers();
    assert.equal(ctx.Invasion.turn, turn);
    ctx.__press(KEY.SPACE); // and plays on from there: the held turn runs at once
    assert.equal(ctx.Invasion.turn, turn + 1);
    ctx.__runTimers();
    assert.equal(ctx.Invasion.turn, turn + 2);
});

test('→ while playing only pauses', () => {
    const ctx = invading();
    ctx.__press(KEY.SPACE);
    const turn = ctx.Invasion.turn;
    ctx.__press(KEY.RIGHT);
    assert.equal(ctx.Invasion.paused, true);
    assert.equal(ctx.Invasion.turn, turn);
    assert.equal(ctx.__timers.length, 0);
});

test('F plays fast from pause and toggles back', () => {
    const ctx = invading();
    ctx.__press(KEY.F);
    assert.equal(ctx.Invasion.fast, true);
    assert.equal(ctx.Invasion.paused, false);
    ctx.__press(KEY.F);
    assert.equal(ctx.Invasion.fast, false);
    assert.equal(ctx.Invasion.paused, false);
});

test('skip from the first frame reaches cleaning with the same dungeon', () => {
    for (const seed of [1, 7]) {
        const ctx = invading(seed);
        skipToCleaning(ctx);
        assert.deepEqual(fingerprint(ctx), fingerprint(instantRun(seed)));
    }
});

test('skip after a few steps and while playing still ends the night', () => {
    const ctx = invading();
    ctx.__press(KEY.RIGHT);
    ctx.__press(KEY.RIGHT);
    ctx.__press(KEY.SPACE);
    skipToCleaning(ctx);
});

test('controls are always shown under the REC line', () => {
    const ctx = invading();
    ctx.__drawn.length = 0;
    ctx.Game.drawMap();
    const rows = r => ctx.__drawn.filter(d => d.text && d.y == r).map(d => plain(d.text)).join('\n');
    assert.ok(rows(0).includes('PAUSED'), rows(0));
    assert.ok(rows(1).includes('rewind'), rows(1));
    ctx.__press(KEY.SPACE);
    ctx.__drawn.length = 0;
    ctx.Game.drawMap();
    assert.ok(!rows(0).includes('PAUSED'));
    assert.ok(rows(1).includes('rewind'));
    for (const w of [100, 60, 40, 30]) {
        assert.ok(plain(ctx.Invasion.controlsText(w)).length <= w - 2, String(w));
    }
});

test('the side panel lists the replay keys', () => {
    const ctx = invading();
    const lines = ctx.Panel.lines('invasion').map(plain).join('\n');
    for (const k of ['[Space] play/pause', '[→] step', '[R] rewind', '[F] fast', '[Esc] skip']) {
        assert.ok(lines.includes(k), k);
    }
});
