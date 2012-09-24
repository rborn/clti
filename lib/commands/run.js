var 
string = require('../string.js'),
shell = require('shelljs'),
spawn = require('child_process').spawn;

function help () {
	// print any additional arguments
	console.log([
		"Command options:".bold.yellow,
		"",
		"  " + string.rpad("--DEVICE", 15) + "DEVICE could be: ios / android".grey,
		"",
		"  When iOS you must specify device family:",
		"  --iphone|ipad",
		"",
		"  Optional:",
		"  " + string.rpad("-f", 15) + "Force clean build".grey,
		"  " + string.rpad("-x", 15) + "eXtreme and ExPERIMENTAL fast run. Needs a previous 'normal' run (only iOS)".grey,
		"  " + string.rpad("--sdk=X.Y[.Z]", 15) + "iOS SDK version (only iOS)".grey
	].join("\n"));
	
	console.log();
}


var startLog = false;

function logWatcher (data) {
	var str = data.toString('utf-8');

	if (!startLog) {
		if (str.indexOf('Application started') > 0) {
			startLog = true;
		}
		else {
			return;
		}
	}

	if (str.indexOf('Terminating in response to SpringBoard') >= 0) {
		process.exit(0);
	}

	var out = str.trim(data),
	error = out.indexOf('[ERROR]') === 0,
	debug = out.indexOf('[DEBUG]') === 0,
	info = out.indexOf('[INFO]') === 0,
	log = out.indexOf('[LOG]') === 0,
	color = error ? 'red' : (debug ? 'yellow' : (info ? 'magenta' : (log  ? 'cyan' : 'white')));

	console.log(out[color]);
}

function execute (argv, cfg, tiapp) {
	if (argv.ios && (argv.iphone || argv.ipad)) {
		shell.silent(true);

		var device = argv.iphone ? 'iphone' : 'ipad',
		// get a valid ios version
		ios = (function () {
			var lines = shell.exec('xcodebuild -showsdks').output.split('\n'),
			l = lines.length - 1, line, 
			token = '-sdk iphonesimulator', tokenIndex, 
			ffound = false, ios, major;
			
			while (l-- && !ffound) {
				if (line = lines[l], tokenIndex = line.indexOf(token), line.indexOf('\t') === 0 &&  tokenIndex > 0) {
					ios = line.substring(tokenIndex + token.length, line.length);					
					ffound = parseFloat(ios) === argv.sdk;
					major = major ? major : ios;
				}
			}
			if (!ffound && argv.sdk) {
				console.log('iOS SDK not found!'.red);
				process.exit(0);
			}

			ios = ffound ? ios : major;
			console.log(('Using iOS SDK ' + ios + '...').cyan);
			
			return ios;
		})()

		shell.silent(true);

		// experiments with waxsim
		if (argv.x) {
			var xcodePath = shell.exec('/usr/bin/xcode-select -print-path').output.replace('\n', ''),
			waxsim = spawn(__dirname + '/../../bin/waxsim', [process.cwd() + '/build/iphone/build/Debug-iphonesimulator/' + tiapp.name + '.app']);
			
			// focus simulator when exit
			waxsim.on('exit', function () {
				shell.exec('osascript -e \'' + string.escapeAppleScript('tell application "' + xcodePath + '/Platforms/iPhoneSimulator.platform/Developer/Applications/iPhone Simulator.app" to activate') + '\'');
			});
			
			// observe log file
			startLog = false;

			// log obverver
			var logfile = shell.exec('find ' + string.cliEscape('~/Library/Application Support/iPhone Simulator/' + ios+ '/Applications/') + ' -name ' + tiapp.guid + '.log').output,
			tail = spawn("tail", ["-f", logfile.substring(0, logfile.length - 1)]);
			tail.stdout.on('data', logWatcher);

			function killerQueen () {
				console.log('\nCleaning processes...'.cyan);
				tail.kill('SIGINT');

				// todo get the app PID and kill the process
				//var grep = shell.exec('ps -A | grep ' + tiapp.guid);
				//console.log(grep.output.red);
			}

			process.on('SIGUSR', killerQueen);
			process.on('SIGINT', killerQueen);
			process.on('SIGHUP', killerQueen);

			return;
		}
		
		shell.silent(false);

		if (argv.f) {
			console.log('Forcing rebuild...'.cyan);
			shell.exec('rm -rf build/iphone/*', {
				async: true,
			});
		}
		
		shell.silent(true);
		
		startLog = true;
		var sdk =  tiapp['sdk-version'] ? tiapp['sdk-version'] : cfg.sdk,
		cmd = shell.exec(string.cliEscape(cfg.ti) + '/mobilesdk/osx/' + sdk + '/iphone/builder.py run ' + process.cwd() + '/ ' + ios + ' ' + tiapp.id + ' \'' + tiapp.name + '\' ' + device, {
			async: true
		});
		cmd.stdout.on('data', logWatcher);
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