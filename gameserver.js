var util = require('util');
var fs = require('fs');

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
// var child_process = require('child_process');
var port;
var socket;
var usernames = [];
var socket_usernames = {};
var members_of_room = [];
var bossUsername;
var bossSocket = [0];
var count = 0;
process.on('message', function(message) {
	process.send("hi i received your message");
	port = message[0];
	members_of_room = Object.keys(message[1]);
	socket_usernames = message[2];

	process.send("game server received "+JSON.stringify(members_of_room) + " "+JSON.stringify(socket_usernames));
	for(var i=0; i< members_of_room.length; i++){
		usernames.push(socket_usernames[members_of_room[i]]);
	}
	http.listen(port, function(){
		process.send("listening to port " + port);
	});

	bossUsername = usernames[0];
});
io.on('connection', function(socket) {
	process.send("game.js received client connection");
	socket.join('game');
	count++;
	if(count == members_of_room.length)	io.to('game').emit('start', {players: usernames, boss: bossUsername});

	socket.on('player name', function(message){
		if(bossUsername == message){
			bossSocket[0] = socket;	
		}
	});
	socket.on('player action', function(message){
		process.send("pleb action received ");
		if(!bossSocket[0]){
			process.send("pleb action processing");
			io.to('game').emit("pleb action", message);
		}
	});
	socket.on('gameState', function(message){
		process.send("updating game states");
		socket.broadcast.to('game').emit('update', message);
	});

});





