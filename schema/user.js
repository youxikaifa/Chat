var mongoose = require("mongoose");

var Schema = mongoose.Schema;
var user = new Schema({
    "name": String,
    "account":String,
    "pwd": String,
    "token": String,
    "expires": String,
    "openid": String,
    "created": String,
    "thumb": String,
    // "followed": [],
    "friend": [],
    "sex": Number,
    "fans": [], //关注我的人
    "reduce": "", //个人简介
    "following": [], //我关注的人
    "collections": [],
    "school": "",
    "skill": "",
    "habit": "",
    "contact": {
        "phone": "",
        "qq": "",
        "weixin": "",
        "weibo":""
    },
    rooms:[] //加入的房间id
})

exports.User = mongoose.model('user',user)