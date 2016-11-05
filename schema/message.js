var mongoose = require("mongoose");

var Schema = mongoose.Schema;
var message = new Schema({
    name: String,
    msg: String,
    userIconUrl:String
})

module.exports = message