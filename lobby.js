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

io.on('connection', function (socket){ // socket is the newly connected socket
  // join the lobby when first entering the app
	socket.join('lobby');  
	socket.current_room = 'lobby';
	io.to('lobby').emit('new comer', {id:socket.id}); // tell others about it
	
	socket.on('disconnect', function(){
		io.to(socket.current_room).emit('disconnected', {id:socket.id});
	});
	
	socket.on('join room', function(message){
    console.log(socket.id+' joined room '+message.room);
		socket.leave(socket.current_room);
		socket.join(message.room);
		socket.current_room = message.room;
		io.to(socket.current_room).emit('new comer', {id:socket.id});
    // get copy of members of the room and send it
    var room = io.nsps['/'].adapter.rooms[socket.current_room]; 
    if(room){
      socket.emit('room members',Object.keys(room));
      console.log(Object.keys(room) + ' are in the room');
    }    
	});
	
	socket.on('start game', function(message){
		// launch game.js in a child process here
	});
	
	console.log('There are '+Object.keys(io.nsps['/'].adapter.rooms['lobby']).length+' people connected')
});

