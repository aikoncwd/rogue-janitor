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

// A finished run: five grades and the given points before the last day's clean %.
function lastDay(points, seed = 1234) {
    const ctx = cleaningDay(seed);
    const G = ctx.Game;
    G.day = 5;
    G.run.grades = ['B', 'A', 'S', 'A'];
    G.run.cleanPcts = [75, 88, 97, 90];
    G.run.chattedWith = ['Bob the Kobold', 'Tin the Harpy'];
    G.run.zorkmidsEarned = 120;
    G.yendorPoints = points;
    G.cleanPercent = () => 80;
    G.endShift();
    return ctx;
}

function pressEnterUntilCard(ctx) {
    let n = 0;
    while (!ctx.Ending.onCard && n++ < 30) ctx.__press(13);
    assert.ok(ctx.Ending.onCard, 'reached the card');
}

test('points decide the ending', () => {
    let ctx = lastDay(570); // + 80 today = 650
    ctx.Game.endRun();
    assert.strictEqual(ctx.Ending.kind, 'mop');
    assert.strictEqual(ctx.Game.victory, true);
    assert.strictEqual(ctx.Game.phase, 'ending');
    ctx = lastDay(569);
    ctx.Game.endRun();
    assert.strictEqual(ctx.Ending.kind, 'senior');
    assert.strictEqual(ctx.Game.victory, false);
});

test('the senior ending never says failed', () => {
    const ctx = lastDay(10);
    ctx.Game.endRun();
    for (let i = 0; i < 20; i++) {
        const text = ctx.Ending.lines().join('\n') + strip(ctx.Ending.cardLines().join('\n'));
        assert.ok(!/fail|lose|lost|game over/i.test(text), text);
    }
});

test('card lines share one width', () => {
    for (const pts of [10, 900]) {
        const ctx = lastDay(pts);
        ctx.EasterEggs.mopName = () => 'Sir Mops-a-Lot';
        ctx.Game.endRun();
        const widths = ctx.Ending.cardLines().map(l => strip(l).length);
        assert.ok(widths.every(w => w === widths[0]), JSON.stringify(widths));
        const text = strip(ctx.Ending.cardLines().join('\n'));
        assert.match(text, /B A S A B/);
        assert.match(text, /Sir Mops-a-Lot/);
        assert.match(text, /\/ 650/);
    }
});

test('share text has the ending, grades and points', () => {
    const ctx = lastDay(700);
    ctx.Game.endRun();
    const lines = ctx.Ending.shareText().split('\n');
    assert.match(lines[0], /^Rogue Janitor — Mop of Yendor/);
    assert.match(lines[1], /^5 days · 780 pts · avg 86% · B A S A B$/);
    assert.match(lines[2], /^".+" — .+$/);
});

test('copy without clipboard falls back', () => {
    const ctx = lastDay(100);
    ctx.Game.endRun();
    pressEnterUntilCard(ctx);
    assert.doesNotThrow(() => ctx.__press(67, 99));
    assert.strictEqual(ctx.Ending.copyStatus, 'manual');
    const text = strip(ctx.Ending.cardLines().join('\n'));
    assert.match(text, /Copy failed/);
    const widths = ctx.Ending.cardLines().map(l => strip(l).length);
    assert.ok(widths.every(w => w === widths[0]), JSON.stringify(widths));
});

test('copy with clipboard', () => {
    const ctx = lastDay(100);
    let copied = null;
    ctx.navigator = { clipboard: { writeText(t) { copied = t; return { then(ok) { ok(); return this; } }; } } };
    ctx.Game.endRun();
    pressEnterUntilCard(ctx);
    ctx.__press(67, 99);
    assert.strictEqual(copied, ctx.Ending.shareText());
    assert.strictEqual(ctx.Ending.copyStatus, 'copied');
});

test('after the card a new run starts at the title', () => {
    const ctx = lastDay(100);
    ctx.Game.endRun();
    pressEnterUntilCard(ctx);
    ctx.__press(13);
    assert.strictEqual(ctx.Game.phase, 'title');
    assert.strictEqual(ctx.Game.day, 1);
    assert.strictEqual(ctx.Game.zorkmids, 0);
    assert.strictEqual(ctx.Save.exists(), false);
});

test('best run is stored only when better', () => {
    let ctx = lastDay(500);
    ctx.Game.endRun();
    assert.strictEqual(JSON.parse(ctx.__storage['rj-best-run']).points, 580);
    const storage = Object.assign({}, ctx.__storage);
    ctx = lastDay(100);
    Object.assign(ctx.__storage, storage);
    ctx.Game.endRun();
    assert.strictEqual(JSON.parse(ctx.__storage['rj-best-run']).points, 580);
});

test('leaving on day 5 plays the ending after the night', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.day = 5;
    let door = null;
    for (const k in G.map) { const e = G.map[k].entity; if (e && e.tags && 'exit' in e.tags) door = e; }
    door.cleanerAct();
    door.lastConvoChange = 0;
    ctx.__press(89, 121);
    let n = 0;
    while (G.player.talking && n++ < 40) { G.player.talking.lastConvoChange = 0; ctx.__press(13); }
    assert.strictEqual(G.phase, 'ending');
    assert.ok(ctx.Ending.kind === 'mop' || ctx.Ending.kind === 'senior');
    assert.strictEqual(ctx.Ending.page, 0, 'the closing Enter did not skip the first page');
});

test('the message log is not drawn over the ending', () => {
    const ctx = lastDay(100);
    ctx.Game.endRun();
    ctx.Game.drawMap();
    ctx.Game.sendMessage('A leftover line from the shift.');
    const text = ctx.__drawn.filter(d => d.text).map(d => strip(d.text)).join('\n');
    assert.ok(!/leftover line/.test(text), 'log drawn over the ending');
});
