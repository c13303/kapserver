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
        var that = this;
        fs.readFile(file, 'utf8', function (err, data) {
            that.floorMapJSON = data;
            that.floorMap = JSON.parse(data);
            console.log('FloorMap loaded into server');
        });
        var file = 'data/solids.json';
        fs.readFile(file, 'utf8', function (err, data) {
            that.solidMapJSON = data;
            that.solidMap = JSON.parse(data);
            console.log('SolidMap loaded into server');
        });
        callback(true);
    },

    sendMapToSingle: function (ws) {
        var jdata = {"FloorMap": this.floorMapJSON, "SolidMap": this.solidMapJSON};
        var fullJdata = {"fullmap": jdata};
        ws.send(JSON.stringify(fullJdata));
    },

    
}