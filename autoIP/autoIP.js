const dgram = require('dgram');
const socket = dgram.createSocket('udp4');
const { networkInterfaces } = require('os');
const nets = networkInterfaces();

const nombreInterface='eth0'
const puerto='2222';

let respuestaIp='';
for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
        //guarda con estoooooooooooooooooooooooooooooooo
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
        const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
        if (net.family === familyV4Value && !net.internal) {
            if (name.toString()===nombreInterface) {
                respuestaIp=net.address
            }
        }
    }
}

socket.on('message', function (message, remote) {
  if (message.toString()==='GetIp') {
        //remote.port (numero de puerto donde se recibio el msg)
        console.log('llego msg')
        socket.send(respuestaIp, 0, respuestaIp.length, 8888, remote.address);
  }
});

socket.bind(puerto);
