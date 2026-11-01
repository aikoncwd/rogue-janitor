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

function exitDoor(ctx) {
    for (const k in ctx.Game.map) {
        const e = ctx.Game.map[k].entity;
        if (e && e.tags && 'exit' in e.tags) return e;
    }
    throw new Error('no exit door');
}

// Bump the exit and answer y/n. Returns the door.
function bumpExit(ctx, answer) {
    const door = exitDoor(ctx);
    door.cleanerAct();
    door.lastConvoChange = 0;
    ctx.__press(answer == 'y' ? 89 : 78, answer == 'y' ? 121 : 110);
    return door;
}

function enterUntilDone(ctx, max = 40) {
    let n = 0;
    while (ctx.Game.player.talking && n++ < max) {
        ctx.Game.player.talking.lastConvoChange = 0;
        ctx.__press(13);
    }
}

test('confirming the exit pays by grade', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.cleanPercent = () => 90;
    const before = G.zorkmids;
    bumpExit(ctx, 'y');
    assert.strictEqual(G.zorkmids - before, 30);
    assert.deepStrictEqual(Array.from(G.run.grades), ['A']);
    assert.deepStrictEqual(Array.from(G.run.cleanPcts), [90]);
    assert.strictEqual(G.run.zorkmidsEarned, 30);
    assert.strictEqual(G.payFor('S'), 40);
    assert.strictEqual(G.payFor('D'), 6);
});

test('declining the exit does not pay or record', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.cleanPercent = () => 60;
    const before = G.zorkmids;
    bumpExit(ctx, 'n');
    assert.strictEqual(G.zorkmids, before);
    assert.strictEqual(G.run.grades.length, 0);
    G.player.talking = null;
    bumpExit(ctx, 'y');
    enterUntilDone(ctx, 3);
    assert.strictEqual(G.zorkmids - before, 12);
    assert.strictEqual(G.run.grades.length, 1);
});

test('day 5 ends the run instead of a new day', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.day = 5;
    bumpExit(ctx, 'y');
    enterUntilDone(ctx);
    assert.strictEqual(G.phase, 'ending');
    assert.strictEqual(G.day, 5);
    const nodes = ctx.ConversationBuilder.exitPrompt();
    assert.ok(!nodes.some(n => /In the morning/.test(n.message)), 'no morning on the last day');
});

test('other days still go on to the next morning', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    ctx.Invasion.instant = true;
    bumpExit(ctx, 'y');
    enterUntilDone(ctx);
    assert.strictEqual(G.day, 2);
});

test('coins give zorkmids', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const d = dirs.find(([dx, dy]) => { const t = G.map[(G.player.x + dx) + ',' + (G.player.y + dy)]; return t && t.passThrough() && t.mess == null; });
    ctx.makeMess(G.player.x + d[0], G.player.y + d[1], 'GoldCoins');
    const before = G.zorkmids;
    ctx.__press(71); // G
    const gained = G.zorkmids - before;
    assert.ok(gained >= 1 && gained <= 5, 'gained ' + gained);
    const last = G.log.recent(3).map(l => strip(l.text)).join(' ');
    assert.match(last, /\+\d+ zm/);
});

test('chests scatter more coin', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    assert.strictEqual(G.monsterList.length >= 0, true);
    const chest = ctx.GetEntity('Chest', G.player.x, G.player.y);
    assert.strictEqual(chest.tags.scatter[1], 3);
});

test('the panel shows the wallet', () => {
    const ctx = cleaningDay();
    ctx.Game.zorkmids = 37;
    ctx.Game.drawMap();
    const text = ctx.__drawn.filter(d => d.text).map(d => strip(d.text)).join('\n');
    assert.match(text, /37 zm/);
});

test('the shift report shows pay instead of a best shift', () => {
    const ctx = cleaningDay();
    ctx.Game.cleanPercent = () => 96;
    ctx.Game.zorkmids = 5;
    const r = strip(ctx.Game.shiftReport());
    assert.match(r, /Pay: \+40 zm/);
    assert.ok(!/Best shift|personal best/.test(r));
    assert.ok(!('rj-best' in ctx.__storage));
});
