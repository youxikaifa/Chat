var express = require('express');
var app = express();
var path = require('path')
var favicon = require('serve-favicon')
var logger = require('morgan')
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')
var mongoose = require('mongoose')
var url = require('url')
var router = require('./op.js')

var mongo = require('mongodb')
var monk = require('monk')
var IO = require('socket.io');
var server = require('http').createServer(app);


var models = require('./schema/user.js');
var multiparty = require('connect-multiparty')

//  hat模块生成不重复ID
var hat = require('hat')
var rack = hat.rack()

var socketIO = IO(server);
var roomInfo = {}; //房间用户名单
var sockets = []
var db = monk('localhost:27017/message')
var DB = monk('localhost:27017/users')
var labelDb = monk('localhost:27017/activecompus')
// var Message = mongoose.model('Message', message);
// var message = require('./schema/message.js');
// var User = models.User;

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'jade')

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))

app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))
socketIO.on('connect', function (socket) {

    //加入指定房间
    socket.on('join', function (roomID, user_id, user_name) {

        db.create(roomID);

        if (!roomInfo[roomID]) {
            console.log('尚未建立此房间,正在创建..')
            roomInfo[roomID] = [];

        }
        socket.join(roomID)
        if (roomInfo[roomID].indexOf(user_id) === -1) {
            roomInfo[roomID].push(user_id)
        }
        console.log('人员数:' + roomInfo[roomID])

        socket.broadcast.to(roomID).emit('userCome', user_name + '加入了个房间' + roomID)
    })

    //断开连接
    socket.on('leave', function (roomID, id, name) {
        //从房间内移除名单
        //user 包括id 头像url msg username
        console.log('id:' + id)
        console.log('roomID:' + roomID)
        console.log('name:' + name)
        console.log('roomInfo:' + roomInfo)

        if (roomInfo[roomID]) { //如果房间内有人
            var index = roomInfo[roomID].indexOf(id);
            roomInfo[roomID].splice(index, 1)
            console.log('下标:' + index)
        }

        console.log('剩下的人数:' + roomInfo[roomID])

        if (!roomInfo[roomID]) {
            socket.leave(roomID) //如果人数为0,退出房间
            console.log('房间已关闭')
        }
        // 
        socket.to(roomID).emit('userLeave', name + '离开了房间' + roomID)
        console.log(name + '离开了房间' + roomID)
    })


    //接受用户发送的信息,发送到指定房间    
    socket.on('message', function (roomID, message_id, name, msg, thumb) {
        //user 包括id 头像url msg uername
        console.log('收到一条信息:' + msg)
        console.log("fangjian"+roomID)
        var created = new Date().getTime().toString()
        var collection = db.get(roomID);

        collection.insert({
            "label_id": roomID,
            "thumb": "http://",
            "title": "caonima",
            "unReadNum": 0,
            "msgBean": {
                "message_id": message_id,
                "thumb": "http:??",
                "name": name,
                "msg": msg,
                "type": 0,
                "created": created,
            }
        }, function (err) {
            if (err) {
                console.log('存入数据库失败')
            } else {
                console.log('存入成功')
            }
        })

        //验证用户如果不在房间则不发送
        if (roomInfo[roomID] && roomInfo[roomID].indexOf(message_id) === -1) {
            console.log('用户不在房间')
        } else {
            socketIO.sockets.in(roomID).emit('msg', message_id, name, msg, thumb, created, roomID);
        }

    })
})

app.get('/getJoinRoom', function (req, res) {
    var userCollection = DB.get("user")
    var labelCollection = labelDb.get("labels")
    var user_id = req.query.user_id;
    var roomids = []  //存放房间id
    var backInfo = [] //存放返回的信息

    userCollection.find({ "id": user_id }, function (err, docs) {
        console.log(docs[0])
        if (err) {
            console.log(err)
            res.send(err)
        } else {
            roomids = docs[0].rooms || [];
            console.log(roomids)
            for (var i = 0; i < roomids.length; i++) {
                labelCollection.find({ "id": roomids[i] }, function (err, docs) {
                    var object = {}
                    object.head = docs[0].head;
                    object.title = docs[0].title;
                    backInfo.push(object)
                    console.log('backInfo' + backInfo[0])
                })
            }
            console.log(backInfo.length)
            res.send(backInfo)
        }
    })
})

app.get('/joinRoom', function (req, res) {
    var user_id = req.query.user_id;
    var label_id = req.query.label_id;
    var userCollection = DB.get("user")
    userCollection.update({ "id": user_id }, { $push: { "rooms": label_id } }, function (err, raw) {
        if (err) {
            res.send(err)
        } else {
            res.send("join succ")
            console.log("succ")
        }
    })
})

app.get('/', function (req, res) {
    res.send('connect succeed')
})

app.get('/chatroom', function (req, res) {

    // var name = db.get('110').name; //取数据库的名字
    var label_id = req.query.label_id;
    var user_id = req.query.user_id;
    db.create(label_id); //创建数据库,如果该数据库存在，也不覆盖
    var collection = db.get(label_id);
    collection.find({}, function (err, docs) {
        if (err) {
            res.send(err.message)
        } else {

            if (docs.length == 0) {
                var label = labelDb.get("labels")
                label.find({ "id": label_id }, function (err, docs) {
                    if (err) {
                        res.send(err)
                    } else {
                        var room = {
                            "label_id": docs[0].id,
                            "thumb": docs[0].head,
                            "title": docs[0].title,
                        }
                        res.send(room)
                    }
                })
            } else {
                for (var i = 0; i < docs.length; i++) {
                    if (docs[i].userid == user_id) {
                        docs[i].type = 1
                        console.log(i + 'user_id same')
                    } else {
                        docs[i].type = 0;
                    }
                }
                res.send(docs)
            }

        }


    })
})

app.get('/getRoomInfo', function (req, res) {
    var room_id = req.query.label_id;
    var message_id = req.query.message_id
    var msgCollection = db.get(roomid)
    msgCollection.find({ "message_id": message_id }, function (err, docs) {
        if (err) {
            res.send(err)
        } else {
            res.send(docs)
        }
    }).sort({ "created": 1 }).limit(10);

})

app.post('/login', function (req, res) { //返回0，用户名不存在 返回1，密码错误
    var collection = DB.get("user")
    var account = req.body.account;
    var pwd = req.body.pwd;
    console.log(account, pwd)

    collection.find({ 'account': account }, function (err, docs) {
        if (err) {
            console.log(err)
            res.send('网络请求失败,请检查网络状况。。')
        } else {
            if (docs.length == 0 || docs == null) {
                console.log("用户名不存在")
                res.send('0')
            } else {
                if (docs[0].pwd == pwd) {
                    console.log('succeed')
                    res.send(docs[0])
                } else {
                    console.log("密码错误!")
                    res.send('1')
                }
            }
        }
    })
})

app.post('/loginForThree', function (req, res) {
    var collection = DB.get("user")
    var id = req.body.id;
    console.log(req.body)
    collection.find({ "id": id }, function (err, docs) {
        if (docs.length == 0 || docs == null) {
            console.log('未找到')
            var UID = rack()
            var user = {
                "id": id,
                "name": req.body.name,
                "sex": req.body.sex || 0,
                "account": "",
                "pwd": "",
                "token": req.body.token,
                "expires": new Date().getTime().toString(),
                "openid": req.body.openid,
                "created": new Date().getTime().toString(),
                "thumb": req.body.thumb,
                "followed": [],
                "friend": [],
                "fans": [],
                "reduce": "",
                "following": [],
                "collections": [],
                "school": "",
                "skill": "",
                "habit": "",
                "contact": {},
                "rooms": []
            }
            collection.insert(user, function (err) {
                res.send(user)
            })
        } else {
            console.log("已存在")
            res.send(docs[0])
        }
    })

})

// app.post('/login', router.login);

app.post('/register', function (req, res) {
    var collection = DB.get("user")
    var account = req.body.account
    var pwd = req.body.pwd
    collection.find({
        'account': account
    }, function (err, docs) {
        if (docs.length == 0 || docs == null) {
            var UID = rack()
            var user = {
                "id": UID,
                "name": "",
                "account": account,
                "pwd": pwd,
                "token": rack(),
                "expires": new Date().getTime().toString(),
                "openid": rack(),
                "created": new Date().getTime().toString(),
                "thumb": "http://img06.tooopen.com/images/20161027/tooopen_sl_183292912725.jpg",
                "followed": [],
                "friend": [],
                "sex": req.body.sex || 0,
                "fans": [],
                "reduce": "",
                "following": [],
                "collections": [],
                "school": "",
                "skill": "",
                "habit": "",
                "contact": {},
                "rooms": []
            }
            collection.insert(user, function (err) {
                res.send(user)
            })

        } else {
            console.log("用户名已存在")
            res.send('1') //用户名已存在
        }
    })
})


app.post('/uploadhead', multiparty({ uploadDir: './public/images/head' }), function (req, res) {
    var collection = DB.get("user")
    var thumb;
    var path;
    var userid = req.body.userId
    var sex = req.body.sex //
    var name = req.body.name || "我还没名字呢"
    if (req.files.images != null) {
        path = req.files.images.path
        thumb = path.substring(6).replace(/\\/g, "/") //将存在数据库的缩略图路径,replace 将饭斜杠替换成正斜杠
    } else {
        thumb = "http://img06.tooopen.com/images/20161027/tooopen_sl_183292912725.jpg";
    }

    // var head = req.body.thumb //接收传来的图片路径
    var user = {
        "thumb": thumb,
        "sex": sex,
        "name": name
    }
    collection.update({ "id": userid }, {
        $set: user
    }, function (err, result) {

        if (err) {
            res.send('上传失败' + err.getMessage);
        } else {

            res.send(user);
            router.delFile('public/' + head)
        }
    })
})

app.post('/notice', function (req, res) {
    var collection = DB.get("user")
    var id = req.query.id
    var userId = req.query.userId
    collection.update({ "id": id }, { $push: { "folled": userId } }, function (err, result) {
        if (err) {
            res.send(err)
        } else {
            res.send("update succ")
        }
    })

})

app.post('/fixUserMsg', multiparty({ uploadDir: './public/images/head' }), function (req, res) {
    var collection = DB.get("user")
    var id = req.body.id;
    var oldUser, newUser, path, newThumb, oldThumb, name, reduce, school, skill, habit, phone, qq, weixin, weibo;

    collection.find({ "id": id }, function (err, docs) {
        console.log(docs[0])
        oldUser = docs[0];

        oldThumb = req.body.oldThumbPath;
        console.log("oldThumb" + oldThumb)
        if (req.files.image != null) {
            path = req.files.image.path
            newThumb = path.substring(6).replace(/\\/g, "/") //将存在数据库的缩略图路径,replace 将饭斜杠替换成正斜杠
        } else {
            newThumb = oldThumb;
        }

        if (req.body.name.length == 0) {
            name = oldUser.name;
        } else {
            name = req.body.name;
        }

        if (req.body.reduce.length == 0) {
            reduce = oldUser.reduce;
        } else {
            reduce = req.body.reduce;
        }

        if (req.body.school.length == 0) {
            school = oldUser.school;
        } else {
            school = req.body.school;
        }

        if (req.body.skill.length == 0) {
            skill = oldUser.skill;
        } else {
            skill = req.body.skill;
        }

        if (req.body.habit.length == 0) {
            habit = oldUser.habit;
        } else {
            habit = req.body.habit;
        }

        if (req.body.phone.length == 0) {
            phone = oldUser.contact.phone;
        } else {
            phone = req.body.phone;
        }

        if (req.body.qq.length == 0) {
            qq = oldUser.contact.qq;
        } else {
            qq = req.body.qq;
        }

        if (req.body.weixin.length == 0) {
            weixin = oldUser.contact.weixin;
        } else {
            weixin = req.body.weixin
        }

        if (req.body.weibo.length == 0) {
            weibo = oldUser.contact.weibo;
        } else {
            weibo = req.body.weibo
        }

        console.log(req.files.image)

        newUser = {
            "name": name,
            "thumb": newThumb,
            "reduce": reduce, //个人简介
            "school": school,
            "skill": skill,
            "habit": habit,
            "contact": {
                "phone": phone,
                "qq": qq,
                "weixin": weixin,
                "weibo": weibo
            }
        }

        collection.update({ "id": id }, {
            $set: newUser
        }, function (err, result) {
            if (err) {
                console.log(err)
            } else {
                router.delFile('public/' + req.body.oldThumbPath)
            }
        })
        collection.find({ "id": id }, function (err, docs) {
            if (err) {
                res.send(err.getMessage)
            } else {
                res.send(docs[0])
            }
        })
    })




})

app.get('/getUserInfo', function (req, res) { 
    var userColl = DB.get("user")
    var user_id = req.query.user_id;
    userColl.find({ "id": user_id }, function (err, docs) {
        if (err) {
            console.log(err.getMessage)
        } else {
            res.send(docs[0])
        }
    })
})

app.get('/addFriend', function (req, res) {
    var my_id = req.query.my_id;
    var other_id = req.query.other_id;
    var userColl = DB.get("user")
    userColl.update({ "id": other_id }, { $push: { "friend": my_id } }, function (err, raw) {
        if (err) {
            console.log(err.getMessage)
        } else {
            res.send("添加好友成功")
        }
    })
})

app.get('/unAddFriend', function (req, res) {
    var my_id = req.query.my_id;
    var other_id = req.query.other_id;
    var userColl = DB.get("user")
    userColl.update({ "id": other_id }, { $pull: { "friend": my_id } }, function (err, raw) {
        if (err) {
            console.log(err.getMessage)
        } else {
            res.send("成功删除好友")
        }
    })
})




// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found')
    err.status = 404
    next(err)
})

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500)
        res.render('error', {
            message: err.message,
            error: err
        })
    })
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500)
    res.render('error', {
        message: err.message,
        error: {}
    })
})


server.listen(2016, function () {
    console.log('server listening port 2016..');
})
