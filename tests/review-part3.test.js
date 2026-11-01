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

test('an achievement unlocks once even when storage fails', () => {
    for (const broken of ['get', 'set']) {
        const ctx = cleaningDay();
        if (broken == 'get') ctx.localStorage.getItem = () => { throw new Error('blocked'); };
        else ctx.localStorage.setItem = () => { throw new Error('quota'); };
        assert.strictEqual(ctx.Achievements.unlock('combo10'), true, broken);
        assert.strictEqual(ctx.Achievements.unlock('combo10'), false, broken);
        assert.strictEqual(ctx.Achievements.queue.length, 1, broken);
        assert.strictEqual(ctx.Game.run.newAchievements.length, 1, broken);
    }
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
    assert.strictEqual(ctx.Inventory.isOpen, true);
    assert.strictEqual(ninth.placed, true);
    const text = (() => { G.drawMap(); return ctx.__drawn.filter(d => d.text).map(d => strip(d.text)).join('\n'); })();
    assert.ok(!/[{|}~]\) /.test(text), 'no odd labels');
});

test('toasts from the last run do not carry over', () => {
    const ctx = cleaningDay();
    ctx.Achievements.unlock('combo10');
    assert.strictEqual(ctx.Achievements.queue.length, 1);
    ctx.Game.newRun();
    assert.strictEqual(ctx.Achievements.queue.length, 0);
});

test('a tool bought twice is one item', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.zorkmids = 100;
    const vac = ctx.Lore.shopItems.find(i => i.id == 'vacTurbo');
    ctx.Shop.stock = [Object.assign({}, vac)];
    ctx.Shop.buy(0);
    ctx.Shop.stock = [Object.assign({}, vac)];
    const msg = ctx.Shop.buy(0);
    assert.strictEqual(G.inventory.filter(i => i.id == 'vacTurbo').length, 1);
    assert.match(msg, /already/);
});
