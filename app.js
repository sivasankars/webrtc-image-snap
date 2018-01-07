'use strict';

var os = require('os');
var socketIO = require('socket.io');
var express = require('express');
var fs = require("fs");
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

app.use(express.static(__dirname + '/public'));
app.get('/', function (req, res, next) {
  res.sendFile(__dirname + '/public/index.html');
});

server.listen(8080);

/*
socket.io
*/

io.sockets.on('connection', function (socket) {

  // convenience function to log server messages on the client
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }

  socket.on('message', function (message) {
    log('Client said: ', message);
    // for a real app, would be room-only (not broadcast)
    socket.broadcast.emit('message', message);
  });

  socket.on('create or join', function (room) {
    log('Received request to create or join room ' + room);

    var numClients = io.sockets.sockets.length;
    log('Room ' + room + ' now has ' + numClients + ' client(s)');

    if (numClients === 1) {
      socket.join(room);
      log('Client ID ' + socket.id + ' created room ' + room);
      socket.emit('created', room, socket.id);
    } else if (numClients === 2) {
      log('Client ID ' + socket.id + ' joined room ' + room);
      // io.sockets.in(room).emit('join', room);
      socket.join(room);
      socket.emit('joined', room, socket.id);
      io.sockets.in(room).emit('ready', room);
      socket.broadcast.emit('ready', room);
    } else { // max two clients
      socket.emit('full', room);
    }
  });

  socket.on('ipaddr', function () {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function (details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

  socket.on('store image', function (data) {
    var base64Data = data.replace(/^data:image\/png;base64,/, "");
    fs.writeFile("./uploads/" + new Date().getTime() + ".png", base64Data, 'base64', function (err) {
      console.log(err);
    });
  });

  socket.on('bye', function () {
    console.log('received bye');
  });

});
