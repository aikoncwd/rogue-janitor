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

function keeperTile(ctx) {
    for (const k in ctx.Game.map) {
        const e = ctx.Game.map[k].entity;
        if (e && e.tags && e.tags.shop) return k;
    }
    return null;
}

test('the shopkeeper is in the lounge every day, not a comrade', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    const k = keeperTile(ctx);
    assert.ok(k, 'shopkeeper placed');
    const [x, y] = k.split(',').map(Number);
    assert.strictEqual(G.getRoomIndex(x, y), G.staffRoomID);
    const keeper = G.map[k].entity;
    assert.ok(!G.monsterList.includes(keeper), 'not a comrade');
    assert.ok(!(keeper instanceof ctx.Entity));
    assert.strictEqual(ctx.Shop.stock.length, 4);
});

test('bumping opens the shop, Esc closes it', () => {
    const ctx = cleaningDay();
    ctx.Shop.keeper.cleanerAct();
    assert.strictEqual(ctx.Shop.isOpen, true);
    const text = drawnText(ctx);
    assert.match(text, /a\) /);
    assert.match(text, /zm/);
    ctx.__press(27);
    assert.strictEqual(ctx.Shop.isOpen, false);
});

test('buying spends zorkmids and fills the pocket', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    ctx.Shop.stock = [{ id: 'poster', name: 'Motivational Poster', kind: 'decor', price: 12, desc: 'Strictly decorative.' }];
    G.zorkmids = 30;
    ctx.Shop.keeper.cleanerAct();
    ctx.__press(65, 97); // a
    assert.strictEqual(G.zorkmids, 18);
    assert.strictEqual(G.run.spent, 12);
    assert.strictEqual(G.inventory.length, 1);
    assert.strictEqual(G.inventory[0].name, 'Motivational Poster');
    assert.strictEqual(G.run.silliest, 'Motivational Poster');
    assert.ok(ctx.Achievements.has('firstBuy'));
});

test('food is eaten at once', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    ctx.Shop.stock = [{ id: 'croissant', name: 'Suspicious Dungeon Croissant', kind: 'food', price: 3, desc: 'Does nothing.', eat: 'You feel exactly the same.' }];
    G.zorkmids = 5;
    const msg = ctx.Shop.buy(0);
    assert.match(msg, /exactly the same/);
    assert.strictEqual(G.inventory.length, 0);
    assert.strictEqual(G.zorkmids, 2);
});

test('you can\'t buy what you can\'t afford', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    ctx.Shop.stock = [{ id: 'gold', name: 'Gilded Toilet Brush', kind: 'tool', tool: 'brush', price: 50, desc: 'No effect.' }];
    G.zorkmids = 10;
    const msg = ctx.Shop.buy(0);
    assert.match(msg, /short/);
    assert.strictEqual(G.zorkmids, 10);
    assert.strictEqual(G.inventory.length, 0);
});

test('every item says it does nothing', () => {
    const ctx = bootHeadless();
    assert.ok(ctx.Lore.shopItems.length >= 25);
    for (const item of ctx.Lore.shopItems) {
        assert.ok(item.id && item.name && item.price > 0 && ['food', 'object', 'tool', 'decor'].includes(item.kind), JSON.stringify(item));
        assert.match(item.desc + ' ' + (item.eat || ''), /nothing|decorative|no effect|does not|doesn't|purely|just for show|exactly the same/i, item.name);
        if (item.kind == 'tool') assert.ok(['mop', 'vacuum', 'squeegee', 'brush'].includes(item.tool), item.name);
        if (item.kind == 'food') assert.ok(item.eat, item.name);
    }
});

test('big spender unlocks at 100 zm', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    ctx.Shop.stock = [{ id: 'statue', name: 'Statue of Yourself', kind: 'decor', price: 100, desc: 'Purely decorative.' }];
    G.zorkmids = 100;
    ctx.Shop.buy(0);
    assert.ok(ctx.Achievements.has('spend100'));
});
