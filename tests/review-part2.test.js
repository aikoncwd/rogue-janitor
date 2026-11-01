const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro } = require('./harness');

const strip = s => s.replace(/%c\{[^}]*\}/g, '');

function morning(seed, watched) {
    const ctx = toIntro(bootHeadless({ seed, begin: true }));
    if (watched) {
        ctx.__press(13);
        let n = 0;
        while (ctx.Game.phase == 'invasion' && n++ < 4000) {
            if (ctx.Invasion.stage != null) ctx.__press(13); // the hand-over card waits for a key
            else ctx.__runTimers();
        }
        assert.strictEqual(ctx.Game.phase, 'cleaning', 'watched raid reached the morning');
    }
    else {
        ctx.Invasion.instant = true;
        ctx.__press(13);
        ctx.Invasion.instant = false;
    }
    let n = 0;
    while (ctx.Game.player.talking && n++ < 50) { ctx.Game.player.talking.lastConvoChange = 0; ctx.__press(13); }
    return ctx;
}

function dayPicks(ctx) {
    return JSON.stringify({
        goals: ctx.Objectives.list.map(g => g.label),
        rooms: ctx.Game.rooms.map((r, i) => ctx.Rooms.name(i)),
        stock: ctx.Shop.stock.map(s => s.id),
    });
}

test('goals, room names and the shop are the same watched or skipped', () => {
    for (const seed of [77, 1234, 5]) {
        assert.strictEqual(dayPicks(morning(seed, true)), dayPicks(morning(seed, false)), 'seed ' + seed);
    }
});

test('Continue does not reroll the day\'s goals', () => {
    const A = morning(1234, false);
    // leave through the exit like a player: the night ends, the save is written, day 2's raid runs
    A.Invasion.instant = true;
    let door = null;
    for (const k in A.Game.map) { const e = A.Game.map[k].entity; if (e && e.tags && 'exit' in e.tags) door = e; }
    door.cleanerAct();
    door.lastConvoChange = 0;
    A.__press(89, 121);
    let n = 0;
    while (A.Game.player.talking && n++ < 40) { A.Game.player.talking.lastConvoChange = 0; A.__press(13); }
    n = 0;
    while (A.Game.phase != 'cleaning' && n++ < 10) A.__press(13);
    n = 0;
    while (A.Game.player.talking && n++ < 50) { A.Game.player.talking.lastConvoChange = 0; A.__press(13); }
    const B = bootHeadless({ seed: 999, begin: true });
    Object.assign(B.__storage, A.__storage);
    B.__press(67, 99);
    B.Invasion.instant = true;
    B.Invasion.skip();
    n = 0;
    while (B.Game.phase != 'cleaning' && n++ < 10) B.__press(13);
    n = 0;
    while (B.Game.player.talking && n++ < 50) { B.Game.player.talking.lastConvoChange = 0; B.__press(13); }
    assert.strictEqual(dayPicks(B), dayPicks(A));
});

test('the panel shows the whole room name', () => {
    const ctx = morning(1234, false);
    const G = ctx.Game;
    G.roomNames = G.rooms.map(() => 'the Gallery of Loud Snoring');
    const r = G.rooms.findIndex((x, i) => i != G.staffRoomID);
    const room = G.rooms[r];
    G.map[G.player.x + ',' + G.player.y].entity = null;
    const free = [];
    for (let x = room[0]; x < room[2]; x++) for (let y = room[1]; y < room[3]; y++) { const t = G.map[x + ',' + y]; if (t && t.passThrough()) free.push([x, y]); }
    G.player.x = free[0][0]; G.player.y = free[0][1];
    G.drawMap();
    const text = ctx.__drawn.filter(d => d.text).map(d => strip(d.text)).join(' ');
    assert.ok(text.includes('Loud Snoring'), 'room name cut off');
});

test('a squeegee or vacuum press counts once in the combo', () => {
    const ctx = morning(1234, false);
    const G = ctx.Game;
    G.day = 3;
    for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
        const key = (G.player.x + i) + ',' + (G.player.y + j);
        if (i == 0 && j == 0) { G.map[key].mess = null; continue; }
        G.map[key] = new ctx.Tile(G.player.x + i, G.player.y + j, '.', '#ddd', '#000', true, true);
    }
    for (const [dx, dy] of [[1, 0], [2, 0], [3, 0]]) ctx.makeMess(G.player.x + dx, G.player.y + dy, 'Water');
    ctx.__press(77);
    assert.strictEqual(G.combo.count, 1);
});

test('the mimic stain still giggles when vacuumed', () => {
    const ctx = morning(1234, false);
    const G = ctx.Game;
    G.day = 2;
    const key = (G.player.x + 1) + ',' + G.player.y;
    G.map[key] = new ctx.Tile(G.player.x + 1, G.player.y, '.', '#ddd', '#000', true, true);
    const m = ctx.makeMess(G.player.x + 1, G.player.y, 'Cobweb');
    m.mimic = true;
    ctx.__press(90);
    assert.match(G.log.recent(4).map(l => strip(l.text)).join(' '), /mimic/);
});

test('picking up a ring says so once', () => {
    const ctx = morning(1234, false);
    const G = ctx.Game;
    const key = (G.player.x + 1) + ',' + G.player.y;
    G.map[key] = new ctx.Tile(G.player.x + 1, G.player.y, '.', '#ddd', '#000', true, true);
    ctx.makeMess(G.player.x + 1, G.player.y, 'LostRing');
    ctx.__press(80);
    const lines = G.log.recent(3).map(l => strip(l.text));
    assert.ok(!lines.some(l => /^You pick up/.test(l)), lines.join(' | '));
    assert.ok(lines.some(l => /^You pocket/.test(l)));
});
