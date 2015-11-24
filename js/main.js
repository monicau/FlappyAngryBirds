$(document).ready(function() {
	// Hide game room div at the start
	$("#invalid-username-alert").hide();
	$("#div-join").hide();
	$("#div-room").hide();
	$("#div-lobby").hide();
	$("#game").hide();
});
function newUser() {
	socket.emit('new user', document.getElementById('username').value);
}
function joinRoom(){
	console.log('joining room');
	socket.emit('join room', document.getElementById('room name').value);
	$("#div-join").hide();
	$("#div-lobby").hide();
	$("#div-room").show();
}
function readyUp() {
	socket.emit('ready for game');
	$("#btn-ready").prop("disabled", true);
}

var socket = io();
var roomMembers = [];

socket.on('username taken', function(){
	$("#invalid-username-alert").show();
});

socket.on('username valid', function(){
	$("#div-username").hide();
	$("#invalid-username-alert").hide();
	$("#div-lobby").show();
	$("#div-join").show();
});

socket.on('new lobby member', function(username){
	console.log(username + ' has entered room');
	$('#lobby-messages').append($('<li>').text(username + ' has entered the lobby'));
});

socket.on('new room member', function(username) {
	$('#room-messages').append($('<li>').text(username + ' has entered the room'));
	roomMembers.push(username);
});

socket.on('room members', function(roomMembers){
	console.log(roomMembers);
	$('#room-members').text(roomMembers);
});

socket.on('lobby members', function(members){
	console.log(members);
	$('#lobby-members').text(members);
});

socket.on('gamerooms', function(rooms){
	console.log("game rooms:" + rooms);
	$("#gamerooms").empty();
	for (var i = 0 ; i < rooms.length; i++ ) {
		$('#gamerooms').append($('<li>').text(rooms[i]));
	}
});

socket.on('members ready in room', function(readyMembers) {
	console.log("members ready:");
	console.log(readyMembers);
	$("#room-members-ready").empty();
	for (var i = 0 ; i < readyMembers.length; i++ ) {
		$('#room-members-ready').append($('<li>').text(readyMembers[i]+' ready'));
	}
});

socket.on('lobby member disconnected', function(disconnectedID){
	console.log('DISCONNECTED FROM LOBBY');
	$('#lobby-messages').append($('<li>').text(disconnectedID + " left the lobby"));

});

socket.on('room member disconnected', function(disconnectedID){
	console.log('DISCONNECTED FROM ROOM');
	$('#room-messages').append($('<li>').text(disconnectedID + " left the room"));
});

function birdUpdates(state){

}

var socketGame;
socket.on('gamePort', function(portNum) {
	console.log("Trying to connect to game port: " + portNum);
	socketGame = io.connect('http://localhost:' + portNum);
	
	socketGame.on('message', function(message) {
		console.log("Message from game.js: " + message);
		isBoss = message.youRBoss;
	});

	socketGame.on('update', function(message){
		// update the game state
	});

	socketGame.on('start', function(message){
		console.log('game started');
		birds = message.players;
		$("#game").show();
		// Add main state to game
		game.state.add('main', mainState);
		game.state.start('main');
	});
});
		
