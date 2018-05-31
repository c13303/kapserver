/* file created by charles.torris@gmail.com */

var tools = require('./tools.js');
var v = require('./vars.js');
var clients = require('./clients.js');

module.exports = {
    players: [],

    init: function (connection) {
        for (var x = 1; x <= v.maxPlayers; x++) {
            this.players[x] = null;
        }
        console.log(this.players.length + ' players are init');
        this.loadPeopleFromDB(connection);
    },
    getPeopleInZone: function (zone, gid) {
        if (!gid)
            console.log('Error getPeopleInZone no personal GID');
        var selected = [];
        for (i = 1; i <= this.players.length; i++) {
            var man = this.players[i];
            if (man) {
                var isManInZone = tools.isInZone(man.x, man.y, zone);
                if (man.gid !== gid && isManInZone) {
                    selected.push(man);
                }
            }
        }
        return(selected);
    },
    loadPeopleFromDB: function (connection, callback) {
        var query = 'SELECT direction,gid,isNPC,id,name,x,y FROM users';
        var that = this;
        connection.query(query, function (err, rows, fields) {
            for (i = 0; i < rows.length; i++) {
                var player = rows[i];
                that.players[player.gid] = player;   /* <--- players are empty :'( */
            }
        }, this);

    },
    abortmove : function(gid){
        this.players[gid].isMoving = false;
        this.players[gid].Tx = 0;
        this.players[gid].Ty = 0;
    },
    move: function (map, gid, Tx, Ty, ws = null, Ct = null, clients = null) {

        /* time shit */
        var sT = v.serveurStartTime;
        var t = Date.now() - sT;
        var diffFromLastMove = Ct - this.players[gid].lastMove;
        this.players[gid].lastMove = Ct;
        if (diffFromLastMove < v.movespeed) {
            console.log(this.players[gid].name + " ordered 2 moves in " + diffFromLastMove + " ! too quick ");
        }
        
        

        if (this.players[gid].moveDisabled) {
            return null;
        }


        /* target = same place ? */
        if (Tx === this.players[gid].x && Ty === this.players[gid].y) {
            //console.log("Error : " + this.players[gid].name + " asked to move immobile");
            return null;
        }


        /* MOVER ORDER */
        //console.log("Moving : "+this.players[gid].name);
        this.players[gid].isMoving = true;

        /* save old position */
        this.players[gid].Ox = this.players[gid].x;
        this.players[gid].Oy = this.players[gid].y;

        /* set long term target position */
        this.players[gid].Tx = Tx;
        this.players[gid].Ty = Ty;

        /* calculate next step */
        var arr = tools.getNextCase(Tx, Ty, this.players[gid].x, this.players[gid].y);
        var nextX = arr[0];
        var nextY = arr[1];


        /* if problem, abort now TODO */
        /* if wall */
        try{
            if(map.solidMap[nextX][nextY]>0){
            //console.log("WALL");
            return null;
        }
        }catch(e){
            console.log(e);
            console.log("bug for "+nextX);
        }
        





        /* CHUNK CHECK & CHANGE */
        var NewChunk = tools.getChunk(nextX, nextY);
        if (NewChunk.x !== this.players[gid].chunkX || NewChunk.y !== this.players[gid].chunkY) {
            // console.log("chunk change");
            this.players[gid].x = nextX;
            this.players[gid].y = nextY;
            this.players[gid].direction = direction;
            this.players[gid].chunkX = NewChunk.x;
            this.players[gid].chunkY = NewChunk.y;
            /* if client connected, update for yourself */
            if (ws) {
                ws.UpdateMyClientZone();
            }
        }

        /* save data */
        var direction = tools.getDirection(this.players[gid].x, this.players[gid].y, Tx, Ty);
        this.players[gid].x = nextX;
        this.players[gid].y = nextY;
        this.players[gid].direction = direction;
        this.players[gid].chunkX = NewChunk.x;
        this.players[gid].chunkY = NewChunk.y;


        /* Single Player Move : tell everyone you moved */
        if (this.players[gid].isOnline) {
            var selected = [this.players[gid]];
            clients.tellMoveEveryClient(selected, gid, this);
        } else {
            /* NPC Mass Update = agregate */
         //   console.log("NPC " + this.players[gid].name + " has moved to " + this.players[gid].x + "," + this.players[gid].y);
            return(this.players[gid]);

    }



    }
};
