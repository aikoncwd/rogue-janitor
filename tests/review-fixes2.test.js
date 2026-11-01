const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro } = require('./harness');

const strip = s => s.replace(/%c\{[^}]*\}/g, '');

function cleaningDay(seed = 1234) {
    const ctx = toIntro(bootHeadless({ seed, begin: true }));
    ctx.Invasion.instant = true;
    for (let i = 0; i < 6 && ctx.Game.phase != 'cleaning'; i++) ctx.__press(13);
    ctx.Game.player.talking = null;
    for (let i = ctx.__listeners.length - 1; i >= 0; i--) {
        if (ctx.__listeners[i].fn instanceof ctx.Entity) ctx.__listeners.splice(i, 1);
    }
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

test('a hint never hides a colleague request', () => {
    const ctx = cleaningDay();
    ctx.Flavor.chance = () => true;
    ctx.Requests.CHANCE = 1;
    const hints = [].concat(...Object.values(ctx.Lore.hints));
    let checked = 0;
    for (const m of ctx.Game.monsterList.filter(m => m.alive && !m.tags.visitor)) {
        m.metPlayer = true;
        ctx.ConversationBuilder.buildConvos(m);
        const iHint = m.convos.findIndex(c => c[0] && hints.includes(c[0].text));
        const iOffer = m.convos.findIndex(c => c[0] && c[0].tags && 'offerSeen' in c[0].tags);
        if (iHint >= 0 && iOffer >= 0) {
            assert.ok(iHint < iOffer, 'the offer is heard first');
            checked++;
        }
    }
    assert.ok(checked > 0, 'at least one colleague had both');
});

test('# does nothing on the help screen or while examining', () => {
    const ctx = cleaningDay();
    ctx.Game.player.instructions = true;
    ctx.__pressEvent({ keyCode: 51, key: '#' });
    assert.equal(ctx.EasterEggs.prompt, null, 'help screen');
    ctx.Game.player.instructions = false;
    ctx.Game.player.examining = [ctx.Game.player.x, ctx.Game.player.y];
    ctx.__pressEvent({ keyCode: 51, key: '#' });
    assert.equal(ctx.EasterEggs.prompt, null, 'examine mode');
});

test('funny names keep their capitals in messages', () => {
    const ctx = cleaningDay();
    const p = ctx.Game.player;
    const G = ctx.Game;
    for (const k in G.map) if (G.map[k].mess && Math.abs(G.map[k].mess.x - p.x) <= 1 && Math.abs(G.map[k].mess.y - p.y) <= 1) G.map[k].mess = null;
    const k = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => (p.x + dx) + ',' + (p.y + dy))
        .find(k => G.map[k] && G.map[k].passable && G.map[k].entity == null);
    const [x, y] = k.split(',').map(Number);
    ctx.makeVariant(x, y, 'DroppedSword', 'Excalibur (rental)');
    p.clean('get');
    const text = G.log.lines.map(l => strip(l.text)).join('\n');
    assert.ok(text.includes('You pick up the Excalibur (rental).'), text.slice(-200));
    // plain messes are still lower case
    ctx.makeMess(x, y, 'EmptyMug').name = 'Empty Coffee Mug';
    G.map[k].mess.desc = null;
    p.clean('get');
    assert.ok(G.log.lines.some(l => strip(l.text) == 'You pick up the empty coffee mug.'));
});

test('Elbereth reads well while being scrubbed', () => {
    const ctx = cleaningDay();
    const p = ctx.Game.player;
    const G = ctx.Game;
    let wall = null;
    for (const k in G.map) {
        const t = G.map[k];
        if (!t.passable || t.entity != null || t.door != null || wall) continue;
        const [x, y] = k.split(',').map(Number);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const w = G.map[(x + dx) + ',' + (y + dy)];
            if (w && !w.passable && w.char == '#' && w.mess == null && w.entity == null && w.door == null && w.secretDoor == null) {
                G.map[p.x + ',' + p.y].entity = null;
                p.x = x; p.y = y; t.entity = p;
                wall = [x + dx, y + dy];
                break;
            }
        }
    }
    assert.ok(wall, 'found a wall');
    for (const k in G.map) if (G.map[k].mess && Math.abs(G.map[k].mess.x - p.x) <= 1 && Math.abs(G.map[k].mess.y - p.y) <= 1) G.map[k].mess = null;
    const m = ctx.makeMess(wall[0], wall[1], 'Graffiti');
    m.name = ctx.ELBERETH_NAME; m.elbereth = true;
    p.clean('mop');
    const line = strip(G.log.lines[G.log.lines.length - 1].text);
    assert.ok(line.startsWith('You scrub the Elbereth engraving.'), line);
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
