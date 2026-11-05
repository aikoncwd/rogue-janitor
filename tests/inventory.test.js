const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, cleaningDay, strip } = require('./harness');

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
    assert.match(drawnText(ctx), /Your Pockets/);
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
    ctx.__press(65, 97, 'a'); // a: pick it
    assert.strictEqual(G.equipped.vacuum, undefined, 'a letter only picks the item');
    ctx.__press(13); // Enter: equip
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
    ctx.__press(65, 97, 'a');
    ctx.__press(13);
    assert.strictEqual(G.inventory[0].placed, true);
    assert.match(drawnText(ctx), /in the lounge/);
    ctx.__press(13);
    assert.strictEqual(G.inventory[0].placed, false);
});

test('rings show their lore', () => {
    const ctx = cleaningDay();
    ctx.Game.inventory = [{ kind: 'ring', name: 'a jade ring', lore: 'Ring of Slow Digestion, for long shifts.' }];
    ctx.__press(73);
    assert.doesNotMatch(drawnText(ctx), /Slow Digestion/, 'no descriptions until you pick an item');
    ctx.__press(65, 97, 'a');
    assert.match(drawnText(ctx), /Slow Digestion/);
});

test('inventory letters skip capital I and X too', () => {
    const ctx = bootHeadless();
    const letters = ctx.Inventory.letters();
    for (const c of ['i', 'x', 'I', 'X']) assert.ok(!letters.includes(c), c);
});

test('every inventory item can be used, including the 9th and the 24th', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.inventory = [];
    for (let i = 0; i < 30; i++) G.inventory.push({ kind: 'decor', id: 'd' + i, name: 'Poster ' + i, desc: 'Decorative.' });
    ctx.__press(73); // open
    const letters = ctx.Inventory.letters();
    assert.ok(!letters.includes('i') && !letters.includes('x'), 'i and x close the screen, so they are not item letters');
    const ninth = ctx.Inventory.items()[8];
    ctx.__press(letters[8].toUpperCase().charCodeAt(0), letters[8].charCodeAt(0));
    ctx.__press(13);
    assert.strictEqual(ctx.Inventory.isOpen, true);
    assert.strictEqual(ninth.placed, true);
    const text = (() => { G.drawMap(); return ctx.__drawn.filter(d => d.text).map(d => strip(d.text)).join('\n'); })();
    assert.ok(!/[{|}~]\) /.test(text), 'no odd labels');
});

// 10. shop and inventory own the letters
for (const screen of ['Shop', 'Inventory']) {
    test(screen + ': T and V do not toggle music and sound while it is open', () => {
        const ctx = cleaningDay();
        if (screen == 'Shop') ctx.Shop.openShop(); else ctx.Inventory.openInv();
        const music = ctx.Music.enabled, sfx = ctx.Sfx.enabled;
        ctx.__press(84, 0, 't');
        ctx.__press(86, 0, 'v');
        assert.strictEqual(ctx.Music.enabled, music);
        assert.strictEqual(ctx.Sfx.enabled, sfx);
    });
}
