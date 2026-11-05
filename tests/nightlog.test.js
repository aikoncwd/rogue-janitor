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
    ctx.Game.log.push = t => { if (ctx.Game.phase == 'invasion') logged.push(t); push(t); };
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
