const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, cleaningDay } = require('./harness');

function runFullDay(ctx) {
    ctx.Game.generateDungeon();
    if (ctx.Invasion) ctx.Invasion.instant = true;
    ctx.Game.phase = 'invasion';
    ctx.Game.engine.start(); // runs until Player.act locks the engine
}

test('hero runs to completion and monsters retire to lounge', () => {
    const ctx = bootHeadless();
    runFullDay(ctx);
    assert.equal(ctx.Game.adventurer.active, false);
    assert.ok(ctx.Game.messNumbers[0] > 50, 'messNumbers=' + ctx.Game.messNumbers[0]);
    const today = ctx.Game.monsterList.filter(m => m.alive);
    assert.ok(today.length > 0);
    assert.ok(today.every(m => m.retired));
});

test('monster sort puts higher score first', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
        const ctx = bootHeadless({ seed });
        runFullDay(ctx);
        const score = m => 2 * m.level + m.playerInteractions + m.friends.length;
        const s = ctx.Game.monsterList.map(score);
        for (let i = 1; i < s.length; i++) {
            assert.ok(s[i - 1] >= s[i], `seed ${seed}: ${s.join(',')}`);
        }
    }
});

test('hero does not recompute its path while chasing a target that has not moved', () => {
    for (const seed of [1, 2, 3]) {
        const ctx = bootHeadless({ seed });
        ctx.Game.generateDungeon();
        const a = ctx.Game.adventurer;
        a.targets = [ctx.Game.monsterList[0]];
        a.turns = 1; // keep look() (every 5th turn) out of the way
        let computes = 0, failedMoves = 0;
        const orig = ctx.ROT.Path.AStar.prototype.compute;
        ctx.ROT.Path.AStar.prototype.compute = function (...x) { computes++; return orig.apply(this, x); };
        const move = a.moveTo.bind(a);
        a.moveTo = (x, y) => { const ok = move(x, y); if (!ok) failedMoves++; return ok; };
        for (let i = 0; i < 4; i++) a.act();
        assert.ok(computes <= 1 + failedMoves, `seed ${seed}: computes ${computes} failed ${failedMoves}`);
    }
});

// A free floor tile next to the player: [x, y, keyCode towards it].
function freeBeside(ctx) {
    const G = ctx.Game;
    const dirs = { '1,0': 39, '-1,0': 37, '0,1': 40, '0,-1': 38 };
    for (const d in dirs) {
        const [dx, dy] = d.split(',').map(Number);
        const t = G.map[(G.player.x + dx) + ',' + (G.player.y + dy)];
        if (t && t.passThrough() && t.mess == null) return [G.player.x + dx, G.player.y + dy, dirs[d]];
    }
    throw new Error('no free tile beside the player');
}

test('every map tile knows its own coordinates (secret-door hints depend on it)', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    let bad = [];
    for (const k in G.map) {
        const [x, y] = k.split(',').map(Number);
        if (G.map[k].x !== x || G.map[k].y !== y) bad.push(k);
    }
    assert.deepStrictEqual(bad.slice(0, 5), []);
});

test('findFreeNear returns the nearest free tile', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    const [x, y] = freeBeside(ctx);
    assert.deepStrictEqual(Array.from(ctx.findFreeNear(x, y)), [x, y]);
    // the player's own tile is occupied: the answer is one step away
    const r = ctx.findFreeNear(G.player.x, G.player.y);
    assert.strictEqual(Math.max(Math.abs(r[0] - G.player.x), Math.abs(r[1] - G.player.y)), 1);
    assert.strictEqual(ctx.findFreeNear(100000, 100000, 3), null);
});

test('Pet.recenter does not move when nothing is free', () => {
    const ctx = cleaningDay();
    const pet = Object.create(ctx.Pet.prototype);
    Object.assign(pet, { x: 7, y: 8, home: null, tags: { animal: true } });
    const orig = ctx.findFreeNear;
    ctx.findFreeNear = () => null;
    try {
        pet.recenter(50, 50);
    } finally {
        ctx.findFreeNear = orig;
    }
    assert.deepStrictEqual([pet.x, pet.y], [7, 8]);
});
