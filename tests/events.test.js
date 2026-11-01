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

function log(ctx, n = 3) {
    return ctx.Game.log.recent(n).map(l => strip(l.text)).join(' | ');
}

function openFloor(ctx, r = 3) {
    const G = ctx.Game;
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) {
        if (i == 0 && j == 0) { G.map[G.player.x + ',' + G.player.y].mess = null; continue; }
        G.map[(G.player.x + i) + ',' + (G.player.y + j)] = new ctx.Tile(G.player.x + i, G.player.y + j, '.', '#ddd', '#000', true, true);
    }
}

test('events are eligible by day', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.day = 1;
    assert.strictEqual(ctx.DayEvents.eligible('intern'), false);
    assert.strictEqual(ctx.DayEvents.eligible('dragon'), false);
    G.day = 2;
    assert.strictEqual(ctx.DayEvents.eligible('intern'), true);
    assert.strictEqual(ctx.DayEvents.eligible('dragon'), false);
    G.day = 3;
    assert.strictEqual(ctx.DayEvents.eligible('dragon'), true);
    assert.strictEqual(ctx.DayEvents.eligible('flood'), ctx.DayEvents.fountain() != null);
});

test('flood fills free floor only', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.day = 3;
    const f = ctx.GetEntity('Fountain', G.player.x + 3, G.player.y);
    const wet = new Set(Object.keys(G.map).filter(k => G.map[k].mess && G.map[k].mess.kind == 'Water'));
    const before = wet.size;
    ctx.DayEvents.run('flood');
    const after = Object.values(G.map).filter(t => t.mess && t.mess.kind == 'Water').length;
    assert.ok(after - before >= 5, 'lots of water: ' + (after - before));
    for (const k in G.map) {
        const t = G.map[k];
        if (t.mess && t.mess.kind == 'Water' && !wet.has(k)) assert.ok(t.passable, 'new water on floor only: ' + k);
    }
    const ft = G.map[f.x + ',' + f.y];
    assert.ok(ft.mess && ft.mess.kind == 'Broken Fountain', 'the fountain broke');
    assert.match(log(ctx), /fountain/i);
});

test('the dragon naps in a corridor and rolls over on the third bump', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.day = 3;
    ctx.DayEvents.run('dragon');
    const d = ctx.DayEvents.dragon;
    assert.ok(d, 'a dragon');
    assert.strictEqual(G.getRoomIndex(d.x, d.y), -1, 'in a corridor');
    assert.strictEqual(G.map[d.x + ',' + d.y].entity, d);
    assert.ok(!G.monsterList.includes(d));
    // stand next to it and bump three times
    const spot = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [d.x + dx, d.y + dy]).find(([x, y]) => G.map[x + ',' + y] && G.map[x + ',' + y].passThrough());
    G.map[G.player.x + ',' + G.player.y].entity = null;
    G.player.x = spot[0]; G.player.y = spot[1];
    G.map[spot[0] + ',' + spot[1]].entity = G.player;
    const [dx, dy] = [d.x, d.y];
    d.cleanerAct();
    d.cleanerAct();
    assert.deepStrictEqual([G.player.x, G.player.y], spot, 'still blocked');
    d.cleanerAct();
    assert.deepStrictEqual([G.player.x, G.player.y], [dx, dy], 'squeezed past');
    assert.strictEqual(G.map[dx + ',' + dy].entity, G.player);
    assert.strictEqual(G.map[spot[0] + ',' + spot[1]].entity, d);
    assert.ok(ctx.Achievements.has('dragon'));
});

test('the dragon snores soot, capped', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.day = 3;
    ctx.DayEvents.run('dragon');
    for (let t = 0; t < 400; t++) { G.turnCount++; ctx.DayEvents.tick(); }
    assert.strictEqual(ctx.DayEvents.dragon.puffs, 6);
});

test('the intern follows and makes a little mess, capped', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.day = 2;
    openFloor(ctx, 4);
    ctx.DayEvents.run('intern');
    const it = ctx.DayEvents.intern;
    assert.ok(it);
    ctx.ROT.RNG.getUniform = () => 0; // always drops something
    const before = G.messNumbers[1];
    for (let i = 0; i < 20; i++) {
        ctx.__press(i % 2 ? 37 : 39); // step left and right
    }
    assert.ok(Math.max(Math.abs(it.x - G.player.x), Math.abs(it.y - G.player.y)) <= 1, 'stays close');
    assert.ok(it.messes >= 1 && it.messes <= 10, 'messes ' + it.messes);
    assert.ok(G.messNumbers[1] > before);
});

test('the intern never stands on someone', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.day = 2;
    openFloor(ctx, 3);
    ctx.DayEvents.run('intern');
    for (let i = 0; i < 30; i++) {
        ctx.__press([39, 37, 40, 38][i % 4]);
        const it = ctx.DayEvents.intern;
        if (!it) break;
        assert.strictEqual(G.map[it.x + ',' + it.y].entity, it);
        assert.ok(!(it.x == G.player.x && it.y == G.player.y));
    }
});

test('bumping the intern sends it to training', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.day = 2;
    ctx.DayEvents.run('intern');
    const it = ctx.DayEvents.intern;
    it.cleanerAct();
    assert.strictEqual(ctx.DayEvents.intern, null);
    assert.ok(G.map[it.x + ',' + it.y].entity !== it);
    assert.match(log(ctx), /training/);
    assert.ok(ctx.Achievements.has('intern'));
});

test('the intern goes home after 60 turns', () => {
    const ctx = cleaningDay();
    ctx.Game.day = 2;
    ctx.DayEvents.run('intern');
    for (let t = 0; t < 61; t++) ctx.DayEvents.tick();
    assert.strictEqual(ctx.DayEvents.intern, null);
});
