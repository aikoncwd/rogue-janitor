const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro, strip } = require('./harness');

function cleaningDay(seed = 1234) {
    const ctx = toIntro(bootHeadless({ seed, begin: true }));
    ctx.Invasion.instant = true;
    for (let i = 0; i < 6 && ctx.Game.phase != 'cleaning'; i++) ctx.__press(13);
    assert.equal(ctx.Game.phase, 'cleaning');
    ctx.Game.player.talking = null;
    return ctx;
}

function logText(ctx) {
    return ctx.Game.log.lines.map(l => strip(l.text));
}

function inLounge(ctx, x, y) {
    const r = ctx.Game.rooms[ctx.Game.staffRoomID];
    return x >= r[0] && x < r[2] && y >= r[1] && y < r[3];
}

function visitors(ctx) {
    return ctx.Game.monsterList.filter(m => m.tags.visitor);
}

function convoText(convo) {
    return convo.map(n => n.text || n.message || '').join(' ');
}

test('every shift starts with a memo', () => {
    const ctx = cleaningDay();
    assert.ok(logText(ctx).some(l => l.startsWith('MEMO: ')), logText(ctx).slice(-4).join(' | '));
});

test('no shift event on day 1', () => {
    const ctx = cleaningDay();
    assert.equal(ctx.Game.todayEvent, null);
    assert.equal(visitors(ctx).length, 0);
});

test('the stolen Amulet makes the next memo', () => {
    const ctx = cleaningDay();
    ctx.Game.amuletStolen = true;
    ctx.DayEvents.start();
    assert.ok(logText(ctx).includes('MEMO: ' + ctx.Lore.amuletMemo));
});

test('day 2+ usually has an event', () => {
    let events = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        const ctx = cleaningDay(seed);
        ctx.Game.day = 5;
        ctx.Game.pastHeroes = [{ full: 'Chad the Bard', cls: 'Bard' }];
        ctx.DayEvents.start();
        if (ctx.Game.todayEvent) {
            events++;
            assert.ok(ctx.DayEvents.EVENTS.includes(ctx.Game.todayEvent));
        }
    }
    assert.ok(events >= 3, String(events));
});

test('inspector visits and judges the shift', () => {
    const ctx = cleaningDay();
    ctx.Game.day = 2;
    ctx.DayEvents.run('inspector');
    const v = visitors(ctx);
    assert.equal(v.length, 1);
    assert.ok(/Inspector/.test(v[0].name));
    assert.ok(inLounge(ctx, v[0].x, v[0].y));
    ctx.Game.cleanPercent = () => 90;
    const nodes = ctx.ConversationBuilder.exitPrompt();
    const verdict = nodes.find(n => ctx.Lore.inspectorVerdict.good.includes(n.message));
    assert.ok(verdict, 'good verdict in the exit prompt');
    assert.equal(verdict.globalTags.yendorPoints, 100);
    ctx.Game.cleanPercent = () => 40;
    const bad = ctx.ConversationBuilder.exitPrompt().find(n => ctx.Lore.inspectorVerdict.bad.includes(n.message));
    assert.ok(bad && !(bad.globalTags && bad.globalTags.yendorPoints), 'bad verdict, no bonus');
});

test('birthday: cake in the lounge and a birthday chat', () => {
    const ctx = cleaningDay();
    ctx.DayEvents.run('birthday');
    const m = ctx.Game.monsterList.find(x => x.convos && x.convos.length && /birthday/i.test(convoText(x.convos[x.convos.length - 1])));
    assert.ok(m, 'someone has a birthday');
    let cake = null;
    for (const k in ctx.Game.map) {
        const mess = ctx.Game.map[k].mess;
        if (mess && mess.name == 'Birthday Cake') cake = mess;
    }
    assert.ok(cake && cake.kind == 'Apple Core', 'cake');
    assert.ok(inLounge(ctx, cake.x, cake.y), 'cake in the lounge');
    const last = m.convos[m.convos.length - 1];
    assert.ok(/birthday/i.test(convoText(last)));
    assert.equal(last[last.length - 1].globalTags.yendorPoints, 30);
});

test('mimic stain giggles when cleaned', () => {
    const ctx = cleaningDay();
    ctx.DayEvents.run('mimicStain');
    let key = null;
    for (const k in ctx.Game.map) if (ctx.Game.map[k].mess && ctx.Game.map[k].mess.mimic) key = k;
    assert.ok(key, 'a mimic stain');
    // stand next to it and mop until gone
    const [x, y] = key.split(',').map(Number);
    const p = ctx.Game.player;
    const G = ctx.Game;
    const spot = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]
        .map(([dx, dy]) => (x + dx) + ',' + (y + dy))
        .find(k => G.map[k] && G.map[k].passable && G.map[k].entity == null);
    G.map[p.x + ',' + p.y].entity = null;
    [p.x, p.y] = spot.split(',').map(Number);
    G.map[spot].entity = p;
    for (const k in G.map) if (k != key && G.map[k].mess && Math.abs(G.map[k].mess.x - p.x) <= 1 && Math.abs(G.map[k].mess.y - p.y) <= 1) G.map[k].mess = null;
    for (let i = 0; i < 6 && G.map[key].mess != null; i++) p.clean('mop');
    assert.ok(logText(ctx).includes('Hehe, that tickles!'), logText(ctx).slice(-3).join(' | '));
});

test('rubber duck in the fountain', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    let fountain = null;
    for (const k in G.map) if (G.map[k].entity && G.map[k].entity.name == 'Fountain') fountain = G.map[k].entity;
    if (!fountain) {
        const k = Object.keys(G.map).find(k => G.map[k].passable && !G.map[k].entity && !G.map[k].mess);
        const [x, y] = k.split(',').map(Number);
        fountain = ctx.GetEntity('Fountain', x, y);
    }
    assert.ok(ctx.DayEvents.eligible('rubberDuck'));
    ctx.DayEvents.run('rubberDuck');
    assert.ok(/rubber duck/.test(fountain.describe()), fountain.describe());
});

test('bones: a previous hero haunts the lounge', () => {
    const ctx = cleaningDay();
    ctx.Game.day = 3;
    ctx.Game.pastHeroes = [{ full: 'Chad the Bard', cls: 'Bard' }];
    assert.ok(ctx.DayEvents.eligible('bones'));
    ctx.DayEvents.run('bones');
    const g = visitors(ctx)[0];
    assert.equal(g.name, 'Ghost of Chad the Bard');
    assert.equal(g.char, 'G');
    assert.ok(/killed by/i.test(convoText(g.convos[g.convos.length - 1])));
});

test('Rodney visits from day 4', () => {
    const ctx = cleaningDay();
    ctx.Game.day = 3;
    assert.ok(!ctx.DayEvents.eligible('rodney'));
    ctx.Game.day = 4;
    assert.ok(ctx.DayEvents.eligible('rodney'));
    ctx.DayEvents.run('rodney');
    const r = visitors(ctx)[0];
    assert.ok(/Rodney/.test(r.name));
    assert.ok(/Amulet/.test(convoText(r.convos[r.convos.length - 1])));
});

test('visitors leave before the next invasion', () => {
    const ctx = cleaningDay();
    ctx.DayEvents.run('inspector');
    const v = visitors(ctx)[0];
    ctx.Game.nextDay();
    assert.equal(visitors(ctx).length, 0);
    for (const k in ctx.Game.map) assert.notEqual(ctx.Game.map[k].entity, v);
    assert.ok(!ctx.Invasion.roster.includes(v));
});

test('past heroes are remembered', () => {
    const ctx = cleaningDay();
    assert.equal(ctx.Game.pastHeroes.length, 1);
    assert.equal(ctx.Game.pastHeroes[0].full, ctx.Invasion.hero.full);
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

test('visitors are never asked to coffee or dinner', () => {
    const ctx = cleaningDay();
    ctx.DayEvents.run('inspector');
    const v = ctx.Game.monsterList.find(m => m.tags.visitor);
    ctx.Game.messNumbers = [0, 100];
    for (let i = 0; i < 300; i++) {
        ctx.Game.coffeeThreshold = -1;
        ctx.Game.cleanPercent();
    }
    assert.equal(v.quests.length, 0);
});

test("the ghost is a previous day's hero, never tonight's", () => {
    const ctx = toIntro(bootHeadless({ begin: true }));
    let seen = null;
    const real = ctx.DayEvents.start.bind(ctx.DayEvents);
    ctx.DayEvents.start = () => { seen = ctx.Game.pastHeroes.map(h => h.full); return real(); };
    ctx.Invasion.instant = true;
    for (let i = 0; i < 6 && ctx.Game.phase != 'cleaning'; i++) ctx.__press(13);
    assert.deepEqual(seen, [], 'tonight\'s hero is not a past hero yet');
    assert.equal(ctx.Game.pastHeroes.length, 1, 'remembered afterwards');
});

test('visitors never found the union', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.unionist = null;
    const orig = ctx.RandomName;
    ctx.RandomName = () => 'Marx';
    try {
        new ctx.Entity(G.player.x, G.player.y, 'V', '#fff', 'Visitor', 1, { monster: true, visitor: true }, 1);
    } finally {
        ctx.RandomName = orig;
    }
    assert.strictEqual(G.unionist, null);
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

test('a visitor who finds the lounge full never came: no news, no verdict', () => {
    for (const name of ['inspector', 'rodney']) {
        const ctx = cleaningDay();
        ctx.Game.day = 4;
        ctx.Visitors.freeLoungeTile = () => null; // every seat taken
        const before = ctx.Game.log.lines.length;
        assert.strictEqual(ctx.DayEvents.run(name), false);
        assert.strictEqual(ctx.Game.todayEvent, null, name);
        assert.strictEqual(ctx.Game.log.lines.length, before, name + ' sent no news');
    }
});

test('Gribble stays at HR when there is no room in the lounge', () => {
    const ctx = cleaningDay();
    ctx.Game.day = 2;
    ctx.Visitors.freeLoungeTile = () => null;
    ctx.DayEvents.run('intern');
    assert.strictEqual(ctx.Game.todayEvent, null);
    assert.strictEqual(ctx.DayEvents.intern, null);
});

test('every event is registered once, in a fixed order, with eligible and run', () => {
    const ctx = cleaningDay();
    const E = ctx.DayEvents.EVENTS;
    assert.deepStrictEqual(Array.from(E), ['inspector', 'birthday', 'mimicStain', 'rubberDuck', 'bones', 'rodney',
        'flood', 'dragon', 'intern', 'guest', 'monkey', 'diceNight', 'leak']);
    for (const name of E) {
        const h = ctx.DayEvents.HANDLERS[name];
        assert.strictEqual(typeof h.eligible, 'function', name);
        assert.strictEqual(typeof h.run, 'function', name);
    }
    assert.strictEqual(ctx.DayEvents.eligible('nonsense'), false);
});

test("yesterday's puddle is not tracked into a fresh morning", () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.player.spreading = 'Blood';
    G.player.spreadCount = 6;
    ctx.DayEvents.start();
    assert.strictEqual(G.player.spreading, null);
    assert.strictEqual(G.player.spreadCount, 0);
});
