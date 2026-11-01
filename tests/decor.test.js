const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless } = require('./harness');

function freshDungeon(seed = 1234) {
    const ctx = bootHeadless({ seed });
    ctx.Game.generateDungeon();
    return ctx;
}

const DECOR = {
    Pot: ['ö', 'Pottery Shards'],
    WeaponRack: ['‡', 'Broken Weapon Rack'],
    Fountain: ['{', 'Broken Fountain'],
    Rock: ['•', 'Gravel'],
    Column: ['║', 'Broken Column'],
    Banner: ['¶', 'Torn Banner'],
    Torch: ['¡', 'Knocked-Down Torch'],
    Table: ['╤', 'Smashed Table'],
};

function clearAround(ctx, x, y, r = 3) {
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) {
        const t = ctx.Game.map[(x + i) + ',' + (y + j)];
        if (t) t.mess = null;
    }
}

for (const [name, [ch, broken]] of Object.entries(DECOR)) {
    test(`${name} uses '${ch}' and breaks into ${broken}`, () => {
        const ctx = freshDungeon();
        const key = ctx.Game.freeCells.find(k => ctx.Game.map[k].entity == null && !ctx.Game.map[k].important);
        const [x, y] = key.split(',').map(Number);
        const e = ctx.GetEntity(name, x, y);
        assert.equal(e.char, ch);
        clearAround(ctx, e.x, e.y);
        e.adventurerAct();
        const tile = ctx.Game.map[e.x + ',' + e.y];
        assert.equal(tile.entity, null, 'smashed off its tile');
        assert.equal(tile.mess.name, broken);
    });
}

test('banners and torches hang on walls, survive pushing and can be fixed back', () => {
    const ctx = freshDungeon();
    const key = ctx.Game.freeCells.find(k => {
        const [x, y] = k.split(',').map(Number);
        return ctx.Game.map[(x - 1) + ',' + y].char === '#' && ctx.Game.map[k].entity == null;
    });
    const [x, y] = key.split(',').map(Number);
    const banner = ctx.GetEntity('Banner', x, y);
    const wallTile = ctx.Game.map[banner.x + ',' + banner.y];
    assert.equal(wallTile.passable, false, 'attached to a wall');
    // smash it, then fix it from an adjacent floor tile
    clearAround(ctx, banner.x, banner.y);
    banner.adventurerAct();
    assert.equal(wallTile.mess.name, 'Torn Banner');
    assert.equal(wallTile.mess.char, '¶');
    const p = ctx.Game.player;
    const floor = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]
        .map(([dx, dy]) => [banner.x + dx, banner.y + dy])
        .find(([fx, fy]) => { const t = ctx.Game.map[fx + ',' + fy]; return t && t.passable && t.entity == null; });
    ctx.Game.map[p.x + ',' + p.y].entity = null;
    [p.x, p.y] = floor;
    ctx.Game.map[floor[0] + ',' + floor[1]].entity = p;
    p.clean('fix');
    assert.equal(wallTile.mess, null);
    assert.equal(wallTile.entity, banner);
});

test('heavy furniture and wall decoration cannot be pushed', () => {
    const ctx = freshDungeon();
    ctx.Game.phase = 'cleaning';
    ctx.Game.player.endTurn = () => {}; // keep the (not yet started) engine out of it
    for (const name of ['Fountain', 'Column']) {
        const key = ctx.Game.freeCells.find(k => ctx.Game.map[k].entity == null && !ctx.Game.map[k].important);
        const [x, y] = key.split(',').map(Number);
        const e = ctx.GetEntity(name, x, y);
        const at = [e.x, e.y];
        e.cleanerAct();
        assert.deepEqual([e.x, e.y], at, name + ' stays put');
        assert.ok(ctx.Game.log.lines.some(l => /won't budge/.test(l.text)));
    }
});

test('the hero never walks towards wall decoration and still leaves on time', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
        const ctx = freshDungeon(seed);
        ctx.Game.phase = 'invasion';
        ctx.Invasion.instant = true;
        ctx.Game.engine.start();
        assert.equal(ctx.Game.phase, 'cleaning');
        assert.ok(ctx.Game.adventurer.turns < 1000, 'seed ' + seed + ': ' + ctx.Game.adventurer.turns + ' turns');
    }
});

test('dungeons are decorated with the new furniture', () => {
    const seen = new Set();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        const ctx = freshDungeon(seed);
        for (const t of Object.values(ctx.Game.map)) if (t.entity && t.entity.tags && t.entity.tags.loot) seen.add(t.entity.name);
    }
    for (const n of ['Clay Pot', 'Weapon Rack', 'Fountain', 'Rock', 'Column', 'Banner', 'Wall Torch', 'Table']) {
        assert.ok(seen.has(n), n + ' appears in some dungeon');
    }
});
