// #dance: the janitor busts a move. The @ flips and spins (a CSS-animated copy laid
// over its cell on the canvas, see .rj-dancer in style.css); in the secret party
// room everybody partying there joins in. Purely cosmetic and free: it takes no turn.
var Dance = {
    MS: 1600,
    nodes: [],   // the overlay elements on screen
    timer: null,

    aloneLines: [
        "You dance alone. A dust bunny watches, unimpressed.",
        "You bust a move. The mop is your dance partner. It leads.",
        "You do a little twirl. Nobody saw. Probably.",
        "You moonwalk across the floor. Incredible. Slightly sticky.",
        "You dance like nobody's watching. A floating eye somewhere gives you a 7/10.",
    ],
    loungeLines: [
        "You dance in the lounge. {name} claps along politely.",
        "You break into a dance. {name} spills their coffee cheering.",
        "You dance between the tables. {name} holds up a napkin that says 10.",
        "You dance. {name} pretends not to know you, then joins in a little.",
    ],
    partyLines: [
        "The party goes wild! {name} joins in with the robot.",
        "{name} starts a conga line behind you!",
        "Everyone flips out. Literally. They're all flipping.",
        "The skeleton DJ drops the beat just for you! {name} screams with joy.",
        "{name} challenges you to a dance-off. It's a tie. Everyone wins.",
    ],

    // Who is near the janitor, and where: 'party', 'lounge' or 'alone'.
    scene: function () {
        let p = Game.player;
        let room = Game.getRoomIndex(p.x, p.y);
        let here = function (m) {
            return m.alive && m.retired && !(m.tags && m.tags.visitor) && Game.getRoomIndex(m.x, m.y) == room;
        };
        if (room >= 0 && room == Game.partyRoomID) {
            let crowd = Game.monsterList.filter(function (m) { return here(m) && m.partying; });
            if (crowd.length > 0) {
                return { kind: 'party', crowd: crowd };
            }
        }
        if (room >= 0 && room == Game.staffRoomID) {
            let crowd = Game.monsterList.filter(function (m) { return here(m) && !m.partying; });
            if (crowd.length > 0) {
                return { kind: 'lounge', crowd: crowd };
            }
        }
        return { kind: 'alone', crowd: [] };
    },

    start: function () {
        if (Game.phase != 'cleaning' || Game.player == null) {
            return false;
        }
        let scene = this.scene();
        let pool = scene.kind == 'party' ? this.partyLines : scene.kind == 'lounge' ? this.loungeLines : this.aloneLines;
        let line = Flavor.rng.getItem(pool);
        if (scene.crowd.length > 0) {
            let star = Flavor.rng.getItem(scene.crowd);
            line = line.replace('{name}', star.name.split(' ')[0]);
        }
        Game.sendMessage(line);
        if (scene.kind == 'party') {
            Achievements.unlock('dance');
        }
        else if (scene.kind == 'alone') {
            Achievements.unlock('danceAlone');
        }
        // in the lounge they only clap: dancing is for the party
        let dancers = [Game.player].concat(scene.kind == 'party' ? scene.crowd : []);
        this.play(dancers);
        return true;
    },

    // Hides each dancer's own glyph for the length of the dance and lays the
    // animated copy over it. Notes float above the janitor.
    play: function (dancers) {
        this.stop();
        let frames = Math.ceil(this.MS / Effects.FRAME_MS);
        for (let i = 0; i < dancers.length; i++) {
            let d = dancers[i];
            let blank = [];
            let late = i > 0 ? Math.ceil(160 / Effects.FRAME_MS) : 0; // the crowd's copies start late
            for (let f = 0; f < frames + late; f++) {
                blank.push([' ', '#000', null]);
            }
            Effects.add(d.x, d.y, blank);
        }
        let p = Game.player;
        let above = Game.map[p.x + ',' + (p.y - 1)];
        if (above && above.passable && above.entity == null) {
            let notes = [];
            for (let f = 0; f < frames; f++) {
                notes.push([['♪', '♫', ' '][Math.floor(f / 4) % 3], '#f8f', null]);
            }
            Effects.add(p.x, p.y - 1, notes);
        }
        Sfx.play('blip');
        this.overlay(dancers);
    },

    // The flipping copies, drawn in the browser only (tests have no DOM).
    overlay: function (dancers) {
        if (typeof document == 'undefined' || typeof document.createElement != 'function' ||
            Game.display == null || Game.offset == null) {
            return;
        }
        let canvas = Game.display.getContainer();
        if (!canvas || typeof canvas.getBoundingClientRect != 'function') {
            return;
        }
        let rect = canvas.getBoundingClientRect();
        let opts = Game.display.getOptions();
        let cw = rect.width / opts.width;
        let ch = rect.height / opts.height;
        let cam = Game.cameraTarget();
        for (let i = 0; i < dancers.length; i++) {
            let d = dancers[i];
            let tile = Game.map[d.x + ',' + d.y];
            if (!tile || !tile.visible) {
                continue;
            }
            let sx = d.x - cam.x + Game.offset[0];
            let sy = d.y - cam.y + Game.offset[1];
            if (sx < 0 || sy < 0 || sx >= Game.layoutInfo.mapCols || sy >= Game.layoutInfo.mapRows) {
                continue;
            }
            let el = document.createElement('div');
            el.className = 'rj-dancer';
            el.textContent = d.char;
            el.style.left = (rect.left + sx * cw) + 'px';
            el.style.top = (rect.top + sy * ch) + 'px';
            el.style.width = cw + 'px';
            el.style.height = ch + 'px';
            el.style.lineHeight = ch + 'px';
            el.style.fontSize = Game.fontSize + 'px';
            el.style.color = d.color;
            el.style.animationDuration = this.MS + 'ms';
            if (i > 0) { // the crowd joins a beat late, some the other way round
                el.style.animationDelay = (80 * (i % 3)) + 'ms';
                el.style.animationDirection = i % 2 ? 'reverse' : 'normal';
            }
            document.body.appendChild(el);
            this.nodes.push(el);
        }
        let self = this;
        this.timer = setTimeout(function () {
            self.timer = null;
            self.removeNodes();
        }, this.MS + 300);
    },

    removeNodes: function () {
        for (let i = 0; i < this.nodes.length; i++) {
            if (this.nodes[i].parentNode) {
                this.nodes[i].parentNode.removeChild(this.nodes[i]);
            }
        }
        this.nodes = [];
    },

    // Any key ends the dance early (moving would leave the copies behind).
    stop: function () {
        if (this.nodes.length == 0 && this.timer == null) {
            return false;
        }
        if (this.timer != null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.removeNodes();
        Effects.clear();
        if (Effects.canRedraw()) {
            Game.drawMap(); // the hidden glyphs come back even if the key does nothing
        }
        return true;
    },

    isDancing: function () {
        return this.nodes.length > 0;
    },
};

if (typeof module !== 'undefined') module.exports = Dance;
