var 
string = require('../string.js'),
shell = require('shelljs');

function help () {
	// print any additional arguments
	console.log([
		"Command options:".bold.yellow,
		"",
		"  " + string.rpad("--ios|android", 15) + "Packages app for iOS / Android".grey
	].join("\n"));
	
	console.log();
}

function execute (argv, cfg, tiapp) {
	if (argv.ios) {
		shell.silent(false);
		var cmd = shell.exec(string.cliEscape(cfg.ti) + '/mobilesdk/osx/' + tiapp['sdk-version'] + '/iphone/prereq.py package', {
			async: true
		});
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