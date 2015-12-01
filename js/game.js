// http://blog.lessmilk.com/how-to-make-flappy-bird-in-html5-1/
// Create new game
var game = new Phaser.Game(500, 500, Phaser.AUTO, 'game');
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
		game.stage.disableVisibilityChange = true;
	},

	create: function() {
		// Set up the physics system
		game.physics.startSystem(Phaser.Physics.ARCADE);

		// Display bird
		for(id in this.birds){
			this.birds[id] = this.game.add.sprite(100, 245, 'bird');		

			// Add gravity to bird
			game.physics.arcade.enable(this.birds[id]);
			if(DEBUG){
				this.birds[id].body.gravity.y = 10;
			}
			else{
				this.birds[id].body.gravity.y = 1000;
			}


			// Set anchor so that its animation rotates how we want
			this.birds[id].anchor.setTo(-0.2, 0.5);	

			console.log("In game state, checking id: " + this.myID + " vs " + id);

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
		this.pipes.createMultiple(20, 'pipe');

		// Create a timer for the pipes
		this.timer = game.time.events.loop(1500, this.addRowOfPipes, this);

		// score
		this.score = 0;
		this.labelScore = game.add.text(20,20,"0", {font:"30px Arial", fill:"#ffffff"});

		
	},

	update: function() {
		// This gets called 60 times per second


		// Rotate bird over time
		if (this.bird.angle < 20) {
			this.bird.angle += 1;
		}

		// Restart game if bird falls out of the screen
		if (this.bird.inWorld == false) this.crippleBird();

		if (this.isBoss) {
			// Do collision detection
			if(!DEBUG) {
				for (id in this.birds) {
					var bird = this.birds[id];
					game.physics.arcade.overlap(bird, this.pipes, this.hitPipe, null, this);
				}
			}

			birdUpdates();
		}
	},

	crippleBird: function() {
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
			console.log("pleb jumping");
			gameSocket[0].emit('player action', 'jump', myUsername);
		}
	},

	left: function(){
		if (this.bird.alive == false) {
			return;
		}
		this.bird.x -= 50;
		if(!this.isBoss){
			console.log("pleb lefting");
			gameSocket[0].emit('player action', 'left', myUsername);
		}
	},

	right: function(){
		if (this.bird.alive == false) {
			return;
		}
		this.bird.x += 50;
		if(!this.isBoss){
			console.log("pleb righting");
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

		console.log("other bird jumping");
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

	addRowOfPipes: function() {
		// Create a gap to fly through
		var hole = Math.floor(Math.random() * 5) + 1;

		// Add 6 pipes
		for (var i=0; i<8; i++) {
			if (i != hole && i != hole + 1) {
				this.addOnePipe(500, i*60+10);
			}
		}

		// Increase score
		this.score += 1;
		this.labelScore.text = this.score;
	},

	hitPipe: function() {
		if (this.bird.alive == false) {
			return;
		}
		this.bird.alive = false;
		
		// Stop pipes from appearing
		game.time.events.remove(this.timer);

		// Go through all pipes and stop their movement
		this.pipes.forEachAlive(function(p) {
			p.body.velocity.x = 0;
		}, this);
	},

};
