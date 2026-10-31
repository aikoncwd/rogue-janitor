const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless } = require('./harness');

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
