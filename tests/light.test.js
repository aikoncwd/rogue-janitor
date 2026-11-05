const test = require('node:test');
const assert = require('node:assert');
const { cleaningDay } = require('./harness');

// A small open room around the player with a torch on its north wall.
function litRoom(ctx) {
    const G = ctx.Game;
    const px = G.player.x, py = G.player.y;
    for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) {
        if (i == 0 && j == 0) { G.map[px + ',' + py].mess = null; continue; }
        const wall = Math.abs(i) == 4 || Math.abs(j) == 4;
        G.map[(px + i) + ',' + (py + j)] = new ctx.Tile(px + i, py + j, wall ? '#' : '.', wall ? '#ddd' : '#ddd', wall ? '#777' : '#000', !wall, !wall);
    }
    const torch = ctx.GetEntity('Torch', px, py - 3);
    return { px, py, torch };
}

function cellAt(ctx, x, y) {
    const G = ctx.Game;
    const sx = x - G.player.x + G.offset[0], sy = y - G.player.y + G.offset[1];
    const hits = ctx.__drawn.filter(d => d.x === sx && d.y === sy && d.ch !== undefined);
    return hits[hits.length - 1];
}

test('floor near a torch is warm', () => {
    const ctx = cleaningDay();
    const { torch } = litRoom(ctx);
    ctx.Game.drawMap();
    const near = cellAt(ctx, torch.x, torch.y + 1);
    assert.ok(near && near.bg && near.bg.toLowerCase() != '#000' && near.bg.toLowerCase() != '#000000', JSON.stringify(near));
    const far = cellAt(ctx, ctx.Game.player.x, ctx.Game.player.y + 3);
    assert.ok(far, 'far tile drawn');
});

test('walls keep their colours', () => {
    const ctx = cleaningDay();
    const { torch, px, py } = litRoom(ctx);
    ctx.Game.drawMap();
    const wall = cellAt(ctx, px + 2, py - 4);
    assert.strictEqual(wall.bg, '#777');
});

test('drawing stays deterministic', () => {
    const ctx = cleaningDay();
    litRoom(ctx);
    const state = JSON.stringify(ctx.ROT.RNG.getState());
    for (let i = 0; i < 3; i++) ctx.Game.drawMap();
    assert.strictEqual(JSON.stringify(ctx.ROT.RNG.getState()), state);
});

function wall(ctx, x, y) {
    ctx.Game.map[x + ',' + y] = new ctx.Tile(x, y, '#', '#ddd', '#777', false, false);
}

// 9. torchlight and walls
function litRoomTall(ctx) {
    const G = ctx.Game;
    const px = G.player.x, py = G.player.y;
    for (let i = -4; i <= 4; i++) for (let j = -6; j <= 4; j++) {
        if (i == 0 && j == 0) { G.map[px + ',' + py].mess = null; continue; }
        const isWall = Math.abs(i) == 4 || j == 4 || j == -4;
        G.map[(px + i) + ',' + (py + j)] = new ctx.Tile(px + i, py + j, isWall ? '#' : '.', '#ddd', isWall ? '#777' : '#000', !isWall, !isWall);
    }
    const torch = ctx.GetEntity('Torch', px, py - 3);
    return { px, py, torch };
}

test('player art has the tile background', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    const tile = G.map[G.player.x + ',' + G.player.y];
    tile.bgColor = '#123456'; // a coloured floor: the janitor stands on it, not on black
    const art = G.player.getArt();
    assert.strictEqual(art[0], '@');
    assert.strictEqual(art[2], '#123456');
});

test('torchlight does not go through the wall it hangs on', () => {
    const ctx = cleaningDay();
    const { px, py, torch } = litRoomTall(ctx);
    assert.deepStrictEqual([torch.x, torch.y], [px, py - 4]);
    assert.ok(ctx.Game.warmth(px, py - 3, [torch]) > 0, 'its own side is warm');
    assert.strictEqual(ctx.Game.warmth(px, py - 5, [torch]), 0, 'the other side stays dark');
});

test('torchlight does not go round a pillar', () => {
    const ctx = cleaningDay();
    const { px, py, torch } = litRoomTall(ctx);
    wall(ctx, px, py - 2);
    assert.strictEqual(ctx.Game.warmth(px, py - 1, [torch]), 0);
    assert.ok(ctx.Game.warmth(px + 1, py - 3, [torch]) > 0);
});

test('torchlight reaches along the wall it hangs on', () => {
    const ctx = cleaningDay();
    const { px, py, torch } = litRoomTall(ctx);
    for (const dx of [-3, -2, -1, 1, 2, 3]) {
        assert.ok(ctx.Game.warmth(px + dx, py - 3, [torch]) > 0, 'dx ' + dx);
    }
});

test('torchlight drawing does not use the world RNG', () => {
    const ctx = cleaningDay();
    litRoomTall(ctx);
    const state = JSON.stringify(ctx.ROT.RNG.getState());
    ctx.Game.drawMap();
    assert.strictEqual(JSON.stringify(ctx.ROT.RNG.getState()), state);
});
