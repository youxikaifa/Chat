var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var router = express.Router();

// var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();
var IO = require('socket.io');
var server = require('http').createServer(app);


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));




var socketIO = IO(server);
var roomInfo = {};
socketIO.on('connect',function(socket){
  var url = socket.request.headers.referer;
  console.log('req:'+socket);
  console.log('url:'+url);
  var splited = url.split('/');
  var roomID = splited[splited.length-1];
  var user = '';

  socket.on('join',function(userName){ //userName从何而来
    user = userName;

    //将用户昵称加入房间名单中
    if(!roomInfo[roomID]){
      roomInfo[roomID] = [];
    }

    roomInfo[roomID].push(user);
    socket.join(roomID); //加入房间

    //通知房间内人员
    socketIO.to(roomID).emit('sys',user+'加入了房间',roomInfo[roomID]);
    console.log(user+'加入了房间'+roomID);
  })

  socket.on('leave',function(){
    socket.emit('disconnect');
  })

  socket.on('disconnect',function(){
    //从房间名单删除
    var index = roomInfo[roomID].indexOf(user);
    if(index != -1){
      roomInfo[roomID].splice(index,1);
    }
    socket.leave(roomID);
    socketIO.to(roomID).emit('sys',user+'退出了房间',roomInfo[roomID]);
    console.log(user+'退出了房间'+roomID);
  })

  //接受用户信息，发送到相应的房间
  socket.on('message',function(msg){
    //验证如果用户不在房间则不发送
    if(roomInfo[roomID].indexOf(user) === -1){
      return false;
    }
    socketIO.to(roomID).emit('msg',user,msg);
  })
})

// app.use('/', router);
// app.get('/room/:roomID',function(req,res){
//   var roomID = req.params.roomID;
// })



// // catch 404 and forward to error handler
// app.use(function(req, res, next) {
//   var err = new Error('Not Found');
//   err.status = 404;
//   next(err);
// });

// // error handlers

// // development error handler
// // will print stacktrace
// if (app.get('env') === 'development') {
//   app.use(function(err, req, res, next) {
//     res.status(err.status || 500);
//     res.render('error', {
//       message: err.message,
//       error: err
//     });
//   });
// }

// // production error handler
// // no stacktraces leaked to user
// app.use(function(err, req, res, next) {
//   res.status(err.status || 500);
//   res.render('error', {
//     message: err.message,
//     error: {}
//   });
// });


server.listen(3000,function(){
  console.log('server listening port 3000..');
})
