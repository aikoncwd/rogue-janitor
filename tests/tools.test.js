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
