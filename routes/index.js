var express = require('express');
var router = express.Router();
var http = require('http').createServer();
var io = require('socket.io')(http);
/* GET home page. */
router.createroom = function(req, res) {
  // var _socket = io.connect('http://localhost:2000/');
  io.on('connection', function(socket){
    socket.on('event', function(data){

    })
  });
  res.send("连接成功")
};

router.sendMsg = function(req,res){
  var content = 'one message';
  var username = 'hejinjin'
  var obj = {
    msg : message,
    name : username
  }

  _socket.emit('message',message);

  res.send('send succeed:'+obj.msg)
}

router.news = function(req,res){

  _socket.on('message',function(obj){
    console.log('speak:'+obj.msg);
  });
  res.send('get msg succeed'+msg)
}





module.exports = router;
