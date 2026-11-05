const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, cleaningDay } = require('./harness');

test('the report is a framed card above a short line', () => {
    const ctx = cleaningDay();
    ctx.Game.cleanPercent = () => 87;
    const nodes = ctx.ConversationBuilder.exitPrompt();
    const node = nodes.find(n => n.message && /Shift report/.test(n.message));
    assert.strictEqual(node.scene, 'report');
    assert.ok(node.message.split('\n').length <= 2, 'short line under the card');
    const card = ctx.Scenes.art.report.frames[0].join('\n');
    assert.match(card, /SHIFT REPORT/);
    assert.match(card, /87%/);
    assert.match(card, /Pay/);
    assert.match(card, /\bA\b/);
});

test('card lines share one width', () => {
    const ctx = cleaningDay();
    for (const pct of [0, 42, 100]) {
        ctx.Game.cleanPercent = () => pct;
        const lines = ctx.Game.reportCardLines();
        const w = lines.map(l => l.length);
        assert.ok(w.every(x => x == w[0]), JSON.stringify(w));
    }
});

test('the clean bar changes colour by tier', () => {
    const ctx = bootHeadless();
    assert.strictEqual(ctx.Panel.barColor(30), '#c33');
    assert.strictEqual(ctx.Panel.barColor(65), '#cc3');
    assert.strictEqual(ctx.Panel.barColor(90), '#0c0');
});

test('cleaned tiles shine for a moment', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    let now = 5000;
    G.now = () => now;
    const key = (G.player.x + 1) + ',' + G.player.y;
    G.map[key] = new ctx.Tile(G.player.x + 1, G.player.y, '.', '#ddd', '#000', true, true);
    ctx.makeMess(G.player.x + 1, G.player.y, 'Water');
    ctx.__press(77);
    assert.ok(G.shineAt(key) > 0, 'shining');
    now += G.SHINE_MS + 1;
    assert.strictEqual(G.shineAt(key), 0);
});

test('cleanPercent with no mess is 100', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.messNumbers = [0, 0];
    assert.strictEqual(G.cleanPercent(), 100);
    assert.ok(!/NaN/.test(G.shiftReport()));
    assert.ok(!/NaN/.test(G.plaqueLines().join('\n')));
});

test('cleanPercent has no side effects', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.messNumbers = [10, 100];
    const before = G.monsterList.map(m => m.quests.length);
    for (let i = 0; i < 50; i++) {
        G.coffeeThreshold = -1;
        G.inviteOutThreshold = -1;
        G.cleanPercent();
    }
    assert.deepStrictEqual(G.monsterList.map(m => m.quests.length), before);
});

test('the report card shows progress toward the Mop', () => {
    const ctx = cleaningDay();
    ctx.Game.yendorPoints = 120;
    ctx.Game.cleanPercent = () => 50;
    const card = ctx.Game.reportCardLines().join('\n');
    assert.match(card, /Mop of Yendor\s+170 \/ 650/);
    const w = ctx.Game.reportCardLines().map(l => l.length);
    assert.ok(w.every(x => x == w[0]));
});

// Ends today, plays tonight's raid instantly and clocks in to the next shift.
function playNextDay(ctx, beforeRaid) {
    const G = ctx.Game;
    G.nextDay();
    G.player.endTurn(); // as the exit conversation does
    if (beforeRaid) beforeRaid();
    ctx.Invasion.instant = true;
    ctx.Invasion.skip();
    let n = 0;
    while (G.phase != 'cleaning' && n++ < 10) ctx.__press(13);
    n = 0;
    while (G.player.talking && n++ < 50) { G.player.talking.lastConvoChange = 0; ctx.__press(13); }
    return ctx;
}

test("a comrade's lost item from yesterday counts as a mess when it turns up again", () => {
    const ctx = cleaningDay(1234);
    const G = ctx.Game;
    let m = null;
    playNextDay(ctx, () => {
        // a comrade in tonight's raid still owes us yesterday's lost item (not on today's map)
        m = G.monsterList.find(x => x.alive && !x.retired && !x.tags.visitor);
        ctx.QuestMess(m, G.player.x, G.player.y);
        G.map[m.questItem.x + ',' + m.questItem.y].mess = null;
        G.messNumbers[0]--;
        G.messNumbers[1]--;
    });
    assert.strictEqual(G.phase, 'cleaning');
    assert.ok(Object.values(G.map).some(t => t.mess === m.questItem), 'the item is back on the map');
    const onMap = Object.values(G.map).filter(t => t.mess).length;
    assert.strictEqual(G.messNumbers[0], onMap, 'every mess on the map is counted once');
});

test('cleanliness never goes above 100%, and the report card still draws', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.messNumbers = [-1, 5]; // a counter gone wrong must not break the evening
    assert.strictEqual(G.cleanPercent(), 100);
    assert.doesNotThrow(() => G.reportCardLines());
});

test('a lost item is not dropped on 0,0 when no tile is free', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.freeCells = []; // nothing free anywhere
    assert.strictEqual(G.randomFarFromPlayer(), null);
});
