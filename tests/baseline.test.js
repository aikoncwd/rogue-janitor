const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless } = require('./harness');

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
