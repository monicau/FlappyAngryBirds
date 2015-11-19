var util = require('util');
var fs = require('fs');

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
// var child_process = require('child_process');
var port;
var socket;
var room;

process.on('message', function(message) {
	process.send("hi i received your message");
	port = message[0];
	room = message[1];
	http.listen(port, function(){
		process.send("listening to port " + port);
	});
});

io.on('connection', function(socket) {
	process.send("game.js received client connection");
	socket.join('game');
	io.to('game').emit('message', "hello !");
});



