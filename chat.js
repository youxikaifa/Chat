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

var message = require('./schema/message.js');

//  hat模块生成不重复ID
var hat = require('hat')
var rack = hat.rack()

var socketIO = IO(server);
var roomInfo = {}; //房间用户名单
var db = monk('localhost:27017/message')
var DB = monk('localhost:27017/users')
var Message = mongoose.model('Message', message);

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))

app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))
socketIO.on('connect', function (socket) {

    //加入指定房间
    socket.on('join', function (roomID, id, name) {

        db.create(roomID);

        if (!roomInfo[roomID]) {
            console.log('尚未建立此房间,正在创建..')
            roomInfo[roomID] = [];
            socket.join(roomID)
        }
        if (roomInfo[roomID].indexOf(id) === -1) {
            roomInfo[roomID].push(id)
        }
        console.log('人员数:' + roomInfo[roomID])

        socket.broadcast.to(roomID).emit('userCome', name + '加入了个房间' + roomID)
    })

    // //离开房间
    // socket.on('diconnect', function () {
    //     socket.emit('disconnect')
    // })

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

        if (roomInfo[roomID].length == 0) {
            socket.leave(roomID) //如果人数为0,退出房间
            console.log('房间已关闭')
        }
        // 
        socket.to(roomID).emit('userLeave', name + '离开了房间' + roomID)
        console.log(name + '离开了房间' + roomID)
    })


    //接受用户发送的信息,发送到指定房间    
    socket.on('message', function (roomID, token, name, msg, thumb) {
        //user 包括id 头像url msg uername
        console.log('收到一条信息:' + msg)
        var created = new Date().getTime().toString()
        var collection = db.get(roomID);
        // var message = new Message({
        //     'name': name,
        //     'userIconUrl': userIconUrl,
        //     'msg': msg,
        // })
        // message.save( function (err) {
        //     if (err) {
        //         console.log(err.message)
        //     }
        //     console.log('数据存储成功!')
        // })
        collection.insert({
            'name': name,
            'token': token,
            'msg': msg,
            'thumb': thumb,
            'created': created
        })

        //验证用户如果不在房间则不发送
        if (roomInfo[roomID].indexOf(token) === -1) {
            return false;
        }
        socketIO.to(roomID).emit('msg', token, name, msg, thumb,created);
    })
})
app.get('/', function (req, res) {
    res.send('connect succeed')
})

app.get('/chatroom/', function (req, res) {

    // var name = db.get('110').name; //取数据库的名字
    var roomID = url.parse(req.url, true).query.roomid;
    var token = url.parse(req.url, true).query.token
    db.create(roomID); //创建数据库,如果该数据库存在，也不覆盖
    var collection = db.get(roomID);
    collection.find({}, function (err, docs) {
        if (err) {
            res.send(err.message)
        } else {
            for (var i = 0; i < docs.length; i++) {
                if (docs[i].token == token) {
                    docs[i].type = 1
                }
                docs[i].type = 0;
            }
        }

        res.send(docs)
    })
})

app.post('/login', function (req, res) {
    var collection = DB.get("user")
    var b = req.body;
    console.log('body:' + req)
    var name = req.body.name;
    var pwd = req.body.pwd;

    collection.find({ 'name': name }, function (err, docs) {
        if (err) {
            console.log(err)
            res.send('请求失败')
        } else {
            if (docs.length == 0 || docs == null) {
                console.log("用户名不存在!")
                res.send('用户名不存在')
            } else {
                if (docs[0].pwd == pwd) {
                    console.log('succeed')
                    res.send(docs[0])
                } else {
                    console.log("密码错误!")
                    res.send('密码错误')
                }
            }
        }
    })
})

// app.post('/login', router.login);

app.post('/register', function (req, res) {
    var collection = DB.get("user")
    var name = req.body.name
    var pwd = req.body.pwd
    collection.find({
        'name': name
    }, function (err, docs) {
        if (docs.length == 0 || docs == null) {
            var UID = rack()
            collection.insert({
                "name": name,
                "pwd": pwd,
                "token": UID,
                "expires": "1233453456",
                "openid": "23443215435",
                "created": new Date().getTime().toString(),
                "thumb": "http://"
            }, function (err) {
                res.send('注册成功')
            })

        } else {
            console.log("用户名已存在")
            res.send('用户名已存在')
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


server.listen(3000, function () {
    console.log('server listening port 3000..');
})
