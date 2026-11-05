const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro, cleaningDay, strip } = require('./harness');

function clearAround(ctx, r = 2) {
    const G = ctx.Game;
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) {
        const key = (G.player.x + i) + ',' + (G.player.y + j);
        if (i == 0 && j == 0) { if (G.map[key]) G.map[key].mess = null; continue; }
        G.map[key] = new ctx.Tile(G.player.x + i, G.player.y + j, '.', '#ddd', '#000', true, true);
    }
}

// Mop one fresh puddle next to the player (a cleaning action that takes a turn).
function mopOne(ctx) {
    const G = ctx.Game;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const t = G.map[(G.player.x + i) + ',' + (G.player.y + j)]; if (t) t.mess = null; }
    ctx.makeMess(G.player.x + 1, G.player.y, 'Water'); // never a stubborn stain
    ctx.__press(77);
}

test('a scrub pass keeps the streak alive without counting', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    clearAround(ctx);
    mopOne(ctx);
    mopOne(ctx);
    const acid = ctx.makeMess(G.player.x + 1, G.player.y, 'AcidPool');
    for (let i = 0; i < 2; i++) ctx.__press(77); // two scrub passes
    assert.ok(G.map[(G.player.x + 1) + ',' + G.player.y].mess === acid, 'still there');
    for (let i = 0; i < 2; i++) ctx.__press(190);
    ctx.__press(77); // gone now: the streak survived the passes and the short pause
    assert.strictEqual(G.combo.count, 3);
});

test('quick cleans build a combo', () => {
    const ctx = cleaningDay();
    clearAround(ctx);
    for (let i = 0; i < 3; i++) mopOne(ctx);
    assert.strictEqual(ctx.Game.combo.count, 3);
});

test('a pause breaks it', () => {
    const ctx = cleaningDay();
    clearAround(ctx);
    mopOne(ctx);
    mopOne(ctx);
    for (let i = 0; i < 4; i++) ctx.__press(190); // wait
    mopOne(ctx);
    assert.strictEqual(ctx.Game.combo.count, 1);
});

test('stepping in a spreading mess breaks it', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    clearAround(ctx);
    mopOne(ctx);
    mopOne(ctx);
    ctx.makeMess(G.player.x, G.player.y - 1, 'BloodPool');
    ctx.__press(38); // up, into the blood
    assert.strictEqual(G.combo.count, 0);
});

test('milestones pay once', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    clearAround(ctx);
    assert.strictEqual(G.comboBonus(5), 5);
    assert.strictEqual(G.comboBonus(10), 10);
    assert.strictEqual(G.comboBonus(20), 20);
    assert.strictEqual(G.comboBonus(30), 20);
    assert.strictEqual(G.comboBonus(7), 0);
    for (let i = 0; i < 4; i++) mopOne(ctx);
    const before = G.yendorPoints;
    mopOne(ctx);
    assert.strictEqual(G.yendorPoints - before, 5);
    const lines = G.log.recent(5).map(l => strip(l.text)).filter(t => /Combo x5/.test(t));
    assert.strictEqual(lines.length, 1);
});

test('panel shows the combo', () => {
    const ctx = cleaningDay();
    clearAround(ctx);
    mopOne(ctx);
    mopOne(ctx);
    ctx.Game.drawMap();
    const text = ctx.__drawn.filter(d => d.text).map(d => strip(d.text)).join('\n');
    assert.match(text, /Combo x2/);
});

test('best combo reaches the run', () => {
    const ctx = cleaningDay();
    clearAround(ctx);
    for (let i = 0; i < 6; i++) mopOne(ctx);
    assert.strictEqual(ctx.Game.run.bestCombo, 6);
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

test('a squeegee or vacuum press counts once in the combo', () => {
    const ctx = morning(1234, false);
    const G = ctx.Game;
    G.day = 3;
    for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
        const key = (G.player.x + i) + ',' + (G.player.y + j);
        if (i == 0 && j == 0) { G.map[key].mess = null; continue; }
        G.map[key] = new ctx.Tile(G.player.x + i, G.player.y + j, '.', '#ddd', '#000', true, true);
    }
    for (const [dx, dy] of [[1, 0], [2, 0], [3, 0]]) ctx.makeMess(G.player.x + dx, G.player.y + dy, 'Water');
    ctx.__press(77);
    assert.strictEqual(G.combo.count, 1);
});
