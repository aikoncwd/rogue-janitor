const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro } = require('./harness');

function cleaning(seed = 1234) {
    const ctx = toIntro(bootHeadless({ seed, begin: true }));
    ctx.Invasion.instant = true;
    ctx.__press(13);
    while (ctx.Game.player.talking) ctx.Game.player.talking.cancelConvo();
    return ctx;
}

// Walks the exit cutscene up to the first node with a scene and puts it on screen.
function showFirstScene(ctx, want) {
    const G = ctx.Game;
    const m = G.monsterList.find(x => x.alive && x.retired);
    const convo = ctx.ConversationBuilder.exitPrompt();
    const idx = convo.findIndex(n => n.scene === want);
    assert.ok(idx > 0, 'exit cutscene has a ' + want + ' scene');
    m.convos.push(convo);
    m.convoIndex = m.convos.length - 1;
    m.convoInnerDex = idx;
    G.player.talking = m;
    G.drawMap();
    return convo[idx];
}

test('day 1 is a small dungeon and later days follow the room table', () => {
    for (const seed of [1, 2, 3]) {
        const ctx = bootHeadless({ seed });
        const G = ctx.Game;
        G.generateDungeon();
        assert.equal(G.rooms.length, G.DAY_ROOMS[0], 'day 1 rooms');
        for (let d = 2; d <= 5; d++) {
            ctx.Invasion.instant = true;
            G.nextDay();
            assert.equal(G.dungeonRooms, G.DAY_ROOMS[d - 1], 'day ' + d);
        }
    }
});

test('every night plan has its own animated ASCII scene', () => {
    const ctx = bootHeadless();
    const S = ctx.Scenes;
    assert.equal(S.forPlan('dinner'), 'dinner');
    assert.equal(S.forPlan('drinks'), 'drinks');
    assert.equal(S.forPlan('dancing'), 'dancing');
    assert.equal(S.forPlan("Grr's barbeque"), 'bbq');
    for (const name of ['dinner', 'drinks', 'dancing', 'bbq', 'home', 'sleep']) {
        const frames = S.art[name].frames;
        assert.ok(frames.length >= 2, name + ' animates');
        for (const f of frames) assert.equal(f.length, frames[0].length, name + ' frames share a height');
    }
});

test('a night in shows the home scene with the janitor, then animates', () => {
    const ctx = cleaning();
    ctx.Game.convoTags.invitationAccepted = false;
    showFirstScene(ctx, 'home');
    const at = ctx.__drawn.filter(d => d.ch === '@');
    assert.ok(at.length === 1 && at[0].fg === '#ff0', 'janitor drawn once');
    const before = ctx.__drawn.length;
    ctx.__runTimers();
    assert.ok(ctx.__drawn.length > before, 'next frame drawn');
    assert.ok(ctx.Scenes.current.frame === 1);
});

test('going out casts the comrade who invited you in the scene', () => {
    const ctx = cleaning();
    const G = ctx.Game;
    const host = G.monsterList.filter(x => x.alive).slice(-1)[0];
    G.convoTags.invitationAccepted = true;
    G.convoTags.dinnerPlan = 'dancing';
    G.convoTags.dinnerHost = host.name;
    showFirstScene(ctx, 'dancing');
    assert.equal(ctx.Scenes.current.cast[0].char, host.char);
    assert.ok(ctx.__drawn.some(d => d.ch === host.char && d.fg === host.color));
});

test('the scene stops animating once the cutscene moves on', () => {
    const ctx = cleaning();
    ctx.Game.convoTags.invitationAccepted = false;
    showFirstScene(ctx, 'home');
    ctx.Game.player.talking.cancelConvo();
    ctx.__runTimers();
    assert.equal(ctx.Scenes.current, null);
    assert.equal(ctx.Scenes.timer, null);
});

test('comrades with a quest to give blink with a "!" on their own tile until you take it', () => {
    const ctx = cleaning();
    const G = ctx.Game;
    for (const t of Object.values(G.map)) t.visible = true;
    const m = G.monsterList.find(x => x.alive && x.retired && !G.hasQuestToGive(x));
    assert.ok(m);
    const cam = () => G.cameraTarget();
    const glyphAt = (bang) => {
        const real = Date.now;
        ctx.Date.now = () => (bang ? 1 : 0) * G.QUEST_BLINK_MS;
        G.drawMap();
        ctx.Date.now = real;
        const x = m.x - cam().x + G.offset[0], y = m.y - cam().y + G.offset[1];
        return ctx.__drawn.filter(d => d.x === x && d.y === y && d.ch).pop();
    };
    assert.equal(glyphAt(true).ch, m.char, 'no quest: no marker');

    // a favour on offer
    m.convos.push([{ text: 'Could you…', y: 1, n: 2, tags: { offerSeen: true } }]);
    assert.ok(G.hasQuestToGive(m));
    assert.equal(glyphAt(true).ch, '!');
    assert.equal(glyphAt(true).fg, '#ff0');
    assert.equal(glyphAt(false).ch, m.char, 'blinks back to the monster');
    m.convoTags.offerSeen = true; // you heard the request
    assert.ok(!G.hasQuestToGive(m));
    assert.equal(glyphAt(true).ch, m.char);

    // a lost item
    m.questItem = { pickedUp: false };
    assert.ok(G.hasQuestToGive(m));
    m.convoTags.questHeard = true;
    assert.ok(!G.hasQuestToGive(m), 'gone once they told you');
});

test('hearing the lost-item line or a favour offer clears the marker', () => {
    const ctx = cleaning();
    const conv = [];
    const m = ctx.Game.monsterList.find(x => x.alive);
    m.questItemName = 'hat';
    ctx.ConversationBuilder.searchQuestConvo(conv, m);
    assert.equal(conv[0][0].tags.questHeard, true);
});

test('a lost item you were told about is listed under REQUESTS until you hand it back', () => {
    const ctx = cleaning();
    const G = ctx.Game;
    const strip = s => s.replace(/%c\{[^}]*\}/g, '');
    const m = G.monsterList.find(x => x.alive && x.retired);
    m.questItem = { pickedUp: false };
    m.questItemName = 'favourite hat';
    const text = () => ctx.Panel.lines('cleaning', 70).map(strip).join('\n');
    assert.ok(!/Favourite hat/.test(text()), 'not before they tell you');
    m.convoTags.questHeard = true;
    assert.match(text(), /REQUESTS/);
    assert.match(text(), /Favourite hat +lost/);
    m.questItem.pickedUp = true;
    assert.match(text(), /Favourite hat +found!/);
    m.convoTags.questItemSuccess = true;
    assert.ok(!/Favourite hat/.test(text()), 'gone once handed back');
    for (const l of ctx.Panel.lines('cleaning', 70)) assert.ok(strip(l).length <= ctx.Panel.WIDTH - 1, l);
});
