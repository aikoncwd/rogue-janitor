const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro, cleaningDay } = require('./harness');

// What the player will clean: every mess on the map, plus the invasion stats.
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

function toInvasion(ctx) {
    for (let i = 0; i < 5 && ctx.Game.phase != 'invasion'; i++) ctx.__press(13);
}

function toCleaning(ctx) {
    for (let i = 0; i < 5 && ctx.Game.phase != 'cleaning'; i++) ctx.__press(13);
}

function watched(seed) {
    const ctx = bootHeadless({ seed, begin: true });
    ctx.Invasion.instant = true;
    toInvasion(ctx);
    toCleaning(ctx);
    return ctx;
}

function skippedFromStart(seed) {
    const ctx = bootHeadless({ seed, begin: true });
    ctx.Invasion.skipping = true;
    toInvasion(ctx);
    toCleaning(ctx);
    return ctx;
}

function skippedMidway(seed, n) {
    const ctx = bootHeadless({ seed, begin: true });
    toInvasion(ctx);
    for (let i = 0; i < n; i++) ctx.__runTimers();
    ctx.__press(27);
    toCleaning(ctx);
    return ctx;
}

test('mess is identical watched, skipped from start and skipped midway', () => {
    for (const seed of [1, 7, 42]) {
        const a = fingerprint(watched(seed));
        assert.ok(a.messes.length > 0);
        assert.deepEqual(fingerprint(skippedFromStart(seed)), a, 'skip from start, seed ' + seed);
        for (const n of [3, 25]) {
            assert.deepEqual(fingerprint(skippedMidway(seed, n)), a, 'skip at ' + n + ', seed ' + seed);
        }
    }
});

test('Flavor.line does not consume ROT.RNG', () => {
    const ctx = bootHeadless({ files: ['script/flavor.js'], game: false });
    const before = ctx.ROT.RNG.getState();
    for (let i = 0; i < 20; i++) ctx.Flavor.line('heroHit', { hero: 'H', monster: 'M' });
    assert.deepEqual(ctx.ROT.RNG.getState(), before);
});

function morning(seed, watched) {
    const ctx = toIntro(bootHeadless({ seed, begin: true }));
    if (watched) {
        ctx.__press(13);
        let n = 0;
        while (ctx.Game.phase == 'invasion' && n++ < 4000) {
            if (ctx.Invasion.stage != null) ctx.__press(13); // the hand-over card waits for a key
            else ctx.__runTimers();
        }
        assert.strictEqual(ctx.Game.phase, 'cleaning', 'watched raid reached the morning');
    }
    else {
        ctx.Invasion.instant = true;
        ctx.__press(13);
        ctx.Invasion.instant = false;
    }
    let n = 0;
    while (ctx.Game.player.talking && n++ < 50) { ctx.Game.player.talking.lastConvoChange = 0; ctx.__press(13); }
    return ctx;
}

function dayPicks(ctx) {
    return JSON.stringify({
        goals: ctx.Objectives.list.map(g => g.label),
        rooms: ctx.Game.rooms.map((r, i) => ctx.Rooms.name(i)),
        stock: ctx.Shop.stock.map(s => s.id),
    });
}

test('drawing the map does not consume the world RNG', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    // put a secret door right next to the janitor so the hint roll happens
    const k = (G.player.x) + ',' + (G.player.y - 1);
    G.map[k].secretDoor = { char: '+', door: '-', color: '#fff', bgColor: '#000', sound: 'You hear a test.' };
    const state = JSON.stringify(ctx.ROT.RNG.getState());
    for (let i = 0; i < 5; i++) G.drawMap();
    assert.strictEqual(JSON.stringify(ctx.ROT.RNG.getState()), state);
});

test('goals, room names and the shop are the same watched or skipped', () => {
    for (const seed of [77, 1234, 5]) {
        assert.strictEqual(dayPicks(morning(seed, true)), dayPicks(morning(seed, false)), 'seed ' + seed);
    }
});
