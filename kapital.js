/* file created by charles.torris@gmail.com */

var mysql = require('mysql');
var params = require('./params.js');
var tools = require('./tools.js');
var v = require('./vars.js');
var fs = require('fs');
var people = require('./people.js');
var map = require('./map.js');
var clients = require('./clients.js');

var connection = mysql.createConnection({
    host: params.localhost,
    user: params.user,
    password: params.password,
    database: params.database
});
connection.connect();

var chunksWidth = v.maxTiles / v.chunksize;






/*
 * 
 * COMMAND READING
 */
var stdin = process.openStdin();

stdin.addListener("data", function (d) {
    var commande = d.toString().trim();
    if (commande) {
        console.log("command entered: [" + commande + "]");

        if (commande === "loadmap") {
            map.loadMapFromFiles(dataOK);
        }
        if (commande === 'sendmap') {
            clients.sendMapToMulti(map);
        }
        
        if (commande === 'debug') {
            console.log(people.players[1]);            
            console.log(people.players[2]);
            console.log(people.players[3]);
        }
    }

});





/* classe map */


/* callback TODO */
function dataOK() {
    //
    v.scriptToLoad++;
    if (v.scriptToLoad >= 1) {
        console.log('Rock&Loaded!');
        v.rockAndLoaded = true;
    }
}

/* global scope */

function move(gid,Tx,Ty,ws=null){

         if (!people.players[gid].isMoving) {           
             
            /* MOVER ORDER */
            people.players[gid].isMoving = true;
            
            /* save old position */
            people.players[gid].Ox = people.players[gid].x;
            people.players[gid].Oy = people.players[gid].y;
                       
            /* set long term target position */
            people.players[gid].Tx = Tx;
            people.players[gid].Ty = Ty;
            
            /* calculate next step */
            var arr = tools.getNextCase(Tx, Ty, people.players[gid].x, people.players[gid].y); 
            var nextX = arr[0];
            var nextY = arr[1];     
            
            
            /* if problem, abort now TODO */  
            
            
           
            /* CHUNK CHECK & CHANGE */
            var NewChunk = tools.getChunk(nextX, nextY);
            if (NewChunk.x !== people.players[gid].chunkX || NewChunk.y !== people.players[gid].chunkY) {
                people.players[gid].chunkX = NewChunk.x;
                people.players[gid].chunkY = NewChunk.y;                
                /* if client connected, update for yourself */
                if(ws){
                     ws.UpdateMyClientZone();
                }
            }
            
            /* save data */
            var direction = tools.getDirection(people.players[gid].x,people.players[gid].y,Tx,Ty);            
            people.players[gid].x = nextX;
            people.players[gid].y = nextY;
            people.players[gid].direction = direction;            
            
            
           /* tell everyone you moved */   
            var selected = [people.players[gid]];
            clients.tellEveryClient(selected,gid,people);
            
            /* MOVE COMPLETE */
            setTimeout(function () {  
                people.players[gid].isMoving = null;
                people.players[gid].Ox = null;
                people.players[gid].Oy = null;
            }, v.movespeed);

        } else {
            console.log(gid + ' refused move instruction : too quick');
        }

}









/* init serveur */

console.log('Lancement serveur');
map.loadMapFromFiles(dataOK);
people.init(connection);




/* auth */
var WebSocketServer = require('ws').Server, wss = new WebSocketServer(
        {
            port: 8080,
            verifyClient: function (info, callback) {
                try {
                    var urlinfo = info.req.url;
                    const ip = info.req.connection.remoteAddress;
                    urlinfo = urlinfo.replace('/', '');
                    urlinfo = urlinfo.split('-');
                    var username = urlinfo[1];                    
                    var md5password = urlinfo[0];
                    
                    if(!username || !md5password){
                        callback(false);
                        return(false);
                    }
                    
                    var query = 'SELECT direction,gid,isNPC,id,name,x,y FROM users WHERE name= ? AND password = ?';
                    connection.query(query, [username, md5password], function (err, rows, fields) {
                        if (!rows || !rows[0])
                        {
                            console.log('[Auth DENIED] User ' + username);
                            callback(false);
                            return(false);
                        } else {
                            console.log('[Auth OK] User ' + username + ' GID ' + rows[0].gid);
                            if(people.players[rows[0].gid].isOnline){     /* check if char is already online */
                                console.log('[Auth DENIED] Is Already Online ' + username);
                                callback(false);
                                return(false);
                            }
                            info.req.user = rows[0];
                            callback(true);
                        }
                    });
                } catch (e) {
                    console.log('erreur ');
                    console.log(e);
                }
            }
        });



/*
 *  KOMMUNICATIONS
 */

wss.on('connection', function aconnection(ws, req) {


    console.log('--- ' + req.user.name + ' is online ---');
    ws.gid = req.user.gid;
    ws.id = req.user.id; /* SQL id */
    


    /* send GID + map version to client */
    try {
        ws.send(JSON.stringify({
            "gid": ws.gid,
            "direction":people.players[ws.gid].direction,
            "originalPositionX": people.players[ws.gid].x,
            "originalPositionY": people.players[ws.gid].y,
            "mapversion": v.MapVersion
        }));
    } catch (e) {
        console.log(e);
    }
    ;

    /* function WS */
   
   
   ws.UpdateMyClientZone = function(isFlush = true, peopleArray = null){
       var data = {};
       data.isFlush = isFlush;
       if(!peopleArray && isFlush){ // flush = we fetch automatically people in the zone
           var zone = tools.getZone(people.players[ws.gid].x, people.players[ws.gid].y);        
           var peopleInZone = people.getPeopleInZone(zone,ws.gid);
            var fullJdata = {"UpdateMyZone": peopleInZone};
            ws.send(JSON.stringify(fullJdata));
            // console.log(ws.gid + '< UpdateMyZone Full (chunk change) : ' + peopleInZone.length + ' people received');
       } else { // array given of people (already filtered zone for the client */  
           var fullJdata = {"UpdateMyZone": peopleArray};
            ws.send(JSON.stringify(fullJdata));
          //  console.log(ws.gid + '< UpdateMyZone Partial (update from players) ' + peopleArray.length + ' people received');
       }
   };

  

    /* fonction teleport */
    ws.teleport = function (x, y) {
        people.players[ws.gid].x = x;
        people.players[ws.gid].y = y;
        var jdata = {"x": x, "y": people.players[ws.gid].y};
        var fullJdata = {"moving": jdata};
        ws.send(JSON.stringify(fullJdata));
    };



    /* INIT GAME FOR PLAYER */

    var Chunk = tools.getChunk(people.players[ws.gid].x, people.players[ws.gid].y);
    people.players[ws.gid].chunkX = Chunk.x;
    people.players[ws.gid].chunkY = Chunk.y;
    ws.UpdateMyClientZone();
    clients.clients.push(ws);

    people.players[ws.gid].isOnline = true;
   

    










    /* READ COMMUNICATION CLIENT */
    ws.on('message', function incoming(message) {
        var Jdata = message.toString();
        //console.log(Jdata);
        try {
            var data = JSON.parse(Jdata);

            /* reload map */
            if (data.sendMapPlease) {
                console.log('updating map for ' + ws.gid);
                map.sendMapToSingle(ws);
            }

            /* player move */
            if (data.move) {
                 move(ws.gid,data.x,data.y,ws);
            }

            /* map writing */
            if (data.SolidMap) {
                var ToJSON = JSON.stringify(data.SolidMap);
                fs.writeFile("data/solids.json", ToJSON, function (err) {
                    if (err) {
                        return console.log(err);
                    }
                    console.log("The solids were saved!");
                });
            }
            if (data.FloorMap) {
                var ToJSON = JSON.stringify(data.FloorMap);
                fs.writeFile("data/floor.json", ToJSON, function (err) {
                    if (err) {
                        return console.log(err);
                    }
                    console.log("The floors were saved!");
                    map.loadMapFromFiles(dataOK); // pas top
                });
            }
        } catch (e) {
            console.log(e);
        }
    });
    /* end communcation client */

    ws.on('close', function (message) {
        // IP  this._socket.remoteAddress

        people.players[ws.gid].isOnline = false;
        
        var index = clients.clients.indexOf(ws);
        clients.clients.splice(index, 1);
        var query = 'UPDATE users SET x= ?, y = ? WHERE id= ? ';
        connection.query(query, [people.players[ws.gid].x, people.players[ws.gid].y, people.players[ws.gid].name], function () {
            console.log(people.players[ws.gid].name + ' disconnected ');
        });
    });

});




/* NPC */


/* update "cron" */

if (v.rockAndLoaded && 1===0) {
    setInterval(function () {

        var NPCmovers = [];

        for (var i = 1; i < people.players.length; i++) {            
            if (people.players[i])
            {               
                var man = people.players[i];
                if (man) {                    
                    if (!man.isOnline)
                    {
                       /* USE FONCTION MOVE */
                    }

                }
            }
        }

    }, 2000);

}





