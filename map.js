/* file created by charles.torris@gmail.com */

var tools = require('./tools.js');
var v = require('./vars.js');
var fs = require('fs');

module.exports = {

    solidMap: [],
    floorMap: [],
    floorMapJSON: null,
    solidMapJSON: null,

    loadMapFromFiles: function (callback) {
        var file = 'data/floor.json';
        fs.readFile(file, 'utf8', function (err, data) {
            this.floorMapJSON = data;
            this.floorMap = JSON.parse(data);
            console.log('FloorMap loaded into server');
        });
        var file = 'data/solids.json';
        fs.readFile(file, 'utf8', function (err, data) {
            this.solidMapJSON = data;
            this.solidMap = JSON.parse(data);
            console.log('SolidMap loaded into server');
        });
        callback(true);
    },

    sendMapToClient: function (ws) {
        var jdata = {"FloorMap": this.floorMapJSON, "SolidMap": this.solidMapJSON};
        var fullJdata = {"fullmap": jdata};
        ws.send(JSON.stringify(fullJdata));
    },

    
}