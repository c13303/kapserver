/* file created by charles.torris@gmail.com */

var mysql = require('mysql');
var params = require('./params.js');
var tools = require('./tools.js');
var v = require('./vars.js');
var fs = require('fs');
var people = require('./people.js');
var map = require('./map.js');

var connection = mysql.createConnection({
    host: params.localhost,
    user: params.user,
    password: params.password,
    database: params.database
});
connection.connect();

var chunksWidth = v.maxTiles / v.chunksize;

people.init();




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
            clients.sendMapToClients();
        }
        
        if (commande === 'test') {
           // map.updatePlayer(3,50,55,false);
        }
        
        if (commande === 'debug') {
            
        }
    }

});






/* classe all clients */
var clients = {};
clients.clients = [];

clients.sendCommandToClients = function (commande) {
    for (var i = 0, len = clients.clients.length; i < len; i++) {
        var ws = clients.clients[i];
        console.log(':) client WS > ' + i);
        var jdata = {"command": commande};
        ws.send(JSON.stringify(jdata));
    }
};

/* update map to all clients.  */
clients.sendMapToClients = function () {
    for (var i = 0, len = clients.clients.length; i < len; i++) {
        var ws = clients.clients[i];
        var jdata = {"version": v.MapVersion, "FloorMap": map.floorMapJSON, "SolidMap": map.solidMapJSON};
        var fullJdata = {"fullmap": jdata};
        ws.send(JSON.stringify(fullJdata));
    }
    console.log('Map sent to ' + i + ' client(s)');
};

clients.collectiveNearMe = function (movers) {
     var selected = [];
    for (var i = 0; i < clients.clients.length; i++) { /* each client */
        var ws = clients.clients[i];   
        var clientZone = tools.getZone(ws.x,ws.y); 
        var selected = [];
        for(var j = 0; j < movers.length; j++){
            var man = movers[j];           
            var isManInZone = tools.isInZone(man.x,man.y,clientZone);
            if(isManInZone){
                selected.push(man);
            }
        } 
        if(selected.length){
            ws.NearMe(false,selected);
        }
    }   
   // console.log("CollectiveNearMe " + clients.clients.length+' clients ')

};



/* classe map */
function loadPeopleFromDB() {
    var query = 'SELECT gid,isNPC,id,name,x,y FROM users';
    connection.query(query, function (err, rows, fields) {
        for (i = 0; i < rows.length; i++) {
            var player = rows[i];
            //this.people.players[player.x][player.y] = player;
            people.players[player.gid] = player;
        }
        console.log('People loaded into map and chunks');
    });
}

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
loadPeopleFromDB();



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
                    var query = 'SELECT gid,isNPC,id,name,x,y FROM users WHERE name= ? AND password = ?';
                    connection.query(query, [username, md5password], function (err, rows, fields) {
                        if (!rows || !rows[0])
                        {
                            console.log('[Auth XXX-DENIED-XXX] User ' + username);
                            callback(false);
                            return(false);
                        } else {
                            console.log('[Auth OK] User ' + username + ' ID ' + rows[0].id);
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

    /* send map version to client */
    try {
        ws.send(JSON.stringify({
            "originalPositionX": ws.x,
            "originalPositionY": ws.y,
            "mapversion": v.MapVersion
        }));
    } catch (e) {
        console.log(e);
    }
    ;

    /* function WS */

   
   
   ws.NearMe = function(isFlush = true, peopleArray = null){
       var data = {};
       data.isFlush = isFlush;
       if(!peopleArray && isFlush){ // flush = we fetch automatically people in the zone
           var zone = tools.getZone(ws.x, ws.y);        
           var peopleInZone = people.getPeopleInZone(zone,ws.gid);
            var fullJdata = {"NearMe": peopleInZone};
            ws.send(JSON.stringify(fullJdata));
            console.log('NearMe Flush ' + peopleInZone.length + ' people Sent');
           // console.log(peopleInZone);
       } else {
           console.log('NearMe Update ' + peopleArray.length + ' people Sent');
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
            ws.moveTimer = setTimeout(function () {
                /* The Move Is DONE */
                // console.log('moved to '+nextX+","+nextY);
                ws.x = nextX;
                ws.y = nextY;
                ws.isMoving = null;

                /* check adn eventuellay update chunk */
                var NewChunk = tools.getChunk(nextX, nextY);
                if (NewChunk.x !== ws.chunkX || NewChunk.y !== ws.chunkY) {
                    console.log(ws.chunkX + ',' + ws.chunkY + ' Chunk Change ' + NewChunk.x + ',' + NewChunk.y);
                    ws.chunkX = NewChunk.x;
                    ws.chunkY = NewChunk.y;
                    ws.NearMe();
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
    ws.NearMe();
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
                console.log('updating map for ' + ws.id);
                map.sendMapToClient(ws);
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
                    console.log("The solids was saved!");
                });
            }
            if (data.FloorMap) {
                var ToJSON = JSON.stringify(data.FloorMap);
                fs.writeFile("data/floor.json", ToJSON, function (err) {
                    if (err) {
                        return console.log(err);
                    }
                    console.log("The floors was saved!");
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

if (v.rockAndLoaded ) {
    setInterval(function () {

        var NPCmovers = [];

        for (var i = 1; i < people.players.length; i++) {            
            if (people.players[i])
            {               
                var man = people.players[i];
                if (man) {                    
                    if (!man.isOnline)
                    {
                        /* demo back and forth */
                        if (!man.DemoRound)
                            man.DemoRound = 0;
                        man.DemoRound++;
                        if (man.DemoRound > 1)
                            man.DemoRound = 0;
                        if (man.DemoRound === 1) {
                            man.x--;
                        } else {
                            man.x++;
                        }
                        NPCmovers.push(man);           
                        people.players[man.gid] = man;
                    }

                }
            }
        }
        
        clients.collectiveNearMe(NPCmovers);
    }, 2000);

}





