// The hero invasion: a non-interactive, paced replay of the adventurer storming the
// dungeon, told from the monsters' point of view. Receives events from the
// adventurer/monster code, keeps stats, bodies and hit flashes, and hands over
// to the player when the hero leaves.
var Invasion = {
    instant: false, // run every hero turn without delay (tests)
    BASE_DELAY_MS: 200,
    BORING_DELAY_MS: 90,
    FAST_FACTOR: 4,
    fast: false,
    skipping: false,
    timer: null,
    engineStarted: false,
    eventful: false,

    // Hands control to the hero: called when the intro screen is dismissed (day 1)
    // or when a new day's dungeon is generated (the player's pending unlock resumes it).
    start: function () {
        Game.phase = 'invasion';
        Game.stopQuestBlink();
        Game.drawMap();
        if (!this.engineStarted) {
            this.engineStarted = true;
            Game.engine.start();
        }
    },

    // Delay before the next hero turn; quiet walking turns go by faster.
    delay: function (eventful) {
        let ms = eventful ? this.BASE_DELAY_MS : this.BORING_DELAY_MS;
        return this.fast ? ms / this.FAST_FACTOR : ms;
    },

    // Called after every active hero turn: pause the engine and resume on a timer.
    afterHeroTurn: function () {
        if (this.instant || this.skipping || Game.phase != 'invasion') {
            return;
        }
        let eventful = this.eventful || Game.adventurer.targets.length > 0;
        this.eventful = false;
        Game.engine.lock();
        Game.drawMap();
        this.timer = setTimeout(function () {
            Invasion.timer = null;
            Game.engine.unlock();
        }, this.delay(eventful));
    },

    // Run the rest of the invasion instantly.
    skip: function () {
        this.skipping = true;
        if (this.timer != null) {
            clearTimeout(this.timer);
            this.timer = null;
            Game.engine.unlock();
        }
    },

    handleKey: function (code) {
        if (Game.phase == 'intro') {
            this.start();
            return true;
        }
        if (this.stage != null) {
            this.clockIn(); // any key hurries the hand-over along
            return true;
        }
        if (Game.player.talking != null) {
            return false; // a conversation owns the keys (e.g. the night screen before day 2)
        }
        if (Game.phase == 'invasion') {
            if (code == 32) {
                this.fast = !this.fast;
                Game.drawMap();
                return true;
            }
            if (code == 27) {
                this.skip();
                return true;
            }
        }
        return false;
    },

    hero: { short: 'The hero', full: 'The hero' },
    roster: [],
    stats: {},
    bodies: [],
    flashes: {},
    turn: 0,
    optionalLogged: false,

    reset: function (adventurer) {
        this.hero = Flavor.heroName();
        this.roster = Game.monsterList.filter(function (m) { return m.alive && !m.retired; });
        this.stats = { fainted: 0, hits: 0, lootSmashed: 0, snacks: 0, potions: 0, doors: 0, heroHurt: 0, graffiti: 0, specials: 0 };
        if (adventurer && adventurer.setClass) {
            adventurer.setClass(this.hero.cls);
        }
        this.bodies = [];
        this.flashes = {};
        this.turn = 0;
        this.optionalLogged = false;
    },

    // Logging and sounds are suppressed while skipping (only the report matters then).
    quiet: function () {
        return this.skipping === true;
    },

    say: function (pool, vars, optional = false) {
        if (this.quiet()) {
            return;
        }
        if (optional) {
            if (this.optionalLogged) {
                return;
            }
            this.optionalLogged = true;
        }
        vars = vars || {};
        vars.hero = '%c{' + this.heroColor() + '}' + this.hero.short + '%c{}';
        let line = Flavor.line(pool, vars);
        if (line != "") {
            Game.log.push(line);
        }
    },

    sound: function (name) {
        if (!this.quiet()) {
            Sfx.play(name);
        }
    },

    flash: function (x, y) {
        this.flashes[x + ',' + y] = 2;
    },

    monsterName: function (monster) {
        return '%c{' + monster.color + '}' + monster.name + '%c{}';
    },

    event: function (type, data) {
        data = data || {};
        if (type != 'turn') {
            this.eventful = true;
        }
        switch (type) {
            case 'turn':
                this.turn++;
                Game.log.markStale(); // last turn's lines dim, this turn's stay bright
                this.optionalLogged = false;
                for (let key in this.flashes) {
                    this.flashes[key]--;
                    if (this.flashes[key] <= 0) {
                        delete this.flashes[key];
                    }
                }
                if (ROT.RNG.getUniform() < 0.04) {
                    this.say('heroCry', {}, true);
                }
                break;
            case 'enter':
                this.say('heroEnter');
                this.sound('fanfareIn');
                break;
            case 'hit':
                this.stats.hits++;
                this.flash(data.monster.x, data.monster.y);
                this.say('heroHit', { monster: this.monsterName(data.monster) });
                this.sound('hit');
                if (data.monster.hp > 0 && ROT.RNG.getUniform() < 0.5) {
                    this.say('monsterPain', { monster: this.monsterName(data.monster) }, true);
                    this.sound('yelp');
                }
                break;
            case 'faint':
                this.stats.fainted++;
                this.bodies.push({ x: data.monster.x, y: data.monster.y, char: data.monster.char });
                this.say('monsterFaint', { monster: this.monsterName(data.monster) });
                this.sound('faint');
                break;
            case 'loot':
                this.stats.lootSmashed++;
                this.say('lootSmash', { item: data.entity.name.toLowerCase() });
                this.sound('smash');
                break;
            case 'door':
                this.stats.doors++;
                this.say('doorKick');
                this.sound('door');
                break;
            case 'snack':
                this.stats.snacks++;
                this.say('snack', {}, true);
                this.sound('munch');
                break;
            case 'potion':
                this.stats.potions++;
                this.say('potion');
                this.sound('gulp');
                break;
            case 'special':
                this.stats.specials++;
                this.say('special_' + data.cls);
                this.sound('spray');
                break;
            case 'graffiti':
                this.stats.graffiti++;
                this.say('graffiti', { item: ROT.RNG.getItem(Flavor.pools.graffitiTags) });
                this.sound('spray');
                break;
            case 'heroHurt':
                this.stats.heroHurt++;
                this.flash(Game.adventurer.x, Game.adventurer.y);
                this.say('heroHurt', {}, true);
                this.sound('heroHurt');
                break;
        }
    },

    reportCutscene: function () {
        let s = this.stats;
        let lines = [
            '%c{#ff0}Invasion report:%c{} %c{' + this.heroColor() + '}' + this.hero.full + '%c{} has left the building.',
            'Monsters fainted (theatrically): ' + s.fainted,
            'Loot smashed: ' + s.lootSmashed + '   Doors kicked: ' + s.doors,
            'Snacks eaten on duty: ' + s.snacks + '   Potions quaffed: ' + s.potions,
            'Blood puddles (fake): ' + s.bloodPuddles + '   Walls vandalised: ' + s.graffiti,
            this.classStat() + ': ' + s.specials,
        ];
        // one screen for the whole report: a single Enter to read it all
        return [{ message: lines.join('\n'), any: -1 }];
    },

    // --- Hand-over: the pause between the hero leaving and the shift starting ---
    // 'linger'  the camera stays on the empty stairs for a moment,
    // 'curtain' the screen closes from the top and bottom,
    // 'card'    a title card for the night shift,
    // then clockIn() moves everyone to the lounge and the player takes over.
    LINGER_MS: 2500,
    SKIP_LINGER_MS: 800,
    CURTAIN_MS: 1200,
    CARD_MS: 4500,
    TICK_MS: 40,
    stage: null,
    stageStart: 0,
    stageEnd: 0,
    exitSpot: null,
    cardLines: [],
    handoverTimer: null,

    now: function () {
        return Date.now();
    },

    handover: function (x, y) {
        let skipped = this.skipping;
        this.skipping = false; // the exit line and sound play even after a skip
        this.say('heroExit');
        this.sound('fanfareOut');
        if (this.instant) {
            this.clockIn();
            return;
        }
        this.exitSpot = { x: x, y: y };
        Game.engine.lock();
        this.setStage('linger', skipped ? this.SKIP_LINGER_MS : this.LINGER_MS);
    },

    setStage: function (stage, ms) {
        this.stage = stage;
        this.stageStart = this.now();
        this.stageEnd = this.stageStart + ms;
        Game.drawMap();
        this.tick();
    },

    // Fraction of the current stage that has gone by (0..1).
    stageProgress: function () {
        let len = this.stageEnd - this.stageStart;
        return len > 0 ? Math.max(0, Math.min(1, (this.now() - this.stageStart) / len)) : 1;
    },

    tick: function () {
        let self = this;
        this.handoverTimer = setTimeout(function () {
            self.handoverTimer = null;
            if (self.stage == null) {
                return;
            }
            if (self.now() < self.stageEnd) {
                if (self.stage == 'curtain') {
                    Game.drawMap();
                }
                self.tick();
                return;
            }
            if (self.stage == 'linger') {
                self.setStage('curtain', self.CURTAIN_MS);
            }
            else if (self.stage == 'curtain') {
                self.cardLines = self.makeCard();
                self.setStage('card', self.CARD_MS);
            }
            else {
                self.clockIn();
            }
        }, this.TICK_MS);
    },

    makeCard: function () {
        return [
            '%c{#777}~ ~ ~%c{}',
            '',
            '%c{#ff0}' + Flavor.line('cardTitle', {}).replace('{day}', Game.day) + '%c{}',
            '',
            Flavor.line('cardLine', {}),
            '',
            '%c{#777}~ ~ ~%c{}',
        ];
    },

    // Rows of the map area hidden by the closing curtain, counted from each edge.
    curtainRows: function (mapRows) {
        if (this.stage != 'curtain') {
            return 0;
        }
        return Math.ceil(this.stageProgress() * Math.ceil(mapRows / 2));
    },

    clockIn: function () {
        let locked = this.stage != null;
        if (this.handoverTimer != null) {
            clearTimeout(this.handoverTimer);
            this.handoverTimer = null;
        }
        this.stage = null;
        this.exitSpot = null;
        Game.moveMonstersToLounge();
        Game.scheduler.add(Game.player, true);
        this.finish();
        if (locked) {
            Game.engine.unlock();
        }
    },

    classStat: function () {
        let a = Game.adventurer;
        let def = a && a.heroClass ? Adventurer.classes[a.heroClass] : null;
        return def ? def.stat : 'Heroic deeds';
    },

    heroColor: function () {
        return Game.adventurer ? Game.adventurer.color : '#0ff';
    },

    finish: function () {
        this.skipping = false;
        this.fast = false;
        if (this.timer != null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.say('monstersGetUp');
        this.say('shiftBegins');
        this.bodies = [];
        this.flashes = {};
        Game.forgetMap();
        this.stats.bloodPuddles = 0;
        for (let key in Game.map) {
            if (Game.map[key].mess != null && Game.map[key].mess.name == '"Blood"') {
                this.stats.bloodPuddles++;
            }
        }
        Game.player.cutscene = ConversationBuilder.chainCutscenes(this.reportCutscene(), Game.player.cutscene);
        Game.phase = 'cleaning';
    },
};

if (typeof module !== 'undefined') module.exports = Invasion;
