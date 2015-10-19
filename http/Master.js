var http = require("http");

var childProcess = require("child_process");
var process = childProcess.fork("worker");

var server = http.createServer(function (){
});

server.listen(8080 , function (){
    process.send("newconn" , this);
    this.close();
})