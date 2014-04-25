/*global floppy,manager*/
var floppy2048 = (function() {
	var opts = {
		start_lives: 3,
		mode: 'normal'
	};

	var states = {
		lives: opts.start_lives
	};

	var $document = $(document);
	var $lives = $('.lives-container');


	function _now() { return new Date().getTime(); }
	function throttle(func, wait, options) {
		var context, args, result;
		var timeout = null;
		var previous = 0;
		options || (options = {});
		var later = function() {
			previous = options.leading === false ? 0 : _now();
			timeout = null;
			result = func.apply(context, args);
			context = args = null;
		};
		return function() {
			var now = _now();
			if (!previous && options.leading === false) previous = now;
			var remaining = wait - (now - previous);
			context = this;
			args = arguments;
			if (remaining <= 0) {
				clearTimeout(timeout);
				timeout = null;
				previous = now;
				result = func.apply(context, args);
				context = args = null;
			} else if (!timeout && options.trailing !== false) {
				timeout = setTimeout(later, remaining);
			}
			return result;
		};
	}

	function screenClick() {
		floppy.screenClick();
	}

	function updateLives() { $lives.text(states.lives); }

	function removeLife() {
		if(--states.lives === 0) {
			floppy.playerDead();
		} else {
			floppy.soundHit.play();
		}
		updateLives();
	}

	function newGame() {
		if(states.lives === opts.start_lives) return;
		states.lives = opts.start_lives;
		updateLives();
		manager.restart();
		floppy.setDifficulty(opts.mode);
		floppy.replay();
	}


	floppy.on('collide', throttle(removeLife, 1000, {trailing: false}));


	//Handle mouse down OR touch start
	var clickEventStr = "ontouchstart" in window ? 'touchstart' : 'mousedown';
	$document.on(clickEventStr, screenClick);

	$('.restart-button').on('click', newGame);

	return {
		newGame: newGame
	};

})();
