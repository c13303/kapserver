/* file created by charles.torris@gmail.com */

var tools = require('./tools.js');
var v = require('./vars.js');

module.exports = {
    players: [],

    init: function (connection) {
        for (var x = 1; x <= v.maxPlayers; x++) {
            this.players[x] = null;
        }
        console.log(this.players.length+ ' players are init');
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
        },this);

    }
};
