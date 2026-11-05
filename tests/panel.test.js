const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro, cleaningDay, strip } = require('./harness');

test('layout 100x40', () => {
    const ctx = bootHeadless();
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.Panel.layout(100, 40))),
        { mapCols: 76, mapRows: 34, panelX: 76, logY: 35, offset: [38, 17] });
});

test('layout narrow hides panel', () => {
    const ctx = bootHeadless();
    const l = ctx.Panel.layout(50, 20);
    assert.equal(l.panelX, 50);
    assert.equal(l.mapCols, 50);
});

test('layout tiny stays positive', () => {
    const ctx = bootHeadless();
    const l = ctx.Panel.layout(10, 6);
    for (const v of [l.mapCols, l.mapRows, l.offset[0], l.offset[1]]) assert.ok(v >= 1, JSON.stringify(l));
    assert.ok(l.logY >= 1);
});

test('getSize stores the layout and sets the map offset', () => {
    const ctx = bootHeadless();
    assert.deepEqual(Array.from(ctx.Game.offset), [38, 17]); // stub display is 100x40
    assert.equal(ctx.Game.layoutInfo.panelX, 76);
});

test('messCategories counts', () => {
    const ctx = bootHeadless();
    ctx.Game.generateDungeon();
    for (const k in ctx.Game.map) ctx.Game.map[k].mess = null;
    const floor = Object.keys(ctx.Game.map).filter(k => ctx.Game.map[k].passable && !ctx.Game.map[k].important && !ctx.Game.map[k].door);
    const place = (i, name) => { const [x, y] = floor[i * 7].split(',').map(Number); ctx.makeMess(x, y, name); };
    place(0, 'BloodPool'); place(1, 'BloodPrints'); place(2, 'MudPrints'); place(3, 'Wrapper');
    place(4, 'BrokenTable'); place(5, 'Water'); place(6, 'EmptyMug');
    const c = ctx.Panel.messCategories();
    assert.deepEqual(JSON.parse(JSON.stringify(c)), { blood: 1, prints: 2, spills: 1, litter: 2, broken: 1, graffiti: 0, dust: 0, other: 0 });
});

test('invasion panel shows hero, statuses and truncation', () => {
    const ctx = bootHeadless();
    ctx.Game.generateDungeon();
    ctx.Game.phase = 'invasion';
    const base = ctx.Invasion.roster[0];
    const roster = [];
    for (let i = 0; i < 30; i++) roster.push(Object.assign(Object.create(Object.getPrototypeOf(base)), base, { name: 'Mon' + i }));
    roster[0].alive = false; roster[0].hp = 0;
    roster[1].active = true; roster[1].hp = roster[1].maxhp - 1;
    ctx.Invasion.roster = roster;
    const lines = ctx.Panel.lines('invasion', 30).map(strip);
    assert.ok(lines.length <= 30);
    const text = lines.join('\n');
    assert.ok(text.includes(ctx.Invasion.hero.full.slice(0, 20)));
    assert.ok(/Mon0 +fainted/.test(text), text);
    assert.ok(/Mon1 +fighting!/.test(text), text);
    assert.ok(/Mon2 +unharmed/.test(text), text);
    assert.ok(/\+\d+ more/.test(text), text);
    assert.ok(text.includes('[Esc] skip'));
    assert.ok(lines.every(l => l.length <= ctx.Panel.WIDTH - 1), 'lines fit the panel');
});

test('cleaning panel shows day, lounge and mess left', () => {
    const ctx = bootHeadless();
    ctx.Game.generateDungeon();
    ctx.Game.phase = 'invasion';
    ctx.Invasion.instant = true;
    ctx.Game.engine.start();
    const text = ctx.Panel.lines('cleaning', 40).map(strip).join('\n');
    assert.ok(text.includes('Day 1'));
    assert.ok(text.includes('STAFF LOUNGE'));
    assert.ok(text.includes('MESS LEFT'));
    assert.ok(/blood|prints|litter/i.test(text));
});

test('sendMessage writes to log and keeps non-important semantics', () => {
    const ctx = bootHeadless();
    ctx.Game.sendMessage('You open the door.');
    ctx.Game.sendMessage('You hear barking.', false); // ignored: a fresh message is showing
    let texts = ctx.Game.log.recent(5).map(l => l.text);
    assert.deepEqual(texts, ['You open the door.']);
    ctx.Game.log.markStale(); ctx.Game.lastMessage = ''; // what a player move does
    ctx.Game.sendMessage('You hear barking.', false);
    texts = ctx.Game.log.recent(5).map(l => l.text);
    assert.deepEqual(texts, ['You open the door.', 'You hear barking.']);
});

test('cleaning drawMap draws log and panel, not the old top text', () => {
    const ctx = bootHeadless();
    ctx.Game.generateDungeon();
    ctx.Game.phase = 'invasion';
    ctx.Invasion.instant = true;
    ctx.Game.engine.start();
    ctx.Game.player.talking = null;
    ctx.Game.log.push('hello log');
    ctx.Game.drawMap();
    const texts = ctx.__drawn.filter(d => d.text);
    assert.ok(!texts.some(d => /Cleanliness:/.test(d.text)));
    assert.ok(texts.some(d => d.text.includes('hello log') && d.y >= ctx.Game.layoutInfo.logY));
    assert.ok(texts.some(d => d.x >= ctx.Game.layoutInfo.panelX && /SHIFT/.test(d.text)));
    // nothing from the map viewport spills into the panel or the log
    const cells = ctx.__drawn.filter(d => d.ch !== undefined && ![' ', '│', '─'].includes(d.ch)); // blanks clear the log rows
    assert.ok(cells.every(d => d.x < ctx.Game.layoutInfo.mapCols && d.y < ctx.Game.layoutInfo.mapRows));
});

test('bodies and flashes are drawn during the invasion', () => {
    const ctx = toIntro(bootHeadless({ begin: true }));
    ctx.__press(13);
    const hero = ctx.Game.adventurer;
    // a body right next to the hero, on an empty visible tile
    const spot = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [hero.x + dx, hero.y + dy])
        .find(([x, y]) => { const t = ctx.Game.map[x + ',' + y]; return t && t.passable && !t.entity; });
    ctx.Invasion.bodies.push({ x: spot[0], y: spot[1], char: 'g' });
    ctx.Invasion.flashes[hero.x + ',' + hero.y] = 2;
    ctx.Game.drawMap();
    const o = ctx.Game.offset;
    const body = ctx.__drawn.filter(d => d.x === spot[0] - hero.x + o[0] && d.y === spot[1] - hero.y + o[1]).pop();
    assert.equal(body.ch, 'g');
    assert.equal(body.fg, '#555');
    const heroCell = ctx.__drawn.filter(d => d.x === o[0] && d.y === o[1] && d.ch !== undefined).pop();
    assert.equal(heroCell.ch, '@');
    assert.equal(heroCell.bg, '#a00');
});

test('drawMap works in a tiny window', () => {
    const ctx = toIntro(bootHeadless({ begin: true }));
    ctx.Game.display.computeSize = () => [12, 7];
    ctx.Game.getSize(true);
    ctx.__press(13);
    ctx.__runTimers();
    ctx.Game.drawMap();
    const bad = ctx.__drawn.filter(d => d.text && d.text.length && d.y >= 7);
    assert.equal(bad.length, 0);
});

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

// 3. panel in a short window
test('a short panel drops the minimap and the lounge list, never the help keys', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.comboActive = () => true;
    G.combo.count = 7;
    ctx.Objectives.list = [
        { type: 'spotless', room: 0, label: 'Leave it spotless', short: 'Spotless: Slightly Haunted Gallery of Many Doors', done: false },
        { type: 'chat', label: 'Chat with 3 colleagues', done: false },
    ];
    ctx.Rooms.at = () => 'the Slightly Haunted Gallery of Many Doors';
    for (const rows of [30, 26, 24, 22, 20]) {
        const lines = ctx.Panel.lines('cleaning', rows).map(strip);
        const text = lines.join('\n');
        assert.ok(lines.length <= rows, rows + ' rows');
        assert.match(text, /\[\?\] help/, rows + ' rows: ' + text);
        assert.match(text, /\[T\] music/, rows + ' rows');
        assert.match(text, /\[\+\/-\] zoom/, rows + ' rows');
        assert.match(text, /MESS LEFT/, rows + ' rows: ' + text);
        assert.match(text, /Day \d/, rows + ' rows');
    }
});

test('a very short panel still shows MESS LEFT with a count', () => {
    const ctx = cleaningDay();
    ctx.Game.comboActive = () => true;
    ctx.Game.combo.count = 7;
    for (const rows of [11, 12, 13, 15]) {
        const lines = ctx.Panel.lines('cleaning', rows).map(strip);
        const i = lines.findIndex(l => /MESS LEFT/.test(l));
        assert.ok(i >= 0, rows + ' rows: ' + lines.join('\n'));
        assert.match(lines[i + 1] || '', /\d|Spotless/, rows + ' rows: ' + lines.join('\n'));
        assert.ok(lines.some(l => /\[\?\] help/.test(l)));
        assert.ok(lines.length <= rows);
    }
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
