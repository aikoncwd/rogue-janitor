function Adventurer(x,y) {
    this.x=x;
    this.y=y;
    this.hunger=50;
    this.turns=-1;
    this.blood=0;
    this.dmg=1;
    this.hp=5;
    this.char='@';
    this.color='#0ff';
    this.heroClass=null;
    this.specials=0;
    this.moveTo(x,y);
    this.roomsToExplore=[];
    this.destinationIndex=0;
    this.destinations=[[this.x,this.y]]; // places to go
    this.targets=[]; // monsters to slay
    this.currentTarget=[];
    this.active=true;
    this.path=[];
    this.recalculate=true;
    this.graffiti=0;
    this.spreading="MudPrints";
    this.spreadCount=10;
    this.fov = new ROT.FOV.PreciseShadowcasting(function(x,y){
        return Game.lightPasses(x,y);
    });
    for (let i=0;i<Game.rooms.length;i++) {
        if (i != Game.staffRoomID) {
            this.roomsToExplore.push(i);
            let center=Game.getCenter(i);
            this.destinations.push([center[0],center[1]]);
        }
    }
    //console.log(this.destinations);
    Game.scheduler.add(this,true);
    this.path=null;
}

Adventurer.prototype.nextDestination = function() {
    if (this.x == this.destinations[this.destinationIndex][0] && this.y == this.destinations[this.destinationIndex][1]) {
        this.destinations.splice(this.destinationIndex, 1);
    }
    if (this.destinations.length==0 || this.destinations==null) {
        this.destinations=[[Game.stairs[1][0],Game.stairs[1][1]]];
        if (this.x==this.destinations[0][0] && this.y==this.destinations[0][1]) {
            this.leave();
            return;
        }
    }
    
    let best=[-1,10000];
    for (let i=0;i<this.destinations.length;i++) {
        let dist = Math.abs(this.x - this.destinations[i][0]) + Math.abs(this.y - this.destinations[i][1]);
        if (dist < best[1]) {
            best[0]=i;
            best[1]=dist;
        }
    }
    this.destinationIndex=best[0];
}

Adventurer.prototype.maxTurns = 1500; // fail-safe: a normal invasion takes ~500 turns; give up and leave if stuck

// The hero exits the dungeon. Invasion.handover() lets the moment breathe, then the
// fainted monsters get up and the player's shift starts.
Adventurer.prototype.leave = function() {
    let key=this.x+','+this.y;
    if (key in Game.map && Game.map[key].entity==this) {
        Game.map[key].entity=null;
    }
    let exit=[this.x,this.y];
    this.x=-10000;this.y=-100000;
    this.active=false;
    Invasion.handover(exit[0],exit[1]);
}

Adventurer.prototype.look = function() {
    this.fov.compute(this.x,this.y,10,function(x,y,r,visibility) {
        if (x == Game.adventurer.x && y==Game.adventurer.y) {
            return;
        }
        let key = x+','+y;
        if (key in Game.map && Game.map[key].entity != null && Game.map[key].entity instanceof Entity) {
            if ('monster' in Game.map[key].entity.tags) {
                //console.log('monster spotted');
                Game.map[key].entity.active=true;
                Game.adventurer.targets.push(Game.map[key].entity);
            }
            else if ('loot' in Game.map[key].entity.tags && !('wall' in Game.map[key].entity.tags)) {
                //console.log('loot identified');
                
                Game.adventurer.destinations.push([x,y]);
                Game.adventurer.newDestinationFound=true;
                //console.log(this.destinations);
            }
        }
    });

    if (this.newDestinationFound) {
        this.nextDestination();
    }
}

Adventurer.prototype.maxGraffiti = 6;

// Every hero class makes its own kind of mess. `every` is the average number of
// turns between specials; `special` is the method called.
Adventurer.classes = {
    Paladin:      { color:'#ff8', hp:6, dmg:1, every:30, special:'holyWater', stat:'Rooms blessed' },
    Barbarian:    { color:'#f84', hp:6, dmg:2, every:35, special:'drumstick', stat:'Drumsticks devoured' },
    Wizard:       { color:'#c8f', hp:4, dmg:1, every:25, special:'fireball', stat:'Fireballs cast' },
    Ranger:       { color:'#8f8', hp:5, dmg:1, every:12, special:'arrow', stat:'Arrows loosed' },
    Rogue:        { color:'#aaa', hp:5, dmg:1, every:40, special:'smokeBomb', stat:'Smoke bombs thrown' },
    Bard:         { color:'#f8f', hp:5, dmg:1, every:25, special:'song', stat:'Songs performed' },
    Archeologist: { color:'#da6', hp:5, dmg:1, every:30, special:'dig', stat:'Holes dug' },
    Alchemist:    { color:'#6fc', hp:5, dmg:1, every:20, special:'potionSplash', stat:'Potions spilled' },
    Tourist:      { color:'#fd8', hp:5, dmg:1, every:20, special:'snapshot', stat:'Photos taken' },
    Valkyrie:     { color:'#adf', hp:7, dmg:2, every:30, special:'frost', stat:'Battle cries' },
    Speedrunner:  { color:'#f6a', hp:4, dmg:1, every:25, special:'energyDrink', stat:'Frames saved' },
    Necromancer:  { color:'#9a9', hp:5, dmg:1, every:30, special:'readAloud', stat:'Pages read aloud' },
    Monk:         { color:'#fc6', hp:5, dmg:1, every:30, special:'incense', stat:'Moments of inner peace' },
    Healer:       { color:'#fff', hp:5, dmg:1, every:25, special:'bandage', stat:'Unrequested bandages' },
    Berserker:    { color:'#f44', hp:6, dmg:2, every:30, special:'berserk', stat:'Chairs defeated' },
    Wanderer:     { color:'#9cf', hp:5, dmg:1, every:25, special:'wander', stat:'Baffling items dropped' },
};

var ELBERETH_NAME = 'Elbereth engraving';

// Special events (lost hero, unknown scroll...): rare, and never two close together.
Adventurer.EVENT_GAP = 25;
Adventurer.EVENT_CHANCE = 0.06;
Adventurer.EVENTS = ['lost', 'scroll', 'backIn5', 'elbereth'];

// Wands, staves and rings (the classics): world mess, so ROT.RNG throughout.
Adventurer.ZAP_CHANCE = 0.03;
Adventurer.MAX_ZAPS = 2;
Adventurer.RING_CHANCE = 0.012;
Adventurer.MAX_RINGS = 2;

// A free floor tile at or next to the hero with no mess on it, or null.
Adventurer.prototype.litterSpot = function() {
    let spots = [];
    for (let i=-1;i<2;i++) {
        for (let j=-1;j<2;j++) {
            let t = Game.map[(this.x+i)+','+(this.y+j)];
            if (t && t.passable && t.door == null && !t.important && t.mess == null) {
                spots.push([this.x+i,this.y+j]);
            }
        }
    }
    return spots.length > 0 ? ROT.RNG.getItem(spots) : null;
};

// The hero zaps a wand (or a staff) at nothing in particular, makes a mess and
// drops the used-up thing on the floor.
Adventurer.prototype.tryZap = function() {
    this.zaps = (this.zaps || 0) + 1;
    let mat = ROT.RNG.getItem(Lore.wandMaterials);
    let effect = ROT.RNG.getItem(Lore.zapEffects);
    let staff = ROT.RNG.getUniform() < 0.35;
    let spot = this.litterSpot();
    if (spot != null) {
        makeMess(spot[0], spot[1], effect.mess);
    }
    let name;
    spot = this.litterSpot();
    if (spot != null) {
        let used = makeMess(spot[0], spot[1], staff ? 'CrackedStaff' : 'UsedWand');
        name = staff ? 'Staff of ' + effect.staff + ' (cracked)' : ROT.RNG.getItem(['Snapped', 'Empty', 'Bent', 'Fizzled']) + ' ' + mat.name + ' Wand';
        used.name = name;
        used.color = mat.color;
    }
    Invasion.event('zap', {wand: (staff ? 'staff of ' + effect.staff.toLowerCase() : mat.name.toLowerCase() + ' wand'), effect: effect.line});
    return true;
};

// Rings: tried on, didn't fit, left behind. At most MAX_RINGS a raid.
Adventurer.prototype.tryDropRing = function() {
    let spot = this.litterSpot();
    if (spot == null) {
        return false;
    }
    this.ringsDropped = (this.ringsDropped || 0) + 1;
    let ring = makeMess(spot[0], spot[1], 'LostRing');
    ring.name = ROT.RNG.getItem(Lore.ringNames); // world RNG: the same ring watched or skipped
    ring.ringLore = ROT.RNG.getItem(Lore.ringLore);
    Invasion.event('ring', {});
    return true;
};

Adventurer.prototype.setClass = function(cls) {
    let def = Adventurer.classes[cls] || Adventurer.classes.Paladin;
    this.heroClass = (cls in Adventurer.classes) ? cls : 'Paladin';
    this.color = def.color;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.dmg = def.dmg;
    this.specials = 0;
    return this;
}

// Floor tiles around the hero (within `radius`) where a mess could go.
Adventurer.prototype.floorAround = function(radius) {
    let spots=[];
    for (let i=-radius;i<=radius;i++) {
        for (let j=-radius;j<=radius;j++) {
            let tile=Game.map[(this.x+i)+','+(this.y+j)];
            if (tile && tile.passable && !tile.important && tile.door == null) {
                spots.push([this.x+i,this.y+j]);
            }
        }
    }
    return spots;
}

Adventurer.prototype.splat = function(type, radius, count) {
    let spots=this.floorAround(radius);
    let made=0;
    for (let k=0;k<count && spots.length>0;k++) {
        let i=Math.floor(ROT.RNG.getUniform()*spots.length);
        let spot=spots.splice(i,1)[0];
        makeMess(spot[0],spot[1],type);
        made++;
    }
    return made;
}

Adventurer.prototype.trySpecial = function() {
    let def = Adventurer.classes[this.heroClass];
    if (!def || ROT.RNG.getUniform() >= 1/def.every) {
        return false;
    }
    if (this[def.special]()) {
        this.specials++;
        Invasion.event('special', {cls:this.heroClass});
        return true;
    }
    return false;
}

Adventurer.prototype.holyWater = function() { return this.splat('HolyWater', 2, 3) > 0; }
Adventurer.prototype.drumstick = function() { return this.splat('Drumstick', 1, 1) > 0; }
Adventurer.prototype.fireball = function() {
    let made = this.splat('Scorch', 2, 5);
    this.splat('SpentScroll', 1, 1);
    return made > 0;
}
Adventurer.prototype.arrow = function() { return this.splat('StrayArrow', 4, 1) > 0; }
Adventurer.prototype.smokeBomb = function() { return this.splat('Soot', 1, 3) > 0; }
Adventurer.prototype.song = function() { return this.splat('SheetMusic', 2, 2) > 0; }
Adventurer.prototype.dig = function() {
    let made = this.splat('DugHole', 1, 1);
    this.splat('SpilledSoil', 1, 2);
    return made > 0;
}
// Splats `count` messes of `type` around the hero, all called `name`.
Adventurer.prototype.splatVariant = function(type, name, radius, count) {
    let spots=this.floorAround(radius);
    let made=0;
    for (let k=0;k<count && spots.length>0;k++) {
        let spot=spots.splice(Math.floor(ROT.RNG.getUniform()*spots.length),1)[0];
        makeVariant(spot[0],spot[1],type,name);
        made++;
    }
    return made;
}
Adventurer.prototype.snapshot = function() {
    let made = this.splatVariant('Wrapper', 'Expensive Gift Shop Receipt', 1, 1);
    this.splatVariant('GoldCoins', 'Overpriced Souvenir Coins', 1, 1);
    return made > 0;
}
Adventurer.prototype.frost = function() { return this.splatVariant('Water', 'Melted Frost', 1, 2) > 0; }
Adventurer.prototype.energyDrink = function() { return this.splatVariant('EmptyBottle', 'Energy Drink Can', 1, 1) > 0; }
Adventurer.prototype.readAloud = function() { return this.splatVariant('LoosePages', 'Page of the Necronomicon (do not read aloud)', 1, 1) > 0; }

Adventurer.prototype.incense = function() { return this.splatVariant('Soot', 'Incense Ash', 1, 2) > 0; }
Adventurer.prototype.bandage = function() { return this.splatVariant('Wrapper', 'Used Bandage Wrapper', 1, 1) > 0; }
Adventurer.prototype.berserk = function() {
    let made = this.splat('Splinters', 1, 3);
    this.splatVariant('LoosePages', 'Pamphlet: TROG SAYS BOOKS ARE FOR BURNING', 1, 1);
    return made > 0;
}
// The Wanderer's random starting kit: nobody knows what it was for.
Adventurer.WANDERER_KIT = ['Half a Ration of Something', 'Unlabelled Throwing Net', 'Single Boomerang (One-Way)',
    'Wand of Unknown Wand', 'Book of Mysterious Recipes', 'Very Old Sandwich'];
Adventurer.prototype.wander = function() {
    return this.splatVariant('Crossword', ROT.RNG.getItem(Adventurer.WANDERER_KIT), 1, 1) > 0;
}

Adventurer.prototype.potionSplash = function() {
    let made = this.splat('PotionSplash', 1, 2);
    this.splat('BrokenFlask', 1, 1);
    return made > 0;
}

// Banners and torches hang on walls the hero cannot walk onto: wreck them in passing.
Adventurer.prototype.smashWallDecor = function() {
    for (let i=-1;i<2;i++) {
        for (let j=-1;j<2;j++) {
            let tile=Game.map[(this.x+i)+','+(this.y+j)];
            if (tile && tile.entity instanceof Entity && 'wall' in tile.entity.tags && ROT.RNG.getUniform() < 0.6) {
                tile.entity.adventurerAct();
                return true;
            }
        }
    }
    return false;
}

// Plain wall tiles next to the hero (for graffiti and engravings).
Adventurer.prototype.wallsAround = function() {
    let walls=[];
    for (let i=-1;i<2;i++) {
        for (let j=-1;j<2;j++) {
            let key=(this.x+i)+','+(this.y+j);
            let tile=Game.map[key];
            if (tile && !tile.passable && tile.door == null && tile.secretDoor == null && tile.mess == null && (tile.char == '#' || tile.char == '♯')) {
                walls.push([this.x+i,this.y+j]);
            }
        }
    }
    return walls;
}

// Heroes cannot resist writing their name on things.
Adventurer.prototype.tagWall = function() {
    let walls=this.wallsAround();
    if (walls.length == 0) {
        return false;
    }
    let spot=ROT.RNG.getItem(walls);
    makeMess(spot[0],spot[1],'Graffiti');
    this.graffiti++;
    Invasion.event('graffiti', {x:spot[0], y:spot[1]});
    return true;
}

// Now and then something silly happens. Uses ROT.RNG: it changes the world, so it
// must happen the same way whether the invasion is watched or skipped.
Adventurer.prototype.tryEvent = function() {
    if (this.turns - (this.lastEvent || 0) < Adventurer.EVENT_GAP || ROT.RNG.getUniform() >= Adventurer.EVENT_CHANCE) {
        return false;
    }
    let order = ROT.RNG.shuffle(Adventurer.EVENTS.slice());
    for (let i=0;i<order.length;i++) {
        if (this.doEvent(order[i])) {
            return true;
        }
    }
    return false;
}

// Runs one special event if it can happen here; returns whether it did.
Adventurer.prototype.doEvent = function(name, outcome=null) {
    let awake = Game.monsterList.filter(function(m) { return m.alive && !m.retired && m.hp > 0; });
    let fainted = Game.monsterList.filter(function(m) { return !m.retired && m.hp <= 0; });
    let self = this;
    let near = awake.filter(function(m) { return Math.abs(m.x-self.x) + Math.abs(m.y-self.y) <= 6; });
    let done = false;
    switch (name) {
        case 'lost':
        if (near.length > 0) {
            makeVariant(this.x, this.y, 'Crossword', 'Hand-drawn Map (wrong)');
            Invasion.event('lost', {monster: ROT.RNG.getItem(near)});
            done = true;
        }
        break;
        case 'scroll':
        outcome = outcome || ROT.RNG.getItem(['loss', 'menu', 'confetti']);
        makeMess(this.x, this.y, 'SpentScroll');
        if (outcome == 'confetti') {
            this.splat('LoosePages', 1, 3);
        }
        Invasion.event('scroll', {outcome: outcome});
        done = true;
        break;
        case 'backIn5':
        if (fainted.length > 0 && awake.length > 0) {
            Invasion.event('backIn5', {monster: ROT.RNG.getItem(awake)});
            done = true;
        }
        break;
        case 'elbereth':
        let walls = this.wallsAround();
        if (walls.length > 0) {
            let spot = ROT.RNG.getItem(walls);
            let mess = makeMess(spot[0], spot[1], 'Graffiti');
            mess.name = ELBERETH_NAME;
            mess.char = 'E';
            mess.elbereth = true;
            Invasion.event('elbereth', {monster: near.length > 0 ? ROT.RNG.getItem(near) : null});
            done = true;
        }
        break;
    }
    if (done) {
        this.lastEvent = this.turns;
    }
    return done;
}

Adventurer.prototype.damage = function() {
    this.hp--;
    Invasion.event('heroHurt', {by:null});
    let dx = Math.floor(3 * ROT.RNG.getUniform()) - 1;
    let dy = Math.floor(3 * ROT.RNG.getUniform()) - 1;
    //let newMess1 = makeMess(this.x, this.y, "BloodPool");
    let newMess2 = makeMess(this.x + dx, this.y + dy, "BloodPool");

}

// `released`: the first-frame gate letting this turn through.
Adventurer.prototype.act = function (released) {
    if (!released && this.turns == -1 && Invasion.holdFirst(this)) {
        return Invasion.firstFrameGate(this); // the footage starts paused on its first frame
    }
    this.takeTurn();
    if (this.active) {
        Invasion.afterHeroTurn();
    }
}

// How does the brave and noble adventurer proceed?
Adventurer.prototype.takeTurn = function () {
    if (!this.active) {
        return;
    }
    if (this.turns>this.maxTurns) {
        this.leave();
        return;
    }
    if (this.turns==-1) {
        Invasion.event('enter', {});
    }
    Invasion.event('turn', {});
    if (this.spreadCount>0 && this.spreading != null) {
        let newMess = makeMess(this.x,this.y,this.spreading);
        this.spreadCount--;
        if (this.spreadCount==0 && newMess.spreads!=null && newMess.spreads!="") {
            newMess.spread(this);
        }
    }
    if (this.hp<=0 && this.turns % 5 ==0) {
        if (!this.savedOnce) {
            // the first time: "You die... Restoring from save."
            this.savedOnce=true;
            this.hp=this.maxHp || 5;
            Invasion.event('saveScum', {});
        }
        else {
            let newMess1 = makeMess(this.x, this.y, "EmptyPotion");
            Invasion.event('potion', {});
            this.hp+=6;
        }
    }
    //console.log(this.x+','+this.y);
    //console.log(this.destinations);
    this.hunger--;
    if (this.hunger<=0) {
        let newMess = makeMess(this.x,this.y,"Wrapper");
        Invasion.event('snack', {});
        this.hunger += Math.floor(15*ROT.RNG.getUniform())+20;
    }
    // once per raid, the hero's coin purse springs a leak (more pocket money for you)
    if (!this.purseLeaked && this.turns > 20 && ROT.RNG.getUniform() < 0.03) {
        this.purseLeaked = true;
        makeMess(this.x, this.y, 'GoldCoins');
        Invasion.event('purse', {});
    }
    if ((this.zaps || 0) < Adventurer.MAX_ZAPS && this.turns > 10 && ROT.RNG.getUniform() < Adventurer.ZAP_CHANCE) {
        this.tryZap();
    }
    if ((this.ringsDropped || 0) < Adventurer.MAX_RINGS && this.turns > 10 && ROT.RNG.getUniform() < Adventurer.RING_CHANCE) {
        this.tryDropRing();
    }
    this.smashWallDecor();
    this.trySpecial();
    this.tryEvent();
    if (this.graffiti < this.maxGraffiti && ROT.RNG.getUniform() < 0.025) {
        this.tagWall();
    }
    this.turns++;
    if (this.blood>0) {
        this.blood--;
    }
    if (this.turns % 5 ==0) {
        this.look();
    }
    while (this.targets.length>0 && !(this.targets[0].alive)) {
        this.targets.shift();
    }
    if (this.targets.length>0) {
        if (this.currentTarget[0] != this.targets[0].x || this.currentTarget[1] != this.targets[0].y) {
            this.currentTarget=[this.targets[0].x,this.targets[0].y];
            this.recalculate=true;
        }
    }
    else {
        while (this.destinations.length>0 && this.x == this.destinations[this.destinationIndex][0] && this.y == this.destinations[this.destinationIndex][1]) {
            this.nextDestination();
            if (!this.active) {return;}
        }
        let dest = this.destinations[this.destinationIndex];
        if (this.currentTarget[0] != dest[0] || this.currentTarget[1] != dest[1]) {
            this.currentTarget = this.destinations[this.destinationIndex];
            this.recalculate=true;
        }
    }
    if (this.recalculate) {
        this.path=[];
        var astar = new ROT.Path.AStar(this.currentTarget[0], this.currentTarget[1], function(x,y) {
            let key = x+','+y;
            if (key in Game.map && Game.map[key].passable) {
                return true;
            }
            else {
                return false;
            }
        });//,{topology:4});
        //console.log("Recalculating...");
        //if (t)
        astar.compute(this.x,this.y,function(x,y){
            Game.adventurer.path.push([x,y]);
        });
        
        this.path.shift()
        this.recalculate=false;
    }
    //console.log(this.currentTarget);
    if (this.path.length > 0) {
        let nextStep=this.path.shift()
        //console.log(nextStep);
        if (!this.moveTo(nextStep[0],nextStep[1])) {
            let key=nextStep[0]+','+nextStep[1];
            if (key in Game.map) {
                if (Game.map[key].door != null && !Game.map[key].open) {
                    Game.map[key].open=true;
                    Invasion.event('door', {x:nextStep[0], y:nextStep[1]});
                }
                if (Game.map[key].entity != null && Game.map[key].entity instanceof Entity) {
                    Game.map[key].entity.adventurerAct();
                }
            }
            this.recalculate=true;
        }
    }
}

Adventurer.prototype.getArt = function() {
    return [this.char,this.color,'#000'];
}

Adventurer.prototype.moveTo=function(x,y) {
    let oldKey = this.x+','+this.y;
    let newKey = x+','+y;
    if (newKey in Game.map && Game.map[newKey].passThrough()) {
        Game.map[newKey].entity=this;
        this.x=x;
        this.y=y;
        if (Game.map[newKey].mess != null) {
            Game.map[newKey].mess.spread(this);
        }
        if (Game.map[newKey].trap != null && typeof Traps != 'undefined') {
            Traps.spring(this, Game.map[newKey]);
        }
    }
    else {
        return false;
    }
    /*console.log(Game.getRoomIndex(x,y));
    if (Game.getRoomIndex(x,y)>=0) {
        console.log('Exits:'+Game.rooms[Game.getRoomIndex(x,y)][4]);
    }*/
    if (oldKey != newKey && oldKey in Game.map && Game.map[oldKey].entity==this) {
        Game.map[oldKey].entity=null;
    }
    return true;
};