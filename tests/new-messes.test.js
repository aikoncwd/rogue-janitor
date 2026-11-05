const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless } = require('./harness');

function freshDungeon(seed = 1234) {
    const ctx = bootHeadless({ seed });
    ctx.Game.generateDungeon();
    return ctx;
}

function cleaningDay(seed = 1234) {
    const ctx = freshDungeon(seed);
    ctx.Game.phase = 'invasion';
    ctx.Invasion.instant = true;
    ctx.Game.engine.start();
    ctx.Game.player.talking = null;
    return ctx;
}

// A free floor tile with free floor on both sides along +x.
function openRow(ctx) {
    for (const key of ctx.Game.freeCells) {
        const [x, y] = key.split(',').map(Number);
        const ok = [0, 1, 2].every(d => {
            const t = ctx.Game.map[(x + d) + ',' + y];
            return t && t.passable && !t.door && !t.important && t.entity == null;
        });
        if (ok) return [x, y];
    }
    throw new Error('no open row');
}

function messesOnMap(ctx) {
    return Object.values(ctx.Game.map).filter(t => t.mess != null).map(t => t.mess.name);
}

test('every new mess type can be made and cleaned with the right verb', () => {
    const ctx = freshDungeon();
    const expect = {
        SmashedBarrel: 'fix', SpilledAle: 'mop', StickyPrints: 'mop', ToppledBookshelf: 'fix',
        LoosePages: 'get', GoldCoins: 'get', Crossword: 'get', Cobweb: 'mop',
        SlimePool: 'mop', SlimeTrail: 'mop', SlimePrints: 'mop',
    };
    const key = ctx.Game.freeCells.find(k => !ctx.Game.map[k].important && ctx.Game.map[k].entity == null);
    const [x, y] = key.split(',').map(Number);
    for (const [type, verb] of Object.entries(expect)) {
        ctx.Game.map[key].mess = null;
        const m = ctx.makeMess(x, y, type);
        assert.equal(m.cleanMethod, verb, type);
        assert.notEqual(m.name, 'Discarded Candy Wrapper', type + ' is not the default case');
    }
});

test('smashing a chest scatters gold coins, a bookshelf scatters pages, a barrel spills ale', () => {
    const ctx = freshDungeon();
    for (const [loot, mess] of [['Chest', 'Scattered Gold Coins'], ['Bookshelf', 'Loose Pages'], ['Barrel', 'Spilled Ale']]) {
        const [x, y] = openRow(ctx);
        for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
            const t = ctx.Game.map[(x + i) + ',' + (y + j)];
            if (t) t.mess = null;
        }
        const e = ctx.GetEntity(loot, x + 1, y);
        e.adventurerAct();
        const names = messesOnMap(ctx);
        const kinds = Object.values(ctx.Game.map).filter(t => t.mess).map(t => t.mess.kind); // litter may wear a funny name
        assert.ok(kinds.includes(mess), loot + ' -> ' + mess + ' in ' + names.join(','));
    }
});

test('picking up gold coins is worth a little extra', () => {
    const ctx = cleaningDay();
    const p = ctx.Game.player;
    const t = ctx.Game.map[(p.x + 1) + ',' + p.y];
    t.entity = null; t.passable = true; t.important = false; t.door = null; t.mess = null;
    ctx.makeMess(p.x + 1, p.y, 'GoldCoins');
    const before = ctx.Game.yendorPoints;
    p.clean('get');
    assert.equal(t.mess, null);
    assert.equal(ctx.Game.yendorPoints, before + 2);
});

test('slimes exist, bleed slime and can turn up as level 2 monsters', () => {
    const ctx = freshDungeon();
    const [x, y] = openRow(ctx);
    const s = ctx.GetEntity('Slime', x, y);
    assert.equal(s.char, 's');
    assert.equal(s.level, 2);
    ctx.Game.adventurer.dmg = 1;
    s.adventurerAct();
    assert.equal(ctx.Game.map[s.x + ',' + s.y].mess.name, 'Slime Puddle');
});

test('stepping on a slime puddle makes the janitor slide one extra tile', () => {
    const ctx = cleaningDay();
    const [x, y] = openRow(ctx);
    const p = ctx.Game.player;
    ctx.Game.map[p.x + ',' + p.y].entity = null;
    p.x = x - 1; p.y = y;
    ctx.Game.map[p.x + ',' + p.y] && (ctx.Game.map[p.x + ',' + p.y].entity = p);
    for (let d = 0; d < 3; d++) ctx.Game.map[(x + d) + ',' + y].mess = null;
    p.x = x; p.y = y; ctx.Game.map[x + ',' + y].entity = p;
    ctx.makeMess(x + 1, y, 'SlimePool');
    assert.equal(p.moveTo(x + 1, y), true);
    assert.equal(p.slide([1, 0]), true);
    assert.deepEqual([p.x, p.y], [x + 2, y]);
    assert.ok(ctx.Game.log.lines.some(l => /slip/.test(l.text)));
});

test('no slide off plain floor', () => {
    const ctx = cleaningDay();
    const [x, y] = openRow(ctx);
    const p = ctx.Game.player;
    for (let d = 0; d < 3; d++) ctx.Game.map[(x + d) + ',' + y].mess = null;
    ctx.Game.map[p.x + ',' + p.y].entity = null;
    p.x = x; p.y = y; ctx.Game.map[x + ',' + y].entity = p;
    assert.equal(p.slide([1, 0]), false);
    assert.deepEqual([p.x, p.y], [x, y]);
});

test('the hero tags walls with graffiti that can be mopped off', () => {
    const ctx = freshDungeon();
    const a = ctx.Game.adventurer;
    const nearWall = ctx.Game.freeCells.find(k => {
        const [x, y] = k.split(',').map(Number);
        return ctx.Game.map[(x - 1) + ',' + y] && ctx.Game.map[(x - 1) + ',' + y].char === '#';
    });
    [a.x, a.y] = nearWall.split(',').map(Number);
    assert.equal(a.tagWall(), true, 'the hero stands next to a wall');
    const wall = Object.values(ctx.Game.map).find(t => t.mess && t.mess.name === 'Graffiti');
    assert.ok(wall);
    assert.equal(wall.passable, false);
    assert.equal(wall.mess.cleanMethod, 'mop');
    assert.equal(ctx.Invasion.stats.graffiti, 1);
});

test('a full invasion keeps mess bookkeeping consistent with the new messes', () => {
    for (const seed of [1, 7, 42]) {
        const ctx = cleaningDay(seed);
        const onMap = Object.values(ctx.Game.map).filter(t => t.mess != null).length;
        assert.equal(ctx.Game.messNumbers[0], onMap, 'seed ' + seed);
        assert.ok(ctx.Game.adventurer.graffiti <= ctx.Game.adventurer.maxGraffiti);
    }
});

test('some rooms start out with cobwebs in their corners', () => {
    let total = 0;
    for (const seed of [1, 2, 3]) {
        const ctx = freshDungeon(seed);
        total += messesOnMap(ctx).filter(n => n === 'Cobweb').length;
    }
    assert.ok(total > 0);
});
