const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro } = require('./harness');

function cleaningDay(seed = 1234) {
    const ctx = toIntro(bootHeadless({ seed, begin: true }));
    ctx.Invasion.instant = true;
    ctx.__press(13);
    ctx.Invasion.instant = false;
    let n = 0;
    while (ctx.Game.player.talking && n++ < 50) { ctx.Game.player.talking.lastConvoChange = 0; ctx.__press(13); }
    return ctx;
}

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
