var API = {},
currentColor = 'white',
colors = {
	error: 'red',
	warn: 'magenta',
	trace: 'green',
	debug: 'cyan',
	log: 'white',
	info: 'inverse',
	unknown: 'grey'
};

API.logWatcher = function (error, output) {
	if (error) {
		console.log(output.red);
		process.exit();
	}

	var lines = output.split('\n'), line;
	for (var i = 0, l = lines.length; i < l; i++) {
		line = lines[i];
		if (line.length === 0) {
			continue;
		}

		if (line.indexOf('[ERROR') === 0) {
			currentColor = colors.error;
		}
		else if (line.indexOf('[WARN') === 0) {
			currentColor = colors.warn;
		}
		else if (line.indexOf('[TRACE') === 0) {
			currentColor = colors.trace;
		}
		else if (line.indexOf('[DEBUG') === 0) {
			currentColor = colors.debug;
		}
		else if (line.indexOf('[LOG') === 0) {
			currentColor = colors.log;
		}
		else if (line.indexOf('[INFO') === 0) {
			currentColor = colors.info;
		}
		else {
			currentColor = colors.unknown;	
		}
		console.log(line[currentColor]);
	}	
};

API.logWatcherLogCat = function (error, output) {
	if (error) {
		console.log(output.red);
		process.exit();
	}

	var lines = output.split('\n'), line;
	for (var i = 0, l = lines.length; i < l; i++) {
		line = lines[i];
		if (line.length === 0) {
			continue;
		}

		if (line[0] === 'E') {
			currentColor = colors.error;
		}
		else if (line[0] === 'W') {
			currentColor = colors.warn;
		}
		else if (line[0] === 'T') {
			currentColor = colors.trace;
		}
		else if (line[0] === 'D') {
			currentColor = colors.debug;
		}
		else if (line[0] === 'L') {
			currentColor = colors.log;
		}
		else if (line[0] === 'I') {
			currentColor = colors.info;
		}
		else {
			currentColor = colors.unknown;	
		}
		console.log(line[currentColor]);
	}	
};

module.exports = API;