const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro } = require('./harness');

const boot = () => bootHeadless({ files: ['script/messagelog.js'], game: false });
const texts = lines => lines.map(l => l.text);

test('push dedupes consecutive identical text and refreshes it', () => {
    const ctx = boot();
    const log = new ctx.MessageLog();
    log.push('a');
    log.markStale();
    assert.equal(log.recent(5)[0].fresh, false);
    log.push('a');
    assert.equal(log.recent(5).length, 1);
    assert.equal(log.recent(5)[0].fresh, true);
});

test('recent returns oldest-first last n', () => {
    const ctx = boot();
    const log = new ctx.MessageLog();
    for (const t of 'abcdefg') log.push(t);
    assert.deepEqual(texts(log.recent(5)), ['c', 'd', 'e', 'f', 'g']);
});

test('trims to max', () => {
    const ctx = boot();
    const log = new ctx.MessageLog(3);
    for (const t of 'abcde') log.push(t);
    assert.deepEqual(texts(log.recent(10)), ['c', 'd', 'e']);
});

test('markStale and clear', () => {
    const ctx = boot();
    const log = new ctx.MessageLog();
    log.push('a'); log.push('b');
    log.markStale();
    assert.ok(log.recent(5).every(l => !l.fresh));
    log.clear();
    assert.equal(log.recent(5).length, 0);
});

function cleaning() {
    const ctx = toIntro(bootHeadless({ begin: true }));
    ctx.Invasion.instant = true;
    ctx.__press(13);
    while (ctx.Game.player.talking) ctx.Game.player.talking.cancelConvo();
    return ctx;
}

test('M-2: examine messages are transient and do not flood the log', () => {
    const ctx = cleaning();
    const G = ctx.Game;
    G.log.push('Keep me');
    const before = G.log.lines.length;
    ctx.__press(88); // X: examine
    for (const k of [39, 39, 40, 40, 37, 38]) ctx.__press(k);
    assert.equal(G.log.lines.length, before, 'no examine lines added to the log');
    const logRows = ctx.__drawn.filter(d => d.text && d.y >= G.layoutInfo.logY).map(d => d.text).join('\n');
    assert.ok(/Floor|Wall|door|staircase|You can't see|the |It's you/.test(logRows), 'current examine text is shown');
    assert.ok(logRows.includes('Keep me'));
    ctx.__press(27); // leave examine
    const after = ctx.__drawn.filter(d => d.text && d.y >= G.layoutInfo.logY).map(d => d.text).join('\n');
    assert.ok(!/Floor\.|Wall\./.test(after), 'examine text disappears when examine ends');
});

test('the test display flags text that rot.js would wrap', () => {
    const ctx = bootHeadless();
    ctx.Game.display.drawText(0, 0, '%c{#fff}hello world%c{}', 5);
    assert.strictEqual(ctx.__overflows.length, 1);
    ctx.Game.display.drawText(0, 0, '%c{#fff}hello%c{}', 5);
    assert.strictEqual(ctx.__overflows.length, 1);
});

test('the test window ignores a listener added twice, like a browser', () => {
    const ctx = bootHeadless();
    const fn = () => {};
    const before = ctx.__listeners.length;
    ctx.window.addEventListener('keydown', fn);
    ctx.window.addEventListener('keydown', fn);
    assert.strictEqual(ctx.__listeners.length, before + 1);
});
