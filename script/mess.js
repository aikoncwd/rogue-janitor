function Mess(x,y,char,color,bgColor,name,importance,spreads=null,spreadCount=0,altname="",cleanMethod="mop") {
    this.x=x;
    this.y=y;
    this.char=char;
    this.color=color;
    this.bgColor=bgColor;
    this.name=name;
    this.kind=name; // what it really is; `name` may be a funny variant (logic uses kind)
    this.spreads=spreads;
    this.spreadCount=spreadCount;
    this.importance=importance;
    this.cleanMethod=cleanMethod;
    this.parent=null;
    this.droppedBy=null;
    let key=x+','+y;
    let increment=true;
    this.pickedUp=false;
    this.unique=false;
    if (key in Game.map && Game.map[key].mess != null) {
        increment=false;
    }
    if (key in Game.map && Game.map[key].passable && !Game.map[key].important && (Game.map[key].mess == null || (this.importance >= Game.map[key].mess.importance))) {
        Game.map[key].mess=this;
        if (increment) {
            Game.messNumbers[0]++;
            Game.messNumbers[1]++;
        }
    }
    else if (spreads != null && key in Game.map && (!Game.map[key].passable || Game.map[key].important) && (Game.map[key].mess == null || this.importance >= Game.map[key].mess.importance)) {
        Game.map[key].mess=this;
        this.char = Game.map[key].char;
        if (this.char=='#') {
            this.char='\u266F';
        }
        let newbgColor = ROT.Color.fromString(this.color);
        newbgColor=ROT.Color.multiply(newbgColor,[100,100,100]);
        this.bgColor = ROT.Color.toHex(newbgColor);
        if (increment) {
            Game.messNumbers[0]++;
            Game.messNumbers[1]++;
        }
    }
}

// Tough stains need several passes. They start out in a loud, saturated version
// of their colour and get darker with every pass until they are gone.
Mess.prototype.makeTough = function(passes) {
    this.passes = passes;
    this.maxPasses = passes;
    let hsl = ROT.Color.rgb2hsl(ROT.Color.fromString(this.color));
    this.hue = hsl[0];
    this.toughColor();
    return this;
}

Mess.prototype.toughColor = function() {
    let wall = this.char == '\u266F' || (this.bgColor != '#000' && this.bgColor != '#000000');
    let l = 0.18 + 0.42 * (this.passes / this.maxPasses);
    this.color = ROT.Color.toHex(ROT.Color.hsl2rgb([this.hue, 1, l]));
    if (wall) {
        this.bgColor = ROT.Color.toHex(ROT.Color.hsl2rgb([this.hue, 0.6, l * 0.4]));
    }
}

// One pass of scrubbing. Returns true when the stain is finally gone.
Mess.prototype.scrub = function() {
    if (!this.passes || this.passes <= 1) {
        this.passes = 0;
        return true;
    }
    this.passes--;
    this.toughColor();
    return false;
}

Mess.prototype.getAction = function() {
    if (this.passes > 1) {
        return '%c{#ff0}M%c{}op it! (' + this.passes + ' passes left)';
    }
    if (this.cleanMethod=='get') {
        return '%c{#ff0}P%c{}ick it up!';
    }
    else if (this.cleanMethod=='mop') {
        return '%c{#ff0}M%c{}op it!';
    }
    else if (this.cleanMethod=='fix') {
        return 'You can %c{#ff0}f%c{}ix it!';
    }
}

// The name inside a sentence: ordinary messes in lower case ("the empty coffee mug"),
// funny variants as written ("the Excalibur (rental)").
Mess.prototype.displayName = function() {
    return this.name == this.kind ? this.name.toLowerCase() : this.name;
}

// What examining it says: name, a funny description if it has one, and what to do.
Mess.prototype.describe = function() {
    return this.name + ". " + (this.desc ? this.desc + " " : "") + this.getAction();
}

Mess.prototype.getArt = function() {
    return [this.char, this.color, this.bgColor];
}

Mess.prototype.spread = function(spreader) {
    if (spreader.spreadCount < this.spreadCount || spreader.spreading == this.spreads) {
        spreader.spreading=this.spreads;
        spreader.spreadCount=this.spreadCount;//Math.max(this.spreadCount,spreader.spreadCount+2);
    }
}

Mess.prototype.plural = function() {
    if ('pluralName' in this) {
        return this.pluralName;
    }
    else {
        return this.name+'s';
    }
}

function makeMess(x,y,name) {
    var newMess;
    switch(name) {
        default:
        case 'Wrapper':
        newMess = new Mess(x,y,'w','#ccc','#000','Discarded Candy Wrapper',10,null,0,"","get");
        break;
        case 'AppleCore':
        newMess = new Mess(x,y,'%','#0f0','#000','Apple Core',10,null,0,"","get");
        break;
        case 'EmptyBottle':
        newMess = new Mess(x,y,'!','#080','#000',"Empty Bottle",10,null,0,"","get");
        break;
        case 'EmptyMug':
        newMess = new Mess(x,y,'u','#999','#000',"Empty Coffee Mug",10,null,0,"","get");
        break;
        case 'EmptyPotion':
        newMess = new Mess(x,y,'!','#0ff','#000',"Empty Potion",11,null,0,"","get");
        break;
        case 'BloodPool':
        newMess = new Mess(x,y,"~",'#f00','#000','"Blood"',6,"BloodPrints",6,'"Blood" Covered');
        break;
        case 'HydraHead':
        newMess = new Mess(x,y,'\u2082','#e00','#000','Hydra Head',11,'BloodPool',1,null,"get");
        break;
        case 'BloodPrints':
        newMess = new Mess(x,y,",",'#f00','#000','"Blood" Footprints',3,"",0,'"Blood" Covered');
        break;
        case 'AcidPool':
        newMess = new Mess(x,y,"~",'#0f0','#000','Acid Pool',6,"AcidPrints",6,'Acid Covered');
        newMess.pluralName='Pools of Acid';
        break;
        case 'AcidPrints':
        newMess = new Mess(x,y,",",'#0f0','#000','Acid Footprints',3,"",0,'Acid Covered');
        break;
        case 'MudPrints':
        newMess = new Mess(x,y,",",'#960','#000','Muddy Footprints',3,"",0,'Mud Covered');
        break;
        case 'BrokenTable':
        newMess = new Mess(x,y,'/','#fa0','#000',"Smashed Table",12,"Splinters",2,"","fix");
        break;
        case 'BrokenChest':
        newMess = new Mess(x,y,'/','#fa0','#000',"Smashed Treasure Chest",12,"Splinters",2,"","fix");
        break;
        case 'Splinters':
        newMess = new Mess(x,y,',','#fa0','#000',"Splinters",4,null,0,"");
        break;
        case 'TippedCauldron':
        newMess = new Mess(x,y,'C','#ccc','#000',"Tipped Over Cauldron",12,"Water",2,"","fix");
        break;
        case 'Water':
        newMess = new Mess(x,y,'~','#00f','#000',"Water",6,"WetPrints",6,"Soggy");
        break;
        case 'WetPrints':
        newMess = new Mess(x,y,',','#00f','#000',"Wet Footprints",3,"",0,"Soggy");
        break;
        case 'Scorch':
        newMess = new Mess(x,y,'*','#999','#000',"Scorch Mark",7,"",0,"Scorched");
        break;
        case 'SmashedStatue':
        newMess = new Mess(x,y,';','#ccc',"#000","Smashed Statue",12,null,0,"","fix");
        break;
        case 'SmashedCandle':
        newMess = new Mess(x,y,'/','#ff0',"#000","Smashed Candelabrum",12,null,0,"","fix");
        break;
        case 'SmashedBarrel':
        newMess = new Mess(x,y,'%','#a62',"#000","Smashed Barrel",12,"Splinters",2,"","fix");
        break;
        case 'SpilledAle':
        newMess = new Mess(x,y,'~','#da3','#000',"Spilled Ale",6,"StickyPrints",5,"Sticky");
        newMess.pluralName='Puddles of Ale';
        break;
        case 'StickyPrints':
        newMess = new Mess(x,y,',','#da3','#000',"Sticky Footprints",3,"",0,"Sticky");
        break;
        case 'ToppledBookshelf':
        newMess = new Mess(x,y,'\u2550','#a62',"#000","Toppled Bookshelf",12,"Splinters",2,"","fix");
        break;
        case 'LoosePages':
        newMess = new Mess(x,y,'?','#eee','#000',"Loose Pages",9,null,0,"","get");
        newMess.pluralName='Loose Pages';
        break;
        case 'GoldCoins':
        newMess = new Mess(x,y,'$','#ff0','#000',"Scattered Gold Coins",9,null,0,"","get");
        newMess.pluralName='Scattered Gold Coins';
        newMess.bonusPoints=2;
        newMess.sound='coins';
        break;
        case 'UsedWand': // what the hero leaves after zapping (renamed by material)
        newMess = new Mess(x,y,'/','#c96','#000',"Used Wand",10,null,0,"","get");
        break;
        case 'CrackedStaff':
        newMess = new Mess(x,y,'_','#a74','#000',"Cracked Staff",10,null,0,"","get");
        break;
        case 'LostRing': // goes to your pocket (inventory) when picked up
        newMess = new Mess(x,y,'=','#fd0','#000',"Lost Ring",30,null,0,"","get");
        newMess.unique = true; // "You pick up a jade ring!", not "the a jade ring"
        // which ring is picked by Adventurer.tryDropRing (world RNG); no rolls here
        newMess.name = Lore.ringNames[0];
        newMess.ringLore = Lore.ringLore[0];
        break;
        case 'Crossword':
        newMess = new Mess(x,y,'=','#fff','#000',"Crumpled Crossword",10,null,0,"","get");
        break;
        case 'Cobweb':
        newMess = new Mess(x,y,'"','#aaa','#000',"Cobweb",5,null,0,"");
        break;
        case 'SlimePool':
        newMess = new Mess(x,y,'~','#4f9','#000',"Slime Puddle",6,"SlimePrints",4,"Slimy");
        newMess.slippery=true;
        break;
        case 'SlimeTrail':
        newMess = new Mess(x,y,':','#4f9','#000',"Slime Trail",4,null,0,"Slimy");
        break;
        case 'SlimePrints':
        newMess = new Mess(x,y,',','#4f9','#000',"Slimy Footprints",3,"",0,"Slimy");
        break;
        case 'PotShards':
        newMess = new Mess(x,y,',','#c84','#000',"Pottery Shards",9,null,0,"","get");
        newMess.pluralName='Pottery Shards';
        break;
        case 'SpilledSoil':
        newMess = new Mess(x,y,'.','#963','#000',"Spilled Soil",5,"MudPrints",3,"Mud Covered");
        break;
        case 'BrokenRack':
        newMess = new Mess(x,y,'/','#aaa','#000',"Broken Weapon Rack",12,null,0,"","fix");
        break;
        case 'DroppedSword':
        newMess = new Mess(x,y,')','#ccc','#000',"Dropped Sword",9,null,0,"","get");
        break;
        case 'BrokenFountain':
        newMess = new Mess(x,y,'{','#888','#000',"Broken Fountain",12,"Water",3,"","fix");
        break;
        case 'Gravel':
        newMess = new Mess(x,y,':','#999','#000',"Gravel",5,null,0,"");
        newMess.pluralName='Piles of Gravel';
        break;
        case 'BrokenColumn':
        newMess = new Mess(x,y,':','#ddd','#000',"Broken Column",12,null,0,"","fix");
        break;
        case 'TornBanner':
        // hangs on the wall: an empty `spreads` lets the Mess sit on an impassable tile
        newMess = new Mess(x,y,'\u00B6','#777','#000',"Torn Banner",12,"",0,"","fix");
        newMess.char='\u00B6';
        newMess.color='#777';
        newMess.bgColor='#000';
        break;
        case 'FabricScraps':
        newMess = new Mess(x,y,'~','#a5f','#000',"Scraps of Banner",9,null,0,"","get");
        newMess.pluralName='Scraps of Banner';
        break;
        case 'FallenTorch':
        newMess = new Mess(x,y,'\u00A1','#777','#000',"Knocked-Down Torch",12,"",0,"","fix");
        newMess.char='\u00A1';
        newMess.color='#777';
        newMess.bgColor='#000';
        break;
        case 'DrippedWax':
        newMess = new Mess(x,y,',','#ffd','#000',"Dripped Wax",4,null,0,"");
        break;
        // monster messes
        case 'Spores':
        newMess = new Mess(x,y,'\u00B7','#c6f','#000',"Spores",4,null,0,"Spore Covered");
        newMess.pluralName='Clouds of Spores';
        break;
        case 'Feathers':
        newMess = new Mess(x,y,"'",'#edb','#000',"Loose Feathers",9,null,0,"","get");
        newMess.pluralName='Loose Feathers';
        break;
        case 'MimicDrool':
        newMess = new Mess(x,y,'~','#f8c','#000',"Mimic Drool",6,"DroolPrints",4,"Drool Covered");
        newMess.slippery=true;
        break;
        case 'DroolPrints':
        newMess = new Mess(x,y,',','#f8c','#000',"Drooly Footprints",3,"",0,"Drool Covered");
        break;
        case 'BoneDust':
        newMess = new Mess(x,y,'.','#eee','#000',"Bone Dust",5,"DustyPrints",3,"Dusty");
        break;
        case 'DustyPrints':
        newMess = new Mess(x,y,',','#eee','#000',"Dusty Footprints",3,"",0,"Dusty");
        break;
        case 'LooseBone':
        newMess = new Mess(x,y,'%','#eee','#000',"Loose Bone",11,null,0,"","get");
        break;
        case 'Ectoplasm':
        newMess = new Mess(x,y,'~','#7fd','#000',"Ectoplasm",7,"EctoPrints",4,"Ectoplasmic");
        newMess.pluralName='Puddles of Ectoplasm';
        break;
        case 'EctoPrints':
        newMess = new Mess(x,y,',','#7fd','#000',"Glowing Footprints",3,"",0,"Ectoplasmic");
        break;
        // hero class messes
        case 'HolyWater':
        newMess = new Mess(x,y,'~','#bdf','#000',"Holy Water",6,"WetPrints",4,"Soggy");
        newMess.pluralName='Puddles of Holy Water';
        break;
        case 'Drumstick':
        newMess = new Mess(x,y,'%','#c63','#000',"Gnawed Drumstick",10,null,0,"","get");
        break;
        case 'SpentScroll':
        newMess = new Mess(x,y,'?','#ff8','#000',"Spent Scroll",10,null,0,"","get");
        break;
        case 'StrayArrow':
        newMess = new Mess(x,y,'\u2192','#ca8','#000',"Stray Arrow",10,null,0,"","get");
        break;
        case 'Soot':
        newMess = new Mess(x,y,'\u2591','#777','#000',"Soot",7,"SootyPrints",3,"Sooty");
        break;
        case 'SootyPrints':
        newMess = new Mess(x,y,',','#777','#000',"Sooty Footprints",3,"",0,"Sooty");
        break;
        case 'SheetMusic':
        newMess = new Mess(x,y,'\u266A','#f8f','#000',"Sheet Music",10,null,0,"","get");
        newMess.pluralName='Sheets of Music';
        break;
        case 'DugHole':
        newMess = new Mess(x,y,'\u25CB','#a74','#000',"Dug-Up Hole",12,null,0,"","fix");
        break;
        case 'PotionSplash':
        let potionColor=ROT.Color.toHex(ROT.Color.hsl2rgb([ROT.RNG.getUniform(),1,0.6]));
        newMess = new Mess(x,y,'~',potionColor,'#000',"Bubbling Potion",7,"",0,"");
        newMess.pluralName='Puddles of Bubbling Potion';
        break;
        case 'BrokenFlask':
        newMess = new Mess(x,y,',','#aff','#000',"Broken Flask",9,null,0,"","get");
        break;
        case 'Graffiti':
        // Walls only: an empty `spreads` lets the Mess sit on an impassable tile.
        newMess = new Mess(x,y,'#','#f5f','#000',"Graffiti",8,"",0,"");
        newMess.char = ROT.RNG.getItem(['H','E','R','O','!','X','$']);
        newMess.color = ROT.RNG.getItem(['#f5f','#5ff','#ff5']);
        break;

        // quest items
        case 'FavouriteHat':
        newMess = new Mess(x,y,'^','#fff','#000','Favourite Hat',50,null,0,"","get");
        break;
        case 'Purse':
        newMess = new Mess(x,y,'\u03B4','#ccc','#000','Purse',50,null,0,"","get");
        break;
        case 'Vuvuzela':
        newMess = new Mess(x,y,'\u227A','#f00','#000','Vuvuzela',50,null,0,"","get");
        break;
        case 'Manifesto':
        newMess = new Mess(x,y,'\u262D','#f00','#000','Manifesto',50,null,0,"",'get');
        break;
        case 'Umbrella':
        newMess = new Mess(x,y,'\u0372','#f0f','#000','Umbrella',50,null,0,"",'get');
        break;
        case 'DiceBag':
        newMess = new Mess(x,y,'\u03C3','#ff0','#000','Dice Bag',50,null,0,"",'get');
        break;
        case 'Cello':
        newMess = new Mess(x,y,'\u03A6','#fa0','#000','Cello',50,null,0,"",'get');
        break;
        case 'YoYo':
        let color=ROT.Color.toHex(ROT.Color.hsl2rgb([ROT.RNG.getUniform(),1,0.5]));
        newMess = new Mess(x,y,'\u0398',color,'#000','Lucky Yo-Yo',50,null,0,"",'get');
        break;
    }

    if (newMess.kind in TOUGH_STAINS && !newMess.passes) {
        let passes = TOUGH_STAINS[newMess.kind];
        if (newMess.kind == '"Blood"') {
            passes = ROT.RNG.getUniform() < 0.25 ? 2 : 1; // some of it has had time to dry
        }
        if (passes > 1) {
            newMess.makeTough(passes);
        }
    }
    if (name in Lore.variants && ROT.RNG.getUniform() < Lore.VARIANT_CHANCE) {
        applyVariant(newMess, ROT.RNG.getItem(Lore.variants[name]));
    }
    return newMess;
}

function applyVariant(mess, variant) {
    mess.name = variant.name;
    mess.desc = variant.desc || null;
    mess.pickup = variant.pickup || null;
}

// A mess of `type` that is definitely called `variantName` (heroes' signature mess).
function makeVariant(x,y,type,variantName) {
    let mess = makeMess(x,y,type);
    applyVariant(mess, Lore.variantNamed(type, variantName) || {name: variantName});
    return mess;
}

// Passes needed to scrub away the stubborn stuff.
var TOUGH_STAINS = {
    'Acid Pool': 3,
    'Graffiti': 3,
    'Ectoplasm': 3,
    'Scorch Mark': 2,
    'Slime Puddle': 2,
    'Spilled Ale': 2,
    'Soot': 2,
    '"Blood"': 2,
};

function QuestMess(dropper,x,y) {
    var options=['Purse','Vuvuzela','Umbrella','DiceBag','Cello','YoYo'];
    if (dropper.species=='Dragon') {
        options.push('DiceBag');
        options.push('DiceBag');
    }
    if (dropper.hatChar != null) {
        options.push('FavouriteHat');
        options.push('FavouriteHat');
    }
    if (dropper.unionStarter) {
        options=['Manifesto'];
    }
    let choice = ROT.RNG.getItem(options);
    let newMess = makeMess(x, y, choice);
    newMess.unique=true;
    dropper.questItemName = newMess.name.toLowerCase();
    newMess.name = dropper.name + "'s " + newMess.name;
    dropper.questItem = newMess;
}