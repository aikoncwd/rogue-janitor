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
    while (ctx.Game.player.talking && n++ < 50) { ctx.Game.player.talking.lastConvoChange = 0; ctx.__press(13); }
    return ctx;
}

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

test('the report card shows progress toward the Mop', () => {
    const ctx = cleaningDay();
    ctx.Game.yendorPoints = 120;
    ctx.Game.cleanPercent = () => 50;
    const card = ctx.Game.reportCardLines().join('\n');
    assert.match(card, /Mop of Yendor\s+170 \/ 650/);
    const w = ctx.Game.reportCardLines().map(l => l.length);
    assert.ok(w.every(x => x == w[0]));
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
