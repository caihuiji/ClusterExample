
var WebSocket = require('ws');

var  PerMessageDeflate = require('./PerMessageDeflate')
var  Extensions = require('./Extensions')

var server = require('http').createServer(function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Handled by child, pid = ' + process.pid + '\n');
});



function acceptExtensions(offer) {
    var extensions = {};
    if ( offer[PerMessageDeflate.extensionName]) {
        var perMessageDeflate = new PerMessageDeflate({}, true);
        perMessageDeflate.accept(offer[PerMessageDeflate.extensionName]);
        extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
    }
    return extensions;
}


process.on("message" ,  function (msg,  socket){
    //console.log(handle)

    var options = msg.options;
    var extensionsOffer = Extensions.parse(options.wsextensions);

    var client = new WebSocket([{}, socket, new Buffer(options.buf)], {
        protocolVersion: options.version,
        protocol: options.protocol,
        extensions: acceptExtensions(extensionsOffer)
    });

    console.log(new Buffer(options.buf))

    client.on("message" , function (data){
        console.log(data);

        //client.close();
    })

})