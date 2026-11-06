// Player feedback before the itch.io update: action keys 1/2/3 next to WASD, a
// party room that is never empty, a fuller first lounge, pets you can actually
// get in a 5-day run (with achievements), #dance, and louder secret rooms.
const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro, cleaningDay, strip } = require('./harness');

const lounge = G => G.monsterList.filter(m => m.alive && m.retired && !m.partying && !m.tags.visitor);
const party = G => G.monsterList.filter(m => m.alive && m.partying);
const lastLine = G => strip(G.log.lines[G.log.lines.length - 1].text);

// The next morning, straight to the lounge (no replay, no chats).
function nextMorning(ctx) {
    ctx.Game.nextDay();
    ctx.Invasion.clockIn();
    let n = 0;
    while (ctx.Game.player.talking && n++ < 60) { ctx.Game.player.talking.lastConvoChange = 0; ctx.__press(13); }
}

// Puts the janitor on a free floor tile inside room i.
function standIn(G, i) {
    const r = G.rooms[i];
    for (let x = r[0]; x <= r[2]; x++) {
        for (let y = r[1]; y <= r[3]; y++) {
            const t = G.map[x + ',' + y];
            if (t && t.passable && t.entity == null) {
                G.map[G.player.x + ',' + G.player.y].entity = null;
                G.player.x = x; G.player.y = y;
                t.entity = G.player;
                return [x, y];
            }
        }
    }
    throw new Error('no free tile in room ' + i);
}

function runCommand(ctx, cmd) {
    ctx.EasterEggs.run(cmd);
}

test('1, 2 and 3 mop, pick up and fix, like M, G and F', () => {
    const ctx = cleaningDay();
    const seen = [];
    ctx.Game.player.clean = verb => { seen.push(verb); return 0; };
    for (const code of [49, 50, 51, 77, 71, 70]) ctx.__press(code);
    assert.deepEqual(seen, ['mop', 'get', 'fix', 'mop', 'get', 'fix']);
});

test('the help lists the number keys', () => {
    const ctx = cleaningDay();
    const help = ctx.Game.helpLines().map(strip).join('\n');
    assert.match(help, /M or 1 +mop/);
    assert.match(help, /G\/P or 2 +pick up/);
    assert.match(help, /F\/R or 3 +fix/);
});

test('number keys nag during the replay instead of doing nothing', () => {
    const ctx = toIntro(bootHeadless({ begin: true }));
    for (const code of [49, 50, 51]) assert.ok(ctx.Invasion.NAG_KEYS.includes(code));
});

test('every morning has a full lounge and a party with people in it', () => {
    for (let seed = 1; seed <= 12; seed++) {
        const ctx = cleaningDay(seed);
        const G = ctx.Game;
        assert.ok(lounge(G).length >= 6, 'seed ' + seed + ' day 1 lounge: ' + lounge(G).length);
        assert.ok(party(G).length >= 3, 'seed ' + seed + ' day 1 party: ' + party(G).length);
        for (const m of party(G)) assert.equal(G.getRoomIndex(m.x, m.y), G.partyRoomID);
        nextMorning(ctx);
        assert.ok(lounge(G).length >= 6, 'seed ' + seed + ' day 2 lounge');
        assert.ok(party(G).length >= 3, 'seed ' + seed + ' day 2 party');
    }
});

test('the top-up only happens when few comrades were on shift', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    const before = G.monsterList.length;
    for (const m of G.monsterList) m.retired = false; // pretend everyone is coming
    while (G.monsterList.length < G.COMRADES_MIN) ctx.GetEntity('Goblin', G.player.x, G.player.y);
    const count = G.monsterList.length;
    assert.equal(G.topUpComrades(G.player.x + ',' + G.player.y), 0);
    assert.equal(G.monsterList.length, count);
    assert.ok(count >= before);
});

test('partygoers talk about the party', () => {
    const ctx = cleaningDay();
    const lines = ctx.ConversationBuilder.partyLines.map(l => l[0]);
    for (const m of party(ctx.Game)) {
        const texts = m.convos.map(c => c[0].text);
        assert.ok(texts.some(t => lines.includes(t)), m.name + ' has a party line');
    }
});

test('the welcome to the party room mentions #dance', () => {
    const ctx = cleaningDay();
    const m = party(ctx.Game)[0];
    const welcome = m.convos.find(c => /Secret Party room/.test(c[0].text || ''));
    assert.match(strip(welcome[welcome.length - 1].text), /#dance/);
});

test('someone in the lounge asks your favourite critter until you answer', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    const askers = lounge(G).filter(m => m.convos.some(c => c.some(n => /favourite type of critter/.test(n.text || ''))));
    assert.ok(askers.length >= 1);
    // answered: nobody asks again
    G.convoTags.animal = 'cat';
    assert.equal(G.offerCritterQuestion(), null);
});

test('the critter question comes right after saying hello', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    delete G.convoTags.animal;
    const [m, ...others] = lounge(G);
    for (const o of others) o.alive = false; // m is the only one who can ask
    const isAsk = c => /favourite type of critter/.test((c[1] || {}).text || '');
    m.metPlayer = false;
    m.convos = [[{ action: 'is vaping.', any: -1 }], ctx.ConversationBuilder.meetingPlayer(m)];
    assert.strictEqual(G.offerCritterQuestion(), m);
    assert.ok(isAsk(m.convos[m.convos.length - 2]), 'asked right after the greeting (played last-first)');
    m.metPlayer = true;
    m.convos = [[{ action: 'is vaping.', any: -1 }]];
    G.offerCritterQuestion();
    assert.ok(isAsk(m.convos[m.convos.length - 1]), 'already met: asked first');
});

test('answering an animal brings a petting zoo, and 3 pets get you adopted', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.convoTags.animal = 'dog';
    nextMorning(ctx);
    assert.ok(G.animalRoomID >= 0);
    assert.ok(G.petList.length >= 2);
    assert.equal(G.PET_LOVE, 3);
    G.petList[0].playerInteractions = 3;
    G.player.cutscene = null;
    nextMorning(ctx);
    assert.strictEqual(G.playerPet, G.petList[0]);
    assert.ok(ctx.Achievements.has('adopted'));
});

test('two pets are not enough to be adopted', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.convoTags.animal = 'cat';
    nextMorning(ctx);
    G.petList[0].playerInteractions = 2;
    G.player.cutscene = null;
    nextMorning(ctx);
    assert.strictEqual(G.playerPet, null);
});

test('finding the petting zoo and petting every animal there', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.convoTags.animal = 'rabbit';
    nextMorning(ctx);
    standIn(G, G.animalRoomID);
    G.noticeRoom();
    assert.ok(ctx.Achievements.has('petRoom'));
    const pets = G.petList;
    for (let i = 0; i < pets.length; i++) {
        assert.ok(!ctx.Achievements.has('zoo'), 'not before the last one');
        pets[i].cleanerAct();
        G.player.talking.cancelConvo();
    }
    assert.ok(ctx.Achievements.has('zoo'));
});

test('#dance in the party room: everyone joins, and an achievement', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    standIn(G, G.partyRoomID);
    const before = ctx.Effects.list.length;
    runCommand(ctx, 'dance');
    const names = party(G).map(m => m.name.split(' ')[0]);
    const line = lastLine(G);
    assert.ok(names.some(n => line.includes(n)) || /Everyone flips out/.test(line), line);
    assert.ok(ctx.Achievements.has('dance'));
    // the janitor and each partygoer get hidden for the dance (+ the notes, maybe)
    assert.ok(ctx.Effects.list.length - before >= 1 + party(G).length);
});

test('#dance alone, and in the lounge where comrades only clap', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    standIn(G, G.staffRoomID);
    runCommand(ctx, 'dance');
    assert.ok(lounge(G).some(m => lastLine(G).includes(m.name.split(' ')[0])), lastLine(G));
    assert.ok(!ctx.Achievements.has('dance'));
    // somewhere with nobody around
    const room = G.rooms.findIndex((r, i) => i != G.staffRoomID && i != G.partyRoomID && i != G.animalRoomID);
    standIn(G, room);
    runCommand(ctx, 'dance');
    assert.ok(ctx.Dance.aloneLines.includes(lastLine(G)), lastLine(G));
    assert.ok(ctx.Achievements.has('danceAlone'));
});

test('#dance takes no turn and any key ends it', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    const turnBefore = G.player.hasTurn;
    runCommand(ctx, 'dance');
    assert.equal(G.player.hasTurn, turnBefore);
    assert.ok(ctx.Effects.list.length > 0);
    ctx.Dance.timer = 1; // as if the overlay were up
    assert.equal(ctx.Dance.stop(), true);
    assert.equal(ctx.Effects.list.length, 0);
});

test('a colleague may hint at #dance', () => {
    const ctx = cleaningDay();
    assert.ok(ctx.Lore.hints.dance.length >= 1);
    assert.ok(ctx.Lore.hints.dance.every(h => h.includes('#dance')));
});

test('a secret room is heard from further away, louder when close, never once found', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    const key = G.soundDoors()[0];
    assert.ok(key, 'the party room door makes a sound');
    const door = G.map[key];
    const place = (dx, dy) => { G.player.x = door.x + dx; G.player.y = door.y + dy; };
    G.lastSecretHint = null;
    place(13, 0);
    assert.equal(G.secretHint(), null, 'too far');
    place(10, 0);
    const far = G.secretHint();
    assert.ok(far && strip(far).includes(door.secretDoor.sound), far);
    place(9, 0);
    assert.equal(G.secretHint(), null, 'not every step');
    place(3, 0);
    const near = G.secretHint();
    assert.match(strip(near), /^\u266A Right behind a wall here!/);
    for (let i = 0; i < G.SECRET_EVERY - 1; i++) assert.equal(G.secretHint(), null);
    assert.ok(G.secretHint(), 'reminded after a while');
    door.openSecretDoor();
    G.lastSecretHint = null;
    assert.equal(G.secretHint(), null, 'found: silent');
});

test('the party room music shows up as a highlighted line in the log', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    const door = G.map[G.soundDoors()[0]];
    G.lastSecretHint = null;
    G.player.x = door.x + 6; G.player.y = door.y;
    G.secretHint();
    const raw = G.log.lines[G.log.lines.length - 1].text;
    assert.match(raw, /^%c\{#f8f\}♪ /);
});

// --- review fixes ---

test('two hidden rooms close together do not take turns every step', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    const a = G.map[G.soundDoors()[0]];
    // a second sounding door 6 tiles from the first
    const b = new ctx.Tile(a.x + 6, a.y, '#', '#fff', '#000', false, false);
    G.map[b.x + ',' + b.y] = b;
    b.secretDoor = { char: '+', door: '-', color: '#fff', bgColor: '#000', sound: 'You hear barking.' };
    G.soundDoorCache = null;
    G.lastSecretHint = null;
    let said = 0;
    for (let i = 0; i < 10; i++) {
        // step back and forth on the line between them, each door nearest in turn
        G.player.x = i % 2 ? a.x + 1 : a.x + 5; G.player.y = a.y + 1;
        if (G.secretHint()) said++;
    }
    assert.ok(said <= 2, 'said ' + said + ' times in 10 steps');
});

test('ending a dance early redraws, so nobody is left invisible', () => {
    const ctx = cleaningDay();
    let draws = 0;
    const real = ctx.Game.drawMap.bind(ctx.Game);
    ctx.Game.drawMap = () => { draws++; return real(); };
    ctx.Dance.start();
    ctx.Dance.timer = 1; // as if the overlay were up
    draws = 0;
    ctx.Dance.stop();
    assert.ok(draws >= 1);
    assert.equal(ctx.Effects.list.length, 0);
});

test('the crowd stays hidden a little longer than the janitor (their copies start late)', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    const r = G.rooms[G.partyRoomID];
    for (let x = r[0]; x <= r[2]; x++) for (let y = r[1]; y <= r[3]; y++) {
        const t = G.map[x + ',' + y];
        if (t && t.passable && t.entity == null && G.player.x != x) {
            G.map[G.player.x + ',' + G.player.y].entity = null;
            G.player.x = x; G.player.y = y; t.entity = G.player;
        }
    }
    ctx.Effects.list = [];
    ctx.Dance.start();
    const mine = ctx.Effects.list.find(e => e.x == G.player.x && e.y == G.player.y);
    const crowd = ctx.Effects.list.find(e => party(G).some(m => m.x == e.x && m.y == e.y));
    assert.ok(crowd.frames.length > mine.frames.length);
});

test('Ctrl+1 (a browser tab shortcut) does not mop', () => {
    const ctx = cleaningDay();
    const seen = [];
    ctx.Game.player.clean = verb => { seen.push(verb); return 0; };
    ctx.__pressEvent({ keyCode: 49, key: '1', ctrlKey: true });
    ctx.__pressEvent({ keyCode: 80, key: 'p', ctrlKey: true });
    assert.deepEqual(seen, []);
    ctx.__pressEvent({ keyCode: 49, key: '1' });
    assert.deepEqual(seen, ['mop']);
});

test("a morning without pets forgets yesterday's petting zoo room", () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.animalRoomID = 2; // left over from another run
    nextMorning(ctx);
    assert.equal(G.animalRoomID, -1);
});
