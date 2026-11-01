const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless } = require('./harness');

function cleaningDay() {
    const ctx = bootHeadless();
    ctx.Game.generateDungeon();
    ctx.Game.phase = 'invasion';
    ctx.Invasion.instant = true;
    ctx.Game.engine.start();
    // leave the start-of-shift cutscene so the map can be redrawn freely
    ctx.Game.player.talking = null;
    let t = 0;
    ctx.Effects.now = () => t;
    ctx.__advance = ms => { t += ms; };
    return ctx;
}

// Clears the 3x3 around the player and puts one mess at (dx,dy).
function messAt(ctx, dx, dy, type) {
    const p = ctx.Game.player;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        const t = ctx.Game.map[(p.x + i) + ',' + (p.y + j)];
        if (t) { t.mess = null; t.secretDoor = null; }
    }
    const t = ctx.Game.map[(p.x + dx) + ',' + (p.y + dy)];
    t.entity = null;
    t.passable = true;
    t.important = false;
    t.door = null;
    ctx.makeMess(p.x + dx, p.y + dy, type);
    return t;
}

test('broom glyph follows the direction of the mopped tile', () => {
    const ctx = cleaningDay();
    const E = ctx.Effects;
    assert.equal(E.toolChar(1, 0), '-');
    assert.equal(E.toolChar(-1, 0), '-');
    assert.equal(E.toolChar(0, 1), '|');
    assert.equal(E.toolChar(0, -1), '|');
    assert.equal(E.toolChar(1, -1), '/');
    assert.equal(E.toolChar(-1, 1), '/');
    assert.equal(E.toolChar(1, 1), '\\');
    assert.equal(E.toolChar(-1, -1), '\\');
});

for (const [dx, dy, ch] of [[1, 0, '-'], [0, -1, '|'], [1, -1, '/'], [-1, -1, '\\']]) {
    test(`mopping at (${dx},${dy}) draws the broom '${ch}' on that tile`, () => {
        const ctx = cleaningDay();
        messAt(ctx, dx, dy, 'BloodPool');
        ctx.Game.player.clean('mop');
        assert.equal(ctx.Effects.list.length, 1);
        ctx.Game.drawMap();
        const cx = ctx.Game.offset[0] + dx, cy = ctx.Game.offset[1] + dy;
        const cells = ctx.__drawn.filter(d => d.x === cx && d.y === cy && d.ch !== undefined);
        assert.equal(cells[cells.length - 1].ch, ch, 'last thing drawn on the tile is the broom');
    });
}

test('the broom wiggles and then disappears', () => {
    const ctx = cleaningDay();
    messAt(ctx, 1, 0, 'Water');
    ctx.Game.player.clean('mop');
    const chars = new Set();
    for (let i = 0; i < 20; i++) {
        const cur = ctx.Effects.current();
        if (cur.length) chars.add(cur[0].frame[0]);
        ctx.__advance(ctx.Effects.FRAME_MS);
    }
    assert.ok(chars.size >= 2, 'more than one frame: ' + [...chars]);
    assert.equal(ctx.Effects.current().length, 0);
});

test('picking up and fixing get their own effects', () => {
    const ctx = cleaningDay();
    messAt(ctx, 0, 1, 'Wrapper');
    ctx.Game.player.clean('get');
    assert.equal(ctx.Effects.list[0].frames[0][0], '|');
    ctx.Effects.clear();
    const t = messAt(ctx, 1, 1, 'BrokenTable');
    const table = ctx.GetEntity('Table', ctx.Game.player.x + 5, ctx.Game.player.y + 5);
    ctx.Game.map[table.x + ',' + table.y].entity = null; // the broken table is not standing anywhere yet
    t.mess.parent = table;
    ctx.Game.player.clean('fix');
    assert.equal(ctx.Effects.list.length, 1);
    assert.equal(ctx.Effects.list[0].frames[0][0], 'T');
});

test('effects never redraw over a conversation', () => {
    const ctx = cleaningDay();
    messAt(ctx, 1, 0, 'BloodPool');
    ctx.Game.player.clean('mop');
    ctx.Game.player.talking = { doConvo() {} };
    assert.equal(ctx.Effects.canRedraw(), false);
});
