// Little animated ASCII scenes for the night cutscenes (going out, a night in, sleeping).
// In the art, '@' is you and the digits 1-3 are comrades from today's shift: the one who
// invited you (if any) plays '1'. Colours come from each scene's palette, keyed by
// character or by 'row:character'; a list of colours cycles along the row and over time.
var Scenes = {
    FRAME_MS: 450,
    current: null, // {name, node, frame, cast}
    timer: null,

    art: {
        dancing: {
            frames: [
                [
                    "       .   *   \\ | /   *   .     ",
                    "     *       -- (O) --       *   ",
                    "               / | \\             ",
                    "   \u266A                         \u266B   ",
                    "     \\1/      @/     \\2      3/  ",
                    "      |      /|       |\\     |   ",
                    "     / \\     / \\     / \\    / \\  ",
                    "  \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550  ",
                ],
                [
                    "       *   .   / | \\   .   *     ",
                    "     .       -- (O) --       .   ",
                    "               \\ | /             ",
                    "   \u266B                         \u266A   ",
                    "      1      \\@      2/     \\3   ",
                    "     /|\\      |\\     |       |\\  ",
                    "     | |     / \\    / \\     / \\  ",
                    "  \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550  ",
                ],
            ],
            palette: {
                '*': ['#f0f', '#0ff', '#ff0'], '.': ['#0ff', '#f0f'], 'O': '#fff',
                '0:\\': '#ff8', '0:|': '#ff8', '0:/': '#ff8', '2:\\': '#ff8', '2:|': '#ff8', '2:/': '#ff8', '-': '#ff8',
                '\u266A': '#f6f', '\u266B': '#6ff', '\u2550': ['#f0f', '#00f', '#0ff', '#0f0', '#ff0', '#f00'],
            },
        },
        bbq: {
            frames: [
                [
                    "          (    )   (                ",
                    "           )  (   ) )               ",
                    "          (  )  (  (                ",
                    "        ^  ^^  ^ ^^  ^              ",
                    "   1   [=o==o====o==o=]    @    2   ",
                    "  /|\\_o  |  ######  |     /|\\  /|\\  ",
                    "   |     |__________|      |    |   ",
                    "  / \\     |        |      / \\  / \\  ",
                ],
                [
                    "           )  (    )                ",
                    "          (    ) (  (               ",
                    "           )  (   )  )              ",
                    "         ^^  ^ ^^  ^  ^             ",
                    "   1   [==o==o==o==o==]   \\@/  \\2/  ",
                    " o_/|\\   |  ######  |      |    |   ",
                    "   |     |__________|      |    |   ",
                    "  / \\     |        |      / \\  / \\  ",
                ],
            ],
            palette: {
                '(': '#666', ')': '#666', '^': ['#f00', '#f80', '#ff0'], '#': ['#f40', '#c00', '#f80'],
                'o': '#c63', '=': '#999', '[': '#999', ']': '#999',
                '6:_': '#777', '5:|': '#777', '6:|': '#777', '7:|': '#777',
            },
        },
        dinner: {
            frames: [
                [
                    "      ~     ~       ~     ~      ",
                    "      1     @       2     3      ",
                    "     /|\\   /|\\     /|\\   /|\\     ",
                    "  ____________________________   ",
                    "  | (_)  [===]  (_)  {o}  (_) |  ",
                    "  |___________________________|  ",
                    "    ||                     ||    ",
                ],
                [
                    "       ~     ~     ~       ~     ",
                    "      1     @       2     3      ",
                    "     /|>   \\|/     <|\\   /|\\     ",
                    "  ____________________________   ",
                    "  | (_)  [===]  (_)  {o}  (_) |  ",
                    "  |___________________________|  ",
                    "    ||                     ||    ",
                ],
            ],
            palette: {
                '~': ['#ccc', '#888'], '(': '#c84', ')': '#c84', '4:_': '#c84', '[': '#f80', ']': '#f80', '4:=': '#f80',
                '{': '#e44', '}': '#e44', 'o': '#e44',
                '3:_': '#a62', '4:|': '#a62', '5:|': '#a62', '5:_': '#a62', '6:|': '#a62',
            },
        },
        drinks: {
            frames: [
                [
                    "                                 ",
                    "    1         @         2        ",
                    "   /|\\_[u]   /|\\_[u]   /|\\_[u]   ",
                    "    |         |         |        ",
                    "   / \\       / \\       / \\       ",
                    " =============================== ",
                ],
                [
                    "       *  c h e e r s !  *       ",
                    "    1  [u]    @  [u]    2  [u]   ",
                    "   /|\\_/     /|\\_/     /|\\_/     ",
                    "    |         |         |        ",
                    "   / \\       / \\       / \\       ",
                    " =============================== ",
                ],
            ],
            palette: {
                '[': '#a72', ']': '#a72', 'u': '#fc3', '*': ['#ff0', '#f80'],
                '0:c': '#ff0', '0:h': '#ff0', '0:e': '#ff0', '0:r': '#ff0', '0:s': '#ff0', '0:!': '#ff0',
                '=': '#a62',
            },
        },
        home: {
            frames: [
                [
                    "   .--------.                    ",
                    "   | ~ <o>  |        @           ",
                    "   |  ~~ *  |       /|\\_         ",
                    "   '--------'        |  [~|~]    ",
                    "       ||       [===========]    ",
                    "    ___||___    [___________]    ",
                ],
                [
                    "   .--------.                    ",
                    "   |  * ~~  |        @           ",
                    "   | <o>  ~ |       /|\\_         ",
                    "   '--------'        |  [~/~]    ",
                    "       ||       [===========]    ",
                    "    ___||___    [___________]    ",
                ],
            ],
            palette: {
                '1:~': ['#0cf', '#f0c', '#cf0'], '2:~': ['#0cf', '#f0c', '#cf0'], '<': '#f44', '>': '#f44', 'o': '#ff0',
                '*': ['#fff', '#0cf'], '.': '#888', '-': '#888', "'": '#888', '0:|': '#888', '1:|': '#888',
                '3:|': '#ccc', '4:|': '#888', '5:|': '#888', '5:_': '#888',
                '2:/': '#ccc', '2:\\': '#ccc', '2:_': '#ccc',
                // the book: brown covers, pages that flip
                '3:[': '#c84', '3:]': '#c84', '3:~': '#eee', '3:/': '#eee',
                '4:[': '#a44', '4:]': '#a44', '4:=': '#a44', '5:[': '#a44', '5:]': '#a44',
            },
        },
        sleep: {
            frames: [
                [
                    "  (                        z     ",
                    "                       z         ",
                    "                    .            ",
                    "   ___________________           ",
                    "  |@ ~~~~~~~~~~~~~~~~ |          ",
                    "  |___________________|          ",
                    "  ||                 ||          ",
                ],
                [
                    "  (                           Z  ",
                    "                        Z        ",
                    "                     z           ",
                    "   ___________________           ",
                    "  |@ ~~~~~~~~~~~~~~~~ |          ",
                    "  |___________________|          ",
                    "  ||                 ||          ",
                ],
            ],
            palette: {
                '(': '#ffc', 'z': '#88f', 'Z': '#aaf', '.': '#66a', '~': '#66c',
                '_': '#a62', '|': '#a62',
            },
        },
    },

    // Which scene goes with tonight's plan ('dinner', 'drinks', 'dancing' or "Name's barbeque").
    // The end-of-shift plaque: text as it is (no cast substitution), flowers that sway.
    setPlaque: function (lines) {
        let palette = { '/': '#999', '\\': '#999', '|': '#999' };
        let flowers = lines.findIndex(function (l) { return l.indexOf('*') >= 0; });
        palette[flowers + ':*'] = '#f8c'; // only the flower row: "PEACE," keeps its comma white
        palette[flowers + ':,'] = '#f8c';
        palette['0:_'] = '#999';
        palette[(lines.length - 1) + ':_'] = '#6a4';
        palette[(lines.length - 1) + ':\\'] = '#6a4';
        palette[(lines.length - 1) + ':/'] = '#6a4';
        palette[(lines.length - 1) + ':|'] = '#6a4';
        this.art.plaque = {
            literal: true,
            frames: [lines, lines.map(function (l) { return l.replace(/\*/g, ','); })],
            palette: palette,
        };
    },

    forPlan: function (plan) {
        if (plan == 'dinner' || plan == 'drinks' || plan == 'dancing') {
            return plan;
        }
        return 'bbq';
    },

    // Up to three comrades from today: the host first, then the others in roster order.
    pickCast: function () {
        let list = (typeof Game != 'undefined' && Game.monsterList) ? Game.monsterList.filter(function (m) { return m.alive; }) : [];
        let host = Game.convoTags ? Game.convoTags.dinnerHost : null;
        list.sort(function (a, b) { return (b.name == host ? 1 : 0) - (a.name == host ? 1 : 0); });
        let cast = [];
        for (let i = 0; i < 3; i++) {
            let m = list[i];
            cast.push(m ? {char: m.char, color: m.color} : {char: '&', color: '#888'});
        }
        return cast;
    },

    // The cell to draw for character `ch` at column x, row y, on frame f.
    cell: function (scene, ch, x, y, f) {
        if (scene.literal) {
            let lc = scene.palette[y + ':' + ch] || scene.palette[ch];
            return [ch, lc || '#ddd'];
        }
        if (ch == '@') {
            return ['@', '#ff0'];
        }
        if (ch >= '1' && ch <= '3') {
            let who = this.current.cast[ch.charCodeAt(0) - 49];
            return [who.char, who.color];
        }
        let c = scene.palette[y + ':' + ch];
        if (c == null) {
            c = scene.palette[ch];
        }
        if (Array.isArray(c)) {
            c = c[(x + f) % c.length];
        }
        return [ch, c || '#ccc'];
    },

    // Called from the conversation drawing: shows `name` above the cutscene text.
    show: function (name, node) {
        if (!(name in this.art)) {
            this.stop();
            return;
        }
        if (this.current == null || this.current.node !== node) {
            this.current = {name: name, node: node, frame: 0, cast: this.pickCast()};
        }
        this.draw();
        this.schedule();
    },

    draw: function () {
        if (this.current == null || Game.display == null || Game.layoutInfo == null) {
            return;
        }
        let scene = this.art[this.current.name];
        let lines = scene.frames[this.current.frame % scene.frames.length];
        let w = 0;
        for (let i = 0; i < lines.length; i++) {
            w = Math.max(w, lines[i].length);
        }
        let cols = Game.layoutInfo.mapCols;
        let left = Math.max(0, Math.floor((cols - w) / 2));
        let top = Math.max(0, Game.offset[1] - Math.floor(lines.length / 2) - 3);
        for (let y = 0; y < lines.length; y++) {
            for (let x = 0; x < w && left + x < cols; x++) {
                let ch = lines[y][x] || ' ';
                let c = ch == ' ' ? [' ', '#000'] : this.cell(scene, ch, x, y, this.current.frame);
                Game.display.draw(left + x, top + y, c[0], c[1], '#000');
            }
        }
    },

    // The cutscene line currently on screen, if any.
    activeNode: function () {
        let t = Game.player ? Game.player.talking : null;
        let scene = t && t.convos ? t.convos[t.convoIndex] : null;
        return scene ? scene[t.convoInnerDex] : null;
    },

    schedule: function () {
        if (this.timer != null) {
            return;
        }
        let self = this;
        this.timer = setTimeout(function () {
            self.timer = null;
            if (self.current == null || self.activeNode() !== self.current.node || Game.player.instructions) {
                self.current = null;
                return;
            }
            self.current.frame++;
            self.draw();
            self.schedule();
        }, this.FRAME_MS);
    },

    stop: function () {
        this.current = null;
        if (this.timer != null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    },
};

if (typeof module !== 'undefined') module.exports = Scenes;
