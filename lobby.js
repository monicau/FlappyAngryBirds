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

io.on('connection', function (socket){ // socket is the newly connected socket
  // join the lobby when first entering the app
	socket.join('lobby');  
	socket.current_room = 'lobby';
	lobby_members.push(socket.id);
	io.to('lobby').emit('new comer', {id:socket.id}); // tell others about it
	io.to('lobby').emit('lobby members', {members: lobby_members });
	socketID = socket.id;

	socket.on('disconnect', function(){
		io.to('lobby').emit('disconnected', {id:socketID});
		var index = lobby_members.indexOf(socket.id);
		lobby_members = lobby_members.splice(index, 1);
		io.to('lobby').emit('lobby members', {members: lobby_members })

	});
	
	socket.on('join room', function(message){
  		console.log(socket.id+' joined room '+message.room);
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
		// launch game.js in a child process here
		
		var room = io.nsps['/'].adapter.rooms[socket.current_room];
		room.readied = (room.readied==null) ? 2 : room.readied+1; // 2 because "readied" is a member of the room. it's a guy
		console.log(room.readied);
		console.log("keys length: " + Object.keys(room).length);
		console.log("keys: " + Object.keys(room));
		if(room.readied == Object.keys(room).length){
			console.log("Everyone ready, starting game server..")
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
	
	console.log('There are '+Object.keys(io.nsps['/'].adapter.rooms['lobby']).length+' people connected')
});

