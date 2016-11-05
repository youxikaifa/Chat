var mongoose = require("mongoose");
var express = require('express');
var router = express.Router();
var monk = require('monk')
var DB = monk('localhost:27017/users')

router.login = function (req, res) {
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
}

module.exports = router;