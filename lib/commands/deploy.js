var 
string = require('../string.js'),
spawn = require('child_process').spawn;

function help () {
	// print any additional arguments
	console.log([
		"Command options:".bold.yellow,
		"",
		"  " + string.rpad("--ios|android", 15) + "Deploys app on an iOS / Android device (for iOS, it uses fruitstrap!)".grey,
		"",
		"  Optional:",
		"  " + string.rpad("--debug", 15) + "Builds using debug configuration (only iOS)".grey,
		"  " + string.rpad("--universal", 15) + "As universal app (only iOS)".grey,
		"  " + string.rpad("--ipad", 15) + "As iPad app (only iOS)".grey
	].join("\n"));
	
	console.log();
}

function execute (argv, cfg, tiapp) {
	if (argv.ios || argv.ipad) {
		var 
		pwd =  process.cwd(),
		target = tiapp.name + (argv.ipad ? '-iPad' : (argv.universal ? '-universal' : '')),
		configuration = argv.debug ? 'Debug' : 'Release';

		process.chdir(pwd + '/build/iphone');

		console.log('Cleaning...'.yellow);
		spawn('xcodebuild', ['-target=' + target, 'clean']).on('exit', function (code) {
			console.log('Building...\n'.yellow);
			var build_cmd = spawn('xcodebuild', ['-target=' + target, '-configuration=' + configuration, '-sdk=iphoneos', '-arch="armv6 armv7"']),
			build_cmd_done = false, killed = false, error = false,
			fruitstrap_cmd;

			build_cmd.stdout.on('data', function (data) {
				console.log(data + '');
			});
			build_cmd.stderr.on('data', function (data) {
				error = true;
				console.log((data + '').red);
			});
			build_cmd.on('exit', function (code) {
				build_cmd_done = true;
				if (!error && !killed) {
					console.log('Deploying...\n'.yellow);

					fruitstrap_cmd = spawn(__dirname + '/../../bin/fruitstrap', ['install', '--bundle=' + pwd + '/build/iphone/build/' + configuration + '-iphoneos/' + tiapp.name + '.app'])
					fruitstrap_cmd.stdout.on('data', function (data) {
						console.log(data + '');
					});
					fruitstrap_cmd.stdout.on('error', function (data) {
						console.log((data + '').red);
					});
				}
			});

			function endCommands () {
				console.log('[User interrupted]\n'.bold.red);
				killed = true;
				if (build_cmd_done) {
					build_cmd.kill();
				}
				if (fruitstrap_cmd) {
					fruitstrap_cmd.kill();
				}					
			}
			process.on("uncaughtException", endCommands);
			process.on("SIGINT", endCommands);
			process.on("SIGTERM", endCommands);
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