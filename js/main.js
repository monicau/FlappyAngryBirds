var MAX_LENGTH_OF_LOG = 10;

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
var last_state_sent_time = new Date().getTime();
var threshold = 500;
var birds = [];
var myUsername;

socket.on('username invalid', function(){
	$("#invalid-username-alert").show();
});

socket.on('username valid', function(username){
	$("#div-username").hide();
	$("#invalid-username-alert").hide();
	$("#div-lobby").show();
	$("#div-join").show();
	myUsername = username;
	console.log("username valid: " + username);
});

socket.on('new lobby member', function(username){
	console.log(username + ' has entered room');
	var messages = $('#lobby-messages');
	if($("#lobby-messages li").length >= MAX_LENGTH_OF_LOG){
		messages.children()[0].remove();
	}
	messages.append($('<li>').text(username + ' entered the lobby'));
});

socket.on('new room member', function(username) {
	var messages = $('#room-messages');
	if($("#room-messages li").length >= MAX_LENGTH_OF_LOG){
		messages.children()[0].remove();
	}
	messages.append($('<li>').text(username + ' entered the room'));
	roomMembers.push(username);
});

socket.on('room members', function(roomMembers){
	console.log(roomMembers);
	$('#room-members').empty();
	for (var i = 0 ; i < roomMembers.length; i++ ) {
		$('#room-members').append($('<li>').text(roomMembers[i]));
	}
});

socket.on('lobby members', function(members){
	console.log(members);
	$('#lobby-members').empty();
	for (var i = 0 ; i < members.length; i++ ) {
		$('#lobby-members').append($('<li>').text(members[i]));
	}
});

socket.on('gamerooms', function(rooms){
	console.log("game rooms:" + rooms);
	$("#gamerooms").empty();
	for (var i = 0 ; i < rooms.length; i++ ) {
		$('#gamerooms').append($('<li>').text(rooms[i]));
	}
});

socket.on('members ready in room', function(readyMembers) {
	console.log("members ready:" + readyMembers);
	$("#room-members-ready").empty();
	for (var i = 0 ; i < readyMembers.length; i++ ) {
		$('#room-members-ready').append($('<li>').text(readyMembers[i]));
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
	socketGame = io.connect('localhost:' + portNum);
	
	socketGame.on('update', function(state){
		console.log("Received new updated game");
		// update the game state from the master client
		mainState = state;
	});

	socketGame.on('start', function(players, bossUsername){
		console.log('game started');
		console.log("Players: " + players);
		mainState.usernames = players;
		mainState.isBoss = bossUsername == myUsername;
		if(mainState.isBoss) console.log("I AM THE BOSS");
		else {
			console.log("I pleb");
		}
		console.log("start => "+ mainState.usernames);
		$("#game").show();
		// Add main state to game
		window.setTimeout(startGame, 1000);
		$("#div-room").hide();
	});

	socketGame.on('gameEnded', function(){
		$("#div-room").show();
	});

	socketGame.on('pleb action', function(action, username){
		console.log("received pleb action");
		if(mainState.isBoss){
			console.log("is boss and received pleb action " + action + " username " + username);
			if(action == 'jump'){
				mainState.otherBirdJump(username);
			}
			else if(action == 'right'){
				mainState.otherBirdRight(username);
			}
			else if(action == 'left'){
				mainState.otherBirdLeft(username);
			}
			var current = new Date().getTime();
			if(current - last_state_sent_time > threshold){
				// send updates to clients
				// socketGame.emit('gameState', mainState);

				// send positions of {username : birds_position}
				// send positions of pipes
				last_state_sent_time = current;
			}
		}
	});

	function startGame(){
		game.state.add('main', mainState);
		mainState.myID = myUsername;
		mainState.birds = {};
		for(var i = 0 ; i < mainState.usernames.length; i++){
			mainState.birds[mainState.usernames[i]] = {};
		}
		console.log("Bird list => "+ JSON.stringify(mainState.birds));

		game.state.start('main');
	}
});
		
