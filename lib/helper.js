var API = {},
currentColor = 'white';

API.logWatcher = function (error, output) {
	if (error) {
		console.log(output.red);
		process.exit();
	}

	var lines = output.split('\n'), line;
	for (var i = 0, l = lines.length; i < l; i++) {
		line = lines[i];

		if (line.indexOf('ERROR') > 0) {
			currentColor = 'red';
		}
		else if (line.indexOf('WARN') > 0) {
			currentColor = 'red';
		}
		else if (line.indexOf('TRACE') > 0) {
			currentColor = 'white';
		}
		else if (line.indexOf('DEBUG') > 0) {
			currentColor = 'grey';
		}
		else if (line.indexOf('LOG') > 0) {
			currentColor = 'yellow';
		}
		else if (line.indexOf('INFO') > 0) {
			currentColor = 'yellow';
		}
		console.log(line[currentColor]);
	}	
};

module.exports = API;