var mongoose = require("mongoose");

var Schema = mongoose.Schema;
var room = new Schema({
    "label_id": String,
    "thumb": String,
    "title": String,
    "msgBean": {
        "message_id": String,
        "thumb": String,
        "name": String,
        "msg": String,
        "type": Number,
        "created": String,
    }
})

exports.Room = mongoose.model('room', room)