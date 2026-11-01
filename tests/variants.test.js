const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro } = require('./harness');

const strip = s => s.replace(/%c\{[^}]*\}/g, '');

function dungeon(seed = 1234) {
    const ctx = bootHeadless({ seed });
    ctx.Game.generateDungeon();
    return ctx;
}

// A floor tile with nothing on it.
function freeKey(ctx, near = null) {
    const G = ctx.Game;
    const ok = k => G.map[k] && G.map[k].passable && !G.map[k].important && G.map[k].mess == null && G.map[k].entity == null && G.map[k].door == null;
    if (near) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
            const k = (near.x + dx) + ',' + (near.y + dy);
            if (ok(k)) return k;
        }
    }
    for (const k in G.map) if (ok(k)) return k;
    throw new Error('no free tile');
}

function at(ctx, key, type) {
    const [x, y] = key.split(',').map(Number);
    ctx.Game.map[key].mess = null;
    return ctx.makeMess(x, y, type);
}

function cleaningDay(seed = 1234) {
    const ctx = toIntro(bootHeadless({ seed, begin: true }));
    ctx.Invasion.instant = true;
    for (let i = 0; i < 6 && ctx.Game.phase != 'cleaning'; i++) ctx.__press(13);
    ctx.Game.player.talking = null;
    return ctx;
}

test('every variant keeps its type: glyph, colour, clean method and kind', () => {
    const ctx = dungeon();
    const key = freeKey(ctx);
    for (const type in ctx.Lore.variants) {
        ctx.Lore.VARIANT_CHANCE = 0;
        const base = at(ctx, key, type);
        assert.equal(base.kind, base.name, type);
        ctx.Lore.VARIANT_CHANCE = 1;
        const names = ctx.Lore.variants[type].map(v => v.name);
        assert.ok(names.length >= 3, type + ' has at least 3 variants');
        for (let i = 0; i < 30; i++) {
            const m = at(ctx, key, type);
            assert.equal(m.kind, base.name, type);
            assert.equal(m.char, base.char, type);
            assert.equal(m.color, base.color, type);
            assert.equal(m.cleanMethod, base.cleanMethod, type);
            assert.ok(names.includes(m.name), type + ': ' + m.name);
        }
    }
});

test('variants show up about 40% of the time', () => {
    const ctx = dungeon();
    const key = freeKey(ctx);
    let funny = 0;
    for (let i = 0; i < 200; i++) if (at(ctx, key, 'LoosePages').name != 'Loose Pages') funny++;
    assert.ok(funny >= 40 && funny <= 120, String(funny));
});

test('quest items keep their names', () => {
    const ctx = dungeon();
    ctx.Lore.VARIANT_CHANCE = 1;
    const m = ctx.Game.monsterList[0];
    const [x, y] = freeKey(ctx).split(',').map(Number);
    ctx.QuestMess(m, x, y);
    const q = m.questItem;
    assert.ok(q.name.startsWith(m.name + "'s "), q.name);
    assert.equal(q.unique, true);
});

test('panel categories and favours count variants by kind', () => {
    const ctx = dungeon();
    const key = freeKey(ctx);
    const [x, y] = key.split(',').map(Number);
    ctx.Game.map[key].mess = null;
    const page = ctx.makeVariant(x, y, 'LoosePages', 'Scroll labeled KLAATU BARADA NIKTO');
    assert.equal(page.kind, 'Loose Pages');
    assert.ok(ctx.Requests.type('pages').test(page));
    ctx.Game.map[key].mess = null;
    const coins = ctx.makeVariant(x, y, 'GoldCoins', 'Scattered Zorkmids');
    assert.ok(ctx.Requests.type('coins').test(coins));
    for (const k in ctx.Game.map) if (k != key) ctx.Game.map[k].mess = null;
    assert.equal(ctx.Panel.messCategories().litter, 1);
});

test('examine shows the variant description', () => {
    const ctx = dungeon();
    const [x, y] = freeKey(ctx).split(',').map(Number);
    const m = ctx.makeVariant(x, y, 'LoosePages', 'Page of the Necronomicon (do not read aloud)');
    const text = strip(m.describe());
    assert.ok(text.startsWith('Page of the Necronomicon (do not read aloud). You decide not to read it.'), text);
    assert.ok(text.includes('ick it up'), text);
});

test('fortune cookies hold a rumor', () => {
    const ctx = cleaningDay();
    const p = ctx.Game.player;
    const [x, y] = freeKey(ctx, p).split(',').map(Number);
    ctx.makeVariant(x, y, 'AppleCore', 'Fortune Cookie');
    p.clean('get');
    const lines = ctx.Game.log.lines.map(l => strip(l.text));
    const line = lines.find(l => l.startsWith('You crack the fortune cookie. It reads: "'));
    assert.ok(line, lines.slice(-3).join(' | '));
    assert.ok(ctx.Lore.rumors.some(r => line.includes(r)));
});

test('variant names read well in cleaning messages', () => {
    const ctx = cleaningDay();
    const p = ctx.Game.player;
    const [x, y] = freeKey(ctx, p).split(',').map(Number);
    ctx.makeVariant(x, y, 'GoldCoins', 'Scattered Zorkmids');
    p.clean('get');
    const text = ctx.Game.log.lines.map(l => strip(l.text)).join('\n');
    assert.ok(text.includes('You pick up the Scattered Zorkmids.'), text);
    assert.ok(!/the the/i.test(text));
});

test('rumors: at least 40, all "They say..."', () => {
    const ctx = bootHeadless({ files: ['script/flavor.js', 'script/lore.js'], game: false });
    assert.ok(ctx.Lore.rumors.length >= 40, String(ctx.Lore.rumors.length));
    assert.ok(ctx.Lore.rumors.every(l => l.startsWith('They say')));
    assert.ok(ctx.Lore.rumors.includes(ctx.Lore.rumor()));
});

test('title sometimes shows a rumor', () => {
    const ctx = bootHeadless({ begin: true });
    ctx.Flavor.chance = () => true;
    for (let i = 0; i < ctx.Title.TAGLINE_FRAMES; i++) ctx.__runTimers();
    assert.ok(ctx.Lore.rumors.includes(ctx.Title.tagline), ctx.Title.tagline);
});
