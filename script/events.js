// The new shift events: a flooding fountain, a sleeping dragon, a goblin intern.
// They join DayEvents' pool. The dragon and the intern are plain map objects (like
// Mimsy): not comrades, no quests, no scheduler. World changes use ROT.RNG.
DayEvents.EVENTS.push('flood', 'dragon', 'intern');
DayEvents.dragon = null;
DayEvents.intern = null;
DayEvents.DRAGON_PUFF_EVERY = 15;
DayEvents.DRAGON_MAX_PUFFS = 6;
DayEvents.INTERN_TURNS = 60;
DayEvents.INTERN_MAX_MESSES = 10;
DayEvents.INTERN_MESS_CHANCE = 0.15;

DayEvents.baseEligible = DayEvents.eligible;
DayEvents.eligible = function (name) {
    switch (name) {
        case 'flood': return Game.day >= 3 && this.fountain() != null;
        case 'dragon': return Game.day >= 3 && this.corridorSpots().length > 0;
        case 'intern': return Game.day >= 2;
    }
    return this.baseEligible(name);
};

DayEvents.baseRun = DayEvents.run;
DayEvents.run = function (name) {
    switch (name) {
        case 'flood': Game.todayEvent = name; this.flood(); return;
        case 'dragon': Game.todayEvent = name; this.napDragon(); return;
        case 'intern': Game.todayEvent = name; this.hireIntern(); return;
    }
    this.baseRun(name);
};

DayEvents.baseStart = DayEvents.start;
DayEvents.start = function () {
    this.dragon = null;
    this.intern = null;
    this.baseStart();
};

// Corridor tiles away from doors where something big could nap.
DayEvents.corridorSpots = function () {
    let spots = [];
    for (let i = 0; i < Game.hallCells.length; i++) {
        let key = Game.hallCells[i];
        let t = Game.map[key];
        if (!t || !t.passThrough() || t.mess != null || t.important || t.door != null) {
            continue;
        }
        let p = key.split(',').map(Number);
        if (Game.getRoomIndex(p[0], p[1]) >= 0) {
            continue;
        }
        let nearDoor = false;
        for (let a = -1; a <= 1; a++) {
            for (let b = -1; b <= 1; b++) {
                let n = Game.map[(p[0] + a) + ',' + (p[1] + b)];
                if (n && (n.door != null || n.secretDoor != null)) {
                    nearDoor = true;
                }
            }
        }
        if (!nearDoor) {
            spots.push(p);
        }
    }
    return spots;
};

DayEvents.flood = function () {
    let f = this.fountain();
    let fx = f.x, fy = f.y;
    Game.map[fx + ',' + fy].entity = null;
    f.alive = false;
    makeMess(fx, fy, 'BrokenFountain').parent = f; // fixing it puts the fountain back
    for (let i = -3; i <= 3; i++) {
        for (let j = -3; j <= 3; j++) {
            if (i * i + j * j > 10) {
                continue;
            }
            let t = Game.map[(fx + i) + ',' + (fy + j)];
            if (t && t.passable && t.door == null && !t.important && t.mess == null && t.entity == null) {
                makeMess(fx + i, fy + j, 'Water');
            }
        }
    }
    Game.log.push(Lore.eventNews.flood);
};

DayEvents.napDragon = function () {
    let s = ROT.RNG.getItem(this.corridorSpots());
    let dragon = {
        x: s[0], y: s[1], char: 'D', color: '#c33', name: 'a sleeping dragon', bumps: 0, puffs: 0,
        tags: {dragon: true},
        getArt: function () { return [this.char, this.color, '#000']; },
        describe: function () { return 'A big friendly dragon, fast asleep in the corridor. Zzz.'; },
        cleanerAct: function () { DayEvents.bumpDragon(this); },
    };
    Game.map[s[0] + ',' + s[1]].entity = dragon;
    this.dragon = dragon;
    Game.log.push(Lore.eventNews.dragon);
};

DayEvents.bumpDragon = function (d) {
    d.bumps++;
    if (d.bumps < 3) {
        Game.sendMessage(Lore.dragonLines[d.bumps - 1]);
        Game.drawMap();
        return;
    }
    // it rolls over in its sleep and you squeeze past (you swap places)
    let p = Game.player;
    let px = p.x, py = p.y;
    Game.map[d.x + ',' + d.y].entity = p;
    Game.map[px + ',' + py].entity = d;
    p.x = d.x; p.y = d.y;
    d.x = px; d.y = py;
    d.bumps = 0;
    Game.sendMessage("The dragon rolls over in its sleep. You squeeze past!");
    Achievements.unlock('dragon');
    Game.drawMap();
};

DayEvents.hireIntern = function () {
    let spot = Visitors.freeLoungeTile();
    if (spot == null) {
        return;
    }
    let intern = {
        x: spot[0], y: spot[1], char: 'g', color: '#8f8', name: 'Gribble the Intern', turns: 0, messes: 0,
        tags: {intern: true},
        getArt: function () { return [this.char, this.color, '#000']; },
        describe: function () { return 'Gribble the goblin intern. Eager. Very eager. Slightly sticky.'; },
        cleanerAct: function () { DayEvents.sendIntern("You send Gribble to \"training\" in the staff lounge. HR was informed."); },
    };
    Game.map[spot[0] + ',' + spot[1]].entity = intern;
    this.intern = intern;
    Game.log.push(Lore.eventNews.intern);
};

DayEvents.sendIntern = function (message) {
    let it = this.intern;
    if (it == null) {
        return;
    }
    let t = Game.map[it.x + ',' + it.y];
    if (t && t.entity === it) {
        t.entity = null;
    }
    this.intern = null;
    Game.sendMessage(message);
    if (/training/.test(message)) {
        Achievements.unlock('intern');
    }
    Game.drawMap();
};

// Once per player turn during the shift.
DayEvents.tick = function () {
    let d = this.dragon;
    if (d != null && Game.turnCount % this.DRAGON_PUFF_EVERY == 0 && d.puffs < this.DRAGON_MAX_PUFFS) {
        let spots = [];
        for (let a = -1; a <= 1; a++) {
            for (let b = -1; b <= 1; b++) {
                let t = Game.map[(d.x + a) + ',' + (d.y + b)];
                if (t && t.passable && t.entity == null && t.mess == null && t.door == null) {
                    spots.push([d.x + a, d.y + b]);
                }
            }
        }
        d.puffs++;
        if (spots.length > 0) {
            let s = ROT.RNG.getItem(spots);
            makeMess(s[0], s[1], 'Soot');
        }
    }
    let it = this.intern;
    if (it == null) {
        return;
    }
    it.turns++;
    if (it.turns > this.INTERN_TURNS) {
        this.sendIntern("Gribble the intern waves and heads back to the lounge. \"Learned SO much today!\"");
        return;
    }
    let p = Game.player;
    if (p.prevX != null && Math.max(Math.abs(it.x - p.x), Math.abs(it.y - p.y)) > 1) {
        let t = Game.map[p.prevX + ',' + p.prevY];
        if (t && t.passThrough()) {
            Game.map[it.x + ',' + it.y].entity = null;
            it.x = p.prevX;
            it.y = p.prevY;
            t.entity = it;
        }
    }
    let here = Game.map[it.x + ',' + it.y];
    if (it.messes < this.INTERN_MAX_MESSES && here.mess == null && ROT.RNG.getUniform() < this.INTERN_MESS_CHANCE) {
        it.messes++;
        makeMess(it.x, it.y, ROT.RNG.getItem(['Wrapper', 'AppleCore', 'Water']));
    }
};

if (typeof module !== 'undefined') module.exports = DayEvents;
