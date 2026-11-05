const test = require('node:test');
const assert = require('node:assert');
const { cleaningDay, strip } = require('./harness');

function panelText(ctx) {
    ctx.Game.drawMap();
    return ctx.__drawn.filter(d => d.text).map(d => strip(d.text)).join('\n');
}

test('every room gets a name, lounge keeps its own', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    for (let i = 0; i < G.rooms.length; i++) {
        assert.ok(ctx.Rooms.name(i).length > 3, 'room ' + i);
    }
    assert.strictEqual(ctx.Rooms.name(G.staffRoomID), 'the Staff Lounge');
    const names = G.rooms.map((r, i) => ctx.Rooms.name(i));
    assert.strictEqual(new Set(names).size, names.length, 'names are unique');
    assert.strictEqual(ctx.Rooms.at(G.player.x, G.player.y), 'the Staff Lounge');
    assert.match(panelText(ctx), /Room: the Staff Lounge/);
});

test('corridors have a name', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    const hall = G.hallCells.find(k => { const [x, y] = k.split(',').map(Number); return G.getRoomIndex(x, y) < 0; });
    const [x, y] = hall.split(',').map(Number);
    assert.strictEqual(ctx.Rooms.at(x, y), 'a corridor');
});

test('day 1 has one goal, later days two', () => {
    const ctx = cleaningDay();
    assert.strictEqual(ctx.Objectives.list.length, 1);
    ctx.Game.day = 2;
    ctx.Objectives.generate();
    assert.strictEqual(ctx.Objectives.list.length, 2);
    assert.notStrictEqual(ctx.Objectives.list[0].type, ctx.Objectives.list[1].type);
});

test('spotless goals pick a dirty room', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
        const ctx = cleaningDay(seed);
        ctx.Game.day = 2;
        for (let k = 0; k < 10; k++) {
            ctx.Objectives.generate();
            for (const g of ctx.Objectives.list.filter(g => g.type == 'spotless')) {
                assert.ok(ctx.Objectives.messesIn(g.room).length >= 3, 'seed ' + seed);
                assert.notStrictEqual(g.room, ctx.Game.staffRoomID);
            }
        }
    }
});

test('finishing a goal pays once', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    ctx.Objectives.list = [{ type: 'chat', label: 'Chat with 3 colleagues', done: false }];
    const pts = G.yendorPoints, zm = G.zorkmids;
    const lounge = G.monsterList.filter(m => m.alive && m.retired && !m.tags.visitor).slice(0, 3);
    lounge.forEach(m => { m.playerTalkedToday = true; });
    ctx.Objectives.check();
    ctx.Objectives.check();
    assert.strictEqual(G.yendorPoints - pts, 25);
    assert.strictEqual(G.zorkmids - zm, 10);
    assert.strictEqual(G.run.goalsDone, 1);
    assert.strictEqual(ctx.Objectives.list[0].done, true);
});

test('goals show on the memo and the panel', () => {
    const ctx = cleaningDay();
    const label = ctx.Objectives.list[0].label;
    const log = ctx.Game.log.recent(10).map(l => strip(l.text)).join(' ');
    assert.ok(log.includes(label), log);
    const text = panelText(ctx);
    assert.match(text, /GOALS/);
    assert.ok(text.includes(label.slice(0, 12)), text);
});

test('combo goal counts the combo', () => {
    const ctx = cleaningDay();
    ctx.Objectives.list = [{ type: 'combo', label: 'Reach a 15 combo', done: false }];
    ctx.Game.combo.bestToday = 15;
    ctx.Objectives.check();
    assert.strictEqual(ctx.Objectives.list[0].done, true);
});

test('long goals wrap in the panel instead of losing the room name', () => {
    const ctx = cleaningDay();
    ctx.Objectives.list = [{ type: 'fixRoom', room: 1, label: 'Fix everything in the Chamber of Loud Snoring', short: 'Fix all: Chamber of Loud Snoring', done: false }];
    const lines = ctx.Objectives.lines(23).map(strip);
    assert.ok(lines.length == 2, JSON.stringify(lines));
    assert.ok(lines.join(' ').includes('Loud Snoring'), JSON.stringify(lines));
    assert.ok(lines.every(l => l.length <= 23));
    assert.ok(lines[1][0] != ' ', 'rot.js drops leading spaces: the second line starts with a visible mark');
});

test('each goal gets its own memo line', () => {
    const ctx = cleaningDay();
    ctx.Game.day = 2;
    ctx.Game.log.clear(); // only the memos of this morning
    ctx.DayEvents.start();
    const memos = ctx.Game.log.lines.map(l => strip(l.text)).filter(t => /^MEMO: Goal:/.test(t)); // other memos may follow
    assert.strictEqual(memos.length, 2);
});

function endTalk(ctx) {
    const t = ctx.Game.player.talking;
    if (t) {
        ctx.removeEventListener('keydown', t);
        ctx.removeEventListener('keypress', t);
        ctx.Game.player.talking = null;
    }
}

// 1. chat goal
test('the chat goal ticks the moment you talk to the third colleague', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    ctx.Objectives.list = [{ type: 'chat', label: 'Chat with 3 colleagues', done: false }];
    G.monsterList.forEach(m => { m.playerTalkedToday = false; });
    const lounge = G.monsterList.filter(m => m.alive && m.retired && !m.tags.visitor && m.convos);
    assert.ok(lounge.length >= 3);
    lounge[0].playerTalkedToday = true;
    lounge[1].playerTalkedToday = true;
    lounge[2].cleanerAct();
    endTalk(ctx);
    assert.strictEqual(ctx.Objectives.list[0].done, true);
});

test('pets are friends, not colleagues: they do not count for the chat goal', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    ctx.Objectives.list = [{ type: 'chat', label: 'Chat with 3 colleagues', done: false }];
    G.monsterList.forEach(m => { m.playerTalkedToday = false; });
    const lounge = G.monsterList.filter(m => m.alive && m.retired && !m.tags.visitor);
    lounge[0].playerTalkedToday = true;
    lounge[1].playerTalkedToday = true;
    const pet = ctx.AddPet(G.player.x + 2, G.player.y, 'dog');
    pet.cleanerAct();
    endTalk(ctx);
    assert.strictEqual(ctx.Objectives.chatted(), 2);
    assert.strictEqual(ctx.Objectives.list[0].done, false);
});
