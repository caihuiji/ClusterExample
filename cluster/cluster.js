/**
 * Created by chriscai on 2015/10/14.
 */
var cluster = require('cluster');
var http = require('http');
var numCPUs = require('os').cpus().length; /* 获取CPU的个数*/

if (cluster.isMaster) {
    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
    cluster.on('exit', function(worker, code, signal) {
        console.log('worker ' + worker.process.pid + ' died');
    });
} else {
    http.createServer(function(req, res) {
        res.writeHead(200);
        res.end("hello world\n");
    }).listen(5000);
}