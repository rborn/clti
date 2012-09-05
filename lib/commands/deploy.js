var 
string = require('../string.js'),
shell = require('shelljs');

function help () {
	// print any additional arguments
	console.log([
		"Command options:".bold.yellow,
		"",
		"  " + string.rpad("--iphone|android", 20) + "iPhone / Android".grey,
		"",
		"  Optional:",
		"  " + string.rpad("-f", 20) + "Fast and **EXPERIMENTAL** deploy using fruitstrap (only iOS)".grey
	].join("\n"));
	
	console.log();
}

function execute (argv, cfg, tiapp) {
	if (argv.iphone) {
		if (argv.f) {
			shell.silent(false);
			shell.exec(__dirname + '/../../bin/fruitstrap list-devices', {
				async: true
			});
		}
		else {
		}
	}
	else if (argv.android) {
	}
	else {
		help();
		return;
	}
}

module.exports.execute = execute;
module.exports.help = help;