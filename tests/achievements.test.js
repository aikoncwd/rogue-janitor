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

function drawnText(ctx) {
    ctx.Game.drawMap();
    return ctx.__drawn.filter(d => d.text).map(d => strip(d.text)).join('\n');
}

test('there are at least 20 achievements, each with a name and a description', () => {
    const ctx = bootHeadless();
    assert.ok(ctx.Achievements.LIST.length >= 20);
    const ids = new Set();
    for (const a of ctx.Achievements.LIST) {
        assert.ok(a.id && a.name && a.desc, JSON.stringify(a));
        assert.ok(!ids.has(a.id), 'unique id ' + a.id);
        ids.add(a.id);
    }
});

test('unlock is once, storage optional', () => {
    const ctx = cleaningDay();
    assert.strictEqual(ctx.Achievements.unlock('combo10'), true);
    assert.strictEqual(ctx.Achievements.unlock('combo10'), false);
    assert.strictEqual(ctx.Achievements.has('combo10'), true);
    assert.deepStrictEqual(Array.from(ctx.Game.run.newAchievements), ['combo10']);
    assert.ok(JSON.parse(ctx.__storage['rj-achievements']).combo10);
    ctx.localStorage.setItem = () => { throw new Error('quota'); };
    assert.doesNotThrow(() => ctx.Achievements.unlock('slips10'));
});

test('a toast shows then goes', () => {
    const ctx = cleaningDay();
    let now = 1000;
    ctx.Achievements.now = () => now;
    ctx.Achievements.unlock('combo10');
    ctx.Achievements.unlock('slips10');
    assert.match(drawnText(ctx), /Achievement unlocked/);
    assert.match(drawnText(ctx), /Streaky/);
    now += ctx.Achievements.TOAST_MS + 1;
    assert.match(drawnText(ctx), /Floor Is Lava/, 'the queued one comes next');
    now += ctx.Achievements.TOAST_MS + 1;
    assert.ok(!/Achievement unlocked/.test(drawnText(ctx)));
});

test('hooks unlock: combo 10, ring, petting-free 100% shift, slips, fortunes', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.combo.count = 9; G.combo.lastTurn = G.turnCount;
    G.comboHit();
    assert.ok(ctx.Achievements.has('combo10'));
    G.cleanPercent = () => 100;
    G.endShift();
    assert.ok(ctx.Achievements.has('zeroWaste'));
    assert.ok(ctx.Achievements.has('firstDay'));
    G.run.counts.slips = 9;
    ctx.Achievements.bump('slips');
    assert.ok(ctx.Achievements.has('slips10'));
    G.run.counts.fortunes = 4;
    ctx.Achievements.bump('fortunes');
    assert.ok(ctx.Achievements.has('fortunes5'));
});

test('title lists achievements with ??? for locked hidden ones', () => {
    const ctx = bootHeadless({ begin: true });
    ctx.__press(65, 97); // a
    const text = drawnText(ctx);
    assert.match(text, /ACHIEVEMENTS/);
    assert.match(text, /\?\?\?/);
    assert.match(text, /0 \/ \d+/);
    ctx.__press(13);
    assert.strictEqual(ctx.Game.phase, 'title');
});

test('the card counts this run\'s new achievements', () => {
    const ctx = cleaningDay();
    ctx.Achievements.unlock('combo10');
    ctx.Game.day = 5;
    ctx.Game.endRun();
    const card = strip(ctx.Ending.cardLines().join('\n'));
    assert.match(card, /Achievements\s+\d+ new \(\d+ \/ \d+\)/);
});
