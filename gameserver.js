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
	password: 'yoursql',
	database: 'cs307'
});

var port;
var usernames = [];
var birds = [];
var bossUsername;
var bossSocket;
var count = 0;
var restart_requests = new Set();
var possibleColors = {
	'light green': 0xB2F2ED,
	'orange': 0xEDB227,
	'yellow': 0xFFFF00,
	'dark green': 0x5D68D9,
	'bright red': 0x9E0000,
	'bright green': 0x00E300};
var myColorName;

function getHighScores(callback) {
	connection.query('select * from scoreboard order by score desc limit 10', function(err, rows, fields) {
		if (err) throw (err);
		callback(rows);	
	});
}

function addHighScore(pUsername, pScore) {
	var post = {
		username: pUsername,
		score: pScore
	};
	var query = connection.query('insert into scoreboard (username, score) values (\'' + pUsername + '\', ' + pScore + ') ', function(err, result) {
		if (err) throw (err);
	});
}

process.on('message', function(message) {
	// process.send("hi i received your message");
	port = message[0];
	usernames = message[1];
	birds = message[2];

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
	var myColors = {};
	for (var user in usernames) {
		if (Object.keys(myColors).length == 0){
			myColors = JSON.parse(JSON.stringify(possibleColors));
		}
		myColorName = Object.keys(myColors)[0];
		var color = myColors[myColorName];
		delete myColors[myColorName];
		playerColours[usernames[user]] = color;
	}

	if(count == usernames.length)	{
		io.to('game').emit('start', usernames, bossUsername, birds);
	}

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
	
	socket.on('restart', function(user){
		restart_requests.add(user);
		process.send("Received re message from "+user+" length "+usernames.length + " vs size "+restart_requests.size);
		if(restart_requests.size == usernames.length){
			process.send("received restart request");
		}
	});

	socket.on('get highscore', function(message) {
		getHighScores(function(result) {
			io.to('game').emit("high score", result);
		});
	});
	socket.on('submit highscore', function(message) {
		addHighScore(message[0], message[1]);
	});
});

