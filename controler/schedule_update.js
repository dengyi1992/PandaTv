var request = require('request');

var EventEmitter = require('events').EventEmitter;
var myEvents = new EventEmitter();

var count = 0;

//var start =11111;
//var start =18955;
var start = 1;
var page = 0;
exports.timeTask = function () {

    var options1 = {
        method: 'GET',
        encoding: null,
        url: "http://localhost:3000?page=" + start
    };
    request(options1, function (error, response, body) {
        console.log(new Date());
        start = start + 1;
    });

};
exports.timeTask1 = function () {

    var options1 = {
        method: 'GET',
        encoding: null,
        url: "http://localhost:3000/crawlerAndroid?pagenumber=" + page
    };

    request(options1, function (error, response, body) {
        console.log(new Date());
        page = page + 1;
    });
    return page;
};



