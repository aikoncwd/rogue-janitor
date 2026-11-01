const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro } = require('./harness');

const strip = s => s.replace(/%c\{[^}]*\}/g, '');

function cleaningDay(seed = 1234) {
    const ctx = toIntro(bootHeadless({ seed, begin: true }));
    ctx.Invasion.instant = true;
    ctx.__press(13);
    ctx.Invasion.instant = false;
    let n = 0;
    while (ctx.Game.player.talking && n++ < 50) {
        ctx.Game.player.talking.lastConvoChange = 0;
        ctx.__press(13);
    }
    return ctx;
}

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
