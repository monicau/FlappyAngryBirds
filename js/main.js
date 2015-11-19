// http://blog.lessmilk.com/how-to-make-flappy-bird-in-html5-1/
// Create new game
var game = new Phaser.Game(500, 500, Phaser.AUTO, 'game');
var isBoss = false;

// Create main state
var mainState = {
	preload: function() {
		// Set background
		game.stage.backgroundColor = '#71c5cf';
		
		// Load game assets
		game.load.image('bird', 'assets/bird.png');
		game.load.image('pipe', 'assets/pipe.png');
		game.load.audio('jump', 'assets/jump.wav');
	},

	create: function() {
		// Set up the physics system
		game.physics.startSystem(Phaser.Physics.ARCADE);

		// Display bird
		this.bird = this.game.add.sprite(100, 245, 'bird');

		// Add gravity to bird
		game.physics.arcade.enable(this.bird);
		this.bird.body.gravity.y = 1000;

		// Set anchor so that its animation rotates how we want
		this.bird.anchor.setTo(-0.2, 0.5);

		// Key binding for jumping
		var spaceKey = this.game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
		spaceKey.onDown.add(this.jump, this);

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

		if (isBoss) {
			// Do collision detection

			
		}
	},

	update: function() {
		// This gets called 60 times per second


		// Rotate bird over time
		if (this.bird.angle < 20) {
			this.bird.angle += 1;
		}

		// Restart game if bird falls out of the screen
		if (this.bird.inWorld == false) this.restartGame();

		// Restart game if bird hits pipe
		game.physics.arcade.overlap(this.bird, this.pipes, this.hitPipe, null, this);
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
// Add main state to game
game.state.add('main', mainState);

