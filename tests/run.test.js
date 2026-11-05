const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, cleaningDay, strip } = require('./harness');

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

// 13. a new run forgets yesterday's memo
test('a new run clears the goals and the room names', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    ctx.Objectives.list = [{ type: 'chat', label: 'Chat with 3 colleagues', done: true }];
    G.roomNames = ['STALE'];
    G.newRun();
    assert.strictEqual(ctx.Objectives.list.length, 0);
    assert.ok(!(G.roomNames || []).includes('STALE'));
});
