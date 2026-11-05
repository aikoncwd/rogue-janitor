const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, cleaningDay, strip } = require('./harness');

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

// 6. toast on a narrow map
test('the achievement toast stays inside a narrow map', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    ctx.Achievements.got = {};
    ctx.Achievements.unlock('petting');
    G.layoutInfo.mapCols = 14;
    ctx.__drawn.length = 0;
    ctx.Achievements.drawToast();
    assert.ok(ctx.__drawn.length > 0, 'something drawn');
    for (const d of ctx.__drawn) {
        const w = d.text != null ? strip(d.text).replace(/%b\{[^}]*\}/g, '').length : 1;
        assert.ok(d.x >= 0 && d.x + w <= 14, JSON.stringify(d));
    }
});

test('an achievement unlocks once even when storage fails', () => {
    for (const broken of ['get', 'set']) {
        const ctx = cleaningDay();
        if (broken == 'get') ctx.localStorage.getItem = () => { throw new Error('blocked'); };
        else ctx.localStorage.setItem = () => { throw new Error('quota'); };
        assert.strictEqual(ctx.Achievements.unlock('combo10'), true, broken);
        assert.strictEqual(ctx.Achievements.unlock('combo10'), false, broken);
        assert.strictEqual(ctx.Achievements.queue.length, 1, broken);
        assert.strictEqual(ctx.Game.run.newAchievements.length, 1, broken);
    }
});

test('toasts from the last run do not carry over', () => {
    const ctx = cleaningDay();
    ctx.Achievements.unlock('combo10');
    assert.strictEqual(ctx.Achievements.queue.length, 1);
    ctx.Game.newRun();
    assert.strictEqual(ctx.Achievements.queue.length, 0);
});

// 14. the toast timer naps while it cannot show
for (const what of ['talking', 'Shop', 'Inventory']) {
    test('the toast timer stops while ' + what + ' hides it', () => {
        const ctx = cleaningDay();
        const G = ctx.Game;
        ctx.Achievements.got = {};
        ctx.Achievements.unlock('petting');
        if (what == 'talking') G.player.talking = { name: 'someone' };
        else if (what == 'Shop') ctx.Shop.isOpen = true;
        else ctx.Inventory.isOpen = true;
        ctx.Achievements.scheduleRedraw();
        G.drawMap = () => {}; // the screen itself is not the point here
        ctx.__runTimers();
        assert.strictEqual(ctx.Achievements.timer, null);
    });
}

test('the ending counts what was unlocked since the run began, even after a Continue', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    ctx.Achievements.got = { petting: true };
    G.run = G.freshRun(); // petting was from an older run
    ctx.Achievements.got.ring = true; // unlocked in a session that was then abandoned
    G.run.newAchievements = []; // ...so the restored run never heard of it
    ctx.Achievements.unlock('combo10');
    const fresh = Array.from(ctx.Achievements.newThisRun()).sort();
    assert.deepStrictEqual(fresh, ['combo10', 'ring']);
});
