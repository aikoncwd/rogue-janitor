const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro } = require('./harness');

function cleaning(seed = 1234) {
    const ctx = toIntro(bootHeadless({ seed, begin: true }));
    ctx.Invasion.instant = true;
    for (let i = 0; i < 6 && ctx.Game.phase != 'cleaning'; i++) ctx.__press(13);
    assert.equal(ctx.Game.phase, 'cleaning');
    while (ctx.Game.player.talking) ctx.Game.player.talking.cancelConvo();
    return ctx;
}

const NODE_KEYS = ['text', 'action', 'conditions', 'tags', 'globalTags', 'message', 'blackScreenMessage', 'scene'];

// Every jump in a conversation lands on a node (or ends it), and every node is reachable.
function assertWellFormed(convo, label) {
    assert.ok(Array.isArray(convo) && convo.length > 0, label);
    const seen = new Set([0]);
    for (let i = 0; i < convo.length; i++) {
        const n = convo[i];
        assert.ok(typeof (n.text || n.message || n.action) == 'string', label + ' #' + i + ' has words');
        assert.ok(!/\{\w+\}/.test(n.text || ''), label + ' #' + i + ' unfilled: ' + n.text);
        const jumps = Object.keys(n).filter(k => !NODE_KEYS.includes(k));
        assert.ok(jumps.length > 0, label + ' #' + i + ' goes somewhere');
        for (const k of jumps) {
            assert.ok(n[k] == -1 || (n[k] > 0 && n[k] < convo.length), label + ' #' + i + ' ' + k + ' -> ' + n[k]);
            if (n[k] > 0) seen.add(n[k]);
        }
    }
    assert.equal(seen.size, convo.length, label + ': every node reachable');
}

test('there are plenty of food runs, each with three orders and a no-thanks', () => {
    const ctx = cleaning();
    const V = ctx.Visits;
    assert.ok(V.PLACES.length >= 16);
    const m = ctx.Game.monsterList.find(x => x.alive);
    for (let i = 0; i < V.PLACES.length; i++) {
        const convo = V.foodRun(m);
        assertWellFormed(convo, 'food run ' + i);
        assert.equal(convo.length, 5);
        assert.ok(convo.slice(1, 4).every(n => n.tags && typeof n.tags.food == 'string'));
    }
});

test('a run goes through every food place before repeating one', () => {
    const ctx = cleaning();
    const V = ctx.Visits;
    const m = ctx.Game.monsterList.find(x => x.alive);
    ctx.Game.run.placesSeen = [];
    const asks = new Set();
    for (let i = 0; i < V.PLACES.length; i++) asks.add(V.foodRun(m)[0].text.split(' ').slice(0, 5).join(' '));
    assert.equal(ctx.Game.run.placesSeen.length, V.PLACES.length);
    assert.equal(new Set(ctx.Game.run.placesSeen).size, V.PLACES.length, 'no repeats');
});

test('the delivery mentions the food, adds the place quip and counts the snack', () => {
    const ctx = cleaning();
    const tags = { food: 'boulder roll', foodQuip: 'No diagonals.' };
    const convo = ctx.ConversationBuilder.deliverConvo(tags, null);
    assertWellFormed(convo, 'delivery');
    assert.match(convo[0].text, /boulder roll/);
    assert.ok(convo.some(n => n.text == 'No diagonals.'));
    assert.equal(tags.food, false);
    assert.equal(ctx.Game.run.counts.snacks, 1);
    assert.equal(ctx.ConversationBuilder.deliverConvo(tags, null), null, 'nothing to deliver twice');
});

test('every chat is a well-formed conversation that ends kindly, with points', () => {
    const ctx = cleaning();
    const V = ctx.Visits;
    assert.ok(V.CHATS.filter(c => !c.species).length >= 10);
    const m = ctx.Game.monsterList.find(x => x.alive);
    for (const c of V.CHATS) {
        const convo = V.buildChat(c, m);
        assertWellFormed(convo, c.id);
        const last = convo[convo.length - 1];
        assert.equal(last.any, -1);
        assert.equal(last.globalTags.yendorPoints, 10);
        assert.equal(last.globalTags.listened, true);
        if (c.dream) assert.equal(last.globalTags.sharedDream, c.dream);
    }
});

test('species with their own worries tell theirs first, and chats do not repeat', () => {
    const ctx = cleaning();
    const V = ctx.Visits;
    ctx.Flavor.chance = () => true;
    const ghost = { species: 'Ghost', name: 'Boo' };
    assert.equal(V.chatFor(ghost).id, 'ghost');
    assert.notEqual(V.chatFor(ghost).id, 'ghost', 'the ghost already told you');
    const generic = V.CHATS.filter(c => !c.species).length;
    ctx.Game.run.chatsSeen = [];
    const ids = new Set();
    for (let i = 0; i < generic; i++) ids.add(V.chatFor({ species: 'Goblin', name: 'G' }).id);
    assert.equal(ids.size, generic);
});

test('halfway through the shift a comrade comes over just to talk', () => {
    const ctx = cleaning();
    const G = ctx.Game;
    assert.ok(G.chatThreshold > G.coffeeThreshold && G.chatThreshold < G.inviteOutThreshold);
    G.coffeeThreshold = 999; G.inviteOutThreshold = 999; G.chatThreshold = -1;
    for (const m of G.monsterList) m.quests = [];
    G.checkCleanMilestones();
    const talker = G.monsterList.find(m => m.quests.includes('chatConvo'));
    assert.ok(talker, 'someone is on their way');
    assert.ok(G.chatThreshold > 100, 'once a day');
    const before = G.monsterList.filter(m => m.quests.includes('chatConvo')).length;
    G.checkCleanMilestones();
    assert.equal(G.monsterList.filter(m => m.quests.includes('chatConvo')).length, before);
});

test('listening three times in a run earns an achievement', () => {
    const ctx = cleaning();
    ctx.Achievements.got = {};
    for (let i = 0; i < 3; i++) ctx.Achievements.bump('listened');
    assert.ok(ctx.Achievements.got.listener);
});

test('every night plan has a scene that exists, and nothing left unfilled', () => {
    const ctx = cleaning();
    const V = ctx.Visits;
    assert.ok(V.PLANS.length >= 11);
    for (const p of V.PLANS.concat([V.BBQ])) {
        const art = ctx.Scenes.art[p.scene];
        assert.ok(art && art.frames.length >= 2, p.id + ' scene');
        for (const f of art.frames) assert.equal(f.length, art.frames[0].length, p.scene + ' height');
        for (const line of p.nights) {
            ctx.Game.convoTags.dinnerGame = 'Brogue';
            ctx.Game.convoTags.dinnerMovie = 'Dust Busters';
            assert.ok(!/\{\w+\}/.test(V.fill(line)), line);
        }
    }
    for (const h of V.HOME) assert.ok(ctx.Scenes.art[h.scene], h.scene);
});

test('every species gets a sensible invitation that leads to a night with a scene', () => {
    const ctx = cleaning();
    const V = ctx.Visits;
    for (const sp of ['Goblin', 'Dragon', 'Naga', 'Skeleton', 'Ghost', 'Harpy', 'Floating Eye', 'Lich', 'Imp']) {
        for (let i = 0; i < 6; i++) {
            const convo = V.invitation({ species: sp, name: 'Pal the ' + sp });
            assertWellFormed(convo, sp);
            const plan = convo[2].globalTags.dinnerPlan;
            const night = V.night(plan);
            assert.ok(ctx.Scenes.art[night.scene], sp + ': ' + plan);
            assert.ok(night.label && night.description, plan);
        }
    }
});

test('going out to each plan plays its scene and someone else\'s dream shows up at night', () => {
    const ctx = cleaning();
    const G = ctx.Game;
    for (const p of ctx.Visits.PLANS) {
        Object.assign(G.convoTags, { invitationAccepted: true, dinnerPlan: p.id, dinnerHost: 'x', sharedDream: 'You dream of soup.', dreamer: 'Grub' });
        const convo = ctx.ConversationBuilder.exitPrompt();
        assert.ok(convo.some(n => n.scene === p.scene), p.id);
        assert.match(convo[0].message, new RegExp(p.label));
        assert.ok(convo.some(n => /You dream of soup\. \(Thanks a lot, Grub\.\)/.test(n.message)));
        const last = convo[convo.length - 1];
        assert.equal(last.globalTags.sharedDream, false, 'the dream is forgotten by morning');
    }
});

test('the dice scene draws the numbers on the die, not the comrades', () => {
    const ctx = cleaning();
    const S = ctx.Scenes;
    S.current = { cast: [{ char: 'g', color: '#0f0' }, { char: 'k', color: '#f00' }, { char: 'o', color: '#00f' }] };
    assert.deepEqual(S.cell(S.art.dice, '¹', 0, 5, 0), ['1', '#fff']);
    assert.equal(S.cell(S.art.dice, '1', 0, 2, 0)[0], 'g', 'the digit is still the host');
    assert.deepEqual(S.cell(S.art.roguelike, 'H', 0, 2, 0), ['@', '#fff']);
});
