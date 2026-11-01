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

function clearAround(ctx) {
    const G = ctx.Game;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        if (i == 0 && j == 0) continue;
        G.map[(G.player.x + i) + ',' + (G.player.y + j)] = new ctx.Tile(G.player.x + i, G.player.y + j, '.', '#ddd', '#000', true, true);
    }
}

test('I opens and Esc closes', () => {
    const ctx = cleaningDay();
    ctx.__press(73);
    assert.strictEqual(ctx.Inventory.isOpen, true);
    assert.match(drawnText(ctx), /POCKETS/);
    ctx.__press(27);
    assert.strictEqual(ctx.Inventory.isOpen, false);
});

test('screens close back to play', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    clearAround(ctx);
    ctx.__press(73);
    ctx.__press(27);
    ctx.Shop.openShop();
    ctx.__press(27);
    const x = G.player.x;
    ctx.__press(39); // right
    assert.strictEqual(G.player.x, x + 1);
});

test('equipping renames the vacuum in messages', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.day = 2;
    G.inventory = [{ kind: 'tool', id: 'vacTurbo', name: 'Turbo-Vac 3000', tool: 'vacuum', desc: 'No effect.' }];
    ctx.__press(73);
    ctx.__press(65, 97); // a: equip
    assert.strictEqual(G.equipped.vacuum, 'vacTurbo');
    ctx.__press(27);
    clearAround(ctx);
    ctx.makeMess(G.player.x + 1, G.player.y, 'Cobweb');
    ctx.__press(90);
    assert.match(G.log.recent(2).map(l => strip(l.text)).join(' '), /Turbo-Vac 3000/);
    assert.strictEqual(ctx.Inventory.toolName('vacuum'), 'Turbo-Vac 3000');
});

test('decor can be marked to place', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.inventory = [{ kind: 'decor', id: 'plant', name: 'Potted Mandrake (Muted)', desc: 'Decorative.' }];
    ctx.__press(73);
    ctx.__press(65, 97);
    assert.strictEqual(G.inventory[0].placed, true);
    assert.match(drawnText(ctx), /in the lounge/);
    ctx.__press(65, 97);
    assert.strictEqual(G.inventory[0].placed, false);
});

test('rings show their lore', () => {
    const ctx = cleaningDay();
    ctx.Game.inventory = [{ kind: 'ring', name: 'a jade ring', lore: 'Ring of Slow Digestion, for long shifts.' }];
    ctx.__press(73);
    assert.match(drawnText(ctx), /Slow Digestion/);
});
