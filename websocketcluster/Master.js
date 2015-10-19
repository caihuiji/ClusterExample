var http = require("http");

var childProcess = require("child_process");
var crypto = require('crypto');
var process = childProcess.fork("Worker");
var WebSocketServer = require('ws').Server;
var  PerMessageDeflate = require('./PerMessageDeflate')
var  Extensions = require('./Extensions')

var server = http.createServer(function (req, res){
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Handled by child, pid = ' + process.pid + '\n');
});


/*server.listen(5000 , function (){
    console.log("send conn")
    process.send("newconn" , this._handle);
    this.close();
    //this.close();
})*/

server.on('upgrade', function(req, socket, upgradeHead) {
    if (typeof req.headers.upgrade === 'undefined' || req.headers.upgrade.toLowerCase() !== 'websocket') {
        return;
    }

    var self = this;

    var head = new Buffer(upgradeHead.length);
    upgradeHead.copy(head);

    // 校验 websocket 协议的正确性
    handleHybiUpgrade(req, socket, upgradeHead , function (options){
        options.buf = upgradeHead;
        process.send({ack :"newconn" , options : options} , socket);
    })


});

server.listen(5000 );


function acceptExtensions(offer) {
    var extensions = {};
    if ( offer[PerMessageDeflate.extensionName]) {
        var perMessageDeflate = new PerMessageDeflate({}, true);
        perMessageDeflate.accept(offer[PerMessageDeflate.extensionName]);
        extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
    }
    return extensions;
}


function abortConnection(socket, code, name) {
    try {
        var response = [
            'HTTP/1.1 ' + code + ' ' + name,
            'Content-type: text/html'
        ];
        socket.write(response.concat('', '').join('\r\n'));
    }
    catch (e) { /* ignore errors - we've aborted this connection */ }
    finally {
        // ensure that an early aborted connection is shut down completely
        try { socket.destroy(); } catch (e) {}
    }
}



function handleHybiUpgrade(req, socket, upgradeHead, cb) {
    // handle premature socket errors
    var errorHandler = function() {
        try { socket.destroy(); } catch (e) {}
    }
    socket.on('error', errorHandler);

    // verify key presence
    if (!req.headers['sec-websocket-key']) {
        abortConnection(socket, 400, 'Bad Request');
        return;
    }

    // verify version
    var version = parseInt(req.headers['sec-websocket-version']);
    if ([8, 13].indexOf(version) === -1) {
        abortConnection(socket, 400, 'Bad Request');
        return;
    }

    // verify protocol
    var protocols = req.headers['sec-websocket-protocol'];

    // verify client
    var origin = version < 13 ?
        req.headers['sec-websocket-origin'] :
        req.headers['origin'];

    // handle extensions offer
    var extensionsOffer = Extensions.parse(req.headers['sec-websocket-extensions']);

    // handler to call when the connection sequence completes
    var self = this;
    var completeHybiUpgrade2 = function(protocol) {

        // calc key
        var key = req.headers['sec-websocket-key'];
        var shasum = crypto.createHash('sha1');
        shasum.update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11");
        key = shasum.digest('base64');

        var headers = [
            'HTTP/1.1 101 Switching Protocols'
            , 'Upgrade: websocket'
            , 'Connection: Upgrade'
            , 'Sec-WebSocket-Accept: ' + key
        ];

        if (typeof protocol != 'undefined') {
            headers.push('Sec-WebSocket-Protocol: ' + protocol);
        }

        var extensions = {};
        try {
            extensions = acceptExtensions.call(self, extensionsOffer);
        } catch (err) {
            abortConnection(socket, 400, 'Bad Request');
            return;
        }

        if (Object.keys(extensions).length) {
            var serverExtensions = {};
            Object.keys(extensions).forEach(function(token) {
                serverExtensions[token] = [extensions[token].params]
            });
            headers.push('Sec-WebSocket-Extensions: ' + Extensions.format(serverExtensions));
        }

        socket.setTimeout(0);
        socket.setNoDelay(true);
        try {
            socket.write(headers.concat('', '').join('\r\n'));
        }
        catch (e) {
            // if the upgrade write fails, shut the connection down hard
            try { socket.destroy(); } catch (e) {}
            return;
        }

        cb({
            protocolVersion: version,
            protocol: protocol,
            wsextensions: req.headers['sec-websocket-extensions']
        });
    }

    // optionally call external protocol selection handler before
    // calling completeHybiUpgrade2
    var completeHybiUpgrade1 = function() {
        // choose from the sub-protocols
        if (typeof protocols !== 'undefined') {
                completeHybiUpgrade2(protocols.split(/, */)[0]);
            }
            else {
                completeHybiUpgrade2();
        }
    }


    completeHybiUpgrade1();
}