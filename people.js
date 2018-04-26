/* file created by charles.torris@gmail.com */

var tools = require('./tools.js');
var v = require('./vars.js');

module.exports = {
    players : [],
    init : function () {        
        for (var x = 1; x < v.maxPlayers; x++) {
            this.players[x] = null;
        }
    },
    getPeopleInZone : function (zone,gid) {
        if(!gid)console.log('Error getPeopleInZone no GID');
        var selected = [];
        for (i = 1; i <= this.players.length; i++) {
            var man = this.players[i];
            if(man){        
                var isManInZone = tools.isInZone(man.x,man.y,zone);
                if(man.gid !== gid && isManInZone){
                   selected.push(man); 
                }                
            }            
        }
        return(selected);
    }
};
