var express = require('express');
var cheerio = require('cheerio');
var request = require('request');
var EventEmitter = require('events').EventEmitter;
var myEvents = new EventEmitter();
var schedule = require('node-schedule');
var rule = new schedule.RecurrenceRule();
var times = [];
var timeTask = require('../controler/schedule_update');
var router = express.Router();
var mysql = require('mysql');

var conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'dengyi',
    database: 'douyu',
    port: 3306
});
/* GET home page. */
router.get('/updateTags', function (req, res, next) {
    if (req.query.page == undefined) {
        return res.json({err: "err params"})
    }
    var page = req.query.page;
    res.json({msg: "getit"});
    var limit_range = (page - 1) * 10 + ',' + 20;
    var userAddSql = 'SELECT * FROM panda limit ' + limit_range + ';';
    conn.query(userAddSql, function (err, rows, fields) {
        if (err) throw err;
        for (var i = 0; i < rows.length; i++) {
            myEvents.emit('geted', rows[i].room_id);
        }

    });
});
router.get('/crawlerAndroid', function (req, res, next) {
    if (req.query.pagenumber == undefined) {
        return res.json({err: "err params"})
    }
    myEvents.emit('initData', req.query.pagenumber);
    res.json({msg: 'android api initing'});

});


myEvents.on('geted', function (room_id) {
    doGET(room_id);
});
function doGET(room_id) {
    var optionsfordetail = {
        method: 'GET',
        encoding: null,
        url: "http://www.panda.tv/api_room?roomid=" + room_id
    };
    request(optionsfordetail, function (error, response, body) {
        if (error) {
            return console.log(error);
        }
        try {
            var parse = JSON.parse(body);
            var fans = parse.data.roominfo.fans;
            var bulletin = parse.data.roominfo.bulletin;
            var classification = parse.data.roominfo.classification;

            myEvents.emit('updateTags', fans, bulletin, classification, room_id);
        }catch (e){
            console.log(e)
        }
       


    });
}
myEvents.on('updateTags', function (fans, mTags, classification, room_id) {
    var updateSql = 'UPDATE panda SET tags = ?,fans= ?,game_name=? WHERE room_id = ?';
    var updateParams = [mTags, fans, classification, room_id];
    conn.query(updateSql, updateParams, function (err, result) {
        if (err) {
            return console.log(err);
        }

    })

});

myEvents.on('initData', function (pn) {
    var douyuApi = {
        method: 'GET',
        encoding: null,
        url: "http://api.m.panda.tv/ajax_live_lists?pagenum=100&pageno=" + parseInt(pn)
    };
    request(douyuApi, function (err, response, body) {
        if (err) {
            return console.log(err);
        }
        acquireData(JSON.parse(body))
    })

});
function acquireData(data) {
    var sql = 'replace INTO panda (room_id, room_name, owner_uid, nickname, online, game_name, fans) VALUES (?,?,?,?,?,?,?)';
    if (data.data.size == 0) {
        return console.log('没有数据了');
    }
    data.data.items.forEach(function (item) {
        var params = [item.id, item.name, item.hostid, item.userinfo.nickName, item.person_num, item.classification, 0];
        conn.query(sql, params, function (err, result) {
            if (err) {
                console.log(err);
                return;
            }

        });

    });
}
var isRunning = false;
router.get('/start', function (req, res, next) {
    sub();
    if (isRunning) {
        return res.json({msg: 'copy that 爬虫还在运行.......'})
    }
    myEvents.emit('start');
    isRunning = true;
    res.json({msg: 'copy that 爬虫开始.......'})
});

myEvents.on('start', function () {
    rule.second = times;
    for (var i = 0; i < 60; i = i + 5) {
        times.push(i);
    }
    schedule.scheduleJob(rule, function () {
        var page = timeTask.getMainData();
        if (page > 113) {
            this.cancel();
            myEvents.emit('startupdateTags')
        }
        console.log("------------" + new Date())
    });
});
myEvents.on('startupdateTags', function () {
    rule.second = times;
    for (var i = 0; i < 60; i = i + 2) {
        times.push(i);
    }
    schedule.scheduleJob(rule, function () {
        var page = timeTask.updateTag();
        if (page > 500) {
            this.cancel();
            isRunning=false;
            console.log('-----------------------------------爬虫结束---------------------------------------------')
        }
        console.log("------------" + new Date())
    });
});
var mypretime=0;
function sub(){
    var Today = new Date();
    var NowHour = Today.getHours();
    var NowMinute = Today.getMinutes();
    var NowSecond = Today.getSeconds();
    var mysec = (NowHour*3600)+(NowMinute*60)+NowSecond;
    if((mysec-mypretime)>10){
//10只是一个时间值，就是10秒内禁止重复提交，值随便设
        mypretime=mysec;
    }else{
        return;
    }
}
module.exports = router;
