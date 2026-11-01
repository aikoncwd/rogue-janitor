const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, run } = require('./harness');

const strip = s => s.replace(/%c\{[^}]*\}/g, '');

test('rooms follow the 5-day table', () => {
    for (const seed of [1, 2, 3]) {
        const ctx = bootHeadless({ seed });
        const G = ctx.Game;
        G.generateDungeon();
        const rooms = [G.dungeonRooms];
        for (let d = 2; d <= 5; d++) {
            ctx.Invasion.instant = true;
            G.nextDay();
            rooms.push(G.dungeonRooms);
        }
        assert.deepStrictEqual(rooms, [5, 7, 10, 13, 16], 'seed ' + seed);
        assert.deepStrictEqual(Array.from(G.DAY_ROOMS), [5, 7, 10, 13, 16]);
        assert.strictEqual(G.roomsForDay(9), 16);
        assert.strictEqual(G.LAST_DAY, 5);
        assert.strictEqual(G.targetPoints, 650);
    }
});

test('no victory cutscene mid-run', () => {
    const ctx = bootHeadless({ seed: 4 });
    const G = ctx.Game;
    G.generateDungeon();
    G.yendorPoints = 10000;
    ctx.Invasion.instant = true;
    G.nextDay();
    assert.strictEqual(G.player.cutscene, null);
    assert.strictEqual(G.victory, false);
});

test('panel shows Day N / 5', () => {
    const ctx = bootHeadless({ seed: 5 });
    const G = ctx.Game;
    G.generateDungeon();
    G.phase = 'cleaning';
    G.day = 3;
    G.drawMap();
    const text = ctx.__drawn.filter(d => d.text).map(d => strip(d.text)).join('\n');
    assert.match(text, /Day 3 \/ 5/);
});
