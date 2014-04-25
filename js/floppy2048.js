/*global floppy*/
var floppy2048 = (function() {
	var opts = {
		start_lives: 3
	};

	var states = {
		lives: 3
	};

	var $document = $(document);


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

	function removeLife() {
		if(--states.lives === 0) {
			floppy.playerDead();
		}
	}

	function newGame() {
		states.lives = opts.start_lives;
	}


	floppy.on('collide', throttle(removeLife, 1000, {trailing: false}));


	//Handle mouse down OR touch start
	var clickEventStr = "ontouchstart" in window ? 'touchstart' : 'mousedown';
	$document.on(clickEventStr, screenClick);

	return {
		newGame: newGame
	};

})();
