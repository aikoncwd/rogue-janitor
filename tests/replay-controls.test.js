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

// --- Rewind ---

// Everything the footage shows at this moment.
function frame(ctx) {
    const G = ctx.Game;
    const map = Object.keys(G.map).sort().map(k => k + ':' + G.map[k].char + ':' + (G.map[k].mess ? G.map[k].mess.name : '')).join('|');
    const a = G.adventurer;
    return {
        map,
        hero: [a.x, a.y, a.hp, a.turns].join(','),
        roster: ctx.Invasion.roster.map(m => m.name + ':' + m.hp + ':' + m.x + ',' + m.y).join('|'),
        stats: JSON.stringify(ctx.Invasion.stats),
        log: G.log.lines.map(l => l.text).join('\n'),
        clock: ctx.Invasion.clockText(),
        bodies: JSON.stringify(ctx.Invasion.bodies),
    };
}

function steps(ctx, n) {
    for (let i = 0; i < n && ctx.Invasion.stage == null && ctx.Game.phase == 'invasion'; i++) ctx.__press(KEY.RIGHT);
}

test('R rewinds to the first frame, paused, and the night replays the same', () => {
    for (const seed of [1234, 7]) {
        const ctx = invading(seed);
        const start = frame(ctx);
        steps(ctx, 25);
        const later = frame(ctx);
        assert.notDeepEqual(later, start);
        ctx.__press(KEY.SPACE); // even while playing
        ctx.__press(KEY.R);
        assert.equal(ctx.Invasion.paused, true);
        assert.equal(ctx.Invasion.turn, 0);
        assert.equal(ctx.Game.adventurer.turns, -1);
        assert.equal(ctx.Game.phase, 'invasion');
        assert.equal(ctx.__timers.filter(t => t.ms !== ctx.Game.QUEST_BLINK_MS).length, 0);
        assert.deepEqual(frame(ctx), start);
        steps(ctx, 25);
        assert.deepEqual(frame(ctx), later);
    }
});

test('a rewound night ends in the same dungeon', () => {
    const ctx = invading(7);
    steps(ctx, 40);
    ctx.__press(KEY.R);
    skipToCleaning(ctx);
    assert.deepEqual(fingerprint(ctx), fingerprint(instantRun(7)));
});

test('rewind on day 2 replays the same and the shift still works', () => {
    const ctx = invading(42);
    const G = ctx.Game;
    const press = k => { if (G.player.talking) G.player.talking.lastConvoChange = 0; ctx.__press(k); };
    skipToCleaning(ctx);
    let n = 0;
    while (G.player.talking && n++ < 50) press(KEY.ENTER);
    // home through the real exit stairs, as a player does
    let exit = null;
    for (const k in G.map) { const e = G.map[k].entity; if (e && e.tags && 'exit' in e.tags) exit = e; }
    exit.cleanerAct();
    G.player.talking.lastConvoChange = 0;
    for (const l of ctx.__listeners.slice()) {
        if (l.type !== 'keypress') continue;
        const ev = { keyCode: 0, charCode: 121, which: 0, preventDefault() {}, stopPropagation() {} };
        if (typeof l.fn === 'function') l.fn(ev); else l.fn.handleEvent(ev);
    }
    n = 0;
    while ((G.phase === 'cleaning' || G.player.talking) && n++ < 40) press(KEY.ENTER);
    assert.equal(G.day, 2);
    assert.equal(G.phase, 'invasion');
    assert.equal(ctx.Invasion.paused, true);
    assert.ok(ctx.Invasion.gate != null, 'waiting on the first frame');
    const start = frame(ctx);
    steps(ctx, 10);
    assert.equal(G.adventurer.turns, 9); // the first step is turn 0
    const later = frame(ctx);
    ctx.__press(KEY.R);
    assert.equal(ctx.Game.day, 2);
    assert.equal(ctx.Invasion.turn, 0);
    assert.deepEqual(frame(ctx), start);
    steps(ctx, 10);
    assert.deepEqual(frame(ctx), later);
    skipToCleaning(ctx);
    n = 0;
    while (ctx.Game.player.talking && n++ < 50) { ctx.Game.player.talking.lastConvoChange = 0; ctx.__press(KEY.ENTER); }
    const p = ctx.Game.player;
    const before = p.x + ',' + p.y;
    const turnsBefore = ctx.Game.turnCount;
    for (const code of [37, 39, 38, 40, 190]) ctx.__press(code); // moves or waits: the engine is alive
    assert.ok(p.x + ',' + p.y != before || ctx.Game.turnCount != turnsBefore || p.talking != null, 'the player can act');
});

test('R does nothing during the hand-over or the shift', () => {
    const ctx = invading();
    ctx.__press(KEY.ESC);
    assert.notEqual(ctx.Invasion.stage, null);
    const day = ctx.Game.day;
    ctx.Invasion.rewind();
    assert.notEqual(ctx.Invasion.stage, null);
    finishHandover(ctx);
    ctx.Invasion.rewind();
    assert.equal(ctx.Game.phase, 'cleaning');
    assert.equal(ctx.Game.day, day);
});

test('rewind works on a continued day', () => {
    const A = invading(5);
    skipToCleaning(A);
    A.Game.nextDay(); // writes the day-2 save
    const B = bootHeadless({ seed: 999, begin: true, paused: true });
    Object.assign(B.__storage, A.__storage);
    B.Game.drawMap();
    B.__press(67, 99); // c: continue
    assert.equal(B.Game.day, 2);
    assert.equal(B.Game.phase, 'invasion');
    assert.equal(B.Invasion.paused, true);
    // the hero's first turn, then eight more; after the rewind the same nine
    B.__press(KEY.RIGHT);
    const start = frame(B);
    steps(B, 8);
    const later = frame(B);
    B.__press(KEY.R);
    steps(B, 9);
    assert.deepEqual(frame(B), later);
    assert.notDeepEqual(start, later);
});
