/* Chien Games ALL RIGHTS RESERVED */
var v = require('./vars.js');
module.exports = {
    getRandomInt: function (max) {
        return Math.floor(Math.random() * Math.floor(max));
    },
    getZoneDiff: function (oldZone, newZone) {


    },
    isInZone: function (x, y, zone) {
        if (x >= zone.startX && x <= zone.endX &&
                y >= zone.startY && y <= zone.endY) {
            return true;
        } else {
            return false;
        }
    },
    getZone: function (x, y) { // get zone by x,y
        var chunk = this.getChunk(x, y);
        var zone = this.getChunkZone(chunk.x, chunk.y);
        return(zone);
    },
    getNineChunks : function(cX,cY){
        
        var maxChunk = v.maxTiles / v.chunksize;
        
        var firstChunkX = cX - 1;
        var firstChunkY = cY - 1;
        var lastChunkX = cX + 1;
        var lastChunkY = cY + 1

        if (firstChunkX < 0)
            firstChunkX = 0;
        if (firstChunkX > maxChunk)
            firstChunkX = maxChunk;
        if (firstChunkY < 0)
            firstChunkY = 0;
        if (firstChunkY > maxChunk)
            firstChunkY = maxChunk;

        if (firstChunkY < 0)
            firstChunkY = 0;
        if (firstChunkY > maxChunk)
            firstChunkY = maxChunk;
        if (firstChunkY < 0)
            firstChunkY = 0;
        if (firstChunkY > maxChunk)
            firstChunkY = maxChunk;
        
        return({firstChunkX: firstChunkX,lastChunkX:lastChunkX,firstChunkY:firstChunkY,lastChunkY:lastChunkY});
        
    },
    getChunk: function (x, y)
    {
        var chunkX = parseInt(x / v.chunksize);
        var chunkY = parseInt(y / v.chunksize);
        var result = {x: chunkX, y: chunkY};
        return(result);
    },
    getChunkZone: function (cX, cY) // get zone by chunk
    {
        var chunk9 = this.getNineChunks(cX,cY);

        var startX = chunk9.firstChunkX * v.chunksize;
        var startY = chunk9.firstChunkY * v.chunksize;
        var endX = (chunk9.lastChunkX + 1) * v.chunksize;
        var endY = (chunk9.lastChunkY + 1) * v.chunksize;

        return({startX: startX, startY: startY, endX: endX, endY: endY});
    },
    getNextCase: function (Tx, Ty, x, y) { /* the true one, of course */

        var nextX;
        var nextY;

        /* DIAGONALS OR NOT */
        if (!v.diagonals) {
            nextX = x;
            nextY = y;
            var distanceX = parseInt(Math.abs(x - Tx));
            var distanceY = parseInt(Math.abs(y - Ty));
            //console.log('Distances '+distanceX+','+distanceY);
            if (distanceX >= distanceY) {
                nextY = y;
                if (Tx > x) {
                    nextX = x + 1;
                } else {
                    nextX = x - 1;
                }
            }
            if (distanceX < distanceY) {
                nextX = x;
                if (Ty > y) {
                    nextY = y + 1;
                } else {
                    nextY = y - 1;
                }
            }
        } else {
            nextX = x;
            nextY = y;
            if (Tx > x) {
                nextX = x + 1;
            }
            if (Tx < x) {
                nextX = x - 1;
            }

            if (Ty > y) {
                nextY = y + 1;
            }
            if (Ty < y) {
                nextY = y - 1;
            }
        }
        if(nextX < 0) nextX = 0;
        if(nextY < 0) nextY = 0;
        if(nextX >= v.maxTiles) nextX = v.maxTiles-1;
        if(nextY >= v.maxTiles) nextY = v.maxTiles-1;
        
        var array = [nextX, nextY];
        return(array);
    },
    getDirection: function (x, y, nextX, nextY) {
        var direction = 0;
        if (nextX === x && nextY === y)
            direction = 0;
        if (nextX > x && nextY === y)
            direction = 1;
        if (nextX > x && nextY < y)
            direction = 2;
        if (nextX === x && nextY < y)
            direction = 3;
        if (nextX < x && nextY < y)
            direction = 4;
        if (nextX < x && nextY === y)
            direction = 5;
        if (nextX < x && nextY > y)
            direction = 6;
        if (nextX === x && nextY > y)
            direction = 7;
        if (nextX > x && nextY > y)
            direction = 8;
        return(direction);
    }


};


