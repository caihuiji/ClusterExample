
var server = require('http').createServer(function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Handled by child, pid = ' + process.pid + '\n');
});

process.on("message" ,  function (msg,  handle){

    handle.on("connection" , function (socket){
        server.emit('connection', socket);
    })
})