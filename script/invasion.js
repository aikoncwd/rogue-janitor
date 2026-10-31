// The hero invasion: a non-interactive, paced replay of the adventurer storming the
// dungeon, told from the monsters' point of view. Receives events from the
// adventurer/monster code, keeps stats, bodies and hit flashes, and hands over
// to the player when the hero leaves.
var Invasion = {
    instant: false,
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
        this.stats = { fainted: 0, hits: 0, lootSmashed: 0, snacks: 0, potions: 0, doors: 0, heroHurt: 0 };
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
        vars.hero = '%c{#0ff}' + this.hero.short + '%c{}';
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
        switch (type) {
            case 'turn':
                this.turn++;
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
            '%c{#ff0}Invasion report:%c{} %c{#0ff}' + this.hero.full + '%c{} has left the building.',
            'Monsters fainted (theatrically): ' + s.fainted,
            'Loot smashed: ' + s.lootSmashed + '   Doors kicked: ' + s.doors,
            'Snacks eaten on duty: ' + s.snacks + '   Potions quaffed: ' + s.potions,
        ];
        let scene = [];
        for (let i = 0; i < lines.length; i++) {
            scene.push({ message: lines[i], any: i + 1 });
        }
        scene[scene.length - 1].any = -1;
        return scene;
    },

    finish: function () {
        this.say('heroExit');
        this.say('monstersGetUp');
        this.say('shiftBegins');
        this.sound('fanfareOut');
        this.bodies = [];
        this.flashes = {};
        Game.forgetMap();
        Game.player.cutscene = ConversationBuilder.chainCutscenes(this.reportCutscene(), Game.player.cutscene);
        Game.phase = 'cleaning';
    },
};

if (typeof module !== 'undefined') module.exports = Invasion;
