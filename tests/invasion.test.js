const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless } = require('./harness');

function runInstant(ctx) {
    ctx.Game.generateDungeon();
    ctx.Game.phase = 'invasion';
    ctx.Invasion.instant = true;
    ctx.Game.engine.start();
}

test('stats and roster after a full invasion', () => {
    for (const seed of [1, 2, 3]) {
        const ctx = bootHeadless({ seed });
        runInstant(ctx);
        const inv = ctx.Invasion;
        assert.equal(ctx.Game.phase, 'cleaning');
        assert.ok(inv.roster.length > 0);
        assert.equal(inv.stats.fainted, inv.roster.filter(m => m.hp <= 0).length);
        assert.ok(inv.stats.hits >= inv.stats.fainted);
        // nobody is still "in the dungeon"; the lounge has limited room (pre-existing rule),
        // monsters that don't fit simply go home for the day
        assert.ok(inv.roster.every(m => !(m.alive && !m.retired)), 'nobody left fighting');
        assert.ok(inv.roster.filter(m => m.alive && m.retired).length >= Math.min(inv.roster.length, 15));
        assert.equal(inv.bodies.length, 0);
        assert.deepEqual(Object.keys(inv.flashes), []);
        assert.ok(inv.hero.full.includes(inv.hero.short));
    }
});

test('map memory is wiped at handover', () => {
    const ctx = bootHeadless();
    ctx.Game.generateDungeon();
    for (const k in ctx.Game.map) ctx.Game.map[k].lastSeen = '#';
    ctx.Game.phase = 'invasion';
    ctx.Invasion.instant = true;
    ctx.Game.engine.start();
    // tiles the player has not looked at yet are unexplored again
    for (const k in ctx.Game.map) {
        if (!ctx.Game.map[k].visible) assert.equal(ctx.Game.map[k].lastSeen, ' ', k);
    }
});

test('handover cutscene starts with report and keeps welcome text', () => {
    const ctx = bootHeadless();
    runInstant(ctx);
    const scene = ctx.Game.player.cutscene || ctx.Game.monsterList[0].convos[ctx.Game.monsterList[0].convos.length - 1];
    assert.ok(scene[0].message.includes(ctx.Invasion.hero.full));
    assert.ok(/Monsters fainted/.test(scene[0].message) && /Loot smashed/.test(scene[0].message), 'whole report on one screen');
    assert.ok(scene.some(n => /Now that the hero is gone/.test(n.message)));
    assert.equal(scene[scene.length - 1].any, -1);
});

test('messNumbers match mess actually on the map', () => {
    for (const seed of [1, 2]) {
        const ctx = bootHeadless({ seed });
        runInstant(ctx);
        let n = 0;
        for (const k in ctx.Game.map) if (ctx.Game.map[k].mess != null) n++;
        assert.equal(ctx.Game.messNumbers[0], n);
    }
});

test('fail-safe ends invasion on same map', () => {
    const ctx = bootHeadless();
    ctx.Game.generateDungeon();
    ctx.Game.adventurer.maxTurns = 3;
    const mapRef = ctx.Game.map;
    ctx.Game.phase = 'invasion';
    ctx.Invasion.instant = true;
    ctx.Game.engine.start();
    assert.equal(ctx.Game.map, mapRef);
    assert.equal(ctx.Game.phase, 'cleaning');
    assert.equal(ctx.Game.adventurer.active, false);
    assert.ok(ctx.Invasion.roster.every(m => !(m.alive && !m.retired)));
});

test('chainCutscenes renumbers', () => {
    const ctx = bootHeadless();
    const a = [{ message: 'a1', any: 1 }, { message: 'a2', any: -1 }];
    const b = [{ message: 'b1', any: 1 }, { message: 'b2', any: -1, globalTags: { victory: true } }];
    const c = ctx.ConversationBuilder.chainCutscenes(a, b);
    assert.deepEqual(c.map(n => n.any), [1, 2, 3, -1]);
    assert.deepEqual(c.map(n => n.message), ['a1', 'a2', 'b1', 'b2']);
    assert.equal(c[3].globalTags.victory, true);
    assert.equal(ctx.ConversationBuilder.chainCutscenes(a, null), a);
});

test('log receives hit and faint lines when not skipping', () => {
    const ctx = bootHeadless();
    runInstant(ctx);
    const text = ctx.Game.log.lines.map(l => l.text).join('\n');
    assert.ok(ctx.Game.log.lines.length > 10);
    const fainted = ctx.Invasion.roster.filter(m => m.hp <= 0);
    assert.ok(fainted.some(m => text.includes(m.name)), 'a fainted monster is named in the log');
    assert.ok(text.includes(ctx.Invasion.hero.short));
});

test('hit events flash the tile and faint events leave a body until handover', () => {
    const ctx = bootHeadless();
    ctx.Game.generateDungeon();
    ctx.Game.phase = 'invasion';
    const m = ctx.Invasion.roster[0];
    ctx.Invasion.event('hit', { monster: m });
    assert.equal(ctx.Invasion.flashes[m.x + ',' + m.y], 2);
    ctx.Invasion.event('turn', {});
    assert.equal(ctx.Invasion.flashes[m.x + ',' + m.y], 1);
    ctx.Invasion.event('faint', { monster: m });
    assert.deepEqual(ctx.Invasion.bodies.map(b => [b.x, b.y, b.char]), [[m.x, m.y, m.char]]);
});
