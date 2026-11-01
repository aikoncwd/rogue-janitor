// Short visual effects drawn on top of the map: the broom wiggling over a tile
// you just mopped, the grabber reaching for litter, the sparkle of a repair.
// Purely cosmetic: the game keeps running while they play.
var Effects = {
    FRAME_MS: 70,
    list: [],
    timer: null,
    now: function () {
        return Date.now();
    },

    // Broom glyph for a tool pointing from the player towards (dx,dy).
    // Screen y grows downwards, so up-right is '/' and down-right is '\'.
    toolChar: function (dx, dy) {
        if (dy == 0) {
            return '-';
        }
        if (dx == 0) {
            return '|';
        }
        return (dx * dy > 0) ? '\\' : '/';
    },

    // The same glyph rotated by `steps` eighth-turns-of-a-half-turn ('-' -> '\' -> '|' -> '/').
    rotate: function (ch, steps) {
        let ring = ['-', '\\', '|', '/'];
        let i = ring.indexOf(ch);
        if (i < 0) {
            return ch;
        }
        return ring[((i + steps) % 4 + 4) % 4];
    },

    // Fades a colour towards black: t=0 gives `from`, t=1 gives '#000'.
    fade: function (from, t) {
        try {
            let c = ROT.Color.fromString(from);
            return ROT.Color.toHex(ROT.Color.interpolate(c, [0, 0, 0], Math.max(0, Math.min(1, t))));
        } catch (e) {
            return '#000';
        }
    },

    // Frames for each cleaning verb. `messColor` tints the background of the
    // first frames so the stain visibly gets scrubbed away.
    framesFor: function (verb, dx, dy, messColor) {
        let base = this.toolChar(dx, dy);
        let frames = [];
        if (verb == 'mop') {
            let wiggle = [0, 1, 0, -1, 0, 1, 0];
            for (let i = 0; i < wiggle.length; i++) {
                frames.push([this.rotate(base, wiggle[i]), '#fd8', this.fade(messColor || '#000', 0.35 + i / wiggle.length)]);
            }
        }
        else if (verb == 'get') {
            frames.push([base, '#ff0', '#000']);
            frames.push([base, '#ff0', '#000']);
            frames.push(['*', '#fff', '#000']);
            frames.push(['+', '#888', '#000']);
        }
        else if (verb == 'vacuum') {
            frames.push(['@', '#aaa', '#000']);
            frames.push(['o', '#888', '#000']);
            frames.push(['°', '#777', '#000']);
            frames.push(['·', '#555', '#000']);
        }
        else if (verb == 'fix') {
            frames.push(['T', '#fa0', '#000']);
            frames.push(['⊥', '#fa0', '#000']);
            frames.push(['T', '#fa0', '#000']);
            frames.push(['*', '#ff0', '#000']);
            frames.push(['+', '#fa0', '#000']);
        }
        else { // sparkle (secret doors, bonuses)
            frames.push(['*', '#ff0', null]);
            frames.push(['+', '#fff', null]);
            frames.push(['*', '#ff0', null]);
        }
        return frames;
    },

    add: function (x, y, frames) {
        this.list.push({ x: x, y: y, frames: frames, start: this.now() });
        this.schedule();
    },

    // Plays the cleaning effect for a tile next to the player.
    clean: function (verb, x, y, messColor) {
        let p = Game.player;
        this.add(x, y, this.framesFor(verb, x - p.x, y - p.y, messColor));
    },

    // Drops finished effects; returns the ones still playing with their current frame.
    current: function () {
        let t = this.now();
        let self = this;
        this.list = this.list.filter(function (e) {
            return Math.floor((t - e.start) / self.FRAME_MS) < e.frames.length;
        });
        return this.list.map(function (e) {
            let i = Math.min(e.frames.length - 1, Math.floor((t - e.start) / self.FRAME_MS));
            return { x: e.x, y: e.y, frame: e.frames[i] };
        });
    },

    // Called by Game.drawMap after the map: draws visible effects relative to the camera.
    draw: function (cam) {
        let active = this.current();
        for (let i = 0; i < active.length; i++) {
            let e = active[i];
            let tile = Game.map[e.x + ',' + e.y];
            if (!tile || !tile.visible) {
                continue;
            }
            let f = e.frame;
            Game.drawCell(e.x - cam.x, e.y - cam.y, f[0], f[1], f[2] == null ? tile.bgColor : f[2]);
        }
    },

    // Redraws while effects are playing. Never redraws over a conversation or the help.
    schedule: function () {
        if (this.timer != null) {
            return;
        }
        let self = this;
        this.timer = setTimeout(function () {
            self.timer = null;
            if (self.current().length == 0) {
                if (self.canRedraw()) {
                    Game.drawMap(); // clear the last frame
                }
                return;
            }
            if (self.canRedraw()) {
                Game.drawMap();
            }
            self.schedule();
        }, this.FRAME_MS);
    },

    canRedraw: function () {
        return Game.display != null && Game.phase == 'cleaning' && Game.player != null &&
            Game.player.talking == null && !Game.player.instructions;
    },

    clear: function () {
        this.list = [];
        if (this.timer != null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    },
};

if (typeof module !== 'undefined') module.exports = Effects;
