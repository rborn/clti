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
		"  " + string.rpad("-f", 20) + "Force clean build".grey
	].join("\n"));
	
	console.log();
}

function execute (argv, cfg, tiapp) {
	if (argv.iphone) {
		shell.silent(false);
		
		if (argv.f) {
			console.log('Forcing rebuild...'.cyan);
			shell.exec('rm -rf build/iphone/*', {
				async: true,
			});
		}
		
		shell.silent(true);
		var cmd = shell.exec(string.cliEscape(cfg.ti) + '/mobilesdk/osx/' + tiapp['sdk-version'] + '/titanium.py run --platform=iphone', {
			async: true
		});
		cmd.stdout.on('data', function (data) {
			var out = string.trim(data),
			error = out.indexOf('[ERROR]') === 0,
			debug = out.indexOf('[DEBUG]') === 0,
			info = out.indexOf('[INFO]') === 0,
			log = out.indexOf('[LOG]') === 0,
			color = error ? 'red' : (debug ? 'yellow' : (info ? 'magenta' : (log  ? 'cyan' : 'white')));

			console.log(out[color]);
		});
	}
	else if (argv.android) {
		shell.silent(false);

		if (argv.f) {
			console.log('Forcing rebuild...'.cyan);
			shell.exec('rm -rf build/android/*', {
				async: true,
			});
		}
		
		shell.exec(string.cliEscape(cfg.ti) + '/mobilesdk/osx/' + tiapp['sdk-version'] + '/titanium.py run --platform=android', {
			async: false
		});
	}
	else {
		help();
		return;
	}
}

module.exports.execute = execute;
module.exports.help = help;