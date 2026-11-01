var Game = {
    display: null,
    map: {},
    freeCells:[],
    hallCells:[],
    rooms:[],
    roomCenters:[],
    player:null,
    scheduler:null,
    engine:null,
    offset: [],
    corners:[],
    dungeonTheme:{
        floorColor:'#ddd',
        corridorWalls:['#b82','#842'],
        roomWalls:['#ddd','#777'],
        doorColor:['#ddd','#842'],
    },
    staffRoomID:-1,
    animalRoomID:-1,
    partyRoomID:-1,
    stairs:[[0,0,-1],[0,0,-1]],
    nameRegistry:[],
    adventurer: null,
    fov:null,
    monsterList:[],
    petList:[],
    playerPet:null,
    messNumbers:[0,0],
    shift: {cleaned:0, passes:0, requestsDone:0, startPoints:0},
    screen: null,
    lastMessage: "",
    lastlastMessage: "",
    lastlastMessageTime:-1,
    coffeeThreshold:Math.floor(40*ROT.RNG.getUniform())+20,
    inviteOutThreshold:Math.floor(15*ROT.RNG.getUniform())+80,
    convoTags:{},
    day: 1,
    unionist: null,
    targetPoints:1500,
    // Dungeon size grows with the days: a small first shift, then 1-2 more rooms
    // every morning (the staff lounge counts as one of them).
    DAY1_ROOMS: 5,
    MAX_ROOMS: 16,
    dungeonRooms: 5,
    yendorPoints:0,
    victory:false,
    pastHeroes:[], // every hero so far: their ghosts may visit
    todayEvent:null,
    hintsToday:[], // easter-egg hints already given today
    amuletStolen:false,
    phase:'intro', // 'intro' | 'invasion' | 'cleaning'
    log: new MessageLog(),
    fontSize: 16,
    MIN_FONT: 12,
    MAX_FONT: 48,
    FONT_STEP: 2,
    TARGET_ROWS: 40,

    init: function() {
        this.screen = document.getElementById("gameContainer");
        this.fontSize = this.chooseFontSize();
        this.display = new ROT.Display({fontSize:this.fontSize});
        this.getSize(false);
        this.screen.appendChild(this.display.getContainer());
        this.setup();
        this.begin();
    },

    // Everything init does that does not need the DOM. The engine is created but
    // only started by Invasion.start() once the intro screen is dismissed.
    setup: function() {
        this.scheduler = new ROT.Scheduler.Simple();
        this.player = new Player(-1,-1,-1);
        this.fov = new ROT.FOV.PreciseShadowcasting(function(x,y){
            return Game.lightPasses(x,y);
        });
        this.engine = new ROT.Engine(this.scheduler);
        window.addEventListener("keydown", function(e) { Game.onKey(e); });
    },

    begin: function() {
        this.generateDungeon();
        this.phase = 'title';
        Title.start();
        this.drawMap();
    },

    // Global keys, active in every phase. Player/conversation keys are handled by
    // their own listeners.
    onKey: function(e) {
        let code = e.keyCode;
        // leave browser shortcuts alone (reload, devtools, fullscreen, alt-tab...)
        if (e.ctrlKey || e.metaKey || e.altKey || (code >= 112 && code <= 123) || [9,16,17,18,20,91,92,93].indexOf(code) >= 0) {
            return;
        }
        Sfx.unlock();
        Music.resume();
        if (this.phase == 'cleaning' && typeof EasterEggs != 'undefined') {
            if (EasterEggs.prompt != null) {
                return; // typing a #command: letters are letters, not music/sound/zoom keys
            }
            EasterEggs.track(code);
        }
        // zoom: + / - (main keyboard or numpad), 0 = automatic size
        if (e.key == '+' || e.key == '=' || code == 107) {
            this.setFontSize(this.fontSize + this.FONT_STEP, true);
            return;
        }
        if (e.key == '-' || e.key == '_' || code == 109) {
            this.setFontSize(this.fontSize - this.FONT_STEP, true);
            return;
        }
        if (e.key == '0' || code == 96) { // main keyboard or numpad 0 (NumLock on or off)
            this.setFontSize(this.autoFontSize(), false);
            return;
        }
        if (e.keyCode == 84 && !this.typingInConvo()) { // T: music on/off
            Music.toggle();
            if (this.phase != 'cleaning' || this.player.talking == null) {
                this.drawMap();
            }
            return;
        }
        if (e.keyCode == 86) { // V
            Sfx.toggle();
            if (this.phase != 'cleaning' || this.player.talking == null) {
                this.drawMap();
            }
            return;
        }
        if (this.phase == 'title') {
            Title.handleKey(e);
            if (e.preventDefault) {
                e.preventDefault();
            }
            return;
        }
        if (this.phase == 'howto') {
            this.phase = 'intro';
            this.drawMap();
            if (e.preventDefault) {
                e.preventDefault();
            }
            return;
        }
        if (this.phase == 'intro' || this.phase == 'invasion') {
            if (Invasion.handleKey(e.keyCode) && e.preventDefault) {
                e.preventDefault();
            }
        }
    },

    // Font size that gives roughly TARGET_ROWS rows in the current window.
    autoFontSize: function() {
        let h = (this.screen && this.screen.clientHeight) ? this.screen.clientHeight : 640;
        return Math.max(this.MIN_FONT, Math.min(this.MAX_FONT, Math.floor(h / this.TARGET_ROWS)));
    },

    // The player's saved zoom level, or the automatic size.
    chooseFontSize: function() {
        try {
            let saved = parseInt(localStorage.getItem('rj-font'), 10);
            if (saved >= this.MIN_FONT && saved <= this.MAX_FONT) {
                return saved;
            }
        } catch (e) {
            // storage unavailable
        }
        return this.autoFontSize();
    },

    setFontSize: function(size, remember) {
        this.fontSize = Math.max(this.MIN_FONT, Math.min(this.MAX_FONT, size));
        try {
            if (remember) {
                localStorage.setItem('rj-font', String(this.fontSize));
            }
            else {
                localStorage.removeItem('rj-font');
            }
        } catch (e) {
            // storage unavailable: zoom lasts for this session only
        }
        this.display.setOptions({fontSize: this.fontSize});
        this.getSize(true);
    },

    getSize: function(redraw=true) {
        if (this.display == null) {
            return; // window resized before the game finished loading
        }
        var setsize=this.display.computeSize(this.screen.clientWidth,this.screen.clientHeight);
        this.display.setOptions({width: setsize[0],height: setsize[1]});
        this.screenSize = [setsize[0], setsize[1]];
        this.layoutInfo = Panel.layout(setsize[0], setsize[1]);
        this.offset = this.layoutInfo.offset;
        if (redraw) {
            Game.drawMap();
        }
    },

    // Conversations read letters (y/n/digits); T is never one of them, but stay safe.
    typingInConvo: function() {
        return false;
    },

    // Which tune fits what is on screen right now.
    musicTrack: function() {
        if (this.phase == 'title' || this.phase == 'howto' || this.phase == 'intro') {
            return 'title';
        }
        let alt = this.day % 2 == 0 ? '2' : ''; // tunes rotate by day
        if (this.phase == 'invasion') {
            return Invasion.stage == 'card' || Invasion.stage == 'curtain' ? 'night' : 'invasion' + alt;
        }
        return this.onBlackScreen() ? 'night' : 'cleaning' + alt;
    },

    drawMap: function() {
        Music.play(this.musicTrack());
        this.display.clear();

        if (Game.player.instructions) {
            let instructions=[
                ["--- Rogue Janitor ---",0],
                ["A game about cleaning dungeons.",0],
                ["",0],
                ["--- Movement ---",0],
                ["Move with arrow keys, numpad, or with VI keys (hjkl, yubn)",0],
                ["Wait with %c{#ff0}.%c{} or %c{#ff0}5%c{}",24],
                ["",0],
                ["--- Cleaning ---",0],
                ["(%c{#ff0}M%c{})op messes.",12],
                ["(%c{#ff0}P%c{})ick up or (%c{#ff0}G%c{})et garbage or other items.",24],
                ["(%c{#ff0}F%c{})ix or (%c{#ff0}R%c{})epair broken furniture.",24],
                ["All cleaning methods affect tiles you are next to.",0],
                ["All cleaning methods can reveal hidden doors!",0],
                ["Careful: slime puddles are slippery!",0],
                ["",0],
                ["--- Other ---",0],
                ["(%c{#ff0}O%c{})pen or (%c{#ff0}C%c{})lose doors.",24],
                ["(%c{#ff0}EX%c{})amine your surroundings.",12],
                ["Walk into monsters and other objects to interact with them.",0],
                ["Toggle sound with %c{#ff0}V%c{}, music with %c{#ff0}T%c{}",24],
                ["Zoom with %c{#ff0}+%c{} and %c{#ff0}-%c{}, automatic size with %c{#ff0}0%c{}",36],
                ["Display this help prompt with %c{#ff0}?%c{}",12]
            ];
            let halfLength=Math.floor(instructions.length/2);
            for (let i=0;i<instructions.length;i++) {
                let halfwidth=Math.floor((instructions[i][0].length - instructions[i][1])/2);
                this.display.drawText(this.offset[0]-halfwidth,this.offset[1]-halfLength+i,instructions[i][0]);
            }
            return;
        }

        if (this.phase == 'title') {
            Title.draw();
            return;
        }

        if (this.phase == 'howto') {
            Title.drawLines(Flavor.pools.howtoText, true);
            return;
        }

        if (this.phase == 'intro') {
            this.drawCentered(Flavor.pools.introText);
            return;
        }

        if (this.phase == 'invasion' && Invasion.stage == 'card') {
            this.drawCentered(Invasion.cardLines);
            this.drawChrome();
            return;
        }

        let cam = this.cameraTarget();
        let invading = this.phase == 'invasion';
        for (let i=-this.offset[0]+cam.x;i<=this.offset[0]+cam.x;i++) {
            for (let j=-this.offset[1]+cam.y;j<=this.offset[1]+cam.y;j++) {
                let key=i+','+j;
                if (key in this.map) {
                    let art = this.map[key].getMemoryArt();
                    this.drawCell(i-cam.x,j-cam.y,art[0],art[1],art[2]);
                }
            }
        }
        this.fov.compute(cam.x,cam.y,50,function(x,y,r,visibility) {
            let key=x+','+y;
            if (key in Game.map) {
                let art = Game.map[key].getArt();
                let bg = (invading && key in Invasion.flashes) ? '#a00' : art[2];
                Game.drawCell(x-cam.x,y-cam.y,art[0],art[1],bg);
            }
        });
        if (invading) {
            // fainted monsters lie where they fell until the hero leaves
            for (let i=0;i<Invasion.bodies.length;i++) {
                let b = Invasion.bodies[i];
                let tile = this.map[b.x+','+b.y];
                if (tile && tile.visible && tile.entity == null) {
                    this.drawCell(b.x-cam.x,b.y-cam.y,b.char,'#555',tile.bgColor);
                }
            }
            // the hero is talking (or quaffing, or posing): a marker over their head
            let hero = this.adventurer;
            if (Invasion.speaking && Invasion.stage == null && hero != null && hero.active) {
                let above = this.map[hero.x+','+(hero.y-1)];
                if (above && above.visible && above.passable && above.entity == null) {
                    this.drawCell(hero.x-cam.x,hero.y-1-cam.y,'!','#ff0',above.bgColor);
                }
            }
        }
        else {
            Effects.draw(cam);
            this.drawQuestMarkers(cam);
        }
        let curtain = invading ? Invasion.curtainRows(this.layoutInfo.mapRows) : 0;
        for (let k=0;k<curtain;k++) {
            for (let x=0;x<this.layoutInfo.mapCols;x++) {
                this.display.draw(x,k,' ','#000','#000');
                this.display.draw(x,this.layoutInfo.mapRows-1-k,' ','#000','#000');
            }
        }

        if (invading && Invasion.stage == null && !Invasion.skipping) {
            let banner = Invasion.bannerText(this.layoutInfo.mapCols);
            let len = banner.replace(/%c\{[^}]*\}/g, '').length;
            // a wall-grey strip across the top, so it reads as part of the screen, not a hole in the map
            let wall = this.dungeonTheme.roomWalls[1];
            for (let x = 0; x < this.layoutInfo.mapCols; x++) {
                this.display.draw(x, 0, ' ', '#fff', wall);
            }
            this.display.drawText(Math.max(0, Math.floor((this.layoutInfo.mapCols - len) / 2)), 0, '%b{' + wall + '}' + banner);
        }

        this.drawChrome();

        this.transientMessage = null;
        if (EasterEggs.prompt != null) {
            if (Game.player.talking != null || this.phase != 'cleaning') {
                EasterEggs.closePrompt(); // a conversation took over
            }
            else {
                this.showTransient(EasterEggs.promptText());
            }
        }
        if (Game.player.examining != null) {
            this.display.draw(Game.player.examining[0]+Game.offset[0]-Game.player.x,Game.player.examining[1]+Game.offset[1]-Game.player.y,'X','#ff0');
            let lookKey=Game.player.examining[0]+','+Game.player.examining[1];
            if (lookKey in this.map && this.map[lookKey].visible) {
                if (this.map[lookKey].entity != null) {
                    if (this.map[lookKey].entity == Game.player) {
                        this.showTransient("It's you!");
                    }
                    else {
                        this.showTransient(this.map[lookKey].entity.describe ? this.map[lookKey].entity.describe() : this.map[lookKey].entity.name+".");
                    }
                }
                else if (this.map[lookKey].mess != null) {
                    this.showTransient(this.map[lookKey].mess.describe());
                }
                else if (this.map[lookKey].door != null) {
                    if (this.map[lookKey].open) {
                        this.showTransient("Open door.");
                    }
                    else {
                        this.showTransient("Closed door.");
                    }
                }
                else if (!this.map[lookKey].passable) {
                    this.showTransient("Wall.");
                }
                else if (this.map[lookKey].char=='>') {
                    this.showTransient("Down staircase.");
                }
                else if (this.map[lookKey].char=='<') {
                    this.showTransient("Up staircase.");
                }
                else {
                    this.showTransient("Floor.");
                }
            }
            else {
                this.showTransient("You can't see that area.");
            }
        }

        if (Game.player.talking) {
            Game.player.talking.doConvo();
        }
        this.drawLog();
    },

    // True while a comrade has a quest you have not taken yet: a favour they are about
    // to ask for, or a lost item they have not told you about. Taking it (hearing them
    // out) turns the marker off.
    hasQuestToGive: function(m) {
        if (!m.alive) {
            return false;
        }
        if (!m.convoTags.offerSeen && m.convos.some(function(c) { return c[0] && c[0].tags && 'offerSeen' in c[0].tags; })) {
            return true;
        }
        return m.questItem != null && !('questItemSuccess' in m.convoTags) && !m.convoTags.questHeard;
    },

    QUEST_BLINK_MS: 450,
    questBlinkTimer: null,

    stopQuestBlink: function() {
        if (this.questBlinkTimer != null) {
            clearTimeout(this.questBlinkTimer);
            this.questBlinkTimer = null;
        }
    },

    // Comrades with a quest to give blink between their own glyph and a yellow '!'.
    drawQuestMarkers: function(cam) {
        let any = false;
        let bang = Math.floor(Date.now()/this.QUEST_BLINK_MS) % 2 == 1;
        for (let i=0;i<this.monsterList.length;i++) {
            let m = this.monsterList[i];
            let tile = this.map[m.x+','+m.y];
            if (!tile || !tile.visible || tile.entity !== m || !this.hasQuestToGive(m)) {
                continue;
            }
            any = true;
            if (bang) {
                this.drawCell(m.x-cam.x,m.y-cam.y,'!','#ff0',tile.bgColor);
            }
        }
        if (any && this.questBlinkTimer == null) {
            let self = this;
            this.questBlinkTimer = setTimeout(function() {
                self.questBlinkTimer = null;
                if (Effects.canRedraw()) {
                    self.drawMap();
                }
            }, this.QUEST_BLINK_MS);
        }
    },

    // Lines of text centred in the map area (intro screen, night-shift title card).
    drawCentered: function(lines) {
        let top = this.offset[1] - Math.floor(lines.length/2);
        for (let i=0;i<lines.length;i++) {
            let plain = lines[i].replace(/%c\{[^}]*\}/g, '');
            this.display.drawText(Math.max(0, this.offset[0]-Math.floor(plain.length/2)), top+i, lines[i]);
        }
    },

    onBlackScreen: function() {
        let t = this.player.talking;
        let scene = t && t.convos ? t.convos[t.convoIndex] : null;
        let node = scene ? scene[t.convoInnerDex] : null;
        return node != null && 'blackScreenMessage' in node;
    },

    // Draws one map cell given its position relative to the camera, clipped to the map viewport.
    drawCell: function(dx,dy,ch,fg,bg) {
        let x = dx + this.offset[0];
        let y = dy + this.offset[1];
        if (x >= 0 && y >= 0 && x < this.layoutInfo.mapCols && y < this.layoutInfo.mapRows) {
            this.display.draw(x,y,ch,fg,bg);
        }
    },

    // Side panel plus the separator line above the message log.
    drawChrome: function() {
        let info = this.layoutInfo;
        for (let x=0;x<info.mapCols;x++) {
            this.display.draw(x,info.logY-1,'─','#333','#000');
        }
        Panel.draw(this.display,info,this.screenSize[0],this.screenSize[1]);
    },

    // Examine text: shown as the newest log row while examining, never stored in the log.
    showTransient: function(msg) {
        this.transientMessage = msg;
    },

    drawLog: function() {
        if (this.onBlackScreen()) {
            return; // night cutscenes are a plain black screen
        }
        let info = this.layoutInfo;
        let lines;
        if (this.transientMessage) {
            lines = this.log.recent(Panel.LOG_ROWS - 1).concat([{text: "%c{#ff0}>%c{} " + this.transientMessage, fresh: true}]);
        }
        else {
            lines = this.log.recent(Panel.LOG_ROWS);
        }
        for (let i=0;i<Panel.LOG_ROWS;i++) {
            let y = info.logY+i;
            for (let x=0;x<info.mapCols;x++) {
                this.display.draw(x,y,' ','#000','#000');
            }
            if (i < lines.length) {
                let width = Math.max(1,info.mapCols-2);
                let text = lines[i].fresh ? Panel.fitColored(lines[i].text, width) : "%c{#777}"+Panel.fit(lines[i].text.replace(/%c\{[^}]*\}/g,''), width)+"%c{}";
                this.display.drawText(1,y,text,width);
            }
        }
    },

    // Adds a message to the log. Non-important messages (ambient hints) are dropped
    // while a fresh message is still showing, as before.
    sendMessage: function(msg=null,important=true) {
        if (this.lastMessage != "" && !important) {
            msg=null;
        }
        if (msg != null) {
            this.lastlastMessage=msg;
            this.lastlastMessageTime=4;
            this.lastMessage=msg;
            this.log.push(msg);
        }
        if (this.display != null && this.layoutInfo != null) {
            this.drawLog();
        }
    },

    cleanPercent: function() {
        let cleaned = Game.messNumbers[1] - Game.messNumbers[0];
        let toReturn = 100 * cleaned / Game.messNumbers[1];
        if (toReturn > this.coffeeThreshold || toReturn > this.inviteOutThreshold) {
            this.coffeeThreshold+=200;
            let sendIndex;
            do {
                sendIndex = Math.floor(this.monsterList.length * ROT.RNG.getUniform());
            } while (this.monsterList[sendIndex].alive == false || this.monsterList[sendIndex].retired == false || this.monsterList[sendIndex].partying || this.monsterList[sendIndex].tags.visitor);

            if (toReturn > this.inviteOutThreshold) {
                this.inviteOutThreshold+=200;
                this.monsterList[sendIndex].invitationQuest();
            }
            else {
                this.monsterList[sendIndex].coffeeQuest();
            }
        }
        return Math.floor(toReturn);
    },

    lightPasses: function(x,y) {
        let key=x+','+y;
        if (key in Game.map && Game.map[key].lightPasses()) {
            return true;
        }
        return false;
    },

    makeTheme: function(hueint,sat=0.5) {
        hue=parseFloat(hueint)/360.0;
        //offsethue=parseFloat(hueint+60 % 360)/360.0;
        var colors=[
            ROT.Color.hsl2rgb([hue,0.1*sat,0.6]),
            ROT.Color.hsl2rgb([hue,sat,0.4]),
            ROT.Color.hsl2rgb([hue,sat,0.2]),
            ROT.Color.hsl2rgb([hue,sat,0.6]),
            ROT.Color.hsl2rgb([hue,sat,0.3]),
            ROT.Color.hsl2rgb([hue,0,0.6]),
            ROT.Color.hsl2rgb([hue,0.5*sat,0.2]),
        ];
        return {
            floorColor:ROT.Color.toHex(colors[0]),
            corridorWalls:[ROT.Color.toHex(colors[1]),ROT.Color.toHex(colors[2])],
            roomWalls:[ROT.Color.toHex(colors[3]),ROT.Color.toHex(colors[4])],
            doorColor:[ROT.Color.toHex(colors[5]),ROT.Color.toHex(colors[6])],
        }
    },

    generateDungeon: function() {
        var thetheme=this.dungeonTheme;
        this.shift = {cleaned:0, passes:0, requestsDone:0, startPoints:this.yendorPoints};
        this.coffeeThreshold = Math.floor(10*ROT.RNG.getUniform()+20*ROT.RNG.getUniform())+30;
        this.inviteOutThreshold =Math.floor(7*ROT.RNG.getUniform()+8*ROT.RNG.getUniform())+80;
        //thetheme=this.makeTheme(300.0/360);
        if ('paint' in this.convoTags) {
            switch(this.convoTags.paint) {
                default:
                thetheme=this.dungeonTheme;
                break;
                case 'purple':
                thetheme=this.makeTheme(300);
                break;
                case 'red':
                thetheme=this.makeTheme(0);
                break;
                case 'blue':
                thetheme=this.makeTheme(240);
                break;
                case 'green':
                thetheme=this.makeTheme(120);
                break;
                case 'yellow':
                thetheme=this.makeTheme(60);
                break;
            }
        }
        this.generateMap(Infinity,[4,10],5,thetheme,this.dungeonRooms);
        this.addStairs();
        this.adventurer = new Adventurer(this.stairs[0][0],this.stairs[0][1]);
        this.populateRooms();
        this.addDoors(thetheme);
        Invasion.reset(this.adventurer);
        if (this.day > 1) {
            Invasion.start();
        }
    },

    cameraTarget: function() {
        if (this.phase != 'cleaning' && this.adventurer != null && this.adventurer.active) {
            return this.adventurer;
        }
        if (this.phase == 'invasion' && Invasion.exitSpot != null) {
            return Invasion.exitSpot; // the hero just left: linger on the stairs
        }
        return this.player;
    },

    forgetMap: function() {
        for (let key in this.map) {
            this.map[key].lastSeen=' ';
            this.map[key].visible=false;
        }
    },

    generateDiner: function() {
        var thetheme = {
            floorColor:'#ddd',
            corridorWalls:['#a0a','#505'],
            roomWalls:['#f0f','#808'],
            doorColor:['#ddd','#842'],
        };
        this.generateMap(300,[6,8],0,thetheme);
        //this.addStairs();
        //this.adventurer = new Adventurer(this.stairs[0][0],this.stairs[0][1]);
        //this.populateRooms();
        this.addDoors(thetheme);
        this.scheduler.add(Game.player,true);
    },

    addSecretRoom: function(size,theme,spacing,doorSound=null) {
        let position=[0,0];
        while (!this.checkFits(size,position,spacing)) {
            position[0] += (Math.floor(5*ROT.RNG.getUniform())-2);
            position[1] += (Math.floor(5*ROT.RNG.getUniform())-2);
        }
        this.roomCenters.push([position[0]+Math.floor(size[0]/2) , position[1]+Math.floor(size[1]/2)]);
        this.secretCorridor(this.roomCenters,theme,doorSound);
        this.buildRoom(size,position,theme);
    },

    secretCorridor: function(roomCenters,theme,doorSound=null) {
        let lastCenter = [roomCenters[roomCenters.length-1][0], roomCenters[roomCenters.length-1][1]];
        let index;// = Math.floor((roomCenters.length-1) * ROT.RNG.getUniform());
        let allCells=this.freeCells.concat(this.hallCells);
        let best = 1000;
        let startCenter=[0,0];
        //let index=-1;
        for (let i = 0; i < allCells.length - 1; i++) {
            let key = allCells[i];
            if (key in this.map && this.map[key].mess == null && this.map[key].passThrough()) {
                let parts=key.split(',');
                let px=parseInt(parts[0]);
                let py=parseInt(parts[1]);
                if (Math.abs(lastCenter[0] - px) + Math.abs(lastCenter[1] - py) < best) {
                    index = i;
                    best = Math.abs(lastCenter[0] - px) + Math.abs(lastCenter[1] - py);
                    startCenter[0]=px;
                    startCenter[1]=py;
                }
            }
        }
        //let startCenter = roomCenters[index];
        let direction=[0,0];
        let position=[startCenter[0],startCenter[1]];
        if (Math.abs(lastCenter[0]-startCenter[0]) > Math.abs(lastCenter[1]-startCenter[1])) {
            direction=[Math.sign(lastCenter[0]-startCenter[0]),0];
        }
        else {
            direction=[0,Math.sign(lastCenter[1]-startCenter[1])];
        }
        //let keepGoing=true;
        let secretDoorPlaced=false;
        let outside=false;
        while (position[0] != lastCenter[0] || position[1] != lastCenter[1]) {
            for (let i=-1;i<2;i++) {
                for (let j=-1;j<2;j++) {
                    let key = (position[0]+i)+','+(position[1]+j);
                    //this.map[key] = new Tile(position[0]+i,position[1]+j,'.',theme.floorColor,'#000',true,true);

                    if (i==0 && j==0) {
                        if (key in Game.map && !Game.map[key].passable) {
                            if (secretDoorPlaced) {
                                this.map[key] = new Tile(position[0]+i,position[1]+j,'.',theme.floorColor,'#000',true,true);
                                outside=true;
                            }
                            else {
                                //this.map[key].char='x';
                                this.map[key].secretDoor = {
                                    char:'+',
                                    door:'-',
                                    color:theme.doorColor[0],
                                    bgColor:theme.doorColor[1],
                                    sound:doorSound,
                                }
                                secretDoorPlaced=true;
                            }
                        }
                    }
                    else {
                        if (!(key in Game.map)) {
                            this.map[key] = new Tile(position[0]+i,position[1]+j,'#',theme.corridorWalls[0],theme.corridorWalls[1],false,false);
                        }
                    }
                }
            }
            if (outside==secretDoorPlaced) {
                //direction=[Math.sign(lastCenter[0]-position[0]),Math.sign(lastCenter[1]-position[1])];
                if (Math.abs(lastCenter[0]-position[0])+ ((ROT.RNG.getUniform()>0.5) ? 1 : 0) > Math.abs(lastCenter[1]-position[1])) {
                    direction=[Math.sign(lastCenter[0]-position[0]),0];
                }
                else {
                    direction=[0,Math.sign(lastCenter[1]-position[1])];
                }
                let nextKey=(position[0]+direction[0])+','+(position[1]+direction[1]);
                let nextnextKey=(position[0]+2*direction[0])+','+(position[1]+2*direction[1]);
                if (nextKey in this.map && !this.map[nextKey].passable && nextnextKey in this.map && !this.map[nextnextKey].passable) {
                    if (direction[0]==0) {
                        direction=[Math.sign(lastCenter[0]-position[0]),0];
                    }
                    else {
                        direction=[0,Math.sign(lastCenter[1]-position[1])];
                    }
                }
                //if (position[0]+direction[0])

            }
            position[0]+=direction[0];
            position[1]+=direction[1];
        }
    },

    // Builds rooms until there are `targSize` room cells or `maxRooms` rooms, whichever comes first.
    generateMap: function(targSize = 400 , minMax=[4,10], spacing=5,theme=this.dungeonTheme,maxRooms=Infinity) {
        this.corners=[[0,0],[0,0]];
        this.messNumbers=[0,0];
        this.roomCenters=[];
        var breaker=0;
        //let minMax=[4,10];
        //let targSize=Math.min(400+30*this.day,800);
        this.map={};
        this.freeCells=[];
        this.hallCells=[];
        this.scheduler.clear();
        this.rooms=[];
        this.staffRoomID=-1;
        while (this.freeCells.length<targSize && this.rooms.length<maxRooms && breaker<10000) {
            let roomSize = [ Math.floor((minMax[1]-minMax[0])*ROT.RNG.getUniform())+minMax[0], Math.floor((minMax[1]-minMax[0])*ROT.RNG.getUniform())+minMax[0] ];
            let roomCorner=[0,0];
            var breaker2=0;
            while (!this.checkFits(roomSize,roomCorner,spacing)) {
                roomCorner[0] += (Math.floor(3*ROT.RNG.getUniform())-1);
                roomCorner[1] += (Math.floor(3*ROT.RNG.getUniform())-1);
                roomSize = [ Math.floor((minMax[1]-minMax[0])*ROT.RNG.getUniform())+minMax[0], Math.floor((minMax[1]-minMax[0])*ROT.RNG.getUniform())+minMax[0] ];
                if (this.freeCells.length + roomSize[0] * roomSize[1] >= targSize) {
                    roomSize[0]=minMax[1];
                    roomSize[1] = minMax[1];
                }
                breaker2++;
            }
            if (this.roomCenters.length>0) {
                this.roomCenters.push([roomCorner[0]+Math.floor(roomSize[0]/2) , roomCorner[1]+Math.floor(roomSize[1]/2)]);
            }
            else {
                this.roomCenters = [[roomCorner[0]+Math.floor(roomSize[0]/2) , roomCorner[1]+Math.floor(roomSize[1]/2)]];
            }
            this.buildRoom(roomSize,roomCorner,theme);
            if (ROT.RNG.getUniform()>0.5 && this.freeCells.length<targSize && this.rooms.length<maxRooms) {
                this.connectRoom(this.roomCenters,1,theme);
                this.connectRoom(this.roomCenters,0,theme);
            }
            else {
                this.connectRoom(this.roomCenters,-1,theme);
            }
            breaker++;
        }
        this.staffRoomID = this.rooms.length-1;
        this.player.moveTo(this.roomCenters[this.roomCenters.length-1][0],this.roomCenters[this.roomCenters.length-1][1]);
    },

    addDoors: function(theme=this.dungeonTheme) {
        for (let i=this.corners[0][0];i <= this.corners[1][0];i++) {
            for (let j=this.corners[0][1]; j<= this.corners[1][1];j++) {
                let key = i+','+j;
                let orthoCount=0;
                let diagCount=0;
                let count=0;
                let touchRoom=false;
                if (key in this.map && this.map[key].char == '.') {
                    for (let ii=-1;ii<2;ii++) {
                        for (let jj=-1;jj<2;jj++) {
                            let testKey = (i+ii)+','+(j+jj);
                            if (this.freeCells.indexOf(testKey)>=0) {
                                touchRoom=true;
                            }
                            if (testKey in this.map && this.map[testKey].char=='#') {
                                count++;
                                if (ii==0 || jj==0) {
                                    orthoCount += Math.abs(ii) + 3*Math.abs(jj);
                                }
                                else {
                                    diagCount++;
                                }
                            }
                        }
                    }
                    if (touchRoom && (orthoCount==2 || orthoCount==6) && count>2 && this.hallCells.indexOf(key)>=0) {
                        this.map[key].char='+';
                        this.map[key].door='-';
                        this.map[key].color=theme.doorColor[0];
                        this.map[key].bgColor=theme.doorColor[1];
                    }
                }
            }
        }
    },

    checkFits: function(roomSize,roomCorner,spacing=5) {
        for (let i=-spacing;i<roomSize[0]+spacing;i++) {
            for (let j=-spacing;j<roomSize[1]+spacing;j++) {
                let key = (i+roomCorner[0])+','+(j+roomCorner[1]);
                if (key in this.map) {
                    return false;
                }
            }
        }
        return true;
    },

    buildRoom: function(roomSize,roomCorner,theme=this.dungeonTheme) {
        if (this.rooms.length<1) {
            this.rooms=[ [roomCorner[0],roomCorner[1],roomCorner[0]+roomSize[0],roomCorner[1]+roomSize[1] , 0] ]
        }
        else {
            this.rooms.push( [roomCorner[0],roomCorner[1],roomCorner[0]+roomSize[0],roomCorner[1]+roomSize[1],0] );
        }
        for (let i=-1;i<roomSize[0]+1;i++) {
            for (let j=-1;j<roomSize[1]+1;j++) {
                let key = (i+roomCorner[0])+','+(j+roomCorner[1]);
                
                //console.log(key);
                if (i>=0 && i<roomSize[0] && j>=0 && j<roomSize[1]) {
                    //this.map[key]='.';
                    this.map[key] = new Tile(i,j,'.',theme.floorColor,'#000',true,true);
                    this.freeCells.push(key);
                }
                else {
                    //this.map[key]='#';
                    if (!(key in this.map) || !this.map[key].passable) {
                        this.map[key] = new Tile(i,j,'#',theme.roomWalls[0],theme.roomWalls[1],false,false);
                    }
                    if (i+roomCorner[0] < this.corners[0][0]) {
                        this.corners[0][0] = i+roomCorner[0];
                    }
                    if (j+roomCorner[1] < this.corners[0][1]) {
                        this.corners[0][1] = j+roomCorner[1];
                    }
                    if (i+roomCorner[0] > this.corners[1][0]) {
                        this.corners[1][0] = i+roomCorner[0];
                    }
                    if (j+roomCorner[1] > this.corners[1][1]) {
                        this.corners[1][1] = j+roomCorner[1];
                    }
                }
            }
        }
    },

    getRoomIndex: function(x,y) {
        for (let i=0;i<this.rooms.length;i++) {
            if (this.rooms[i][0] <= x && this.rooms[i][1] <= y && this.rooms[i][2]>=x && this.rooms[i][3]>=y) {
                return i;
            }
        }
        return -1;
    },

    connectRoom: function(roomCenters,xy=-1,theme=this.dungeonTheme) {
        //console.log(roomCenters);

        let lastCenter = [roomCenters[roomCenters.length-1][0], roomCenters[roomCenters.length-1][1]];
        let index = Math.floor((roomCenters.length-1) * ROT.RNG.getUniform());
        let best = 1000;
        //let index=-1;
        for (let i=0;i<roomCenters.length-1;i++) {
            if (xy==0) {
                if (Math.abs(lastCenter[0]-roomCenters[i][0]) < best) {
                    index=i;
                    best=Math.abs(lastCenter[0]-roomCenters[i][0])
                }
            }
            else if (xy==1) {
                if (Math.abs(lastCenter[1]-roomCenters[i][1]) < best) {
                    index=i;
                    best = Math.abs(lastCenter[1]-roomCenters[i][1]);
                }
            }
            else {
                if (Math.abs(lastCenter[0]-roomCenters[i][0]) + Math.abs(lastCenter[1]-roomCenters[i][1]) < best) {
                    index=i;
                    best = Math.abs(lastCenter[0]-roomCenters[i][0]) + Math.abs(lastCenter[1]-roomCenters[i][1]);
                }
            }
        }
        let targCenter = roomCenters[index];
        let startedDigging=false;
        let doFirst = Math.floor(2*ROT.RNG.getUniform());
        for (let k=0;k<2;k++) {
            var breaker=0;
            while (lastCenter[doFirst] != targCenter[doFirst] && breaker<1000) {
                for (let i=-1;i<2;i++) {
                    for (let j=-1;j<2;j++) {
                        let key = (lastCenter[0]+i)+','+(lastCenter[1]+j);
                        if (!(key in this.map) && !startedDigging) {
                            this.rooms[this.rooms.length-1][4]++;
                            startedDigging=true;
                        }
                        if (i==0 && j==0) {
                            //console.log(key);
                            if (this.map[key].char == '.' && startedDigging) {
                                if (this.getRoomIndex(lastCenter[0],lastCenter[1]) >= 0) {
                                    this.rooms[this.getRoomIndex(lastCenter[0],lastCenter[1])][4]++;
                                }
                                return;
                            }
                            if (key in this.map && this.map[key].char != '.') {
                                this.hallCells.push(key);
                            }
                            //this.map[key]='.';
                            this.map[key] = new Tile(i,j,'.',theme.floorColor,'#000',true,true);
                        }
                        else if (!(key in this.map)) {
                            //this.map[key]='#';
                            this.map[key] = new Tile(i,j,'#',theme.corridorWalls[0],theme.corridorWalls[1],false,false);
                        }
                    }
                }
                if (lastCenter[doFirst] > targCenter[doFirst]) {
                    lastCenter[doFirst]--;
                }
                else if (lastCenter[doFirst] < targCenter[doFirst]) {
                    lastCenter[doFirst]++;
                }
                breaker++;
            }
            doFirst++;
            doFirst %= 2;
        }
    },

    addStairs: function() {
        // try to put as far apart as possible. Exclude staff room
        let best=[-1,-1,-1];
        for (let i=0;i<this.rooms.length;i++) {
            if (i==this.staffRoomID) {
                continue;
            }
            for (let j=i;j<this.rooms.length;j++) {
                if (j==this.staffRoomID) {
                    continue;
                }
                let center1 = [Math.round((this.rooms[i][0]+this.rooms[i][2])/2),Math.round((this.rooms[i][1]+this.rooms[i][3])/2)];
                let center2 = [Math.round((this.rooms[j][0]+this.rooms[j][2])/2),Math.round((this.rooms[j][1]+this.rooms[j][3])/2)];
                let dist = Math.abs(center1[0] - center2[0]) + Math.abs(center1[1] - center2[1]);
                //console.log(dist);
                if (dist > best[2]) {
                    best[0]=i;
                    best[1]=j;
                    best[2]=dist;
                    console.log(best[0]+','+best[1]+','+best[2]);
                }
            }
        }
        if (ROT.RNG.getUniform()>0.5) {
            let scratch=best[0];
            best[0]=best[1];
            best[1]=scratch;
        }
        let center1 = [Math.floor((this.rooms[best[0]][0]+this.rooms[best[0]][2])/2),Math.floor((this.rooms[best[0]][1]+this.rooms[best[0]][3])/2)];
        let center2 = [Math.floor((this.rooms[best[1]][0]+this.rooms[best[1]][2])/2),Math.floor((this.rooms[best[1]][1]+this.rooms[best[1]][3])/2)];
        let key1=center1[0]+','+center1[1];
        let key2=center2[0]+','+center2[1];
        this.map[key1].char='<';
        this.map[key1].important=true;
        this.map[key2].important=true;
        this.map[key2].char='>';
        this.stairs=[ [center1[0],center1[1],best[0]] , [center2[0],center2[1],best[1]] ];
        console.log(this.stairs);
    },

    getCenter(roomID) {
        if (roomID<0 || roomID >= this.rooms.length) {
            return null;
        }
        let center = [Math.floor((this.rooms[roomID][0]+this.rooms[roomID][2])/2),Math.floor((this.rooms[roomID][1]+this.rooms[roomID][3])/2)];
        return center;
    },

    populateRooms: function() {
        for (let i=0;i<this.rooms.length;i++) {
            if (i==this.staffRoomID) {
                continue;
            }
            let center=this.getCenter(i);
            let validForItems=[];
            let roomSize=0;
            for (let x = this.rooms[i][0]; x < this.rooms[i][2]; x++) {
                for (let y = this.rooms[i][1]; y < this.rooms[i][3]; y++) {
                    roomSize++;
                    let wallCount = 0;
                    let floorCount = 0;
                    for (let ii = -1; ii < 2; ii++) {
                        for (let jj = -1; jj < 2; jj++) {
                            let key = (x + ii) + ',' + (y + jj);
                            if (key in this.map) {
                                if (this.map[key].passThrough()) {
                                    floorCount++;
                                }
                                else {
                                    wallCount++;
                                }
                            }
                        }
                    }
                    if (wallCount==3 && floorCount==6) {
                        let key=x+','+y;
                        validForItems.push(key);
                        //continue;
                    }
                }
            }
            if (validForItems.length > 0) {
                for (let k = 0; k < Math.max(2, 5 - this.rooms[i][4]); k++) {
                    let index = Math.floor(ROT.RNG.getUniform() * validForItems.length);
                    let parts = validForItems[index].split(',');
                    AddCollectible(parseInt(parts[0]), parseInt(parts[1]));
                    validForItems.splice(index,1);
                    if (validForItems.length<=0) {
                        break;
                    }
                }
            }

            if (validForItems.length > 0 && ROT.RNG.getUniform() < 0.7) {
                let parts = ROT.RNG.getItem(validForItems).split(',');
                GetEntity(ROT.RNG.getItem(['Banner','Torch']), parseInt(parts[0]), parseInt(parts[1]));
            }
            this.addCobwebs(i);

            let maxLevel = Math.floor(4*ROT.RNG.getUniform())+1;
            let danger = Math.max(1,Math.ceil(roomSize/40));
            if (this.rooms[i][4]<3) {
                danger++;
            }
            if (this.rooms[i][4]<2) {
                maxLevel++;
                danger*=2;
            }
            if (i==this.stairs[1][2]) {
                maxLevel=6;
                danger=7;
            }
            if (i==this.stairs[0][2]) {
                danger=1;
            }
            while (danger>0) {
                let level = Math.min(danger,Math.floor(ROT.RNG.getUniform()*maxLevel)+1);
                let newMonster=AddMonster(center[0],center[1],level);
                danger-=newMonster.level;
            }
        }
    },

    // The dungeon was never spotless to begin with: cobwebs in some room corners.
    addCobwebs: function(roomID) {
        let r = this.rooms[roomID];
        let corners = [[r[0],r[1]],[r[2]-1,r[1]],[r[0],r[3]-1],[r[2]-1,r[3]-1]];
        for (let k=0;k<corners.length;k++) {
            if (ROT.RNG.getUniform() > 0.3) {
                continue;
            }
            let key = corners[k][0]+','+corners[k][1];
            let tile = this.map[key];
            if (tile && tile.passable && !tile.important && tile.mess == null && tile.door == null) {
                makeMess(corners[k][0],corners[k][1],'Cobweb');
            }
        }
    },

    moveMonstersToLounge: function() {
        // build the party room
        this.addSecretRoom([5,5],this.makeTheme(300,0.9),1,"You hear the sound of muffled music.");
        this.partyRoomID=this.rooms.length-1;

        if ('animal' in this.convoTags && this.convoTags.animal != 'none') {
            let doorSound;
            switch (this.convoTags.animal) {
                default:
                case 'dog':
                doorSound="You hear the faint sound of barking.";
                break;
                case 'cat':
                doorSound="You hear a muffled meowing sound.";
                break;
                case 'rat':
                doorSound="You hear a muffled squeaking sound.";
                break;
                case 'rabbit':
                doorSound="You hear the sound of thumping.";
                break;
                case 'horse':
                doorSound="You hear sound of galloping."
                break;
            }
            this.addSecretRoom([5,5],this.makeTheme(200,0.75),1,doorSound);
            this.animalRoomID=this.rooms.length-1;
            let animalCenter=[
                Math.floor((this.rooms[this.animalRoomID][0]+this.rooms[this.animalRoomID][2])/2),
                Math.floor((this.rooms[this.animalRoomID][1]+this.rooms[this.animalRoomID][3])/2)
            ];
            let feederPos=[ this.rooms[this.animalRoomID][0]+1 , this.rooms[this.animalRoomID][1]+1 ];
            let foodBowl = new FoodBowl(feederPos[0],feederPos[1]);
            //let feederKey = feederPos[0]+','+feederPos[1];
            if (this.petList.length>0 && this.playerPet==null && this.player.cutscene==null) {
                let mostLove=[-1,-1];
                for (let i=0;i<this.petList.length;i++) {
                    if (this.petList[i].playerInteractions>mostLove[0]) {
                        mostLove[0]=this.petList[i].playerInteractions;
                        mostLove[1]=i;
                    }
                }
                if (mostLove[0]>5) {
                    this.playerPet=this.petList[mostLove[1]];
                    this.player.cutscene=[{message:"%c{#ff0}"+this.playerPet.name+" loves you a lot! They have adopted you.%c{}",any:-1}]
                }
            }
            //console.log('center'+animalCenter);
            let iterations=Math.min(8,Math.floor(this.yendorPoints/200)+2);
            for (let i=0;i<iterations;i++) {
                if (i<this.petList.length) {
                    if (this.petList[i]==this.playerPet) {
                        this.petList[i].recenter(this.player.x,this.player.y);
                    }
                    else {
                        this.petList[i].recenter(animalCenter[0],animalCenter[1]);
                    }
                }
                else {
                    let newPet = AddPet(animalCenter[0],animalCenter[1],this.convoTags.animal);//new Pet(animalCenter[0],animalCenter[1],'d','Dog');
                }
            };
        }

        let validSpots=[];
        let validPartySpots=[];
        ConversationBuilder.usedGenericOptions=[];
        this.requestsOffered=0;

        for (let x = this.rooms[this.partyRoomID][0]; x < this.rooms[this.partyRoomID][2]; x++) {
            for (let y = this.rooms[this.partyRoomID][1]; y < this.rooms[this.partyRoomID][3]; y++) {
                let wallCount = 0;
                let floorCount = 0;
                for (let ii = -1; ii < 2; ii++) {
                    for (let jj = -1; jj < 2; jj++) {
                        let key = (x + ii) + ',' + (y + jj);
                        if (key in this.map) {
                            if (this.map[key].passable) {
                                floorCount++;
                            }
                            else {
                                wallCount++;
                            }
                        }
                    }
                }
                if ((wallCount == 3 && floorCount == 6)) {//} || (wallCount == 5 && floorCount == 4)) {
                    let key = x + ',' + y;
                    if (Game.map[key].entity == null) {
                        validPartySpots.push(key);
                        continue;
                    }
                }
            }
        }

        for (let x = this.rooms[this.staffRoomID][0]; x < this.rooms[this.staffRoomID][2]; x++) {
            for (let y = this.rooms[this.staffRoomID][1]; y < this.rooms[this.staffRoomID][3]; y++) {
                let wallCount = 0;
                let floorCount = 0;
                for (let ii = -1; ii < 2; ii++) {
                    for (let jj = -1; jj < 2; jj++) {
                        let key = (x + ii) + ',' + (y + jj);
                        if (key in this.map) {
                            if (this.map[key].passable) {
                                floorCount++;
                            }
                            else {
                                wallCount++;
                            }
                        }
                    }
                }
                if ((wallCount == 3 && floorCount == 6)) {//} || (wallCount == 5 && floorCount == 4)) {
                    let key = x + ',' + y;
                    if (Game.map[key].entity == null) {
                        validSpots.push(key);
                        continue;
                    }
                }

                if (x%2==0 || y%2==0) {
                    continue;
                }

                let suitableForTable = true;
                for (let ii = -1; ii < 2; ii++) {
                    for (let jj = -1; jj < 2; jj++) {
                        let key = (x + ii) + ',' + (y + jj);
                        if (validSpots.indexOf(key)>=0) {
                            suitableForTable = false;
                            break;
                        }
                        if (!(key in this.map && this.map[key].passThrough())) {
                            suitableForTable = false;
                            break;
                        }
                    }
                    if (!suitableForTable) {
                        break;
                    }
                }
                if (suitableForTable) {
                    //let key=x+','+y;
                    console.log("??");
                    GetEntity('Table', x, y);
                }
            }
        }
        let level=4;
        let maxPlace=Math.floor(validSpots.length/2);
        let maxParty=Math.floor(validPartySpots.length/2);
        // Sort monsters. Prioritize higher level, more loved by the player, more loved by eachother
        this.monsterList.sort(function (a,b) {
            return (2*b.level+b.playerInteractions+b.friends.length) - (2*a.level+a.playerInteractions+a.friends.length);
        });
        let questItemIndex = Math.floor(maxPlace * ROT.RNG.getUniform());
        let partyCommenced=false;
        let donePlacing=false;
        for (let i = 0; i < this.monsterList.length; i++) {
            //if (this.monsterList[i].level != level) {
            //    continue;
            //}
            this.monsterList[i].spreadCount=-1;
            this.monsterList[i].spreading=null;
            this.monsterList[i].alive=false; // default, incase we run out of space
            if (this.monsterList[i].retired || donePlacing) {
                continue; // retired never got reset. They were not in the dungeon today!
            }

            // Remove them from their current location if they are still there
            let alivePosKey=this.monsterList[i].x+','+this.monsterList[i].y;
            if (alivePosKey in this.map && this.map[alivePosKey].entity == this.monsterList[i]) {
                this.map[alivePosKey].entity=null;
            }

            if (!partyCommenced) {
                if (this.monsterList[i].questItem != null && !this.monsterList[i].questItem.pickedUp) {
                    let questPos = this.randomFarFromPlayer();
                    this.monsterList[i].questItem.x = questPos[0];
                    this.monsterList[i].questItem.y = questPos[1];
                    let questKey = questPos[0] + ',' + questPos[1];
                    Game.map[questKey].mess = this.monsterList[i].questItem;
                }
                else if (this.monsterList[i].questItem == null && questItemIndex >= 0) {
                    if (questItemIndex == 0 || (this.unionist != null && this.unionist == this.monsterList[i].name)) {
                        let questPos = this.randomFarFromPlayer();
                        QuestMess(this.monsterList[i], questPos[0], questPos[1]);
                        questItemIndex -= 1000;
                    }
                }
                questItemIndex--;

                this.monsterList[i].alive = true;
                this.monsterList[i].retired = true;
                this.monsterList[i].partying=false;
                //ConversationBuilder.buildConvos(this.monsterList[i]);
                let index = Math.floor(ROT.RNG.getUniform() * validSpots.length);
                Game.map[validSpots[index]].entity = this.monsterList[i];
                let parts = validSpots[index].split(',');
                this.monsterList[i].x = parseInt(parts[0]);
                this.monsterList[i].y = parseInt(parts[1]);
                validSpots.splice(index, 1);
                if (validSpots.length <= maxPlace || validSpots == null) {
                    partyCommenced = true;
                }
            }
            else {
                this.monsterList[i].alive = true;
                this.monsterList[i].retired = true;
                this.monsterList[i].partying=true;
                //ConversationBuilder.buildConvos(this.monsterList[i],true);
                let index = Math.floor(ROT.RNG.getUniform() * validPartySpots.length);
                Game.map[validPartySpots[index]].entity = this.monsterList[i];
                let parts = validPartySpots[index].split(',');
                this.monsterList[i].x = parseInt(parts[0]);
                this.monsterList[i].y = parseInt(parts[1]);
                validPartySpots.splice(index, 1);
                if (validPartySpots.length <= maxParty || validPartySpots == null) {
                    donePlacing=true;
                }
            }
        }

        // do conversations in reverse order
        for (let j = 0; j < 2; j++) {
            for (let i = this.monsterList.length - 1; i >= 0; i--) {
                if (this.monsterList[i].alive) {
                    if ((j==0) == (!this.monsterList[i].partying)) {
                        ConversationBuilder.buildConvos(this.monsterList[i],j!=0);
                    }
                }
            }
        }

        // Add exit door
        {
            let index = Math.floor(ROT.RNG.getUniform() * validSpots.length);
            let parts = validSpots[index].split(',');
            let px = parseInt(parts[0]);
            let py = parseInt(parts[1]);
            //console.log(px+','+py);
            let exitDoor = GetEntity('ExitDoor', px, py);
            //let ughKey=exitDoor.x+','+exitDoor.y;
            //Game.map[ughKey].lastSeen='?';
            //console.log('exit:'+exitDoor.x+","+exitDoor.y);
            let best=[0,0,100];
            for (let i =-5;i<6;i++) {
                for (let j=-2;j<3;j++) {
                    let fits=true;
                    for (let ii=-3;ii<3;ii++) {
                        let testKey=(exitDoor.x+i+ii)+','+(exitDoor.y+j);
                        if (testKey in Game.map) {
                            fits=false;
                        }
                    }
                    if (fits) {
                        let dist=Math.abs(i)+Math.abs(j);
                        if (dist < best[2]) {
                            best[0]=i;
                            best[1]=j;
                            best[2]=dist;
                        }
                    }
                }
            }
            if (best[2] < 100) {
                let letters = ['*', 'E', 'X', 'I', 'T', '*'];
                for (let ii = -3; ii < 3; ii++) {
                    let testKey = (exitDoor.x + best[0] + ii) + ',' + (exitDoor.y + best[1]);
                    Game.map[testKey] = new Tile(best[0], best[1], letters[ii + 3], '#fff', '#000', false, false);
                    Game.map[testKey].lastSeen = letters[ii + 3];
                }
            }
        }

        for (let i=0;i<this.monsterList.length;i++) {
            if (!(this.monsterList[i].retired)) {
                this.monsterList[i].alive=false;
                let key = this.monsterList[i].x + ',' + this.monsterList[i].y;
                if (key in Game.map && Game.map[key].entity == this.monsterList[i]) {
                    Game.map[key].entity = null;
                }
            }
        }
        //let newPet = new Pet(this.player.x,this.player.y,'d','red','Dog');
    },

    randomFarFromPlayer: function(tries=10) {
        var best=[0,0,0];
        var i=0;
        while (i<tries) {
            let testKey = ROT.RNG.getItem(this.freeCells);

            if (testKey in Game.map && Game.map[testKey].entity == null && Game.map[testKey].mess==null && !(Game.map[testKey].important)) {
                let parts = testKey.split(',');
                let px = parseInt(parts[0]);
                let py = parseInt(parts[1]);
                let dist = Math.abs(this.player.x - px) + Math.abs(this.player.y - py);
                if (dist > best[2]) {
                    best[2]=dist;
                    best[0]=px;
                    best[1]=py;
                }
                tries--;
            }
        }
        return [best[0],best[1]];
    },

    checkConditions: function(conditions,speaker=null)  {
        let success=true;

        if ('cleanliness' in conditions) {
            if (this.cleanPercent() < conditions.cleanliness) {
                success=false;
            }
        }

        if ('requestDone' in conditions) {
            let done = speaker != null && Requests.isDone(speaker);
            if (done != conditions.requestDone) {
                success=false;
            }
        }

        if ('questItemGot' in conditions && speaker!=null) {
            console.log(conditions.questItemGot+','+speaker.questItem.pickedUp);
            if (speaker.questItem != null && conditions.questItemGot == speaker.questItem.pickedUp) {
                success&=true;
            }
            else {
                success=false;
            }
            console.log("success:"+success);
        }

        let keys = Object.getOwnPropertyNames(conditions);
        for (let i=0;i<keys.length;i++) {
            if (keys[i]=='cleanliness') {
                continue;
            }
            if (keys[i]=='questItemGot' || keys[i]=='requestDone') {
                continue;
            }
            if (keys[i] in Game.convoTags) {
                if (typeof Game.convoTags[keys[i]] == typeof conditions[keys[i]]) {
                    success &= (Game.convoTags[keys[i]] == conditions[keys[i]]); // do they match?
                }
                else {
                    success &= conditions[keys[i]]; // condition is "does it exist?"
                }
            }
            else {
                success &= !(conditions[keys[i]]); // condition is "does it not exist?"
            }
        }
        return success;
    },

    // A stone plaque for the end of the shift (our own drawing): every line the same width.
    plaqueLines: function() {
        let inner = 24;
        let center = function(text) {
            let left = Math.floor((inner - text.length) / 2);
            return '|' + ' '.repeat(left) + text + ' '.repeat(inner - text.length - left) + '|';
        };
        let pct = this.messNumbers[1] > 0 ? this.cleanPercent() : 100;
        let cause = Flavor.rng.getItem(Lore.killedBy);
        let wrapped = [];
        let words = cause.split(' ');
        let line = '';
        for (let i = 0; i < words.length; i++) {
            if (line.length > 0 && (line + ' ' + words[i]).length > 16) {
                wrapped.push(line);
                line = words[i];
            }
            else {
                line = line.length > 0 ? line + ' ' + words[i] : words[i];
            }
        }
        wrapped.push(line);
        let lines = [
            '    ' + '_'.repeat(inner - 6) + '    ',
            '   /' + ' '.repeat(inner - 6) + '\\   ',
            '  /' + ' '.repeat(Math.floor((inner - 8) / 2)) + 'REST' + ' '.repeat(inner - 4 - 4 - Math.floor((inner - 8) / 2)) + '\\  ',
            ' /' + ' '.repeat(Math.floor((inner - 4) / 2)) + 'IN' + ' '.repeat(inner - 2 - 2 - Math.floor((inner - 4) / 2)) + '\\ ',
            center('PEACE,'),
            center('YOUR BACK'),
            center(''),
            center('EMPLOYEE OF THE'),
            center('DAY ' + this.day),
            center('cleaned ' + pct + '%'),
            center('killed by:'),
        ];
        for (let i = 0; i < wrapped.length; i++) {
            lines.push(center(wrapped[i]));
        }
        lines.push(center(''));
        lines.push(center('*   *    *    *   *'));
        lines.push(center('|   |    |    |   |')); // stems
        lines.push('\\|/' + '_'.repeat(inner - 4) + '\\|/');
        return lines;
    },

    // Shift report shown when you head home: how today went, and your best day so far.
    shiftReport: function() {
        let pct = this.messNumbers[1] > 0 ? this.cleanPercent() : 100;
        let grade = pct >= 95 ? 'S' : pct >= 85 ? 'A' : pct >= 70 ? 'B' : pct >= 50 ? 'C' : 'D';
        let chatted = this.monsterList.filter(function(m) { return m.alive && m.playerTalkedToday; }).length;
        let today = this.yendorPoints - this.shift.startPoints + pct;
        let best = this.loadBest();
        let bestLine;
        if (pct > 0 && (best == null || pct > best.pct)) {
            bestLine = "%c{#0c0}New personal best!%c{}";
            this.saveBest({pct: pct, day: this.day});
        }
        else if (best != null) {
            bestLine = "%c{#777}Best shift so far: " + best.pct + "% (day " + best.day + ")%c{}";
        }
        else {
            bestLine = "%c{#777}Clean a bit more to set a personal best!%c{}";
        }
        return "%c{#ff0}Shift report, day " + this.day + "%c{}\n" +
            "Dungeon cleaned: " + pct + "%   Grade: %c{#ff0}" + grade + "%c{}\n" +
            "Messes cleaned: " + this.shift.cleaned + "   Stubborn scrubs: " + this.shift.passes + "\n" +
            "Requests done: " + this.shift.requestsDone + "   Comrades chatted with: " + chatted + "\n" +
            "Points today: +" + today + "   Total: " + (this.yendorPoints + pct) + " / " + this.targetPoints + " toward the Mop of Yendor\n" +
            bestLine;
    },

    loadBest: function() {
        try {
            let b = JSON.parse(localStorage.getItem('rj-best'));
            return (b && typeof b.pct == 'number') ? b : null;
        } catch (e) {
            return null;
        }
    },

    saveBest: function(b) {
        try {
            localStorage.setItem('rj-best', JSON.stringify(b));
        } catch (e) {
            // storage unavailable
        }
    },

    // Chebyshev distance and arrow towards the closest mess left in the dungeon.
    nearestMess: function() {
        let best = null;
        for (let key in this.map) {
            let m = this.map[key].mess;
            if (m == null || m.pickedUp) {
                continue;
            }
            let t = this.map[key];
            let dx = t.mess.x - this.player.x;
            let dy = t.mess.y - this.player.y;
            let d = Math.max(Math.abs(dx), Math.abs(dy));
            if (d > 0 && (best == null || d < best.d)) {
                best = {d: d, dx: dx, dy: dy};
            }
        }
        if (best == null) {
            return null;
        }
        let sx = Math.sign(best.dx), sy = Math.sign(best.dy);
        // only count a diagonal when it is roughly diagonal
        if (Math.abs(best.dx) > 2*Math.abs(best.dy)) { sy = 0; }
        if (Math.abs(best.dy) > 2*Math.abs(best.dx)) { sx = 0; }
        let arrows = {'-1,-1':'\u2196','0,-1':'\u2191','1,-1':'\u2197','-1,0':'\u2190','1,0':'\u2192','-1,1':'\u2199','0,1':'\u2193','1,1':'\u2198','0,0':'\u00B7'};
        best.arrow = arrows[sx+','+sy];
        return best;
    },

    nextDay() {
        Visitors.clear();
        this.hintsToday = [];
        this.day++;
        this.dungeonRooms = Math.min(this.MAX_ROOMS, this.dungeonRooms + 1 + Math.floor(2*ROT.RNG.getUniform()));
        this.yendorPoints += this.cleanPercent();
        if (this.yendorPoints>=this.targetPoints && !this.victory) {
            this.player.cutscene=ConversationBuilder.victoryPrompt();
            this.victory=true;
        }
        //this.engine.unlock();
        this.generateDungeon();
    },
};