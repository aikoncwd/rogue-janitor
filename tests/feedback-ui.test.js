// Player feedback after phase 3: numpad waiting, no gender quest, framed screens,
// a shop that does not sell twice, pockets with details on demand and an
// achievements tab, decorations that go up at once, a roomier lounge, toasts in
// chats, no minimap and a hero who never teleports.
const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro } = require('./harness');

const strip = s => s.replace(/%[cb]\{[^}]*\}/g, '');

function cleaningDay(seed = 1234) {
    const ctx = toIntro(bootHeadless({ seed, begin: true }));
    ctx.Invasion.instant = true;
    ctx.__press(13);
    ctx.Invasion.instant = false;
    let n = 0;
    while (ctx.Game.player.talking && n++ < 50) { ctx.Game.player.talking.lastConvoChange = 0; ctx.__press(13); }
    return ctx;
}

function drawn(ctx) {
    ctx.Game.drawMap();
    return ctx.__drawn.filter(d => d.text).map(d => strip(d.text)).join('\n');
}

function loungeDecor(ctx) {
    return Object.values(ctx.Game.map).filter(t => t.entity && t.entity.tags && t.entity.tags.decor).map(t => t.entity);
}

for (const [label, code] of [['numpad 5', 101], ['numpad .', 110], ['numpad . without NumLock', 46]]) {
    test(label + ' waits a turn', () => {
        const ctx = cleaningDay();
        const G = ctx.Game;
        const turn = G.turnCount, x = G.player.x, y = G.player.y;
        ctx.__press(code);
        assert.strictEqual(G.turnCount, turn + 1);
        assert.deepStrictEqual([G.player.x, G.player.y], [x, y]);
    });
}

test('lost quest items never include a gender', () => {
    for (let seed = 1; seed <= 40; seed++) {
        const ctx = bootHeadless({ seed });
        const dropper = { name: 'Bob the Orc', species: 'Orc', hatChar: null };
        ctx.QuestMess(dropper, 0, 0);
        assert.doesNotMatch(dropper.questItem.name, /gender/i);
        assert.doesNotMatch(dropper.questItemName, /gender/i);
    }
    const ctx = bootHeadless();
    assert.strictEqual(ctx.makeMess(0, 0, 'YoYo').name, 'Lucky Yo-Yo');
});

test('the shop does not sell what you already own, and stops offering it', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    const map = ctx.Lore.shopItems.find(i => i.id == 'map');
    G.zorkmids = 100;
    ctx.Shop.stock = [Object.assign({}, map)];
    ctx.Shop.buy(0);
    ctx.Shop.stock = [Object.assign({}, map)]; // the next day, same item again
    const msg = ctx.Shop.buy(0);
    assert.match(msg, /already have/);
    assert.strictEqual(G.inventory.filter(i => i.id == 'map').length, 1);
    assert.strictEqual(G.zorkmids, 100 - map.price);
    for (let day = 0; day < 10; day++) {
        G.daySeed = 1000 + day;
        ctx.Shop.place();
        assert.ok(!ctx.Shop.stock.some(i => i.id == 'map'), 'day ' + day);
    }
});

test('the shop keeps its layout whatever Mimsy says', () => {
    const ctx = cleaningDay();
    const rowOf = (msg) => {
        ctx.Shop.openShop();
        ctx.Shop.lastMessage = msg;
        ctx.Game.drawMap();
        const line = ctx.__drawn.find(d => d.text && /Your wallet/.test(strip(d.text)));
        const first = ctx.__drawn.find(d => d.text && /^a\)/.test(strip(d.text)));
        return [line.y, first.y, first.x];
    };
    const short = rowOf('Hi.');
    const long = rowOf('You buy the Certificate of Authenticity for a Rock. "Pleasure doing business! It does nothing, remember." '.repeat(3));
    assert.deepStrictEqual(long, short);
});

test('pockets: details only for the picked item, Tab shows achievements', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.inventory = [{ kind: 'object', id: 'map', name: 'Map of a Different Dungeon', desc: 'Lovely penmanship.' }];
    ctx.__press(73);
    assert.doesNotMatch(drawn(ctx), /Lovely penmanship/);
    ctx.__press(65, 97, 'a');
    assert.match(drawn(ctx), /Lovely penmanship/);
    ctx.__press(9);
    const text = drawn(ctx);
    assert.strictEqual(ctx.Inventory.tab, 'achievements');
    assert.match(text, /Clocked In/);
    ctx.__press(34); ctx.__press(34); // Page Down to the end of the list
    assert.match(drawn(ctx), /\?\?\?/, 'secret achievements stay secret');
    ctx.__press(9);
    assert.strictEqual(ctx.Inventory.tab, 'pockets');
});

test('a full pocket scrolls to keep the picked item in view', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.inventory = [];
    for (let i = 0; i < 45; i++) G.inventory.push({ kind: 'object', id: 'o' + i, name: 'Pebble number ' + i, desc: 'A pebble.' });
    ctx.__press(73);
    let text = drawn(ctx);
    assert.doesNotMatch(text, /Pebble number 44/, 'too many to show at once');
    const rows = ctx.Game.screenSize[1];
    assert.ok(ctx.__drawn.every(d => d.y < rows), 'nothing drawn off screen');
    for (let i = 0; i < 45; i++) ctx.__press(40); // the first press picks a), then down to the last one
    text = drawn(ctx);
    assert.match(text, /Pebble number 44/);
});

test('decorations go up and come down at once', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.inventory = [{ kind: 'decor', id: 'plant', name: 'Potted Mandrake (Muted)', desc: 'Decorative.' }];
    assert.strictEqual(loungeDecor(ctx).length, 0);
    ctx.__press(73);
    ctx.__press(65, 97, 'a');
    ctx.__press(13);
    const up = loungeDecor(ctx);
    assert.strictEqual(up.length, 1);
    assert.strictEqual(G.getRoomIndex(up[0].x, up[0].y), G.staffRoomID);
    assert.match(drawn(ctx), /staff lounge/);
    ctx.__press(13);
    assert.strictEqual(loungeDecor(ctx).length, 0);
});

test('putting one more up leaves the others where they stand', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.inventory = [
        { kind: 'decor', id: 'a', name: 'Gnome A', desc: 'A gnome.', placed: true },
        { kind: 'decor', id: 'b', name: 'Gnome B', desc: 'A gnome.' },
    ];
    ctx.Decor.refresh();
    const before = loungeDecor(ctx).map(e => e.x + ',' + e.y);
    G.inventory[1].placed = true;
    ctx.Decor.refresh();
    const after = loungeDecor(ctx);
    assert.strictEqual(after.length, 2);
    assert.strictEqual(after.find(e => e.itemId == 'a').x + ',' + after.find(e => e.itemId == 'a').y, before[0]);
});

test('the staff lounge is never tiny', () => {
    for (let seed = 1; seed <= 12; seed++) {
        const ctx = cleaningDay(seed);
        const r = ctx.Game.rooms[ctx.Game.staffRoomID];
        assert.ok(r[2] - r[0] >= ctx.Game.LOUNGE_MIN[0] && r[3] - r[1] >= ctx.Game.LOUNGE_MIN[1], 'seed ' + seed + ': ' + (r[2] - r[0]) + 'x' + (r[3] - r[1]));
        assert.ok(ctx.Shop.loungeSpots().length >= ctx.Decor.MAX, 'seed ' + seed + ': room for the decorations');
    }
});

test('an achievement toast shows during a chat, not only after it', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    ctx.Achievements.got = {};
    G.player.talking = { name: 'a ghost', doConvo() {} };
    ctx.Achievements.unlock('synergy');
    assert.match(drawn(ctx), /Achievement unlocked/);
});

test('the panel has no minimap any more', () => {
    const ctx = cleaningDay();
    assert.strictEqual(ctx.Panel.minimapLines, undefined);
    assert.ok(!ctx.Panel.lines('cleaning', 200).map(strip).some(l => /── MAP ──/.test(l)));
});

test('help opens as a window over the map and scrolls', () => {
    const ctx = cleaningDay();
    ctx.__press(191, 0, '?');
    const text = drawn(ctx);
    assert.match(text, /How to Clean/);
    assert.match(text, /SHIFT/, 'the panel is still there behind it');
    ctx.__press(40);
    ctx.__press(191, 0, '?');
    assert.strictEqual(ctx.Game.player.instructions, false);
});
