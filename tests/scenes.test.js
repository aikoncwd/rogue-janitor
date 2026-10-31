const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless } = require('./harness');

function cleaning(seed = 1234) {
    const ctx = bootHeadless({ seed, begin: true });
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

test('day 1 is a small dungeon and every new day adds one or two rooms', () => {
    for (const seed of [1, 2, 3]) {
        const ctx = bootHeadless({ seed });
        const G = ctx.Game;
        G.generateDungeon();
        assert.equal(G.rooms.length, G.DAY1_ROOMS, 'day 1 rooms');
        let prev = G.dungeonRooms;
        for (let d = 2; d <= 12; d++) {
            ctx.Invasion.instant = true;
            G.nextDay();
            const grew = G.dungeonRooms - prev;
            assert.ok(grew >= 1 && grew <= 2 || G.dungeonRooms == G.MAX_ROOMS, `day ${d} grew ${grew}`);
            assert.ok(G.dungeonRooms <= G.MAX_ROOMS);
            prev = G.dungeonRooms;
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

test('comrades with a favour or a lost item get a "!" above them', () => {
    const ctx = cleaning();
    const G = ctx.Game;
    const lounge = G.monsterList.filter(x => x.alive && x.retired);
    for (const t of Object.values(G.map)) t.visible = true;
    const m = lounge.find(x => !x.questItem && !(x.convoTags.request));
    assert.ok(m);
    G.player.moveTo(m.x, m.y + 2);
    const bangAt = () => {
        G.drawMap();
        const cam = G.cameraTarget();
        return ctx.__drawn.filter(d => d.ch === '!' && d.x === m.x - cam.x + G.offset[0] && d.y === m.y - 1 - cam.y + G.offset[1]);
    };
    const above = G.map[m.x + ',' + (m.y - 1)];
    if (above.entity) above.entity = null;
    assert.equal(G.questMarker(m), null);
    m.convoTags.request = 'cobwebs';
    assert.ok(G.questMarker(m));
    const shown = bangAt();
    assert.equal(shown.length, 1);
    assert.equal(shown[0].fg, ctx.Requests.isDone(m) ? '#0f0' : '#ff0');
    m.convoTags.requestThanked = true;
    assert.equal(G.questMarker(m), null);
    assert.equal(bangAt().length, 0);
    m.questItem = { pickedUp: false };
    assert.equal(G.questMarker(m), '#ff0');
    m.questItem.pickedUp = true;
    assert.equal(G.questMarker(m), '#0f0', 'green once you found it');
});
