const test = require('node:test');
const assert = require('node:assert');
const { cleaningDay, strip } = require('./harness');

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

// 7. soot on important tiles
test('the dragon\'s soot never lands on important tiles', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.day = 3;
    ctx.DayEvents.run('dragon');
    const d = ctx.DayEvents.dragon;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const t = G.map[(d.x + a) + ',' + (d.y + b)];
        if (t && t !== G.map[d.x + ',' + d.y]) t.important = true;
    }
    for (let k = 0; k < 6; k++) {
        G.turnCount = ctx.DayEvents.DRAGON_PUFF_EVERY * (k + 1);
        ctx.DayEvents.tick();
    }
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const t = G.map[(d.x + a) + ',' + (d.y + b)];
        assert.ok(!(t && t.mess && t.mess.kind == 'Soot'), 'soot at ' + a + ',' + b);
    }
});

// 8. the intern and doors
test('the intern does not stop in a doorway', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.day = 2;
    ctx.DayEvents.run('intern');
    const it = ctx.DayEvents.intern;
    assert.ok(it);
    const p = G.player;
    // the tile the player just left is an open door
    const dx = p.x + 1, dy = p.y;
    const t = G.map[dx + ',' + dy];
    t.entity = null; t.mess = null; t.door = '-'; t.open = true; t.passable = true;
    p.prevX = dx; p.prevY = dy;
    if (Math.max(Math.abs(it.x - p.x), Math.abs(it.y - p.y)) <= 1) {
        // move the intern out of reach, so it wants to follow
        const far = Object.keys(G.map).find(k => {
            const [x, y] = k.split(',').map(Number);
            const tile = G.map[k];
            return tile.passable && tile.entity == null && tile.door == null && Math.max(Math.abs(x - p.x), Math.abs(y - p.y)) > 2;
        });
        G.map[it.x + ',' + it.y].entity = null;
        [it.x, it.y] = far.split(',').map(Number);
        G.map[far].entity = it;
    }
    const [ix, iy] = [it.x, it.y];
    ctx.DayEvents.tick();
    assert.notDeepStrictEqual([it.x, it.y], [dx, dy]);
    assert.deepStrictEqual([it.x, it.y], [ix, iy]);
});

test('a fountain fixed after the flood is a fountain again', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.day = 3;
    const f = ctx.GetEntity('Fountain', G.player.x + 3, G.player.y);
    ctx.DayEvents.run('flood');
    const tile = G.map[f.x + ',' + f.y];
    tile.mess = null; // fixed (what the fix tool does: put the parent back)
    tile.entity = f;
    assert.strictEqual(f.getArt()[0], '{');
});

test('a questing comrade can swap past the sleeping dragon', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.day = 3;
    ctx.DayEvents.run('dragon');
    const d = ctx.DayEvents.dragon;
    const spot = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [d.x + dx, d.y + dy]).find(([x, y]) => G.map[x + ',' + y] && G.map[x + ',' + y].passThrough());
    const m = G.monsterList.find(x => x.alive && x.retired && !x.tags.visitor);
    G.map[m.x + ',' + m.y].entity = null;
    m.x = spot[0]; m.y = spot[1];
    G.map[spot[0] + ',' + spot[1]].entity = m;
    const [dx, dy] = [d.x, d.y];
    assert.ok(m.moveTo(dx, dy, true), 'swapped');
    assert.deepStrictEqual([m.x, m.y], [dx, dy]);
    assert.deepStrictEqual([d.x, d.y], spot);
    assert.strictEqual(G.map[spot[0] + ',' + spot[1]].entity, d);
});

test('the intern does not jump to yesterday\'s spot', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.day = 2;
    G.player.prevX = 9999; G.player.prevY = 9999;
    ctx.DayEvents.start();
    assert.strictEqual(G.player.prevX, null);
});

test('the dragon does not roll onto a door', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.day = 3;
    ctx.DayEvents.run('dragon');
    const d = ctx.DayEvents.dragon;
    const spot = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [d.x + dx, d.y + dy]).find(([x, y]) => G.map[x + ',' + y] && G.map[x + ',' + y].passThrough());
    G.map[G.player.x + ',' + G.player.y].entity = null;
    G.player.x = spot[0]; G.player.y = spot[1];
    const t = G.map[spot[0] + ',' + spot[1]];
    t.entity = G.player;
    t.door = '-'; t.open = true; // the player stands in a doorway
    for (let i = 0; i < 3; i++) d.cleanerAct();
    assert.deepStrictEqual([G.player.x, G.player.y], spot, 'no swap onto a door');
    assert.match(G.log.recent(2).map(l => strip(l.text)).join(' '), /dragon/i);
});

test('the dragon puffs counting from its nap, the same after a Continue', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.day = 3;
    G.turnCount = 1234; // a Continue keeps whatever the counter was
    ctx.DayEvents.run('dragon');
    const d = ctx.DayEvents.dragon;
    assert.strictEqual(d.start, 1234);
    for (let i = 0; i < ctx.DayEvents.DRAGON_PUFF_EVERY - 1; i++) { G.turnCount++; ctx.DayEvents.tick(); }
    assert.strictEqual(d.puffs, 0);
    G.turnCount++;
    ctx.DayEvents.tick();
    assert.strictEqual(d.puffs, 1);
});
