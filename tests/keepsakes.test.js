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

function nextMorning(ctx) {
    const G = ctx.Game;
    ctx.Invasion.instant = true;
    let door = null;
    for (const k in G.map) { const e = G.map[k].entity; if (e && e.tags && 'exit' in e.tags) door = e; }
    door.cleanerAct();
    door.lastConvoChange = 0;
    ctx.__press(89, 121);
    let n = 0;
    while (G.player.talking && n++ < 40) { G.player.talking.lastConvoChange = 0; ctx.__press(13); }
    n = 0;
    while (G.phase != 'cleaning' && n++ < 10) ctx.__press(13);
    n = 0;
    while (G.player.talking && n++ < 40) { G.player.talking.lastConvoChange = 0; ctx.__press(13); }
}

function decorTiles(ctx) {
    return Object.keys(ctx.Game.map).filter(k => { const e = ctx.Game.map[k].entity; return e && e.tags && e.tags.decor; });
}

test('a finished request gives a keepsake from day 2', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    const m = G.monsterList.find(x => x.alive && x.retired && !x.tags.visitor);
    const thank = () => {
        m.convos = [[{ text: 'thanks', any: -1, tags: { requestThanked: true } }]];
        m.convoIndex = 0; m.convoInnerDex = 0;
        G.player.talking = m;
        m.doConvo();
    };
    thank();
    assert.strictEqual(G.inventory.filter(i => i.kind == 'keepsake').length, 0, 'not on day 1');
    G.day = 2;
    delete m.convoTags.requestThanked;
    thank();
    thank(); // redraws don't give it twice
    const ks = G.inventory.filter(i => i.kind == 'keepsake');
    assert.strictEqual(ks.length, 1);
    assert.ok(ks[0].name.startsWith(m.name.split(' ')[0] + "'s "), ks[0].name);
    assert.strictEqual(ks[0].placed, true);
    assert.ok(ctx.Achievements.has('keepsake'));
});

test('keepsakes and bought decor appear in the lounge next morning', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.inventory.push({ kind: 'keepsake', id: 'k1', name: "Bob's Pet Rock", desc: 'Sentimental.', placed: true });
    G.inventory.push({ kind: 'decor', id: 'plant', name: 'Potted Mandrake (Muted)', desc: 'Decorative.', placed: true });
    G.inventory.push({ kind: 'decor', id: 'duck', name: 'Rubber Duck Army', desc: 'Decorative.' }); // not put up
    nextMorning(ctx);
    const tiles = decorTiles(ctx);
    assert.strictEqual(tiles.length, 2);
    for (const k of tiles) {
        const [x, y] = k.split(',').map(Number);
        assert.strictEqual(G.getRoomIndex(x, y), G.staffRoomID);
    }
    const names = tiles.map(k => G.map[k].entity.name).sort();
    assert.deepStrictEqual(names, ["Bob's Pet Rock", 'Potted Mandrake (Muted)']);
});

test('decor never blocks the exit', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    for (let i = 0; i < 10; i++) G.inventory.push({ kind: 'decor', id: 'd' + i, name: 'Poster ' + i, desc: 'Decorative.', placed: true });
    nextMorning(ctx);
    const tiles = decorTiles(ctx);
    assert.ok(tiles.length <= ctx.Decor.MAX);
    let exit = null;
    for (const k in G.map) { const e = G.map[k].entity; if (e && e.tags && 'exit' in e.tags) exit = e; }
    for (const k of tiles) {
        const [x, y] = k.split(',').map(Number);
        assert.ok(Math.max(Math.abs(x - exit.x), Math.abs(y - exit.y)) > 1, 'next to the exit');
    }
});

test('inventory and decor survive a save', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.inventory.push({ kind: 'tool', id: 'vacTurbo', name: 'Turbo-Vac 3000', tool: 'vacuum', desc: 'No effect.' });
    G.inventory.push({ kind: 'decor', id: 'plant', name: 'Potted Mandrake (Muted)', desc: 'Decorative.', placed: true });
    G.equipped.vacuum = 'vacTurbo';
    const data = JSON.parse(JSON.stringify(ctx.Save.snapshot()));
    G.inventory = []; G.equipped = {};
    ctx.Save.restore(data);
    assert.strictEqual(G.inventory.length, 2);
    assert.strictEqual(G.equipped.vacuum, 'vacTurbo');
    assert.strictEqual(G.inventory[1].placed, true);
});

test('bumping a decoration describes it without using a turn', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.inventory.push({ kind: 'decor', id: 'plant', name: 'Potted Mandrake (Muted)', desc: 'It sulks. Decorative.', placed: true });
    nextMorning(ctx);
    const k = decorTiles(ctx)[0];
    G.map[k].entity.cleanerAct();
    assert.match(G.log.recent(2).map(l => strip(l.text)).join(' '), /Mandrake/);
});
