function Player(x,y) {
    this.x=x;
    this.y=y;
    this.char='@';
    this.color='#fff';
    this.bgColor='#000';
    this.keyMap = {};
    this.keyMap[38] = 0;
    this.keyMap[87] = 0;
    this.keyMap[75] =0;
    this.keyMap[104] = 0;
    this.keyMap[85] = 1;
    this.keyMap[33] = 1; //85
    this.keyMap[105] = 1;
    this.keyMap[76] = 2;
    this.keyMap[39] = 2;//76
    this.keyMap[68] = 2;
    this.keyMap[102] = 2;
    this.keyMap[78] = 3;
    this.keyMap[34] = 3;//78
    this.keyMap[99] = 3;
    this.keyMap[74] = 4;
    this.keyMap[40] = 4;//74
    this.keyMap[83] = 4;
    this.keyMap[98] = 4;
    this.keyMap[66] = 5;
    this.keyMap[35] = 5;//66
    this.keyMap[97] = 5;
    this.keyMap[72] = 6;
    this.keyMap[37] = 6;//72
    this.keyMap[65] = 6;
    this.keyMap[100] = 6;
    this.keyMap[89] = 7;
    this.keyMap[36] = 7;//89
    this.keyMap[103] = 7;
    this.spreading=null;
    this.spreadCount=0;
    this.talking=null;
    this.reach=1;
    this.cutscene=ConversationBuilder.startGameCutscene();
    this.paused=false;
    this.examining=null;
    this.instructions=false;
}

Player.prototype.getArt = function() {
    if (Game.phase != 'cleaning') {
        // The janitor hasn't clocked in yet: draw the floor underneath instead.
        let tile = Game.map[this.x+','+this.y];
        if (tile) {
            return [tile.char,tile.color,tile.bgColor];
        }
    }
    let under = Game.map[this.x+','+this.y];
    return [this.char,this.color,under ? under.bgColor : '#000'];
}

Player.prototype.act = function() {
    Game.engine.lock();
    Game.turnCount++;
    //console.log(this.x+','+this.y);
    if (this.spreadCount>0 && this.spreading != null) {
        let newMess = makeMess(this.x,this.y,this.spreading);
        this.spreadCount--;
        if (this.spreadCount==0 && newMess.spreads!=null && newMess.spreads!="") {
            newMess.spread(this);
        }
    }
    if (this.cutscene != null) {
        Game.player.talking=Game.monsterList[0];
        Game.monsterList[0].convoIndex=Game.monsterList[0].convos.length;
        Game.monsterList[0].convoInnerDex=0;
        //Game.monsterList[0].convos=[];
        Game.monsterList[0].convos.push(this.cutscene);
        this.cutscene=null;
        window.addEventListener("keydown",Game.monsterList[0]);
        window.addEventListener("keypress",Game.monsterList[0]);
    }
    
    Game.drawMap();
    window.addEventListener("keydown", this);
}

Player.prototype.endTurn = function() {
    Game.drawMap();
    window.removeEventListener("keydown", this);
    Game.engine.unlock();
}

Player.prototype.openClose=function(openclose) {
    for (let i=-1;i<2;i++) {
        for (let j=-1;j<2;j++) {
            if (i==0 && j==0) {
                continue;
            }
            let key = (this.x+i)+','+(this.y+j);
            if (key in Game.map && Game.map[key].mess == null && Game.map[key].door != null) {
                if (Game.map[key].open != openclose) {
                    Game.map[key].open=openclose;
                    Sfx.play('door');
                    if (openclose) {
                        Game.sendMessage("You open the door.")
                    }
                    else {
                        Game.sendMessage("You close the door.")
                    }
                }
            }
        }
    }
}

Player.prototype.clean = function(verb) {
    let doSelf=null;
    let tool = verb;
    let sound = {mop:'mop', get:'pickup', fix:'fix'}[verb];
    for (let i=-this.reach;i<=this.reach;i++) {
        for (let j=-this.reach;j<=this.reach;j++) {
            let key = (this.x+i)+','+(this.y+j);
            if (i==0 && j==0 && verb!='get') {
                if (key in Game.map && Game.map[key].mess != null && Game.map[key].mess.cleanMethod == verb) {
                    doSelf=Game.map[key].mess;
                }
                continue;
            }
            if (key in Game.map && Game.map[key].mess != null && Game.map[key].mess.cleanMethod == verb) {
                let stain = Game.map[key].mess;
                let brushed = false;
                if (verb=='mop' && Game.WATER_KINDS.indexOf(stain.kind) >= 0 && Game.hasTool('squeegee')) {
                    let n = this.squeegee(key);
                    Game.sendMessage("Shhhhk! You squeegee away " + (n > 1 ? n + " tiles of " : "the ") + stain.displayName() + ".");
                    return;
                }
                if (verb=='mop' && stain.passes > 1 && Game.hasTool('brush')) {
                    stain.passes = 0; // the scrub brush does it in one go
                    brushed = true;
                    Game.sendMessage("Your scrub brush makes short work of the " + stain.displayName() + ".");
                }
                if (verb=='mop' && !stain.scrub()) {
                    let left = stain.passes;
                    Game.sendMessage("You scrub the "+stain.displayName()+". "+(left > 1 ? "It's stubborn! ("+left+" more passes)" : "It's fading... one more pass!"));
                    Game.shift.passes++;
                    Game.comboKeep();
                    Sfx.play('scrub');
                    Effects.clean(tool, this.x+i, this.y+j, stain.color);
                    return;
                }
                if (verb=='fix' && Game.map[key].mess.parent == null) {
                    Game.sendMessage("You patch up the "+Game.map[key].mess.displayName()+".");
                }
                else if (verb=='fix') {
                    if (Game.map[key].entity==null) {
                        Game.map[key].entity = Game.map[key].mess.parent;
                        Game.sendMessage("You fix the "+Game.map[key].entity.name.toLowerCase()+".");
                    }
                    else {
                        Game.sendMessage("You try to fix the "+Game.map[key].mess.parent.name.toLowerCase()+" but the "+Game.map[key].entity.name.toLowerCase()+" is in the way!");
                        return;
                    }
                }
                else {
                    if (verb=='get') {
                        verb="pick up";
                    }
                    if (Game.map[key].mess.elbereth) {
                        Game.sendMessage("You erase the engraving. Sorry, Elbereth.");
                        Achievements.unlock('elbereth');
                    }
                    else if (Game.map[key].mess.mimic) {
                        Game.sendMessage("Hehe, that tickles!");
                        Game.sendMessage("The stain was a mimic! It giggles and scurries off to the lounge.");
                        Achievements.unlock('mimic');
                    }
                    else if (Game.map[key].mess.kind == 'Lost Ring') {
                        // said below, when it goes in your pocket
                    }
                    else if (Game.map[key].mess.unique) {
                        Game.sendMessage("You "+verb+" "+Game.map[key].mess.name+"!");
                    }
                    else if (!brushed) {
                        Game.sendMessage("You "+verb+" the "+Game.map[key].mess.displayName()+".");
                    }
                    if (Game.map[key].mess.kind == 'Scattered Gold Coins') {
                        let value = Game.coinValue(Game.map[key].mess);
                        Game.zorkmids += value;
                        Game.run.zorkmidsEarned += value;
                        Game.sendMessage("Ka-ching! %c{#ff0}(+" + value + " zm)%c{}");
                    }
                    if (Game.map[key].mess.kind == 'Lost Ring') {
                        let ring = Game.map[key].mess;
                        Game.inventory.push({kind: 'ring', name: ring.name, lore: ring.ringLore});
                        Achievements.unlock('ring');
                        Game.sendMessage("You pocket " + ring.name + ". Engraved inside: \"" + ring.ringLore + "\"");
                    }
                    if (Game.map[key].mess.pickup == 'fortune') {
                        Game.sendMessage("You crack the fortune cookie. It reads: \""+Lore.rumor()+"\"");
                        Achievements.bump('fortunes');
                    }
                }
                if (tool == 'mop' && EasterEggs.mopName() != null && Flavor.chance(0.2)) {
                    Game.sendMessage("You swish " + EasterEggs.mopName() + ".");
                }
                this.removeMess(key, tool, sound);
                return;
            }
            else if (key in Game.map && Game.map[key].mess == null && Game.map[key].entity==null && Game.map[key].secretDoor != null) {
                Game.map[key].openSecretDoor();
                Effects.add(this.x+i, this.y+j, Effects.framesFor('sparkle'));
                Game.yendorPoints+=10;
                Game.sendMessage("%c{#ff0}You found a secret passageway!%c{}");
                Achievements.unlock('secret');
                return;
            }
        }
    }
    if (doSelf != null) {
        if (doSelf.unique) {
            Game.sendMessage("Stand next to "+doSelf.name+" to "+verb+" it.");
        }
        else {
            let message="Stand next to the "+doSelf.displayName()+" to "+verb;
            if (doSelf.name.charAt(doSelf.name.length-1)=='s') {
                message+=" them.";
            }
            else {
                message+=" it.";
            }
            Game.sendMessage(message);
        }
    }
    else {
        Game.lastMessage="";
        Game.log.markStale();
        Game.lastlastMessageTime--;
    }
}

// Everything that happens when a mess is gone, whatever tool took it.
Player.prototype.removeMess = function(key, tool, sound=null, countCombo=true) {
    let tile = Game.map[key];
    let cleaned = tile.mess;
    if (cleaned.droppedBy != null) {
        ConversationBuilder.cleanConvo(cleaned);
    }
    if (cleaned.bonusPoints) {
        Game.yendorPoints += cleaned.bonusPoints;
    }
    Game.shift.cleaned++;
    cleaned.pickedUp=true;
    tile.mess=null;
    Game.messNumbers[0]--;
    if (countCombo) {
        Game.comboHit();
    }
    Game.checkCleanMilestones();
    Objectives.check();
    Sfx.play(cleaned.sound || sound || 'mop');
    let parts = key.split(',');
    Effects.clean(tool, parseInt(parts[0]), parseInt(parts[1]), cleaned.color);
};

// Z: the vacuum sucks up every dry, fluffy mess around you at once.
Player.prototype.vacuum = function() {
    if (!Game.hasTool('vacuum')) {
        Game.sendMessage("The vacuum arrives tomorrow. HR is \"processing the paperwork\".");
        return false;
    }
    let n = 0;
    for (let i=-1;i<=1;i++) {
        for (let j=-1;j<=1;j++) {
            let key = (this.x+i)+','+(this.y+j);
            let tile = Game.map[key];
            if ((i != 0 || j != 0) && tile && tile.mess != null && Game.VACUUM_KINDS.indexOf(tile.mess.kind) >= 0) {
                this.mimicCheck(tile.mess);
                this.removeMess(key, 'vacuum', 'pickup', false);
                n++;
            }
        }
    }
    if (n == 0) {
        Game.sendMessage("Vrrrr... nothing here the vacuum can take.");
        return false;
    }
    if (n >= 4) {
        Achievements.unlock('vacuum4');
    }
    Game.comboHit(); // one press, one link in the chain
    Game.sendMessage("VRRRRRM! The vacuum swallows " + n + (n > 1 ? " bits of fluff." : " bit of fluff."));
    return true;
};

// The squeegee clears a whole connected puddle (up to SQUEEGEE_CAP tiles).
// Returns how many tiles it cleaned.
Player.prototype.squeegee = function(startKey) {
    let queue = [startKey];
    let seen = {};
    seen[startKey] = true;
    let n = 0;
    while (queue.length > 0 && n < Game.SQUEEGEE_CAP) {
        let key = queue.shift();
        let tile = Game.map[key];
        if (!tile || tile.mess == null || Game.WATER_KINDS.indexOf(tile.mess.kind) < 0) {
            continue;
        }
        this.mimicCheck(tile.mess);
        this.removeMess(key, 'mop', 'mop', false);
        n++;
        let parts = key.split(',').map(Number);
        for (let i=-1;i<=1;i++) {
            for (let j=-1;j<=1;j++) {
                let next = (parts[0]+i)+','+(parts[1]+j);
                if (!seen[next] && next != this.x+','+this.y) {
                    seen[next] = true;
                    queue.push(next);
                }
            }
        }
    }
    if (n > 0) {
        Game.comboHit();
    }
    return n;
};

// The day's mimic stain giggles whatever you clean it with.
Player.prototype.mimicCheck = function(mess) {
    if (mess && mess.mimic) {
        Game.sendMessage("Hehe, that tickles!");
        Game.sendMessage("The stain was a mimic! It giggles and scurries off to the lounge.");
        Achievements.unlock('mimic');
    }
};

Player.prototype.doExamine = function(code) {
    if (!(code in this.keyMap)) {
        switch (code) {
            default:
            return;
            case 69:
            case 88:
            case 27:
            case 8:
            this.examining=null;
        }
    }
    else {
        let diff = ROT.DIRS[8][this.keyMap[code]];
        if (Math.abs(this.examining[0]+diff[0] - this.x)<Game.offset[0]) {
            this.examining[0]+=diff[0];
        }
        if (Math.abs(this.examining[1]+diff[1] - this.y)<Game.offset[1]) {
            this.examining[1]+=diff[1];
        }
    }
    Game.drawMap();
}

Player.prototype.handleEvent = function(e) {
    if (this.paused || Game.phase != 'cleaning') {
        return;
    }
    let code = e.keyCode;
    if (e.key === '?') {
        code = 191; // "?" sits on different physical keys depending on the keyboard layout
    }
    if (this.talking != null) {
        EasterEggs.closePrompt();
        return;
    }
    if (Shop.isOpen) {
        Shop.handleKey(e); // the shop screen owns the keys while it is open
        return;
    }
    if (EasterEggs.handleKey(e)) {
        return; // typing a #command or answering the quit question
    }
    if (e.key === '#' && !this.instructions && this.examining == null) { // also AltGr+3 on Spanish keyboards
        EasterEggs.openPrompt();
        return;
    }
    if (this.examining != null) {
        this.doExamine(code);
        return;
    }
    if (this.instructions) {
        if (code==88 || code==27 || code==8 || code == 191) {
            this.instructions=false;
        }
        Game.drawMap();
        return;
    }
    //console.log(this.keyMap);
    if (!(code in this.keyMap)) {
        switch (code) {
            default:
            return;
            // m for mop
            case 77:
            this.clean('mop');
            this.endTurn();
            return;
            // c for close
            case 67:
            this.openClose(false);
            this.endTurn();
            return;
            // o for open
            case 79:
            this.openClose(true);
            this.endTurn();
            return;
            // g or p for get or pick up
            case 80:
            case 71:
            this.clean('get');
            this.endTurn();
            return;
            // r or f for repair or fix
            case 82:
            case 70:
            this.clean('fix');
            this.endTurn();
            return;
            // z: the vacuum (from day 2)
            case 90:
            if (this.vacuum()) {
                this.endTurn();
            }
            else {
                Game.drawMap();
            }
            return;
            // x to examine
            case 69:
            case 88:
            this.examining=[this.x,this.y];
            Game.drawMap();
            return;
            // Q: the quit joke
            case 81:
            EasterEggs.askQuit();
            Game.drawMap();
            return;
            // open help
            case 191:
            this.instructions=true;
            Game.drawMap();
            return
            // wait
            case 12:
            case 190:
            case 53:
            this.endTurn();
            return;
        }
    }
    //console.log(code);

    // movement
    let diff = ROT.DIRS[8][this.keyMap[code]];
    let testKey = (this.x+diff[0])+','+(this.y+diff[1]);
    let parts = testKey.split(',');

    if (this.moveTo(Math.round(parseInt(parts[0])), Math.round(parseInt(parts[1])))) {
        this.slide(diff);
        Game.drawMap();
        window.removeEventListener("keydown", this);
        Game.engine.unlock();
    }
    else {
        let testKey = Math.round(parseInt(parts[0]))+','+Math.round(parseInt(parts[1]));
        if (testKey in Game.map && Game.map[testKey].entity != null && Game.map[testKey].entity != this) {
            Game.map[testKey].entity.cleanerAct();
        }
    }
}

// Stepping onto something slippery carries you one more tile the same way.
Player.prototype.slide = function(diff) {
    let here = Game.map[this.x+','+this.y];
    if (!here || here.mess == null || !here.mess.slippery) {
        return false;
    }
    let nextKey = (this.x+diff[0])+','+(this.y+diff[1]);
    let next = Game.map[nextKey];
    if (!next || next.door != null || next.secretDoor != null || !next.passThrough()) {
        return false;
    }
    this.moveTo(this.x+diff[0], this.y+diff[1]);
    Game.sendMessage("Whoa! You slip on the "+here.mess.displayName()+" and slide!");
    Achievements.bump('slips');
    Sfx.play('slip');
    return true;
}

Player.prototype.wait = function(milliseconds) {
    this.paused=true;
    setTimeout(function(){
        Game.player.paused=false;
    },milliseconds);
}

Player.prototype.moveTo = function(x,y) {
    let oldKey = this.x+','+this.y;
    let newKey = x+','+y;

    if (newKey in Game.map && Game.map[newKey].door != null && !Game.map[newKey].open) {
        Game.sendMessage("You open the door.");
        Game.map[newKey].open=true;
        Sfx.play('door');
        return true;
    }

    if (newKey in Game.map && Game.map[newKey].secretDoor != null && Game.map[newKey].mess==null) {
        Game.map[newKey].openSecretDoor();
        Game.yendorPoints+=10;
        Game.sendMessage("%c{#ff0}You found a secret passageway!%c{}");
        Achievements.unlock('secret');
        return true;
    }

    if (newKey in Game.map && Game.map[newKey].passThrough()) {
        Game.map[newKey].entity=this;
        this.x=x;
        this.y=y;
        if (Game.map[newKey].mess != null) {
            if (Game.map[newKey].mess.spreads) {
                Game.comboBreak(); // tracking dirt around ends the streak
            }
            Game.map[newKey].mess.spread(this);
        }
    }
    else {
        return false;
    }
    Game.lastMessage="";
    Game.log.markStale();
    Game.lastlastMessageTime--;
    /*console.log(Game.getRoomIndex(x,y));
    if (Game.getRoomIndex(x,y)>=0) {
        console.log('Exits:'+Game.rooms[Game.getRoomIndex(x,y)][4]);
    }*/
    if (oldKey != newKey && oldKey in Game.map && Game.map[oldKey].entity==this) {
        Game.map[oldKey].entity=null;
    }
    return true;
}