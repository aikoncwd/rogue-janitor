const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless } = require('./harness');

function dungeon() {
    const ctx = bootHeadless();
    ctx.Game.generateDungeon();
    return ctx;
}

const DYWYPI = 'Do you want your mess identified? [ynq]';

test('exit prompt shows the plaque before the report', () => {
    const ctx = dungeon();
    const nodes = ctx.ConversationBuilder.exitPrompt();
    const i = nodes.findIndex(n => /Shift report/.test(n.message));
    assert.ok(i > 0, 'report found');
    assert.equal(nodes[i - 1].scene, 'plaque');
    assert.equal(nodes[i - 1].message, DYWYPI);
    assert.ok('plaque' in ctx.Scenes.art);
});

test('the plaque names the day, the score and a funny cause', () => {
    const ctx = dungeon();
    ctx.Game.day = 3;
    ctx.Game.cleanPercent = () => 87;
    const text = ctx.Game.plaqueLines().join('\n');
    assert.ok(text.includes('DAY 3'), text);
    assert.ok(text.includes('cleaned 87%'), text);
    assert.ok(text.includes('YOUR BACK'), text);
    assert.ok(/killed by:/.test(text));
    const cause = ctx.Lore.killedBy.find(c => c.split(' ').every(w => text.includes(w)));
    assert.ok(cause, text);
});

test('the plaque is a clean rectangle', () => {
    const ctx = dungeon();
    for (let i = 0; i < 20; i++) {
        const lines = ctx.Game.plaqueLines();
        const w = lines[0].length;
        assert.ok(lines.every(l => l.length == w), lines.join('\n'));
        const k = lines.findIndex(l => l.includes('killed by:'));
        for (let j = k + 1; j < lines.length && /[a-z]/i.test(lines[j]); j++) {
            assert.ok(lines[j].replace(/^[|\s]+|[|\s]+$/g, '').length <= 16, lines[j]);
        }
    }
});

test('literal scenes keep digits and @ as text', () => {
    const ctx = dungeon();
    ctx.Scenes.setPlaque(ctx.Game.plaqueLines());
    ctx.Scenes.current = { name: 'plaque', node: null, frame: 0, cast: [{ char: 'k', color: '#f00' }, { char: 'g', color: '#0f0' }, { char: 'O', color: '#00f' }] };
    assert.equal(ctx.Scenes.cell(ctx.Scenes.art.plaque, '3', 0, 0, 0)[0], '3');
    assert.equal(ctx.Scenes.cell(ctx.Scenes.art.plaque, '@', 0, 0, 0)[0], '@');
    assert.equal(ctx.Scenes.art.plaque.frames.length, 2);
});

test('only the flowers are pink, not the comma in PEACE,', () => {
    const ctx = dungeon();
    const lines = ctx.Game.plaqueLines();
    ctx.Scenes.setPlaque(lines);
    const art = ctx.Scenes.art.plaque;
    const row = lines.findIndex(l => l.includes('PEACE,'));
    assert.equal(ctx.Scenes.cell(art, ',', 0, row, 0)[1], '#ddd');
    const flowers = lines.findIndex(l => l.includes('*'));
    assert.equal(ctx.Scenes.cell(art, '*', 0, flowers, 0)[1], '#f8c');
    assert.equal(ctx.Scenes.cell(art, ',', 0, flowers, 1)[1], '#f8c');
});
