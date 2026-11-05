// More shift events: a visitor from another dungeon (with a favour to ask), a loose
// Brogue monkey, the dragon's dice hoard spilt on the way to dice night, and a leaky
// ceiling. They join DayEvents' pool like events.js does. World changes use ROT.RNG.
DayEvents.EVENTS.push('guest', 'monkey', 'diceNight', 'leak');
DayEvents.leak = null;
DayEvents.LEAK_EVERY = 12;
DayEvents.LEAK_MAX = 8;
DayEvents.MONKEY_PEELS = [6, 10];
DayEvents.DICE = [8, 13];

DayEvents.guestEligible = DayEvents.eligible;
DayEvents.eligible = function (name) {
    switch (name) {
        case 'guest': return Game.day >= 2 && this.unseenGuests().length > 0;
        case 'monkey': return Game.day >= 2;
        case 'diceNight': return Game.day >= 2;
        case 'leak': return Game.day >= 2 && this.leakRooms().length > 0;
    }
    return this.guestEligible(name);
};

DayEvents.guestRun = DayEvents.run;
DayEvents.run = function (name) {
    switch (name) {
        case 'guest': Game.todayEvent = name; this.inviteGuest(); return;
        case 'monkey': Game.todayEvent = name; this.looseMonkey(); return;
        case 'diceNight': Game.todayEvent = name; this.spillDice(); return;
        case 'leak': Game.todayEvent = name; this.startLeak(); return;
    }
    this.guestRun(name);
};

DayEvents.guestStart = DayEvents.start;
DayEvents.start = function () {
    this.leak = null;
    this.guestStart();
};

DayEvents.unseenGuests = function () {
    let seen = (Game.run && Game.run.guestsSeen) || [];
    return Lore.guests.filter(function (g) { return seen.indexOf(g.id) < 0; });
};

// Free floor tiles outside the staff lounge (for things scattered around the dungeon).
DayEvents.dungeonFloor = function () {
    let out = [];
    for (let key in Game.map) {
        let t = Game.map[key];
        if (!t.passable || t.entity != null || t.mess != null || t.door != null || t.important) {
            continue;
        }
        let p = key.split(',').map(Number);
        let room = Game.getRoomIndex(p[0], p[1]);
        if (room == Game.staffRoomID || room == Game.partyRoomID || room == Game.animalRoomID) {
            continue;
        }
        out.push(p);
    }
    return out;
};

DayEvents.scatter = function (type, count) {
    let spots = this.dungeonFloor();
    let made = [];
    for (let i = 0; i < count && spots.length > 0; i++) {
        let s = spots.splice(Math.floor(ROT.RNG.getUniform() * spots.length), 1)[0];
        made.push(makeMess(s[0], s[1], type));
    }
    return made;
};

DayEvents.inviteGuest = function () {
    let g = ROT.RNG.getItem(this.unseenGuests());
    Game.run.guestsSeen = (Game.run.guestsSeen || []).concat([g.id]);
    let v = Visitors.add(g);
    if (v == null) {
        return;
    }
    v.species = 'Guest';
    let left = Requests.remaining(g.request);
    if (left > 0 && left <= 60) {
        Requests.push(v.convos, Requests.type(g.request));
    }
    else {
        v.convos.push([{ text: "Lovely dungeon you keep here. Very... procedurally generated.", any: -1 }]);
    }
    Game.log.push(Lore.eventNews.guest + ' (' + g.name + ')');
};

DayEvents.looseMonkey = function () {
    let n = this.MONKEY_PEELS[0] + Math.floor(ROT.RNG.getUniform() * (this.MONKEY_PEELS[1] - this.MONKEY_PEELS[0] + 1));
    this.scatter('BananaPeel', n).forEach(function (m) { m.slippery = true; });
    // ...and it pinched something from a comrade, then dropped it somewhere
    let victims = this.loungeMonsters().filter(function (m) { return m.questItem == null && !m.partying; });
    let spots = this.dungeonFloor();
    if (victims.length > 0 && spots.length > 0) {
        let m = ROT.RNG.getItem(victims);
        let s = ROT.RNG.getItem(spots);
        QuestMess(m, s[0], s[1]);
        ConversationBuilder.searchQuestConvo(m.convos, m);
    }
    Game.log.push(Lore.eventNews.monkey);
};

DayEvents.spillDice = function () {
    let n = this.DICE[0] + Math.floor(ROT.RNG.getUniform() * (this.DICE[1] - this.DICE[0] + 1));
    this.scatter('Dice', n);
    Game.log.push(Lore.eventNews.diceNight);
};

// Rooms a leak could drip in (not the lounge).
DayEvents.leakRooms = function () {
    let out = [];
    for (let i = 0; i < Game.rooms.length; i++) {
        if (i != Game.staffRoomID && i != Game.partyRoomID && i != Game.animalRoomID) {
            out.push(i);
        }
    }
    return out;
};

DayEvents.startLeak = function () {
    let room = ROT.RNG.getItem(this.leakRooms());
    this.leak = { room: room, drips: 0 };
    Game.log.push(Lore.eventNews.leak.replace('{room}', Rooms.name(room)));
};

DayEvents.guestTick = DayEvents.tick;
DayEvents.tick = function () {
    let l = this.leak;
    if (l != null && Game.turnCount % this.LEAK_EVERY == 0 && l.drips < this.LEAK_MAX) {
        let r = Game.rooms[l.room];
        let spots = [];
        for (let x = r[0]; x < r[2]; x++) {
            for (let y = r[1]; y < r[3]; y++) {
                let t = Game.map[x + ',' + y];
                if (t && t.passable && t.entity == null && t.mess == null && t.door == null && !t.important) {
                    spots.push([x, y]);
                }
            }
        }
        l.drips++;
        if (spots.length > 0) {
            let s = ROT.RNG.getItem(spots);
            makeMess(s[0], s[1], 'Water');
            if (l.drips == 1) {
                Game.sendMessage('Drip. Drip. Drip. The ceiling of ' + Rooms.name(l.room) + ' is leaking.');
            }
        }
    }
    this.guestTick();
};

if (typeof module !== 'undefined') module.exports = DayEvents;
