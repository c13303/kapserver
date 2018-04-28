/* file created by charles.torris@gmail.com */

var tools = require('./tools.js');
var v = require('./vars.js');

module.exports = {
    players: [],

    init: function (connection) {
        for (var x = 1; x < v.maxPlayers; x++) {
            this.players[x] = null;
        }
        console.log(this.players.length+ ' players are init');
        this.loadPeopleFromDB(connection);
    },    
    getPeopleInZone: function (zone, gid) {
        if (!gid)
            console.log('Error getPeopleInZone no GID');
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
            for (i = 0; i < roman.length; i++) {
                var player = rows[i];
                that.players[player.gid] = player;   /* <--- players are empty :'( */
            }
        },this);

    },
    move: function (man,Tx,Ty,clients,ws=null){
         if (!man.isMoving) {
             
             
            /* MOVER ORDER */
            man.isMoving = true;
            man.Tx = Tx;
            man.Ty = Ty;
            var arr = tools.getNextCase(Tx, Ty, man.x, man.y); // calculate next step
            var nextX = arr[0];
            var nextY = arr[1];     
            
            /* if problem, abort now TODO */
                   
            /* tell everyone you moved */            
            var direction = tools.getDirection(man.x,man.y,Tx,Ty);            
            this.players[man.gid].x = nextX;
            this.players[man.gid].y = nextY;
            this.players[man.gid].direction = direction;            
            var mover = [this.players[man.gid]];
            
            /* CHUNK CHECK & CHANGE */
            var NewChunk = tools.getChunk(nextX, nextY);
            if (NewChunk.x !== man.chunkX || NewChunk.y !== man.chunkY) {
                //  console.log(man.chunkX + ',' + man.chunkY + ' Chunk Change ' + NewChunk.x + ',' + NewChunk.y);
                man.chunkX = NewChunk.x;
                man.chunkY = NewChunk.y;
            }
            
            
            
            
            clients.tellEveryOne(mover,man.gid);
            
            man.moveTimer = setTimeout(function () {
                /* MOVE COMPLETE */               
                man.x = nextX;
                man.y = nextY;
                man.direction = direction;
                man.isMoving = null;
                
               
                
                /* if player online */
                if(ws){
                     ws.UpdateMyZone();
                }

            }, v.movespeed);

        } else {
            console.log('refused move instruction : too quick');
        }
    }
};
