const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro } = require('./harness');

const strip = s => s.replace(/%c\{[^}]*\}/g, '');

function cleaningDay(seed = 1234) {
    const ctx = toIntro(bootHeadless({ seed, begin: true }));
    ctx.Invasion.instant = true;
    ctx.__press(13);
    ctx.Invasion.instant = false;
    let n = 0;
    while (ctx.Game.player.talking && n++ < 50) { ctx.Game.player.talking.lastConvoChange = 0; ctx.__press(13); }
    return ctx;
}

test('the minimap shows the player and explored rooms', () => {
    const ctx = cleaningDay();
    for (const t of Object.values(ctx.Game.map)) t.lastSeen = '.';
    const lines = ctx.Panel.minimapLines(23, 8).map(strip);
    assert.ok(lines.length <= 8 && lines.length >= 2);
    assert.ok(lines.every(l => l.length <= 23), JSON.stringify(lines));
    const all = lines.join('\n');
    assert.ok(all.includes('@'));
    assert.ok(/[░▒]/.test(all));
});

test('unexplored stays blank', () => {
    const ctx = cleaningDay();
    for (const t of Object.values(ctx.Game.map)) t.lastSeen = ' ';
    const all = ctx.Panel.minimapLines(23, 8).map(strip).join('');
    const marks = all.replace(/[ |]/g, '');
    assert.strictEqual(marks, '@');
});

test('minimap only when there is room', () => {
    const ctx = cleaningDay();
    for (const t of Object.values(ctx.Game.map)) t.lastSeen = '.';
    assert.ok(!/── MAP ──/.test(ctx.Panel.lines('cleaning', 30).map(strip).join('\n')));
    const tall = ctx.Panel.lines('cleaning', 80).map(strip).join('\n');
    assert.match(tall, /── MAP ──/);
    assert.match(tall, /\[T\] music/, 'hints still there');
});
