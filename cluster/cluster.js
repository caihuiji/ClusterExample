/**
 * Created by chriscai on 2015/10/14.
 */
var cluster = require('cluster');
var http = require('http');
var numCPUs = 5 //require('os').cpus().length; /* 获取CPU的个数*/
var fs = require("fs");

//cat ./node.cluster.pid | xargs kill -USR2


var restartWorkers = function (){
    var worksId =  Object.keys(cluster.workers); ;

    for(var i =0 ; i < worksId.length ; i++){
        (function (workId , index){
            /**
             * interval restart worker
             */
            setTimeout(function (){
                if(!cluster.workers[workId]){
                    return ;
                }
                cluster.workers[workId].send({
                    text: 'shutdown',
                    from: 'master'
                });
                // if worker not stop , kill it
                setTimeout(function() {
                    if(cluster.workers[workId]) {
                        console.log("workId %s  is not shutdonw , kill it. " , workId)
                        cluster.workers[workId].kill('SIGKILL');
                    }
                }, 3000);
            } ,index *1000)
        })(worksId[i] , i )
    }


}

if (cluster.isMaster) {
    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
    cluster.on('exit', function(worker, code, signal) {
        //console.log(process.exitCode)
        if (code != 0) { // if exit is not abnormal , restart it (code = 0 is normal)
            console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal +", restart ...");
            cluster.fork();
        }

    });

    process.on('SIGUSR2', function () {
	console.log("receive restart signal")
	restartWorkers()
    });

   fs.writeFileSync("./node.cluster.pid", process.pid);
} else {
    var server = http.createServer(function(req, res) {
        res.writeHead(200);
        res.end("hello world\n");
    }).listen(5000);

    process.on('message', function(message) {
        if(message.text === 'shutdown' && message.from == "master") {
	    console.log("recevive shutdown pid : " , process.pid)
            server.close(function (){
                process.exit(1);
            })
        }
    });
}
