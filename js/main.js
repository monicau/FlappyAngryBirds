var MAX_LENGTH_OF_LOG = 10;
var LOCALHOST = 'localhost:';
var OTHERIP = '159.203.5.238:';

var bird_divs;
var player_selection;

$(document).ready(function() {
	// Hide game room div at the start
	$("#invalid-username-alert").hide();
	$("#div-room").hide();
	$("#div-lobby").hide();
	$("#div-game").hide();
	$("#btn-ready").prop("disabled", false);
	$("#btn-leave-game").prop("disabled", true);

	/* Player selection */
	bird_divs = [ $("#player_1"), $("#player_2"), $("#player_3") ];
	bird_radiobuttons = [ $("#radio_1"), $("#radio_2"), $("#radio_3")];
	player_selection = 0;
	bird_divs[1].hide();
	bird_divs[2].hide();

});

function nextPlayer() {
	bird_divs[player_selection].hide();
	player_selection = (player_selection + 1) % 3;
	bird_divs[player_selection].show();
}

function previousPlayer() {
	bird_divs[player_selection].hide();
	player_selection = (player_selection + 2) % 3;
	console.log("next player to display: " + player_selection);
	bird_divs[player_selection].show();
}

function newUser() {
	var message = {};
	message.username = document.getElementById('username').value;
	message.player_selection = player_selection;

	socket.emit('new user', message);
}
function joinRoom(){
	console.log('joining room');
	socket.emit('join room', document.getElementById('room name').value);
	$("#div-lobby").hide();
	$("#div-room").show();
	$("#btn-ready").prop("disabled", false);
}
function lobbyChat() {
	socket.emit('lobby chat message', document.getElementById('lobby_chat').value);
	// Clear message from input field
	$("#lobby_chat").val("");
}
function readyUp() {
	socket.emit('ready for game');
	$("#btn-ready").prop("disabled", true);
}

function leaveRoom(){
	socket.emit('returned to lobby', myUsername);
	$("#div-room").hide();
	$("#div-game").hide();
	$("#div-lobby").show();
}

var socket = io();
var roomMembers = [];
var last_state_sent_time = new Date().getTime();
var threshold = 20;
var birds = [];
var myUsername;

socket.on('username invalid', function(){
	$("#invalid-username-alert").show();
});

socket.on('username valid', function(username){
	socket.emit('request rooms');
	$("#div-username").hide();
	$("#invalid-username-alert").hide();
	$("#div-welcome").hide();
	$("#div-lobby").show();
	myUsername = username;
	console.log("username valid: " + username);
});

socket.on('new lobby member', function(username){
	console.log(username + ' has entered room');
	var messages = $('#lobby-messages');
	if($("#lobby-messages li").length >= MAX_LENGTH_OF_LOG){
		messages.children()[0].remove();
	}
	messages.append($('<li><center><em>' + username + ' entered the lobby</em></center></li>'));
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

socket.on('new lobby chat message', function(message) {
	$('#lobby-messages').append($("<li><b>" + message.user + ":</b> " + message.chatmessage + "</li>"));
	$("#lobby_chatbox").animate({ scrollTop: $("#lobby_chatbox")[0].scrollHeight}, 1000);
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
	$('#lobby-messages').append($('<li><center><em>' + disconnectedID + ' left the lobby</em></center></li>'));
});

socket.on('room member disconnected', function(disconnectedID){
	console.log('DISCONNECTED FROM ROOM');
	$('#room-messages').append($('<li>').text(disconnectedID + " left the room"));
});

var gameSocket = [0];
socket.on('gamePort', function(portNum) {
	console.log("Trying to connect to game port: " + portNum);
	var socketGame = io.connect(OTHERIP + portNum);
	gameSocket[0] = socketGame;
	socketGame.on('update', function(playerMap){
		// update the game state from the master client
		for (var bird in mainState.birds){
			mainState.birds[bird].x = playerMap[bird].x;
			mainState.birds[bird].y = playerMap[bird].y;
			// console.log("bird from message " + bird + ": " + playerMap[bird].angles[bird] );
			if(bird != myUsername) mainState.birds[bird].angle = playerMap[bird].angles;
			// console.log("bird from game playerMap[bird]" + bird + " : " + mainState.birds[bird]);
			mainState.birds[bird].alive = playerMap[bird].alive;
			if(mainState.birds[bird].body)  mainState.birds[bird].body.velocity.y = playerMap[bird].velocity;
		}
	});

	socketGame.on('start', function(players, bossUsername, birdsChosen){
		console.log('game started');
		console.log("Players: " + players);
		console.log("Birds: " + birdsChosen);
		mainState.usernames = players;
		mainState.isBoss = bossUsername == myUsername;
		mainState.birdType = birdsChosen;
		if(mainState.isBoss) {
			// console.log("I AM THE BOSS");
		}
		else {
			console.log("I pleb");
		}
		console.log("start => "+ mainState.usernames);
		$("#div-game").show();
		$("#div-colorbox").show();
		// Add main state to game
		window.setTimeout(startGame, 1000);
		$("#div-room").hide();

	});

	socketGame.on('gameEnded', function(){
		$("#div-room").show();
	});

	socketGame.on('pleb action', function(action, username){
		// console.log("received pleb action");
		if(mainState.isBoss){
			// console.log("is boss and received pleb action " + action + " username " + username);
			if(action == 'jump'){
				mainState.otherBirdJump(username);
			}
			else if(action == 'right'){
				mainState.otherBirdRight(username);
			}
			else if(action == 'left'){
				mainState.otherBirdLeft(username);
			}
		}
	});

	socketGame.on('create pipes', function(hole){
		mainState.addPipes(hole);
	});

	socketGame.on('update score', function(score){
		mainState.score = score;
		mainState.labelScore.text = score;
	});

	socketGame.on('high score', function(listMessages) {
		var message= listMessages[0];
		var lastHighScore = listMessages[1];
		var highlightScore = false;
		mainState.highScore.text = "SCOREBOARD \n\n";
		for (var i=0; i<message.length; i++) {
			if (message[i].score == lastHighScore.score && message[i].username == lastHighScore.user && !highlightScore) {
				mainState.highScore.text += "*** ";
				mainState.highScore.text += message[i].username + " . . . . . . . . . " + message[i].score;
				mainState.highScore.text += " *** ";
				highlightScore = true;
			} else {
				mainState.highScore.text += message[i].username + " . . . . . . . . . " + message[i].score + " ";
			}
			mainState.highScore.text += "\n";
		}
	});
});

function restartGame() {
	gameSocket[0].emit('restart', myUsername);
	$('#btn-restart-game').prop('disabled', true);
}
function startGame(){
	game.state.add('main', mainState);
	mainState.myID = myUsername;
	mainState.birds = {};
	for(var i = 0 ; i < mainState.usernames.length; i++){
		mainState.birds[mainState.usernames[i]] = {};
	}
	// console.log("Bird list => "+ JSON.stringify(mainState.birds));

	game.state.start('main');
}
function updateHighScore(username, score) {
	if (username.length > 0 && score > 0) {
		gameSocket[0].emit('submit highscore', [username, score]);
	}
	gameSocket[0].emit('get highscore', '');
}
setInterval(function(){
	if(gameSocket[0] && mainState.isBoss){
		// bird related data
		var playerMap = {};
		for (var bird in mainState.birds){
			playerMap[bird] = {};
			playerMap[bird].x = mainState.birds[bird].x;
			playerMap[bird].y = mainState.birds[bird].y;
			playerMap[bird].angles = mainState.birds[bird].angle;
			playerMap[bird].alive = mainState.birds[bird].alive;
			if(mainState.birds[bird].body) playerMap[bird].velocity = mainState.birds[bird].body.velocity.y;
		}
		gameSocket[0].emit('gameState', playerMap);
	}
}, threshold);

