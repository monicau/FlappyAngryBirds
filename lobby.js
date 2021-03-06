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

app.get('/game', function(req, res){
	res.sendFile(__dirname+'/html/game.html');
});

var lobby_members = [];
var gamerooms = []; // list of created rooms
var ready_members_per_room = {}; //key: room name, value: list of ready players
var socket_usernames = {}; //key: socket ID, value: username
var username_to_bird = {}; //key: username, value: bird type (0, 1 or 2)

io.on('connection', function (socket){ // socket is the newly connected socket
	socket.on('disconnect', function(){
		var old_room = socket.current_room;
		if(getMembersInRoom(old_room).length ==  0){
			console.log(old_room + " is empty, removing it.");
			var index = gamerooms.indexOf(old_room);
			gamerooms.splice(index, 1);
			io.to('lobby').emit('gamerooms', gamerooms);
		}
		console.log("Socket " + socket.id + " disconnected, Old room was :" + old_room);

		// Remove user's state from their previous room
		if(old_room){
			if(old_room == 'lobby'){
				removeMemberFromLobby(socket);
			}
			else{
				removeMemberFromRoom(socket, old_room);
			}
		}

		delete socket_usernames[socket.id];
	});

	socket.on('new user', function(message) {
		if(!message.username || usernameTaken(message.username)){
			socket.emit("username invalid");
		}
		else{
			socket.emit('username valid', message.username);
			// Join lobby
			lobby_members.push(message.username);
			socket.join('lobby');
			socket.current_room = 'lobby';
			io.to('lobby').emit('new lobby member', message.username); // tell others about it

			// If they aren't currently in socket_usernames, add them, and notify the lobby members
			if(!(socket.id in socket_usernames && socket_usernames[socket.id] === message.username)){
				socket_usernames[socket.id] = message.username;
				username_to_bird[message.username] = message.player_selection;
				console.log("New user: username " + message.username + " with socket " + socket.id);
				io.to('lobby').emit('lobby members', lobby_members)
			}
			console.log("Lobby members:" + JSON.stringify(socket_usernames));
		}
	});

	socket.on('returned to lobby', function(username) {
		var old_room = socket.current_room;
		socket.leave(old_room);

		// Join lobby
		lobby_members.push(username);
		socket.join('lobby');
		socket.current_room = 'lobby';
		io.to('lobby').emit('new lobby member', username); // tell others about it


		if(getMembersInRoom(old_room).length ==  0){
			var index = gamerooms.indexOf(old_room);
			gamerooms.splice(index, 1);
			io.to('lobby').emit('gamerooms', gamerooms);
		}

		if(old_room){
			if(old_room == 'lobby'){
				removeMemberFromLobby(socket);
			}
			else{
				removeMemberFromRoom(socket, old_room);
			}
		}

		io.to('lobby').emit('lobby members', lobby_members)
		console.log("Lobby members:" + JSON.stringify(socket_usernames));
	});

	socket.on('lobby chat message', function(msg) {
		var message = {};
		message.user = socket_usernames[socket.id];
		message.chatmessage = msg;
		// console.log("Received chat. Packing it: " + JSON.stringify(message));
		io.to('lobby').emit('new lobby chat message', message);
	});

	socket.on('join room', function(newRoom){
		// if gameroom doesn't already exist, create it
		if(gamerooms.indexOf(newRoom) == -1){
			gamerooms.push(newRoom);
			console.log("New game room:" + newRoom);
			console.log("Rooms: " + JSON.stringify(gamerooms));
			// Emit new game room to people in lobby
			io.to('lobby').emit('gamerooms', gamerooms);
		}

		removeMemberFromLobby(socket);

		console.log(socket_usernames[socket.id] + "(" + socket.id + ') joined room ' + newRoom);
		socket.leave(socket.current_room);
		socket.join(newRoom);
		socket.current_room = newRoom;

	    // send the new member's username to members of the room, to be logged
		io.to(socket.current_room).emit('new room member', socket_usernames[socket.id]);

		// send new usernames of all the members to members of the room
		var usernames_in_room = getMembersInRoom(socket.current_room);
		io.to(socket.current_room).emit('room members', usernames_in_room);
	});

	socket.on('request rooms', function(){
		io.to('lobby').emit('gamerooms', gamerooms);
	});

	socket.on('ready for game', function(){
		// Add this socket to ready list, creating one if no list exists already or the list is empty
		if (ready_members_per_room[socket.current_room] == null || ready_members_per_room[socket.current_room].length == 0) {
			ready_members_per_room[socket.current_room] = [socket.id];
		} else {
			ready_members_per_room[socket.current_room].push(socket.id);
		}

		// Remove room from open game rooms to prevent new users joining
		var index = gamerooms.indexOf(socket.current_room);
		gamerooms.splice(index, 1);
		io.to('lobby').emit('gamerooms', gamerooms);

		var ready_members_of_room = getReadyMembersInRoom(socket.current_room);
		// Emit readied players
		io.to(socket.current_room).emit('members ready in room', ready_members_of_room);
		var members_of_room = getMembersInRoom(socket.current_room);
		// If everyone is ready, start the game
		if(ready_members_per_room[socket.current_room].length == members_of_room.length){
			console.log("Everyone ready, starting game server.");
			// Create a list of chosen birds for each member of this room
			var birds_in_room = [];
			// console.log("Binding user to bird type...");
			for (var i=0; i<members_of_room.length; i++) {
				// console.log("user: " + members_of_room[i] + ", bird:" + username_to_bird[members_of_room[i]]);
				birds_in_room.push(username_to_bird[members_of_room[i]]);
			}
			var p = launchGameServer(members_of_room, birds_in_room);
		}
	});
	function launchGameServer(members_of_room, birds_in_room) {
		var p = child_process.fork(__dirname + '/gameserver');
		var portNum = Math.round(Math.random() * (10000) + 50000); // generate a random port between 50000 to 60000
		p.send([portNum, members_of_room, birds_in_room]);
		console.log("Emitting game port ");
		io.sockets.in(socket.current_room).emit('gamePort', portNum);
		p.on('message', function(message) {
			console.log("CHILD SAID: " + message);
			if (message.indexOf('restart') > -1) {
				// Launch a new game server for the new game
				return launchGameServer(members_of_room, birds_in_room);
			}
		});
		return p;
	}
});

function removeMemberFromLobby(socket){
	var username = socket_usernames[socket.id];
	io.to('lobby').emit('lobby member disconnected', username);

	console.log("Removing member " + username + " from lobby.");

	var index = lobby_members.indexOf(username);
	lobby_members.splice(index, 1);

	console.log("New lobby members: " + JSON.stringify(lobby_members));
	io.to('lobby').emit('lobby members', lobby_members);
}

function removeMemberFromRoom(socket, room){
	var username = socket_usernames[socket.id];
	io.to(socket.current_room).emit('room member disconnected', username);
	console.log("Removing member " + socket_usernames[socket.id] + " from room " + room);

	var ready_members_in_room = ready_members_per_room[room];
	console.log("Members in rooms " + JSON.stringify(getMembersInRoom(room)));

	if(ready_members_in_room){
		var index = ready_members_in_room.indexOf(socket.id);
		ready_members_in_room.splice(index, 1);

		ready_members_per_room[room] = ready_members_in_room;
	}

	io.to(socket.current_room).emit('room members', getMembersInRoom(room));
	io.to(socket.current_room).emit('members ready in room', getReadyMembersInRoom(socket.current_room));
}

function getMembersInRoom(room) {
	var members = io.nsps['/'].adapter.rooms[room];
	var usernames_in_room = [];
	if(members){
		var sockets_in_room = Object.keys(members);
		if (sockets_in_room) {
			for (var i = 0; i < sockets_in_room.length; i++) {
				var username = socket_usernames[sockets_in_room[i]];
				if (username) {
					usernames_in_room.push(username);
				}
			}
		}
	}
	return usernames_in_room;
}

function usernameTaken(username){
	for(var key in socket_usernames){
		if(socket_usernames.hasOwnProperty(key)){
			if (socket_usernames[key] == username){
				return true;
			}
		}
	}
	return false;
}

function getReadyMembersInRoom(room){
	var ready_sockets = ready_members_per_room[room];
	var ready_usernames = [];
	if(ready_sockets){
		for(var i=0; i<ready_sockets.length; i++){
			var ready_socket = ready_sockets[i];
			ready_usernames.push(socket_usernames[ready_socket]);
		}
	}
	return ready_usernames;
}
