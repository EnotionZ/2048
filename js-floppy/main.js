/*global buzz*/
/*
   Copyright 2014 Nebez Briefkani
   floppybird - main.js

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
var floppy = (function(){
	var pub = {};
	var $pub = $(pub);

	var $playerBoundingBox = $('#playerbox');
	var $pipeBoundingBox = $('#pipebox');
	var $player = $('#player');
	var $flyArea = $('#flyarea');
	var $scoreboard = $('#scoreboard');
	var $splash = $("#splash");
	var $land = $('#land');
	var $ceiling = $('#ceiling');

	var landTop = $land.offset().top;

	var debugmode = false;

	var states = Object.freeze({
		SplashScreen: 0,
		GameScreen: 1,
		ScoreScreen: 2
	});

	var currentstate;

	var flyArea = $flyArea.height();
	var flyTop = $flyArea.offset().top;
	var playerWidth = 120;
	var playerHeight = 120;
	var gravity = 0.28;
	var velocity = 0;
	var position = 180;
	var rotation = 0;
	var jump = -6.8;

	var score = 0;

	var modes = {
		easy: 360,
		normal: 270,
		hard: 230
	};

	var pipeheight = modes.normal; // space between pipe opening
	var pipeVariance = 20;         // variance in pipe opening
	var pipeLoopTimer = 2300;      // timer it takes to generate another pipe
	var pipewidth = 52;
	var pipes = [];


	//sounds
	var volume = 30;
	var soundJump = new buzz.sound("assets/sounds/sfx_wing.ogg");
	var soundScore = new buzz.sound("assets/sounds/sfx_point.ogg");
	var soundHit = new buzz.sound("assets/sounds/sfx_hit.ogg");
	var soundDie = new buzz.sound("assets/sounds/sfx_die.ogg");
	var soundSwoosh = new buzz.sound("assets/sounds/sfx_swooshing.ogg");
	buzz.all().setVolume(volume);

	//loops
	var loopGameloop;
	var loopPipeloop;

	$(document).ready(function() {
		if(window.location.search === "?debug") debugmode = true;
		showSplash(); //start with the splash screen
	});


	function showSplash() {
		currentstate = states.SplashScreen;

		//set the defaults (again)
		velocity = 0;
		position = 180;
		rotation = 0;
		score = 0;

		//update the player in preparation for the next game
		$player.css({ y: 0, x: 0});
		updatePlayer($player);

		soundSwoosh.stop();
		soundSwoosh.play();

		//clear out all the pipes if there are any
		$(".pipe").remove();
		pipes = [];

		//make everything animated again
		$(".animated").css({
			'animation-play-state': 'running',
			'-webkit-animation-play-state': 'running'
		});

		//fade in the splash
		$splash.transition({ opacity: 1 }, 2000, 'ease');
	}

	function startGame() {
		currentstate = states.GameScreen;

		//fade out the splash
		$splash.stop().transition({ opacity: 0 }, 500, 'ease');

		if(debugmode) $(".boundingbox").show();

		//start up our loops
		var updaterate = 1000.0 / 60.0 ; //60 times a second
		loopGameloop = setInterval(gameloop, updaterate);
		loopPipeloop = setInterval(updatePipes, pipeLoopTimer);

		//jump from the start!
		playerJump();
	}

	function updatePlayer(player) {
		rotation = Math.min((velocity / 10) * 90, 90);
		$player.css({ rotate: rotation, top: position });
	}

	function gameloop() {
		//update the player speed/position
		velocity += gravity;
		position += velocity;

		//update the player
		updatePlayer($player);

		//create the bounding box
		var box = $player[0].getBoundingClientRect();

		var boxwidth = playerWidth;
		var boxheight = (playerHeight + box.height) / 2;
		var boxleft = (box.width - boxwidth)/2 + box.left;
		var boxtop = (box.height - boxheight)/2 + box.top;
		var boxright = boxleft + boxwidth;
		var boxbottom = boxtop + boxheight;

		//did we hit the ground?
		if(box.bottom >= landTop) {
			return $pub.trigger('collide');
		}

		//have they tried to escape through the ceiling? :o
		if(boxtop <= ($ceiling.offset().top + $ceiling.height())) position = 0;

		//we can't go any further without a pipe
		if(!pipes[0]) return;

		//determine the bounding box of the next pipes inner area
		var $nextpipe = pipes[0];
		var pipetop = flyTop + $nextpipe.data('top');
		var pipeleft = $nextpipe.offset().left - 2;
		var piperight = pipeleft + pipewidth;
		var pipebottom = pipetop + pipeheight;

		if(debugmode) {
			$playerBoundingBox.css({
				'left': boxleft,
				'top': boxtop,
				'height': boxheight,
				'width': boxwidth
			});
			$pipeBoundingBox.css({
				'left': pipeleft,
				'top': pipetop,
				'height': pipeheight,
				'width': pipewidth
			});
		}

		//have we gotten inside the pipe yet?
		if(boxright > pipeleft) {
			//we're within the pipe, have we passed between upper and lower pipes?
			if(boxtop > pipetop && boxbottom < pipebottom) {
				//yeah! we're within bounds

			} else {
				//no! we touched the pipe
				$pub.trigger('collide');
				return;
			}
		}


		//have we passed the imminent danger?
		if(boxleft > piperight) {
			//yes, remove it
			pipes.splice(0, 1);
			playerScore();
		}
	}

	//Handle space bar
	$(document).keydown(function(e){
		if(e.keyCode === 32) { //space bar!
			if(currentstate !== states.ScoreScreen) screenClick();
		}
	});

	function screenClick() {
		if(currentstate === states.GameScreen) {
			playerJump();
		} else if(currentstate === states.SplashScreen) {
			startGame();
		}
	}

	function playerJump() {
		velocity = jump;
		soundJump.stop();
		soundJump.play();
	}



	function playerDead(disableScore) {
		//stop animating everything!
		$(".animated").css('animation-play-state', 'paused');

		//drop the bird to the floor
		var playerbottom = $player.position().top + $player.width(); //we use width because he'll be rotated 90 deg
		var floor = flyArea;
		var movey = Math.max(0, floor - playerbottom);
		$player.transition({ y: movey + 'px', rotate: 90}, 1000, 'easeInOutCubic');

		//it's time to change states. as of now we're considered ScoreScreen to disable left click/flying
		currentstate = states.ScoreScreen;

		//destroy our gameloops
		clearInterval(loopGameloop);
		clearInterval(loopPipeloop);

		//mobile browsers don't support buzz bindOnce event
		var hasShownScoreScreen = false;
		if(!isIncompatible.any()) {
			//play the hit sound (then the dead sound) and then show score
			soundHit.play().bindOnce("ended", function() {
				soundDie.play().bindOnce("ended", function() {
					hasShownScoreScreen = true;
					if(!disableScore) showScore();
				});
			});
		}
		setTimeout(function() { if(!disableScore && !hasShownScoreScreen) showScore(); }, 2000);
	}

	function showScore() {
		//SWOOSH!
		soundSwoosh.stop();
		soundSwoosh.play();

		//show the scoreboard
		$scoreboard.css({ display: 'block', y: '40px', opacity: 0 });
		$scoreboard.transition({ y: '0px', opacity: 1}, 600, 'ease');
	}

	function replay() {
		//SWOOSH!
		soundSwoosh.stop();
		soundSwoosh.play();

		//fade out the scoreboard
		$scoreboard.transition({ y: '-40px', opacity: 0}, 1000, 'ease', function() {
			//when that's done, display us back to nothing
			$scoreboard.css("display", "none");

			//start the game over!
			showSplash();
		});
	}

	function playerScore() {
		score += 1;
		soundScore.stop();
		soundScore.play();
	}

	function addPipe() {
		//add a new pipe (top height + bottom height  + pipeheight == flyArea) and put it in our tracker
		var padding = pipeVariance;
		var constraint = flyArea - pipeheight - (padding * 2); //double padding (for top and bottom)
		var topheight = Math.floor((Math.random()*constraint) + padding); //add lower padding
		var bottomheight = (flyArea - pipeheight) - topheight;
		return $('<div class="pipe animated"><div class="pipe_upper" style="height: ' + topheight + 'px;"></div><div class="pipe_lower" style="height: ' + bottomheight + 'px;"></div></div>').data('top', topheight);
	}

	function updatePipes() {
		//Do any pipes need removal?
		$(".pipe").filter(function() { return $(this).position().left <= -100; }).remove();

		var newpipe = addPipe();
		$flyArea.append(newpipe);
		pipes.push(newpipe);
	}

	function setDifficulty(val) { pipeheight = modes[val]; }

	var isIncompatible = {
		Android: function() { return navigator.userAgent.match(/Android/i); },
		BlackBerry: function() { return navigator.userAgent.match(/BlackBerry/i); },
		iOS: function() { return navigator.userAgent.match(/iPhone|iPad|iPod/i); },
		Opera: function() { return navigator.userAgent.match(/Opera Mini/i); },
		Safari: function() { return (navigator.userAgent.match(/OS X.*Safari/) && ! navigator.userAgent.match(/Chrome/)); },
		Windows: function() { return navigator.userAgent.match(/IEMobile/i); },
		any: function() { return (isIncompatible.Android() || isIncompatible.BlackBerry() || isIncompatible.iOS() || isIncompatible.Opera() || isIncompatible.Safari() || isIncompatible.Windows()); }
	};


	pub.isPlaying = function() { return currentstate === states.GameScreen; };
	pub.playerDead = playerDead;
	pub.screenClick = screenClick;
	pub.replay = replay;
	pub.on = $pub.on.bind($pub);
	pub.soundHit = soundHit;
	pub.soundDie = soundDie;
	pub.setDifficulty = setDifficulty;

	return pub;
})();
