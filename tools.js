/* Chien Games ALL RIGHTS RESERVED */
var v = require('./vars.js');
module.exports = {
    isInZone : function(x,y,zone){
        if(x >= zone.startX && x <= zone.endX &&
             y >= zone.startY && y <= zone.endY   ){
         return true;
        }else{
            return false;
        }
    },
    getZone : function(x,y){ // get zone by x,y
        var chunk = this.getChunk(x,y);
        var zone = this.getChunkZone(chunk.x,chunk.y);
        return(zone);
    },
    getChunk :  function(x,y) 
    {
        var chunkX = parseInt(x / v.chunksize);
        var chunkY = parseInt(y / v.chunksize);
        var result = {x:chunkX,y:chunkY};
        return(result);
    },
    getChunkZone : function(cX,cY) // get zone by chunk
    {
        var startX=0;
        var startY=0;
        var endX=v.chunksize * 3;
        var endY=v.chunksize * 3;
        var lastChunk = v.maxTiles / v.chunksize;     
       
        if(cX>0){
            startX = (cX - 1) * v.chunksize;
        }  
        if(cY>0){
            startY = (cY -1) * v.chunksize;
        }
        if(cX < lastChunk){ // +2 because include current chunk
            endX = (cX + 2) * v.chunksize;
        }
        if(cY < lastChunk){
            endY = (cY + 2) * v.chunksize;
        }        
        return({startX : startX ,startY : startY ,endX : endX ,endY : endY});        
    },
    getNextCase: function (Tx, Ty, x,y) { /* the true one, of course */
       
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
       
       var array = [nextX,nextY];
       return(array);
    },
    getDirection: function(x,y,nextX,nextY){
        var direction = 0;
        if (nextX === x && nextY === y) direction = 0;
        if (nextX > x && nextY === y) direction = 1;
        if (nextX > x && nextY < y) direction = 2;
        if (nextX === x && nextY < y) direction = 3;
        if (nextX < x && nextY < y) direction = 4;
        if (nextX < x && nextY === y) direction = 5;
        if (nextX < x && nextY > y) direction = 6;
        if (nextX === x && nextY > y) direction = 7;
        if (nextX > x && nextY > y) direction = 8;
        return(direction);
    }
   

};


