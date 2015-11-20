var util = require('util');
var fs = require('fs');

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var child_process = require('child_process');



var port = 8080;
http.listen(port, function(){
  console.log('listening on *:'+port);
});

app.use("/css", express.static(__dirname + '/css'));
app.use("/js", express.static(__dirname + '/js'));
app.use("/assets", express.static(__dirname + '/assets'));

app.get('/', function(req, res){
  res.sendFile(__dirname+'/html/index.html');
});

var lobby_members = [];
var gamerooms = []; // list of created rooms
var rooms_ready = {}; //key: room name, value: list of ready players 
var socket_usernames = {}; //key: socket ID, value: username

io.on('connection', function (socket){ // socket is the newly connected socket
	socketID = socket.id;

	socket.on('disconnect', function(){
		//TODO: remove socket.id from socket_usernames dictionary

		io.to('lobby').emit('disconnected', {id:socketID});
		var index = lobby_members.indexOf(socket.id);
		lobby_members = lobby_members.splice(index, 1);
		io.to('lobby').emit('lobby members', {members: lobby_members })

	});

	socket.on('username', function(message) {
		// Join lobby
		lobby_members.push(message);
		socket.join('lobby');  
		socket.current_room = 'lobby';
		io.to('lobby').emit('new comer', {id:message}); // tell others about it

		//TODO need to check if username/socket id exists already before adding it
		socket_usernames[socket.id] = message;
		console.log("New user: " + message + " with socket " + socket.id);
		io.to('lobby').emit('lobby members', {members: lobby_members })
	});
	
	socket.on('join room', function(message){
		gamerooms.push(message.room);

		// Emit updated game room to people in lobby
		io.to('lobby').emit('gamerooms', gamerooms);

  		console.log(socket_usernames[socket.id] + "(" + socket.id+') joined room '+message.room);
		socket.leave(socket.current_room);
		socket.join(message.room);
		socket.current_room = message.room;
		io.to(socket.current_room).emit('new member', {id:socket.id});
	    // get copy of members of the room and send it
	    var room = io.nsps['/'].adapter.rooms[socket.current_room]; 
	    if(room){
	      // socket.emit('room members',Object.keys(room));
	      io.to(socket.current_room).emit('room members',Object.keys(room));
	      console.log(Object.keys(room) + ' are in the room');
	    }    
	});

	
	
	socket.on('ready game', function(message){
		// Add this socket to ready list
		if (rooms_ready[socket.current_room]==null) {
			rooms_ready[socket.current_room] = [socket.id];
		} else {
			rooms_ready[socket.current_room].push(socket.id);
		}
		// Remove room from open game rooms to prevent new users joining
		var index = gamerooms.indexOf(socket.current_room);
		gamerooms = gamerooms.splice(index, 1);
		io.to('lobby').emit('gamerooms', gamerooms);

		var room = io.nsps['/'].adapter.rooms[socket.current_room];

		// Emit readied players
		io.to(socket.current_room).emit('members ready', rooms_ready[socket.current_room]);

		// If everyone is ready, start the game
		if(rooms_ready[socket.current_room].length == Object.keys(room).length){
			console.log("Everyone ready, starting game server..");
			var p = child_process.fork(__dirname + '/gameserver');
			var portNum = Math.round(Math.random() * (10000) + 50000); // generate a random port between 50000 to 60000
			p.send([portNum, room]);
			console.log("Emitting game port ");
			io.sockets.in(socket.current_room).emit('gamePort', portNum);
			p.on('message', function(message) {
				console.log("CHILD SAID: " + message);
			});
		}
	});
	// console.log('There are '+Object.keys(io.nsps['/'].adapter.rooms['lobby']).length+' people connected')
});

