$(document).ready(function() {
	// Hide game room div at the start
	$("#div-join").hide();
	$("#div-room").hide();
	$("#div-lobby").hide();
	$("#game").hide();
});
function username() {
	socket.emit('username', document.getElementById('username').value);
	$("#div-username").hide();
	$("#div-lobby").show();
	$("#div-join").show();
}
function join(){
	console.log('joining room');
	socket.emit('join room', { room:document.getElementById('room name').value });
	$("#div-join").hide();
	$("#div-lobby").hide();
	$("#div-room").show();
}
function ready() {
	socket.emit('ready game');
	$("#btn-ready").prop("disabled", true);
}
var socket = io();
var roomMembers = [];
socket.on('new comer', function(content){
	console.log(content.id+' has entered room');
	$('#lobby-messages').append($('<li>').text(content.id+' has entered the lobby'));
	
});
socket.on('new member', function(content) {
	$('#room-messages').append($('<li>').text(content.id+' has entered the room'));
	roomMembers.push(content.id);
});

socket.on('room members', function(message){
	console.log(message);
	$('#room-members').text(message); 
});

socket.on('lobby members', function(message){
	console.log(message);
	$('#lobby-members').text(message.members);
});

socket.on('gamerooms', function(message){
	console.log("game rooms:" + message);
	$("#gamerooms").empty();
	for (var i = 0 ; i < message.length; i++ ) {
		$('#gamerooms').append($('<li>').text(message[i]));
	}
});

socket.on('members ready', function(message) {
	console.log("members ready:");
	console.log(message);
	$("#room-members-ready").empty();
	for (var i = 0 ; i < message.length; i++ ) {
		$('#room-members-ready').append($('<li>').text(message[i]+' ready'));
	}
});

socket.on('disconnected', function(messages){
	console.log('DISCONNECTED ');
	$('#lobby-messages').text(messages.id + " disconnected");
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
		
