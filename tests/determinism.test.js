const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless } = require('./harness');

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
