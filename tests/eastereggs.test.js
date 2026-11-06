const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro, strip } = require('./harness');

const KONAMI = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];

function cleaningDay(seed = 1234) {
    const ctx = toIntro(bootHeadless({ seed, begin: true }));
    ctx.Invasion.instant = true;
    for (let i = 0; i < 6 && ctx.Game.phase != 'cleaning'; i++) ctx.__press(13);
    // skip the welcome cutscene: the player holds the keyboard
    ctx.Game.player.talking = null;
    for (let i = ctx.__listeners.length - 1; i >= 0; i--) {
        if (ctx.__listeners[i].fn instanceof ctx.Entity) ctx.__listeners.splice(i, 1);
    }
    assert.ok(ctx.__listeners.some(l => l.fn === ctx.Game.player), 'player is listening');
    return ctx;
}

function key(ctx, ch) {
    if (ch == '#') return ctx.__pressEvent({ keyCode: 51, key: '#', shiftKey: true });
    if (ch == '\n') return ctx.__pressEvent({ keyCode: 13, key: 'Enter' });
    if (ch == ' ') return ctx.__pressEvent({ keyCode: 32, key: ' ' });
    return ctx.__pressEvent({ keyCode: ch.toUpperCase().charCodeAt(0), key: ch });
}

function type(ctx, str) {
    for (const ch of str) key(ctx, ch);
}

function last(ctx) {
    const l = ctx.Game.log.lines;
    return strip(l[l.length - 1].text);
}

test('#xyzzy: nothing happens', () => {
    const ctx = cleaningDay();
    type(ctx, '#xyzzy\n');
    assert.equal(last(ctx), 'Nothing happens.');
    assert.equal(ctx.EasterEggs.prompt, null);
});

test('#pray works once a day', () => {
    const ctx = cleaningDay();
    type(ctx, '#pray\n');
    assert.equal(last(ctx), 'You feel a hopeful feeling. The bucket refills.');
    type(ctx, '#pray\n');
    assert.equal(last(ctx), 'You feel that the Mop God is displeased.');
});

test('#name names the mop and it is remembered', () => {
    const ctx = cleaningDay();
    type(ctx, '#name Excalibroom\n');
    assert.equal(last(ctx), 'You call your mop: Excalibroom.');
    assert.equal(ctx.__storage['rj-mop'], 'Excalibroom');
    assert.equal(ctx.EasterEggs.mopName(), 'Excalibroom');
    // mop something with the named mop
    const p = ctx.Game.player;
    const G = ctx.Game;
    const k = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => (p.x + dx) + ',' + (p.y + dy))
        .find(k => G.map[k] && G.map[k].passable && G.map[k].entity == null);
    for (const kk in G.map) if (G.map[kk].mess && Math.abs(G.map[kk].mess.x - p.x) <= 1 && Math.abs(G.map[kk].mess.y - p.y) <= 1) G.map[kk].mess = null;
    const [x, y] = k.split(',').map(Number);
    ctx.makeMess(x, y, 'Water');
    ctx.Flavor.chance = () => true;
    p.clean('mop');
    assert.ok(ctx.Game.log.lines.some(l => strip(l.text) == 'You swish Excalibroom.'));
});

test('typing in the prompt does not toggle music, sound or zoom', () => {
    const ctx = cleaningDay();
    const music = ctx.Music.enabled, sound = ctx.Sfx.enabled, font = ctx.Game.fontSize;
    type(ctx, '#tv');
    ctx.__pressEvent({ keyCode: 107, key: '+' });
    ctx.__pressEvent({ keyCode: 48, key: '0' });
    assert.equal(ctx.Music.enabled, music);
    assert.equal(ctx.Sfx.enabled, sound);
    assert.equal(ctx.Game.fontSize, font);
    assert.equal(ctx.EasterEggs.prompt, 'tv+0');
});

test('unknown command suggests #pray', () => {
    const ctx = cleaningDay();
    type(ctx, '#moonwalk\n');
    assert.equal(last(ctx), 'Unknown extended command. (Try #pray.)');
});

test('Esc closes the prompt without running anything', () => {
    const ctx = cleaningDay();
    const n = ctx.Game.log.lines.length;
    type(ctx, '#xyzzy');
    ctx.__pressEvent({ keyCode: 27, key: 'Escape' });
    assert.equal(ctx.EasterEggs.prompt, null);
    assert.equal(ctx.Game.log.lines.length, n);
});

test('the prompt is shown while typing', () => {
    const ctx = cleaningDay();
    type(ctx, '#pr');
    ctx.Game.drawMap();
    const shown = ctx.__drawn.filter(d => d.text).map(d => strip(d.text)).join('\n');
    assert.ok(shown.includes('# pr_'), shown.slice(-200));
});

test('prompt swallows game keys and works with AltGr', () => {
    const ctx = cleaningDay();
    const p = ctx.Game.player;
    const at = [p.x, p.y];
    ctx.__pressEvent({ keyCode: 51, key: '#', ctrlKey: true, altKey: true });
    assert.equal(ctx.EasterEggs.prompt, '');
    const turns = ctx.Game.shift.cleaned;
    type(ctx, 'mhjkl');
    assert.deepEqual([p.x, p.y], at, 'did not move');
    assert.equal(ctx.Game.shift.cleaned, turns, 'did not mop');
    assert.equal(ctx.EasterEggs.prompt, 'mhjkl');
});

test('prompt closes when a conversation starts', () => {
    const ctx = cleaningDay();
    type(ctx, '#pra');
    const n = ctx.Game.log.lines.length;
    ctx.Game.player.talking = ctx.Game.monsterList[0];
    ctx.Game.drawMap();
    assert.equal(ctx.EasterEggs.prompt, null);
    assert.equal(ctx.Game.log.lines.length, n);
});

test('Q asks, y tells the union joke, n is a good choice', () => {
    const ctx = cleaningDay();
    key(ctx, 'q');
    assert.equal(last(ctx), 'Really quit? And leave the mess for the next janitor? [yn]');
    const p = ctx.Game.player;
    const at = [p.x, p.y];
    key(ctx, 'y');
    assert.equal(last(ctx), "You can't. Your shift isn't over. (Union rules.)");
    assert.deepEqual([p.x, p.y], at, 'y did not move the player');
    key(ctx, 'q');
    key(ctx, 'n');
    assert.equal(last(ctx), 'Good choice.');
    type(ctx, '#quit\n');
    assert.equal(last(ctx), 'Really quit? And leave the mess for the next janitor? [yn]');
});

test('Konami code', () => {
    const ctx = cleaningDay();
    for (const code of KONAMI) {
        ctx.__pressEvent({ keyCode: code, key: code == 66 ? 'b' : code == 65 ? 'a' : 'Arrow' });
    }
    assert.ok(ctx.Game.log.lines.some(l => /30 extra lives/.test(strip(l.text))));
    assert.equal(ctx.EasterEggs.tried.konami, true);
});

test('colleagues hint at easter eggs, never the same twice a day', () => {
    const ctx = cleaningDay();
    ctx.Flavor.chance = () => true;
    const all = [].concat(...Object.values(ctx.Lore.hints));
    const seen = [];
    for (const m of ctx.Game.monsterList.slice(0, 6)) {
        ctx.ConversationBuilder.buildConvos(m);
        const hint = m.convos.map(c => c[0] && c[0].text).find(t => all.includes(t));
        assert.ok(hint, m.name + ' hints');
        assert.ok(!seen.includes(hint), 'repeated: ' + hint);
        seen.push(hint);
    }
});

test('tried eggs are hinted less', () => {
    const ctx = cleaningDay();
    ctx.EasterEggs.tried.pray = true;
    const w = ctx.EasterEggs.hintWeights();
    assert.equal(w.pray, 0.25);
    assert.equal(w.xyzzy, 1);
    for (const k in ctx.Lore.hints) assert.ok(ctx.Lore.hints[k].length >= 2, k);
});

test('a hint never hides a colleague request', () => {
    let checked = 0;
    for (const seed of [1234, 1, 2, 3, 4, 5]) {
    const ctx = cleaningDay(seed);
    ctx.Flavor.chance = () => true;
    ctx.Requests.CHANCE = 1;
    const hints = [].concat(...Object.values(ctx.Lore.hints));
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

test('#pray is per run: a new run may pray again on the same day number', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.run.prayedDay = G.day; // already prayed today, in the last run
    G.run = G.freshRun();
    assert.strictEqual(G.run.prayedDay, -1);
});
