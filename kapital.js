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

    ws.id = req.user.id;
    ws.x = req.user.x;
    ws.y = req.user.y;
    ws.gid = req.user.gid;
    ws.name = req.user.name;
    ws.direction = req.user.direction;

    /* send GID + map version to client */
    try {
        ws.send(JSON.stringify({
            "gid": ws.gid,
            "direction":ws.direction,
            "originalPositionX": ws.x,
            "originalPositionY": ws.y,
            "mapversion": v.MapVersion
        }));
    } catch (e) {
        console.log(e);
    }
    ;

    /* function WS */
   
   
   ws.UpdateMyZone = function(isFlush = true, peopleArray = null){
       var data = {};
       data.isFlush = isFlush;
       if(!peopleArray && isFlush){ // flush = we fetch automatically people in the zone
           var zone = tools.getZone(ws.x, ws.y);        
           var peopleInZone = people.getPeopleInZone(zone,ws.gid);
            var fullJdata = {"UpdateMyZone": peopleInZone};
            ws.send(JSON.stringify(fullJdata));
            console.log('UpdateMyZone AllZone ' + peopleInZone.length + ' people Sent');
       } else { // array given of people (already filtered zone for the client */  
           var fullJdata = {"UpdateMyZone": peopleArray};
            ws.send(JSON.stringify(fullJdata));
            console.log('UpdateMyZone Partial Update ' + peopleArray.length + ' people Sent');
       }
   };

    /* setup movement on order */
    ws.setMoveInstruction = function (Tx, Ty) {
        
        if (!ws.isMoving) {
            ws.isMoving = true;
            ws.Tx = Tx;
            ws.Ty = Ty;
            var arr = tools.getNextCase(Tx, Ty, ws.x, ws.y);
            var nextX = arr[0];
            var nextY = arr[1];          
            
                   
            /* tell everyone you moved */            
            var direction = tools.getDirection(ws.x,ws.y,Tx,Ty);            
            people.players[ws.gid].x = nextX;
            people.players[ws.gid].y = nextY;
            people.players[ws.gid].direction = direction;            
            var movers = [people.players[ws.gid]];
            clients.tellEveryOne(movers,ws.gid);
            
            ws.moveTimer = setTimeout(function () {
                /* The Move Is DONE */
                // console.log('moved to '+nextX+","+nextY);
                ws.x = nextX;
                ws.y = nextY;
                ws.direction = direction;
                ws.isMoving = null;
                
                /* check adn eventuellay update chunk */
                var NewChunk = tools.getChunk(nextX, nextY);
                if (NewChunk.x !== ws.chunkX || NewChunk.y !== ws.chunkY) {
                    console.log(ws.chunkX + ',' + ws.chunkY + ' Chunk Change ' + NewChunk.x + ',' + NewChunk.y);
                    ws.chunkX = NewChunk.x;
                    ws.chunkY = NewChunk.y;
                    ws.UpdateMyZone(); // actually loads static players
                }

            }, v.movespeed);

        } else {
            console.log('refused move instruction : too quick');
        }
    };

    /* fonction teleport */
    ws.teleport = function (x, y) {
        ws.x = x;
        ws.y = y;
        var jdata = {"x": x, "y": ws.y};
        var fullJdata = {"moving": jdata};
        ws.send(JSON.stringify(fullJdata));
    };



    /* INIT GAME FOR PLAYER */

    var Chunk = tools.getChunk(ws.x, ws.y);
    ws.chunkX = Chunk.x;
    ws.chunkY = Chunk.y;
    ws.UpdateMyZone();
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
                ws.setMoveInstruction(data.x, data.y);
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
        connection.query(query, [ws.x, ws.y, ws.id], function () {
            console.log(ws.name + ' disconnected ');
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





