const test = require('node:test');
const assert = require('node:assert');
const { cleaningDay, strip } = require('./harness');

// An open 7x7 floor area around the player, cleared of messes and entities.
function clearAround(ctx, r = 3) {
    const G = ctx.Game;
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) {
        const key = (G.player.x + i) + ',' + (G.player.y + j);
        if (i == 0 && j == 0) { if (G.map[key]) G.map[key].mess = null; continue; }
        G.map[key] = new ctx.Tile(G.player.x + i, G.player.y + j, '.', '#ddd', '#000', true, true);
    }
}

function put(ctx, dx, dy, kind) {
    const G = ctx.Game;
    return ctx.makeMess(G.player.x + dx, G.player.y + dy, kind);
}

function log(ctx, n = 4) {
    return ctx.Game.log.recent(n).map(l => strip(l.text)).join(' | ');
}

test('vacuum only takes dry fluff', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.day = 2;
    clearAround(ctx);
    put(ctx, 1, 0, 'Cobweb');
    put(ctx, -1, 1, 'Feathers');
    put(ctx, 0, -1, 'BloodPool');
    const before = G.shift.cleaned;
    ctx.__press(90); // Z
    assert.strictEqual(G.shift.cleaned - before, 2);
    assert.ok(G.map[(G.player.x) + ',' + (G.player.y - 1)].mess != null, 'blood stays');
    assert.match(log(ctx), /vacuum/i);
});

test('no vacuum on day 1', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    clearAround(ctx);
    put(ctx, 1, 0, 'Cobweb');
    ctx.__press(90);
    assert.ok(G.map[(G.player.x + 1) + ',' + G.player.y].mess != null);
    assert.match(log(ctx), /tomorrow/i);
});

test('old verbs still clean fluff', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.day = 2;
    clearAround(ctx);
    const f = put(ctx, 1, 0, 'Feathers');
    assert.strictEqual(f.cleanMethod, 'get');
    ctx.__press(80); // P
    assert.strictEqual(G.map[(G.player.x + 1) + ',' + G.player.y].mess, null);
});

test('squeegee clears a connected puddle', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.day = 3;
    clearAround(ctx);
    for (const [dx, dy] of [[1, 0], [2, 0], [3, 0], [3, 1], [3, 2]]) put(ctx, dx, dy, 'Water');
    put(ctx, -2, -2, 'Water'); // not connected
    ctx.__press(77); // M
    for (const [dx, dy] of [[1, 0], [2, 0], [3, 0], [3, 1], [3, 2]]) {
        assert.strictEqual(G.map[(G.player.x + dx) + ',' + (G.player.y + dy)].mess, null, dx + ',' + dy);
    }
    assert.ok(G.map[(G.player.x - 2) + ',' + (G.player.y - 2)].mess != null, 'unconnected puddle stays');
    assert.match(log(ctx), /squeegee/i);
});

test('squeegee stops at 12', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.day = 3;
    clearAround(ctx, 3);
    let made = 0;
    for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
        if (i == 0 && j == 0) continue;
        put(ctx, i, j, 'Water');
        made++;
    }
    const before = G.messNumbers[0];
    ctx.__press(77);
    assert.strictEqual(before - G.messNumbers[0], 12);
});

test('no squeegee before day 3', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.day = 2;
    clearAround(ctx);
    put(ctx, 1, 0, 'Water');
    put(ctx, 2, 0, 'Water');
    ctx.__press(77);
    assert.ok(G.map[(G.player.x + 2) + ',' + G.player.y].mess != null);
});

test('scrub brush clears tough stains in one pass', () => {
    let ctx = cleaningDay();
    let G = ctx.Game;
    G.day = 4;
    clearAround(ctx);
    let acid = put(ctx, 1, 0, 'AcidPool');
    assert.ok(acid.passes > 1, 'acid is tough');
    ctx.__press(77);
    assert.strictEqual(G.map[(G.player.x + 1) + ',' + G.player.y].mess, null);
    assert.match(log(ctx), /brush/i);

    ctx = cleaningDay();
    G = ctx.Game;
    G.day = 3;
    clearAround(ctx);
    put(ctx, 1, 0, 'AcidPool');
    ctx.__press(77);
    assert.ok(G.map[(G.player.x + 1) + ',' + G.player.y].mess != null, 'day 3: still stubborn');
});

test('memo announces new equipment', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.day = 2;
    ctx.DayEvents.start();
    assert.match(G.log.recent(6).map(l => strip(l.text)).join(' '), /vacuum/i);
});

// An open 9x9 floor around the player, nothing on it.
function openFloor(ctx, r = 4) {
    const G = ctx.Game;
    const px = G.player.x, py = G.player.y;
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) {
        if (i == 0 && j == 0) { G.map[px + ',' + py].mess = null; continue; }
        G.map[(px + i) + ',' + (py + j)] = new ctx.Tile(px + i, py + j, '.', '#ddd', '#000', true, true);
    }
    return { px, py };
}

function wall(ctx, x, y) {
    ctx.Game.map[x + ',' + y] = new ctx.Tile(x, y, '#', '#ddd', '#777', false, false);
}

// 2. squeegee
test('the squeegee does not squeeze through the corner of a wall', () => {
    const ctx = cleaningDay();
    const { px, py } = openFloor(ctx);
    // puddle A at (px+1,py+1), puddle B at (px+2,py+2); the corner between them is walled
    wall(ctx, px + 2, py + 1);
    wall(ctx, px + 1, py + 2);
    ctx.makeMess(px + 1, py + 1, 'Water');
    ctx.makeMess(px + 2, py + 2, 'Water');
    const n = ctx.Game.player.squeegee((px + 1) + ',' + (py + 1));
    assert.strictEqual(n, 1);
    assert.ok(ctx.Game.map[(px + 2) + ',' + (py + 2)].mess, 'puddle B is still there');
});

test('the squeegee still goes diagonally across open floor', () => {
    const ctx = cleaningDay();
    const { px, py } = openFloor(ctx);
    ctx.makeMess(px + 1, py + 1, 'Water');
    ctx.makeMess(px + 2, py + 2, 'Water');
    assert.strictEqual(ctx.Game.player.squeegee((px + 1) + ',' + (py + 1)), 2);
});

test('the squeegee only spreads over floor', () => {
    const ctx = cleaningDay();
    const { px, py } = openFloor(ctx);
    wall(ctx, px + 2, py + 1);
    ctx.makeMess(px + 1, py + 1, 'Water');
    ctx.makeMess(px + 2, py + 1, 'Water'); // water "on" a wall
    assert.strictEqual(ctx.Game.player.squeegee((px + 1) + ',' + (py + 1)), 1);
});
