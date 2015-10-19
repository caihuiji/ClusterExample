

var http = require("http");

var WebSocketServer = require('ws').Server;

var server = http.createServer(function (){

});


server.listen(5000);

var webSocketServer = new WebSocketServer({
    server: server,
    path: "/ws/realtimeLog"
});


webSocketServer.on('connection', function (ws) {

    ws.on("message" , function (){
        console.log(555)
    })
    console.log(111);
});

webSocketServer.on('close', function (ws) {
    console.log(222);
});



