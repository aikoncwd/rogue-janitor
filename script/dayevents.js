// Visitors who drop by the staff lounge for a day (an inspector, a ghost, Rodney...).
// They are monsters for talking purposes, but retired and tagged `visitor`, and they
// leave before the next invasion.
var Visitors = {
    // A random free floor tile inside the staff lounge, or null.
    freeLoungeTile: function () {
        let r = Game.rooms[Game.staffRoomID];
        if (!r) {
            return null;
        }
        let spots = [];
        for (let x = r[0]; x < r[2]; x++) {
            for (let y = r[1]; y < r[3]; y++) {
                let t = Game.map[x + ',' + y];
                if (t && t.passable && t.entity == null && t.mess == null && t.door == null) {
                    spots.push([x, y]);
                }
            }
        }
        return spots.length > 0 ? ROT.RNG.getItem(spots) : null;
    },

    // def: { name, char, color, lines: [string] }
    add: function (def) {
        let spot = this.freeLoungeTile();
        if (spot == null) {
            return null;
        }
        let v = new Entity(spot[0], spot[1], def.char, def.color, 'Visitor', 1, { monster: true, visitor: true }, 1);
        v.name = def.name;
        v.retired = true;
        v.metPlayer = true;
        v.home = [v.x, v.y];
        let talk = [];
        for (let i = 0; i < def.lines.length; i++) {
            talk.push({ text: def.lines[i], any: i == def.lines.length - 1 ? -1 : i + 1 });
        }
        v.convos = [[{ action: 'waves at you.', any: -1 }], talk];
        return v;
    },

    clear: function () {
        let gone = Game.monsterList.filter(function (m) { return m.tags && m.tags.visitor; });
        for (let i = 0; i < gone.length; i++) {
            let v = gone[i];
            let key = v.x + ',' + v.y;
            if (key in Game.map && Game.map[key].entity === v) {
                Game.map[key].entity = null;
            }
            Game.scheduler.remove(v);
        }
        Game.monsterList = Game.monsterList.filter(function (m) { return !(m.tags && m.tags.visitor); });
    },
};

// Something small and cozy that happens during the shift, plus the daily memo.
var DayEvents = {
    EVENTS: ['inspector', 'birthday', 'mimicStain', 'rubberDuck', 'bones', 'rodney'],
    NONE_CHANCE: 0.25,

    // Called when the shift starts (after the hand-over).
    start: function () {
        Game.todayEvent = null;
        let memo = Game.amuletStolen ? Lore.amuletMemo : Flavor.rng.getItem(Lore.memos);
        Game.amuletStolen = false;
        Game.log.push('%c{#ff0}MEMO:%c{} ' + memo);
        let gear = {vacuum: "New equipment from HR: a vacuum! Press %c{#ff0}Z%c{} to suck up cobwebs, feathers, spores, soot and other fluff around you.",
            squeegee: "New equipment from HR: a squeegee! Mopping water now clears the whole puddle.",
            brush: "New equipment from HR: a scrub brush! Stubborn stains now go in one pass."};
        for (let tool in gear) {
            if (Game.day == Game.TOOL_DAYS[tool]) {
                Game.log.push('%c{#ff0}MEMO:%c{} ' + gear[tool]);
            }
        }
        Rooms.generate();
        Objectives.generate();
        Game.log.push('%c{#ff0}MEMO:%c{} ' + Objectives.memo());
        if (Game.day < 2) {
            return;
        }
        // world-changing: decided with ROT.RNG, the same whether the invasion was watched or skipped
        let self = this;
        let options = this.EVENTS.filter(function (e) { return self.eligible(e); });
        if (options.length == 0 || ROT.RNG.getUniform() < this.NONE_CHANCE) {
            return;
        }
        this.run(ROT.RNG.getItem(options));
    },

    fountain: function () {
        for (let key in Game.map) {
            let e = Game.map[key].entity;
            if (e instanceof Entity && e.name == 'Fountain' && e.alive) {
                return e;
            }
        }
        return null;
    },

    mopMesses: function () {
        let list = [];
        for (let key in Game.map) {
            let m = Game.map[key].mess;
            if (m != null && m.cleanMethod == 'mop' && !m.unique) {
                list.push(m);
            }
        }
        return list;
    },

    loungeMonsters: function () {
        return Game.monsterList.filter(function (m) { return m.alive && m.retired && !(m.tags && m.tags.visitor) && m.convos; });
    },

    eligible: function (name) {
        switch (name) {
            case 'bones': return Game.day >= 3 && Game.pastHeroes != null && Game.pastHeroes.length > 0;
            case 'rodney': return Game.day >= 4;
            case 'rubberDuck': return this.fountain() != null;
            case 'mimicStain': return this.mopMesses().length > 0;
            case 'birthday': return this.loungeMonsters().length > 0;
            case 'inspector': return true;
        }
        return false;
    },

    run: function (name) {
        Game.todayEvent = name;
        switch (name) {
            case 'inspector':
                Visitors.add(Lore.visitors.inspector);
                Game.log.push(Lore.eventNews.inspector);
                break;
            case 'birthday': {
                let m = ROT.RNG.getItem(this.loungeMonsters());
                m.birthday = true;
                let spot = Visitors.freeLoungeTile();
                if (spot != null) {
                    makeVariant(spot[0], spot[1], 'AppleCore', 'Birthday Cake');
                }
                let lines = Lore.birthdayLines;
                let talk = [];
                for (let i = 0; i < lines.length; i++) {
                    talk.push({ text: lines[i], any: i == lines.length - 1 ? -1 : i + 1 });
                }
                talk[talk.length - 1].globalTags = { yendorPoints: 30 };
                m.convos.push(talk);
                Game.log.push(Lore.eventNews.birthday.replace('{monster}', m.name));
                break;
            }
            case 'mimicStain':
                ROT.RNG.getItem(this.mopMesses()).mimic = true;
                Game.log.push(Lore.eventNews.mimicStain);
                break;
            case 'rubberDuck':
                this.fountain().examineText = "There's a rubber duck in it. It knows things. You explain your problems to it.";
                break;
            case 'bones': {
                let hero = ROT.RNG.getItem(Game.pastHeroes);
                let killedBy = ROT.RNG.getItem(Lore.killedBy);
                let def = Lore.visitors.bones;
                Visitors.add({
                    name: 'Ghost of ' + hero.full,
                    char: def.char,
                    color: def.color,
                    lines: def.lines.map(function (l) { return l.replace('{hero}', hero.full).replace('{killedBy}', killedBy); }),
                });
                Game.log.push(Lore.eventNews.bones);
                break;
            }
            case 'rodney':
                Visitors.add(Lore.visitors.rodney);
                Game.log.push(Lore.eventNews.rodney);
                break;
        }
    },
};

if (typeof module !== 'undefined') module.exports = { Visitors, DayEvents };
