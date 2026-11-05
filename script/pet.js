function Pet(x,y,char,species) {

    let color=ROT.Color.toHex(ROT.Color.hsl2rgb([ROT.RNG.getUniform(),1,0.5]));

    Entity.call(this,x,y,char,color,species,1,{animal:true},1,'#000',false);
    Game.petList.push(this);
    Game.scheduler.add(this,true);
    this.path=[];
    this.direction=[0,0];
    this.sleep=5;
    this.steps=0;
    this.failures=0;
    this.home=null;
    this.metPlayer=false;
    this.aloofness=0.7;
    this.sound=['text','Bork'];
    this.animQueue=[];
    this.animating=false;
}

function AddPet(x,y,species) {
    let newPet;
    switch (species) {
        default:
        case 'dog':
        newPet = new Pet(x,y,'d','Dog');
        newPet.aloofness=0.6;
        newPet.sound=['text','Bork'];
        break;
        case 'cat':
        newPet = new Pet(x,y,'c','Cat');
        newPet.aloofness=0.9;
        newPet.sound=['text','Meow'];
        break;
        case 'rabbit':
        newPet = new Pet(x,y,'r','Rabbit');
        newPet.aloofness=0.8;
        newPet.sound=['action','Thump'];
        break;
        case 'rat':
        newPet = new Pet(x,y,'r','Rat');
        newPet.aloofness=0.8;
        newPet.sound=['text','Squeak'];
        break;
        case 'horse':
        newPet = new Pet(x,y,'h','Horse');
        newPet.sound=['text','Neigh'];
        break;
    }
    return newPet;
}

Pet.prototype = Object.create(Entity.prototype);

Pet.prototype.cleanerAct = function() {
    this.playerInteractions++;
    Achievements.unlock('petting');
    if (!this.playerTalkedToday) {
        Game.yendorPoints+=2;
        this.playerTalkedToday=true;
    }
    Game.player.talking=this;

    ConversationBuilder.petConvo(this);

    this.metPlayer=true;
    this.openConvo(); // the same way a comrade starts a chat
};

Pet.prototype.recenter = function(x,y) {
    Game.scheduler.add(this,true);
    let dx=0;
    let dy=0;
    this.playerTalkedToday=false;
    let spot = findFreeNear(x,y);
    if (spot != null) {
        this.moveTo(spot[0],spot[1]);
    }
    this.home=[this.x,this.y];
};

// Override act. Animals do what they're gonna do
Pet.prototype.act = function() {
    if (this.animQueue.length>0) {
        this.runAnimations();
        return;
    }
    tickSpread(this);
    this.lastSeen++;
    if (Game.phase == 'cleaning' && this.lastSeen<=1 && ROT.RNG.getUniform()>0.95 && (Game.lastMessage==null || Game.lastMessage=="")) {
        let punctuation=['.','.','!','!','!!'];
        if (this.sound[0]=='text') {
            Game.sendMessage(this.sound[1]+ROT.RNG.getItem(punctuation));
        }
        else {
            Game.sendMessage(this.name+" "+this.sound[1].toLowerCase()+'s'+ROT.RNG.getItem(punctuation));
        }
    }
    if (this.home==null) {
        this.home=[this.x,this.y];
    }
    if (this.sleep>0) {
        this.sleep--;
        return;
    }
    else if (this.path.length>0) {
        if (this.moveTo(this.path[0][0],this.path[0][1])) {
            this.failures=0;
            this.path.shift();
        }
        else {
            this.failures++;
        }
        if (this.failures > 5) {
            this.path=[];
        }
        return;
    }

    if (this.steps<0) {
        this.sleep += Math.floor(10*ROT.RNG.getUniform());
        if (ROT.RNG.getUniform()<this.aloofness) {
            this.steps += Math.floor(20*ROT.RNG.getUniform());
            do {
                this.direction[0] = Math.floor(3*ROT.RNG.getUniform())-1;
                this.direction[1] = Math.floor(3*ROT.RNG.getUniform())-1;
            } while (this.direction[0]==0 && this.direction[1]==0); 
        }
        else {
            var targetPos=[this.home[0],this.home[1]];
            if (Game.playerPet==this) {
                targetPos=[Game.player.x,Game.player.y];
            }
            /*if (ROT.RNG.getUniform()>0.3 ) {
                let key = ROT.RNG.getItem(Game.freeCells);
                let parts=key.split(',');
                targetPos[0]=parseInt(parts[0]);
                targetPos[1]=parseInt(parts[1]);
            }*/
            var path=[[this.x,this.y]];
            var astar = new ROT.Path.AStar(targetPos[0], targetPos[1], function (x, y) {
                if ((x==path[0][0] && y==path[0][1]) || (x==targetPos[0] && y==targetPos[1])) {
                    return true;
                }
                let key = x + ',' + y;
                if (key in Game.map && Game.map[key].passThrough()) {
                    return true;
                }
                else {
                    return false;
                }
            });
            astar.compute(this.x,this.y,function(x,y){
                path.push([x,y]);
            });
            if (path.length<=1) { // no way there
                this.path=[];
            }
            else {
                this.path=path;
                this.path.shift();
                this.path.shift();
            }
        }
    }
    else {
        this.steps--; // wandering lasts a few steps, then home or a nap
        if (!this.moveTo(this.x+this.direction[0],this.y+this.direction[1])) {
            while (this.direction[1]==0) {
                this.direction[1] = Math.floor(3*ROT.RNG.getUniform())-1;
            }
            if (!this.moveTo(this.x,this.y+this.direction[1])) {
                while (this.direction[0]==0) {
                    this.direction[0] = Math.floor(3*ROT.RNG.getUniform())-1;
                }
                if (!this.moveTo(this.x+this.direction[0],this.y)) {
                    this.steps=-2;
                    do {
                        this.direction[0] = Math.floor(3*ROT.RNG.getUniform())-1;
                        this.direction[1] = Math.floor(3*ROT.RNG.getUniform())-1;
                    } while (this.direction[0]==0 && this.direction[1]==0); 
                }
            }
        }
    }
};

Pet.prototype.petAction = function(action) {
    switch(action) {
        default:
        case 'play':
            var targetPos=[0,0];
            let key = ROT.RNG.getItem(Game.freeCells);
            let parts = key.split(',');
            targetPos[0] = parseInt(parts[0]);
            targetPos[1] = parseInt(parts[1]);

            var path = [[this.x, this.y]];
            var astar = new ROT.Path.AStar(targetPos[0], targetPos[1], function (x, y) {
                if ((x == path[0][0] && y == path[0][1]) || (x == targetPos[0] && y == targetPos[1])) {
                    return true;
                }
                let key = x + ',' + y;
                if (key in Game.map && Game.map[key].passThrough()) {
                    return true;
                }
                else {
                    return false;
                }
            });
            astar.compute(this.x, this.y, function (x, y) {
                path.push([x, y]);
            });
            this.steps=-1;
            this.sleep=-1;
            if (path.length <= 1) { // unreachable: just run around instead
                this.path = [];
                do {
                    this.direction[0] = Math.floor(3*ROT.RNG.getUniform())-1;
                    this.direction[1] = Math.floor(3*ROT.RNG.getUniform())-1;
                } while (this.direction[0]==0 && this.direction[1]==0); 
                this.steps+=20;
            }
            else {
                this.path = path;
                this.path.shift();
                this.path.shift();
            }
            break;
        case 'pet':
            this.doAnimation('pet');
            Game.player.wait(1000);
            break;
        case 'hug':
            this.doAnimation('hug');
            Game.player.wait(1000);
            break;
    }
};

Pet.prototype.doAnimation=function(anim) {
    this.animating=true;
    this.animQueue.push(anim);
};

Pet.prototype.runAnimations=function() {
    Game.engine.lock();
    var positions=[this.x,this.y];
    var animQueue=this.animQueue;
    var time=0;
    var limits={'hug':20,'pet':16};
    var anim=setInterval(function() {
        let drawPos=[positions[0]+Game.offset[0]-Game.player.x,positions[1]+Game.offset[1]-Game.player.y];
        Game.drawMap();

        switch(animQueue[0]) {
            default:
            case 'hug':
            if (time>limits['hug']) {
                animQueue.shift();
                time=0;
            }
            else {
                let color=ROT.Color.toHex(ROT.Color.hsl2rgb([parseFloat(time)/parseFloat(limits['hug']),1,0.5]));
                Game.display.draw(drawPos[0],drawPos[1]-1.0,'\u2665',color);
            }
            break;
            case 'pet':
            if (time>limits['pet']) {
                animQueue.shift();
                time=0;
            }
            else {
                let petSet=0.3*Math.sin(3.14159 * (parseFloat(time)/4));
                let color='#fff';
                Game.display.draw(drawPos[0],drawPos[1]-petSet-0.6,'-',color);
            }
            break;
        }

        if (animQueue == null || animQueue.length==0) {
            clearInterval(anim);
            Game.engine.unlock();
        }

        time++;
    },50);
}

Pet.prototype.constructor=Pet;

function FoodBowl(x,y) {
    this.x=x;
    this.y=y;
    this.full=false;
    this.name="Empty Food Bowl";
    this.color='#fff';
    let spot = findFreeNear(x,y);
    if (spot != null) {
        this.x=spot[0];
        this.y=spot[1];
        Game.map[this.x+','+this.y].entity=this;
    }
    this.getArt = function() {
        if (this.full) {
            return ['\u2200',this.color,'#000'];
        }
        else {
            return ['\u2228',this.color,'#000'];
        }
    }
    this.cleanerAct = function() {
        if (!this.full) {
            Game.sendMessage("You fill the food bowl.");
            this.name="Full Food Bowl";
            Game.yendorPoints+=50;
            this.full=true;
            Game.player.endTurn();
        }
    }
}