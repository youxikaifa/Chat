var app = require('express')();
var routes = require('./routes/index.js')

app.get('/createroom',routes.createroom);
app.get('/news',routes.news)
app.post('/sendmsg',routes.sendMsg)

http.listen(2000, function(){
  console.log('listening on port:2000');
});
