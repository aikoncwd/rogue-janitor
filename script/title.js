// The title screen: a big ASCII logo, a little animated dungeon where the janitor
// mops back and forth, a rotating tagline and a NetHack-style prompt whose answer
// does not matter. Any key (except the global ones) clocks you in.
var Title = {
    TICK_MS: 250,
    TAGLINE_FRAMES: 24, // 6 s per tagline: time to read it
    BOX_W: 40,
    timer: null,
    frame: 0,
    quitJoke: false,
    tagline: '',

    // 5x5 block letters ('#' becomes a full block when drawn).
    FONT: {
        R: ["#### ", "#   #", "#### ", "#  # ", "#   #"],
        O: [" ### ", "#   #", "#   #", "#   #", " ### "],
        G: [" ####", "#    ", "#  ##", "#   #", " ### "],
        U: ["#   #", "#   #", "#   #", "#   #", " ### "],
        E: ["#####", "#    ", "#### ", "#    ", "#####"],
        J: ["  ###", "    #", "    #", "#   #", " ### "],
        A: [" ### ", "#   #", "#####", "#   #", "#   #"],
        N: ["#   #", "##  #", "# # #", "#  ##", "#   #"],
        I: ["#####", "  #  ", "  #  ", "  #  ", "#####"],
        T: ["#####", "  #  ", "  #  ", "  #  ", "  #  "],
        ' ': ["  ", "  ", "  ", "  ", "  "],
    },
    LOGO_TEXT: "ROGUE JANITOR",
    LOGO_COLORS: ['#fd6', '#fc4', '#fb3', '#f92', '#e72'],
    COMPACT_LOGO: "R O G U E   J A N I T O R",
    LOGO_MIN_COLS: 76,

    logo: function () {
        let rows = ['', '', '', '', ''];
        for (let i = 0; i < this.LOGO_TEXT.length; i++) {
            let glyph = this.FONT[this.LOGO_TEXT[i]];
            for (let r = 0; r < 5; r++) {
                rows[r] += (i > 0 ? ' ' : '') + glyph[r];
            }
        }
        let colors = this.LOGO_COLORS;
        return rows.map(function (row, r) {
            return '%c{' + colors[r] + '}' + row.replace(/#/g, '█') + '%c{}';
        });
    },

    // Mess lying around the vignette: [inner row, column, char, colour].
    MESS: [
        [0, 5, '!', '#0ff'], [0, 12, '%', '#0f0'], [0, 19, ',', '#f00'], [0, 27, '~', '#da3'], [0, 33, '!', '#080'],
        [1, 3, ',', '#960'], [1, 9, '?', '#eee'], [1, 16, '$', '#ff0'], [1, 24, 'u', '#999'], [1, 30, ',', '#4f9'], [1, 36, 'w', '#ccc'],
    ],

    start: function () {
        this.stop();
        this.frame = 0;
        this.quitJoke = false;
        this.tagline = Flavor.line('titleTaglines');
        this.schedule();
    },

    stop: function () {
        if (this.timer != null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    },

    schedule: function () {
        let self = this;
        this.timer = setTimeout(function () {
            self.timer = null;
            if (Game.phase != 'title') {
                return;
            }
            self.frame++;
            if (self.frame % self.TAGLINE_FRAMES == 0) {
                self.tagline = self.nextTagline();
            }
            Game.drawMap();
            self.schedule();
        }, this.TICK_MS);
    },

    // A tagline, or now and then a rumor (if it fits on the screen).
    nextTagline: function () {
        if (typeof Lore != 'undefined' && Flavor.chance(0.25)) {
            let rumor = Lore.rumor();
            if (Game.screenSize == null || rumor.length <= Game.screenSize[0]) {
                return rumor;
            }
        }
        return Flavor.line('titleTaglines');
    },

    handleKey: function (e) {
        if (e.keyCode == 81) { // q
            this.quitJoke = true;
            Game.drawMap();
            return true;
        }
        this.stop();
        Game.phase = 'howto';
        Game.drawMap();
        return true;
    },

    // Janitor column inside the box (1..36), walking ping-pong, and its heading.
    janitor: function () {
        let span = this.BOX_W - 4; // 36 positions
        let cycle = 2 * (span - 1);
        let k = this.frame % cycle;
        let right = k < span - 1;
        return { x: 1 + (right ? k : cycle - k), right: right };
    },

    // Colour-coded string from an array of [char, colour] cells.
    paint: function (cells) {
        let out = '';
        let last = null;
        for (let i = 0; i < cells.length; i++) {
            if (cells[i][1] != last) {
                out += '%c{' + cells[i][1] + '}';
                last = cells[i][1];
            }
            out += cells[i][0];
        }
        return out + '%c{}';
    },

    vignette: function () {
        let w = this.BOX_W;
        let rows = [];
        for (let r = 0; r < 4; r++) {
            let row = [];
            for (let c = 0; c < w; c++) {
                let border = r == 0 || r == 3 || c == 0 || c == w - 1;
                row.push(border ? ['#', '#555'] : [' ', '#000']);
            }
            rows.push(row);
        }
        let j = this.janitor();
        for (let i = 0; i < this.MESS.length; i++) {
            let m = this.MESS[i];
            rows[1 + m[0]][m[1]] = [m[2], m[3]];
        }
        let torch = ['#f80', '#fa0', '#fc4'];
        rows[0][0] = ['*', Flavor.rng.getItem(torch)];
        rows[0][w - 1] = ['*', Flavor.rng.getItem(torch)];
        rows[3][0] = ['*', Flavor.rng.getItem(torch)];
        rows[3][w - 1] = ['*', Flavor.rng.getItem(torch)];
        rows[1][j.x] = ['@', '#ff0']; // standing on a mess hides it: it's being mopped
        rows[1][j.x + (j.right ? 1 : -1)] = ['-\\|/'[this.frame % 4], '#a62'];
        return rows.map(this.paint);
    },

    lines: function (cols) {
        let out = [];
        if (cols >= this.LOGO_MIN_COLS) {
            out = out.concat(this.logo());
        }
        else {
            out.push('%c{#fb3}' + this.COMPACT_LOGO + '%c{}');
        }
        out.push('');
        out = out.concat(this.vignette());
        out.push('');
        out.push('%c{#777}Rogue Janitor 3.6.0-mop%c{}');
        if (this.tagline.length <= cols) {
            out.push('%c{#ccc}' + this.tagline + '%c{}');
        }
        out.push('');
        out.push('%c{#fff}Shall I pick a mop for you? [ynaq]%c{}');
        out.push('%c{#777}(any key clocks you in)%c{}');
        if (this.quitJoke) {
            out.push('%c{#f88}You can\'t quit before your shift. Union rules.%c{}');
        }
        out.push('');
        out.push('%c{#555}Original game by Lauren H · rot.js%c{}');
        return out;
    },

    // Lines centred on the whole screen (no side panel or log on these screens).
    // block=true keeps a common left edge so indented text stays aligned.
    drawLines: function (lines, block) {
        let cols = Game.screenSize[0];
        let rows = Game.screenSize[1];
        let plain = lines.map(function (l) { return l.replace(/%c\{[^}]*\}/g, ''); });
        let widest = Math.max.apply(null, plain.map(function (l) { return l.length; }));
        let top = Math.max(0, Math.floor((rows - lines.length) / 2));
        for (let i = 0; i < lines.length; i++) {
            let w = block ? widest : plain[i].length;
            // rot.js drops leading spaces, so indent by moving the start instead
            let indent = lines[i].match(/^ */)[0].length;
            Game.display.drawText(Math.max(0, Math.floor((cols - w) / 2)) + indent, top + i, lines[i].slice(indent));
        }
    },

    draw: function () {
        this.drawLines(this.lines(Game.screenSize[0]), false);
    },
};

if (typeof module !== 'undefined') module.exports = Title;
