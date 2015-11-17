var util = require('util');
var fs = require('fs');

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);



var port = 8080;
http.listen(port, function(){
  console.log('listening on *:'+port);
});

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
	
	socket.on('start game', function(message){
		// launch game.js in a child process here
	});
	
	console.log('There are '+Object.keys(io.nsps['/'].adapter.rooms['lobby']).length+' people connected')
});

