/* file created by charles.torris@gmail.com */

var mysql = require('mysql');
var params = require('./params.js');
var tools = require('./tools.js');
var v = require('./vars.js');
var fs = require('fs');
var people = require('./people.js');
var map = require('./map.js');
var clients = require('./clients.js');

var items = require('./items.js');



var connection = mysql.createConnection({
    host: params.localhost,
    user: params.user,
    password: params.password,
    database: params.database
});
try {
    connection.connect();
} catch (e) {
    console.log(e);
}

function restart() {
    console.log("Lost Connexion .. trying again");
    setTimeout(function () {
        connection.connect();
    }, 3000);
}

var chunksWidth = v.maxTiles / v.chunksize;



var lagSim = 0;





var mapVersion = v.MapVersion;
if(v.randomMapVersion){
    var mapVersion = tools.getRandomInt(999);
}

/* server time */



/*
 * 
 * COMMAND READING
 */
var stdin = process.openStdin();

stdin.addListener("data", function (d) {
    var commande = d.toString().trim();
    if (commande) {

        var res = commande.split(" ");

        console.log("command entered: [" + commande + "]");

        if (commande === "loadmap") {
            map.loadMapFromFiles(dataOK);
        }
        if (commande === 'sendmap') {
            clients.sendMapToMulti(map);
        }

       if (res[0] === 'debug') {
           var look = res[1];
           for(var i=1;i<people.players.length;i++){
               if(people.players[i].name === look){
                   console.log(people.players[i]);
               }
           }
        }

        if (commande === 'populate') {
            console.log("POPULATING")
            var noms = ["Roger", "cognet", "Paul", "BobArdKor", "evi", "Selbst", "canardo", "mekayel", "Valentine", "Lucie", "Louison", "Eugénie", "Thomas", "guest", "Macron", "Fillon", "pinette", "SophieLaP", "pineFull", "cyril", "senoh", "Jojal", "mitaine", "Gonzague", "Niango", "charmoule", "HUGO", "cybercouille", "z1z1", "sheldor", "Sarkozy", "Trump"];
            for (var i = 1; i < 33; i++) {
                var querie = "INSERT INTO `kapital`.`users` (`id`, `gid`, `name`, `password`, `x`, `y`, `direction`) \n\
VALUES (NULL, " + i + ", '" + noms[i] + "', 'd2104a400c7f629a197f33bb33fe80c0', '11', '32', '0');";
                connection.query(querie);

            }
        }
    }

});





/* classe map */


/* callback TODO */
function dataOK() {
    v.scriptToLoad++;
    if (v.scriptToLoad >= 3) {
        console.log('Rock&Loaded!');
        v.rockAndLoaded = true;
    }
}

/* global scope */

function say(gid, say) {
    clients.tellSayEveryClient(gid, say, people);
}











/* init serveur */
v.serveurStartTime = Date.now();
console.log('Lancement serveur');
map.loadMapFromFiles(dataOK);
people.init(connection);
items.init(connection, dataOK);



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

                    if (!username || !md5password) {
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
                            if (people.players[rows[0].gid].isOnline) {     /* check if char is already online */
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
try {
    wss.on('connection', function aconnection(ws, req) {



        ws.gid = req.user.gid;
        ws.id = req.user.id; /* SQL id */



        /* send GID + map version to client */
        try {
            var t = Date.now() - v.serveurStartTime;
            people.players[ws.gid].startT = t;
            console.log(ws.gid + ': --- ' + req.user.name + ' is online ---');
            var message = JSON.stringify({
                "t": t,
                "gid": ws.gid,
                "direction": people.players[ws.gid].direction,
                "OPX": people.players[ws.gid].x,
                "OPY": people.players[ws.gid].y,
                "mapversion": mapVersion,
                "bible": items.Bible,
                "vars": v
            });
            // console.log(message);
            ws.send(message);
        } catch (e) {
            console.log(e);
        }
        ;

        /* function WS */
        ws.SomeoneSpeaks = function (say, gid) {
            var fullJdata = {"speak": {gid: gid, say: say}};
            ws.send(JSON.stringify(fullJdata));
        };

        ws.UpdateMyClientZone = function (isFlush = true, peopleArray = null) {
            var data = {};
            data.isFlush = isFlush;
            if (!peopleArray && isFlush) { // flush = we fetch automatically people in the zone
                var zone = tools.getZone(people.players[ws.gid].x, people.players[ws.gid].y);
                var peopleInZone = people.getPeopleInZone(zone, ws.gid);
                var itemsInZone = items.getItemsInZone(zone);
                var fullJdata = {
                    "UpdateMyZone": peopleInZone,
                    "IIZ": itemsInZone};

                try {
                    ws.send(JSON.stringify(fullJdata));
                } catch (e) {
                    console.log('ERREUR UpdateMyClientZone : WS DISCONNECTED(1) :');
                }
                //  console.log("Zone is "+zone.startX+","+zone.startY+" to "+zone.endX+","+zone.endY);
                // console.log(ws.gid + '< UpdateMyZone Full (chunk change) : ' + peopleInZone.length + ' people received');
            } else { // array given of people (already filtered zone for the client */  
                try {
                    var fullJdata = {"UpdateMyZone": peopleArray};
                    ws.send(JSON.stringify(fullJdata));
                } catch (e) { console.log('ERREUR UpdateMyClientZone : WS DISCONNECTED(2) :'); }
                
                // console.log(fullJdata);
                //  console.log(ws.gid + '< NPC MINOR UPDATE ' + peopleArray.length + ' NPC array');
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

        clients.clients.push(ws);

        people.players[ws.gid].isOnline = true;


        // ws.UpdateMyClientZone(); // UPDATE will be done after reply from client ;-)










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

                /* simple zone update*/ /* ex : asked when client is ready */
                if (data.upzone) {
                    ws.UpdateMyClientZone();
                }

                /* player move message received */
                if (data.move) {
                    if (ws.gid === 6) { // lagger player
                        var random = 400;
                        setTimeout(function () {
                            people.move(map, ws.gid, data.x, data.y, ws, data.t, clients);
                        }, random);
                    } else
                    {
                        people.move(map, ws.gid, data.x, data.y, ws, data.t, clients);
                    }
                }

                /* player speak */
                if (data.say) {
                    say(ws.gid, data.say);
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

                /* floor writing */
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
            connection.query(query, [people.players[ws.gid].x, people.players[ws.gid].y, people.players[ws.gid].id], function () {
                console.log(people.players[ws.gid].name + ' disconnected ');
            });
        });

    });




    /* NPC */


    /* update "cron" */


    v.NPCDisabled = false;

    setInterval(function () {
        if (!v.rockAndLoaded || v.NPCDisabled) {
            return;
        } else
        {
            var stat = {};
            stat.npcInit = 0;
            stat.npcMove = 0;
            var movers = [];


            for (var i = 1; i < people.players.length; i++) {
                if (!people.players[i].isOnline && !people.players[i].IAMoving)
                {
                    if (!people.players[i].setup) {
                        people.players[i].roundTrip = 0;
                        people.players[i].roundTripMax = v.NPCRoundTripMax;
                        people.players[i].Tx = people.players[i].x;
                        people.players[i].Ty = people.players[i].y;
                        /* setup */
                        people.players[i].IAMoving = false;
                        people.players[i].setup = true;
                        people.players[i].lastde = 0;
                        stat.npcInit++;

                    } else {
                        if (!people.players[i].IAMoving)
                        {

                            /* NPC round trip */





                            /* turn around */
                            
                            /* 
                                                         if (!people.players[i].roundTrip ||
                                    people.players[i].roundTrip > people.players[i].roundTripMax) {
                                people.players[i].roundTrip = 0;
                            }
                            
                             if (people.players[i].roundTrip === 0) {
                             people.players[i].Tx++;
                             }
                             if (people.players[i].roundTrip === 1) {
                             people.players[i].Ty++;
                             }
                             if (people.players[i].roundTrip === 2) {
                             people.players[i].Tx--;
                             }
                             if (people.players[i].roundTrip === 3) {
                             people.players[i].Ty--;
                             }
                             */
                            /*random */
                            var de = tools.getRandomInt(4);
                            var Tx = people.players[i].x;
                            var Ty = people.players[i].y;
                            
                            if (de === 0) {
                                Tx++;
                            }
                            if (de === 1) {
                                Ty++;
                            }
                            if (de === 2) {
                                Tx--;
                            }
                            if (de === 3) {
                                Ty--;
                            }

                            people.players[i].lastde = de;

                            people.players[i].roundTrip++;

                            /* USE FONCTION MOVE */
                            var manMoved =
                                    people.move(map, people.players[i].gid, Tx, Ty, null, Date.now(), clients);
                            if (manMoved) {
                                movers.push(manMoved);
                                stat.npcMove++;
                            }
                        }
                        /* reset */

                    }


                }
            }


            clients.tellMoveEveryClient(movers, null, people);
            /*
             console.log('#Cron');
             console.log(stat);
             */
        }


    }, 300);


} catch (e) {
    console.log(e);
    restart();
}




