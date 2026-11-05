const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro } = require('./harness');

const KEY = { ENTER: 13, SPACE: 32, ESC: 27, TAB: 9, UP: 38, DOWN: 40, PGUP: 33, PGDN: 34, HOME: 36, END: 35 };
const plain = s => s.replace(/%c\{[^}]*\}/g, '');

function invading(seed = 1234) {
    const ctx = toIntro(bootHeadless({ seed, begin: true, paused: true }));
    ctx.__press(KEY.ENTER);
    assert.equal(ctx.Game.phase, 'invasion');
    return ctx;
}

function finishHandover(ctx) {
    for (let i = 0; i < 20 && ctx.Game.phase != 'cleaning'; i++) ctx.__press(KEY.ENTER);
}

// Watches the whole night at normal speed, timer by timer.
function watchAll(ctx) {
    ctx.__press(KEY.SPACE);
    for (let i = 0; i < 2000 && ctx.Game.phase == 'invasion' && ctx.Invasion.stage == null; i++) ctx.__runTimers();
    finishHandover(ctx);
    assert.equal(ctx.Game.phase, 'cleaning');
}

// --- The transcript ---

test('the transcript keeps every line the night said, with the camera clock', () => {
    const ctx = invading();
    const logged = [];
    const push = ctx.Game.log.push.bind(ctx.Game.log);
    let morning = false; // the morning lines belong to the message bar, not the tape
    const finish = ctx.Invasion.finish.bind(ctx.Invasion);
    ctx.Invasion.finish = () => { morning = true; finish(); };
    ctx.Game.log.push = t => { if (ctx.Game.phase == 'invasion' && !morning) logged.push(t); push(t); };
    watchAll(ctx);
    const tr = ctx.Invasion.transcript;
    assert.ok(tr.length > 10, String(tr.length));
    for (const e of tr) assert.match(e.clock, /^\d\d:\d\d [AP]M$/);
    const texts = tr.map(e => e.text);
    for (const t of logged) assert.ok(texts.includes(t), 'missing from the transcript: ' + plain(t));
    // clocks never go backwards
    const mins = tr.map(e => { const [h, m] = e.clock.split(/[: ]/); return (+h % 12) * 60 + +m; });
    for (let i = 1; i < mins.length; i++) assert.ok(mins[i] >= mins[i - 1], 'clock order');
});

test('skipping still writes the transcript, but not the message bar', () => {
    const ctx = invading();
    const before = ctx.Game.log.lines.length;
    ctx.__press(KEY.ESC);
    const tr = ctx.Invasion.transcript;
    assert.ok(tr.length > 5, String(tr.length));
    // the bar only got the exit line, as before, and the transcript has it too
    const added = ctx.Game.log.lines.slice(before).map(l => l.text);
    assert.ok(added.length >= 1 && added.length <= 2, added.map(plain).join(' | '));
    assert.equal(tr[tr.length - 1].text, added[added.length - 1]);
    assert.ok(tr.length > added.length + 5);
});

test('the same night gives the same transcript watched, stepped or rewound', () => {
    const a = invading(7);
    watchAll(a);
    const b = invading(7);
    for (let i = 0; i < 30; i++) b.__press(39);
    b.__press(82); // rewind
    watchAll(b);
    assert.deepEqual(b.Invasion.transcript.map(e => e.clock + e.text), a.Invasion.transcript.map(e => e.clock + e.text));
});

// --- Wrapping ---

test('wrapColored keeps words, widths and colours', () => {
    const ctx = bootHeadless();
    const words = [];
    for (let i = 0; i < 30; i++) words.push('word' + i);
    const text = words.slice(0, 10).join(' ') + ' %c{#0ff}Sir Bob the Very Long Named Paladin of Doom%c{} ' + words.slice(10).join(' ');
    const lines = ctx.Ui.wrapColored(text, 30);
    assert.ok(lines.length > 3);
    for (const l of lines) assert.ok(ctx.Ui.plainLength(l) <= 30, l);
    assert.equal(lines.map(plain).join(' ').replace(/ +/g, ' '), plain(text));
    // a line that starts inside the coloured name reopens its colour
    const inside = lines.findIndex(l => plain(l).startsWith('Very') || plain(l).startsWith('Long') || plain(l).startsWith('Named') || plain(l).startsWith('Paladin') || plain(l).startsWith('of') || plain(l).startsWith('Doom'));
    assert.ok(inside > 0, lines.join('\n'));
    assert.ok(lines[inside].startsWith('%c{#0ff}'), lines[inside]);
    // and a word longer than the line is cut, not lost
    const long = ctx.Ui.wrapColored('x'.repeat(75), 30);
    assert.deepEqual(long.map(plain), ['x'.repeat(30), 'x'.repeat(30), 'x'.repeat(15)]);
});

test('log lines: clock first, hanging indent, nothing wider than the window', () => {
    const ctx = bootHeadless();
    ctx.Invasion.transcript = [
        { clock: '01:05 AM', text: 'Short line.' },
        { clock: '01:06 AM', text: '%c{#da6}Scummy McSavefile%c{} ' + 'does a very long and complicated thing '.repeat(6) },
    ];
    const lines = ctx.NightLog.lines(40);
    assert.equal(plain(lines[0]), '01:05 AM  Short line.');
    assert.ok(plain(lines[1]).startsWith('01:06 AM  Scummy'));
    assert.ok(lines.length >= 5);
    for (let i = 2; i < lines.length; i++) assert.ok(lines[i].startsWith(' '.repeat(10)), JSON.stringify(lines[i]));
    for (const l of lines) assert.ok(ctx.Ui.plainLength(l) <= 40, l);
});

// --- Tab during the shift ---

function cleaningDay(seed = 1234) {
    const ctx = invading(seed);
    ctx.__press(KEY.ESC);
    finishHandover(ctx);
    let n = 0;
    while (ctx.Game.player.talking && n++ < 50) { ctx.Game.player.talking.lastConvoChange = 0; ctx.__press(KEY.ENTER); }
    assert.equal(ctx.Game.phase, 'cleaning');
    assert.equal(ctx.Game.player.talking, null);
    return ctx;
}

function shown(ctx) {
    ctx.__drawn.length = 0;
    ctx.Game.drawMap();
    return ctx.__drawn.filter(d => d.text).map(d => plain(d.text)).join('\n');
}

test('Tab opens the security log in the shift, and Tab or Esc close it', () => {
    const ctx = cleaningDay();
    let prevented = false;
    ctx.__pressEvent({ keyCode: KEY.TAB, preventDefault() { prevented = true; } });
    assert.equal(ctx.NightLog.isOpen, true);
    assert.ok(prevented, 'the browser keeps its focus where it was');
    assert.ok(shown(ctx).includes('Security Log'));
    const p = ctx.Game.player;
    const at = p.x + ',' + p.y;
    ctx.__press(KEY.DOWN);
    ctx.__press(37);
    assert.equal(p.x + ',' + p.y, at, 'keys scroll the log, the janitor stays put');
    ctx.__press(KEY.TAB);
    assert.equal(ctx.NightLog.isOpen, false);
    ctx.__press(KEY.TAB);
    ctx.__press(KEY.ESC);
    assert.equal(ctx.NightLog.isOpen, false);
});

test('scroll keys move through the log', () => {
    const ctx = cleaningDay();
    ctx.__press(KEY.TAB);
    ctx.Game.drawMap();
    assert.equal(ctx.Ui.offsets.nightlog, 0);
    ctx.__press(KEY.END);
    const last = ctx.Ui.offsets.nightlog;
    assert.ok(last > 0 && isFinite(last), String(last));
    ctx.__press(KEY.PGUP);
    assert.ok(ctx.Ui.offsets.nightlog < last);
    ctx.__press(KEY.HOME);
    assert.equal(ctx.Ui.offsets.nightlog, 0);
    ctx.__press(KEY.DOWN);
    assert.equal(ctx.Ui.offsets.nightlog, 1);
});

test('Tab does nothing during the replay, a conversation or another window', () => {
    const r = invading();
    r.__press(KEY.TAB);
    assert.equal(r.NightLog.isOpen, false);
    const ctx = cleaningDay();
    ctx.Game.player.talking = ctx.Game.monsterList.find(m => m.alive && m.retired);
    ctx.__press(KEY.TAB);
    assert.equal(ctx.NightLog.isOpen, false);
    ctx.Game.player.talking = null;
    ctx.__press(73); // I: pockets
    assert.equal(ctx.Inventory.isOpen, true);
    ctx.__press(KEY.TAB); // switches the pockets tab instead
    assert.equal(ctx.NightLog.isOpen, false);
});

test('day 1: a comrade tells you about the tape and the Tab key', () => {
    const ctx = cleaningDay();
    const tips = ctx.Game.log.lines.filter(l => plain(l.text).includes('[Tab]'));
    assert.equal(tips.length, 1);
    const crew = ctx.Invasion.roster.filter(m => m.alive && m.retired);
    assert.ok(crew.some(m => plain(tips[0].text).includes(m.name)), plain(tips[0].text));
});

test('later days: sometimes a comrade comments on the tape', () => {
    for (const lucky of [true, false]) {
        const ctx = bootHeadless({ seed: 3 });
        ctx.Game.generateDungeon();
        ctx.Game.day = 2;
        ctx.Invasion.instant = true;
        ctx.Flavor.chance = () => lucky;
        ctx.Game.phase = 'invasion';
        ctx.Game.engine.start();
        const tips = ctx.Game.log.lines.filter(l => plain(l.text).includes('[Tab]'));
        assert.equal(tips.length, lucky ? 1 : 0, String(lucky));
        if (lucky) assert.ok(ctx.Flavor.pools.tapeComment.some(p => plain(tips[0].text).includes(plain(p).split('{monster}').pop().slice(0, 20))));
    }
});

test('the help lists Tab for the security log', () => {
    const ctx = bootHeadless();
    const rows = ctx.Game.helpLines().map(plain);
    assert.ok(rows.some(r => r.startsWith('Tab') && r.includes('security log')), rows.join('\n'));
});

test('tips use the comrade pools, each with {monster} and [Tab]', () => {
    const ctx = bootHeadless();
    for (const pool of ['tapeTip', 'tapeComment']) {
        const lines = ctx.Flavor.pools[pool];
        assert.ok(lines.length >= 3, pool);
        for (const l of lines) assert.ok(l.includes('{monster}') && l.includes('[Tab]'), l);
    }
});

test('Tab never sends the focus away from the game', () => {
    const tab = ctx => { let p = false; ctx.__pressEvent({ keyCode: KEY.TAB, preventDefault() { p = true; } }); return p; };
    const r = invading();
    assert.ok(tab(r), 'during the replay');
    const ctx = cleaningDay();
    ctx.Game.player.talking = ctx.Game.monsterList.find(m => m.alive && m.retired);
    assert.ok(tab(ctx), 'during a conversation');
    ctx.Game.player.talking = null;
    ctx.__press(191); // help
    assert.ok(tab(ctx), 'with the help open');
});

test('wand and staff lines fill in every placeholder', () => {
    const ctx = bootHeadless();
    for (let i = 0; i < 20; i++) {
        const line = ctx.Flavor.line('zap', { hero: 'Bob', wand: 'staff of frost', effect: 'Everything goes chilly.' });
        assert.ok(!/\{\w+\}/.test(line), line);
        assert.ok(line.includes('staff of frost') && line.includes('Everything goes chilly.'), line);
    }
    // placeholders nobody passed stay as they are (no "undefined")
    ctx.Flavor.pools.__t = ['{hero} and {nobody}'];
    assert.equal(ctx.Flavor.line('__t', { hero: 'Bob' }), 'Bob and {nobody}');
});

test('no line in the night log is left with a {placeholder}', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        const ctx = invading(seed);
        ctx.__press(KEY.ESC);
        for (const e of ctx.Invasion.transcript) assert.ok(!/\{\w+\}/.test(e.text), seed + ': ' + plain(e.text));
    }
});

test('the how-to screen teaches the camera controls and the log', () => {
    const ctx = bootHeadless();
    const text = ctx.Flavor.pools.howtoText.map(plain).join('\n');
    for (const k of ['[Space] play/pause', '[→] step', '[F] fast', '[R] rewind', '[Esc] skip', '[Tab]']) {
        assert.ok(text.includes(k), k);
    }
    assert.ok(!text.includes('fast-forward   '), 'the old Space line is gone');
    for (const l of ctx.Flavor.pools.howtoText) assert.ok(plain(l).length <= 64, plain(l));
});

test('the tape ends with the night, not with the morning lines', () => {
    const ctx = invading();
    watchAll(ctx);
    const tr = ctx.Invasion.transcript.map(e => plain(e.text));
    const morning = [ctx.Flavor.pools.shiftBegins, ctx.Flavor.pools.monstersGetUp].flat().map(plain);
    for (const t of tr.slice(-2)) assert.ok(!morning.includes(t), 'morning line on the tape: ' + t);
});

for (const size of [[100, 40], [60, 24], [50, 20], [34, 12], [24, 8]]) {
    test('windows stay inside a ' + size.join('x') + ' screen', () => {
        const ctx = bootHeadless({ seed: 1234, begin: true, size });
        toIntro(ctx);
        ctx.Invasion.instant = true;
        ctx.__press(13);
        ctx.Invasion.instant = false;
        let n = 0;
        while (ctx.Game.player.talking && n++ < 50) { ctx.Game.player.talking.lastConvoChange = 0; ctx.__press(13); }
        const [cols, rows] = ctx.Game.screenSize;
        const windows = {
            nightlog: () => ctx.NightLog.open(),
            help: () => { ctx.Game.player.instructions = true; },
            pockets: () => ctx.Inventory.openInv(),
            shop: () => ctx.Shop.openShop(),
        };
        for (const [name, open] of Object.entries(windows)) {
            open();
            ctx.__drawn.length = 0;
            ctx.__overflows.length = 0;
            ctx.Game.drawMap();
            const r = name == 'nightlog' ? ctx.Ui.window(ctx.NightLog.options()) : null;
            assert.deepStrictEqual(ctx.__overflows, [], name + ' wraps a line');
            for (const d of ctx.__drawn) {
                if (d.text == null) continue;
                assert.ok(d.x + d.width <= cols, name + ': "' + plain(d.text) + '" runs off the screen');
                assert.ok(d.y < rows, name + ' draws below the screen');
            }
            if (r) assert.ok(r.y + r.h <= rows, 'the log fits the screen');
            ctx.NightLog.close && ctx.NightLog.isOpen && ctx.NightLog.close();
            ctx.Game.player.instructions = false;
            ctx.Inventory.isOpen = false;
            ctx.Shop.isOpen = false;
        }
    });
}
