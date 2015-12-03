// http://blog.lessmilk.com/how-to-make-flappy-bird-in-html5-1/
// Create new game
var game = new Phaser.Game(790, 550, Phaser.AUTO, 'game');
var DEBUG = false;

// Create main state
var mainState = {

	preload: function() {
		// Set background
		game.stage.backgroundColor = '#71c5cf';
		
		// Load game assets
		game.load.image('bird', 'assets/bird.png');
		game.load.image('pipe', 'assets/pipe.png');
		game.load.audio('jump', 'assets/jump.wav');
		game.load.audio('death', 'assets/death.wav');
		game.load.audio('zoom', 'assets/zoom.wav');

		game.stage.disableVisibilityChange = true;
	},

	create: function() {
		var count = 1;
		// Set up the physics system
		game.physics.startSystem(Phaser.Physics.ARCADE);

		// Display bird
		for(id in this.birds){
			this.birds[id] = this.game.add.sprite(100, 245, 'bird');	
			this.birds[id].tint = this.playerColours[id];

			// Add gravity to bird
			game.physics.arcade.enable(this.birds[id]);
			if(DEBUG){
				this.birds[id].body.gravity.y = 10;
			}
			else{
				this.birds[id].body.gravity.y = 1000;
			}

			// Set start position
			this.birds[id].y += count;
			count += 50;

			// Set anchor so that its animation rotates how we want
			this.birds[id].anchor.setTo(-0.2, 0.5);	

			// console.log("In game state, checking id: " + this.myID + " vs " + id);

			if(this.myID == id){
				this.bird = this.birds[id];
			}
		}		

		// Key binding for jumping and dancing
		var spaceKey = this.game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
		spaceKey.onDown.add(this.jump, this);

		var leftKey = this.game.input.keyboard.addKey(Phaser.Keyboard.LEFT);
		var rightKey = this.game.input.keyboard.addKey(Phaser.Keyboard.RIGHT);
		leftKey.onDown.add(this.left, this);
		rightKey.onDown.add(this.right, this);

		// Bind jumping sound to a variable
		this.jumpSound = game.add.audio('jump');

		// Create a group of pipes, add physics
		this.pipes = this.game.add.group();
		this.pipes.enableBody = true;
		this.pipes.createMultiple(50, 'pipe');

		// Create a timer for the pipes
		this.timer = game.time.events.loop(1500, this.addRowOfPipes, this);

		// score
		this.score = 0;
		this.labelScore = game.add.text(20,20,"0", {font:"30px Arial", fill:"#ffffff"});

		
	},

	update: function() {
		// This gets called 60 times per second


		// Rotate bird over time
		for (var bird in this.birds) {
			if (this.birds[bird].angle < 20) {
				this.birds[bird].angle += 1;
			}
		}

		// Restart game if bird falls out of the screen
		if (this.bird.inWorld == false) this.crippleBird();

		if (this.isBoss) {
			// Do collision detection
			if(!DEBUG) {
				for (var id in this.birds) {
					var bird = this.birds[id];
					game.physics.arcade.overlap(bird, this.pipes, this.hitPipe(bird), null, this);
					for (var idOther in this.birds) {
						if (id != idOther) {
							game.physics.arcade.overlap(this.birds[id], this.birds[idOther], this.hitBird(this.birds[idOther]), null, this);
						}
					}
				}
			}

			birdUpdates();
		}

		var alive = false;
		for (var b in this.birds){
			alive |= this.birds[b].alive;
		}
		if(!alive){	// nobody's alive
			// console.log("Nobody's alive");
			// Stop pipes from appearing
			game.time.events.remove(this.timer);

			// Go through all pipes and stop their movement
			this.pipes.forEachAlive(function(p) {
				p.body.velocity.x = 0;
			}, this);	
		}
	},

	crippleBird: function() {
		if(this.bird.alive){ // this check is necessary so that the sound doesn't play many times, which is incredibly painful. do not make my mistakes.
			var death = game.add.audio('death');
			death.play();
		}
		this.bird.alive = false;
	},

	jump: function() {
		if (this.bird.alive == false) {
			return;
		}

		this.jumpSound.play();

		this.bird.body.velocity.y = -350;

		// Create animation
		var animation = game.add.tween(this.bird);
		// Change angle of sprite to -20 degrees in 100 ms
		animation.to({angle:-20}, 100);
		animation.start();

		if(!this.isBoss){
			// console.log("pleb jumping");
			gameSocket[0].emit('player action', 'jump', myUsername);
		}
	},

	left: function(){
		var zoom = game.add.audio('zoom');
		zoom.play();
		if (this.bird.alive == false) {
			return;
		}
		this.bird.x -= 50;
		if(!this.isBoss){
			// console.log("pleb lefting");
			gameSocket[0].emit('player action', 'left', myUsername);
		}
	},

	right: function(){
		var zoom = game.add.audio('zoom');
		zoom.play();
		if (this.bird.alive == false) {
			return;
		}
		this.bird.x += 50;
		if(!this.isBoss){
			// console.log("pleb righting");
			gameSocket[0].emit('player action', 'right', myUsername);
		}
	},

	otherBirdJump: function(id){
		if (this.birds[id].alive == false) {
			return;
		}

		this.jumpSound.play();

		this.birds[id].body.velocity.y = -350;

		// Create animation
		var animation = game.add.tween(this.birds[id]);
		// Change angle of sprite to -20 degrees in 100 ms
		animation.to({angle:-20}, 100);
		animation.start();

		// console.log("other bird jumping");
	},

	otherBirdLeft: function(id){
		if (this.birds[id].alive == false) {
			return;
		}
		this.birds[id].x -= 50;
	},

	otherBirdRight: function(id){
		if (this.birds[id].alive == false) {
			return;
		}
		this.birds[id].x += 50;
	},
	restartGame: function() {
		game.state.start('main');
	},

	addOnePipe: function(x, y) {
		// Grab a pipe 
		var pipe = this.pipes.getFirstDead();
		pipe.reset(x, y);
		pipe.body.velocity.x = -200;

		// Kill the pipe when it's no longer visible
		pipe.checkWorldBounds = true;
		pipe.outOfBoundsKill = true;
	},

	addPipes: function(hole){
		if(this.pipes){
			// Add 6 pipes
			for (var i=0; i<10; i++) {
				if (i != hole && i != hole + 1 && i != hole + 2) {
					this.addOnePipe(790, i*60+10);
				}
			}
		}
	},

	addRowOfPipes: function() {
		if(this.isBoss){
			// random should only be performed on the master 
			// Create a gap to fly through
			var hole = Math.floor(Math.random() * 5) + 1;
			gameSocket[0].emit('hole', hole);
			// Increase score
			this.score += 1;
			this.labelScore.text = this.score;
			gameSocket[0].emit('score', this.score);
			this.addPipes(hole);
		}
		


	},

	hitPipe: function(bird) {
		return function(){
			if (bird.alive == false) {
				return;
			}
			bird.alive = false;
			if (bird == this.bird){
				var death = game.add.audio('death');
				death.play();
			}
		};
	},

	hitBird: function(otherBird) {
		// console.log("Bird collision!");
		return function() {
			if (this.bird.y > otherBird.y) {
				otherBird.body.velocity.y -= 30;
				this.bird.body.velocity.y += 50;
			} else {
				otherBird.body.velocity.y += 50;
				this.bird.body.velocity.y -= 30;
			}
		}
	}

};
