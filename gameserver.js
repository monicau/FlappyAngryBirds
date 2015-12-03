var util = require('util');
var fs = require('fs');

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mysql = require('mysql');
var connection = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: 'superbirdbro',
	database: 'cs307'
})

var port;
var usernames = [];
var bossUsername;
var bossSocket;
var count = 0;
process.on('message', function(message) {
	// process.send("hi i received your message");
	port = message[0];
	usernames = message[1];

	process.send("game server received " + JSON.stringify(usernames));
	http.listen(port, function(){
		process.send("listening to port " + port);
	});

	bossUsername = usernames[0];
});

io.on('connection', function(socket) {
	process.send("game.js received client connection");
	socket.join('game');
	count++;

	var playerColours = {};
	for (var user in usernames) {
		playerColours[usernames[user]] = (Math.random() * 0xffffff);
	}

	if(count == usernames.length)	io.to('game').emit('start', usernames, bossUsername, playerColours);

	socket.on('player name', function(username){
		if(bossUsername == username){
			bossSocket = socket;
		}
	});
	socket.on('player action', function(action, username){
		// process.send("pleb action received ");
		if(!bossSocket){
			// process.send("pleb action processing");
			io.to('game').emit("pleb action", action, username);
		}
	});
	socket.on('gameState', function(playerMap){
		// process.send("updating game states");
		socket.broadcast.to('game').emit('update', playerMap);
	});
	socket.on('hole', function(hole){
		// process.send("received hole location for pipe generation ("+hole+")");
		socket.broadcast.to('game').emit('create pipes', hole);
	});
	socket.on('score', function(score){
		// process.send("received score ("+score+")");
		socket.broadcast.to('game').emit('update score', score);
	});
	socket.on('restart', function(){
		process.send("received restart request");
	});
});
function getHighScores() {
	connection.connect();
	connection.query('select * from scoreboard', function(err, rows, fields) {
		if (!err) {
			for (var i=0; i<rows.length; i++) {
				console.log(rows[i].username + " = " + rows[i].score);
			}
		} else {
			console.log(err);
		}
	});
	connection.end;
	return rows;
}
