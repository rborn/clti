var string = require('../string'),
shell = require('../shell');

function help () {
	// print any additional arguments
	console.log([
		"Command options:".bold.yellow,
		"",
		"  " + string.rpad("--ios|android", 15) + "Deploys app on an iOS / Android device (for iOS, it uses fruitstrap!)".grey,
		"",
		"  Optional:",
		//"  " + string.rpad("--debug", 15) + "Builds using debug configuration (only iOS)".grey,
		"  " + string.rpad("--universal", 15) + "As universal app (only iOS)".grey,
		"  " + string.rpad("--ipad", 15) + "As iPad app (only iOS)".grey
	].join("\n"));
	
	console.log();
}

function execute (argv, cfg, tiapp) {
	if (argv.ios || argv.ipad) {
		var pwd =  process.cwd(),
		target = tiapp.name + (argv.ipad ? '-iPad' : (argv.universal ? '-universal' : '')),
		configuration = 'Release';//argv.debug ? 'Debug' : 'Release';


		process.chdir(pwd + '/build/iphone');

		// clean
		console.log('Cleaning...'.yellow);
		shell.command('xcodebuild', ['-target', target, 'clean'], false, function (error, output) {
			if (error) {
				console.log(output.red);
				process.exit();
			}
			process.stdout.write(output);

		}, function () {
			// once cleaned, build
			console.log('Building...'.yellow);

			var minIosVer = !tiapp.ios ? '4.0' : (!tiapp.ios['min-ios-ver'] ? '4.0' : tiapp.ios['min-ios-ver']),
			archs = 'armv6 armv7 i386';
			if (parseFloat(minIosVer) <= 4.0) {
				archs = 'armv7 i386';
			}

			shell.command('xcodebuild', ['-target', target, '-configuration', configuration, '-sdk', 'iphoneos', '-arch', archs], false, function (error, output) {
				if (error) {
					console.log(output.red);
					process.exit();
				}
				process.stdout.write(output);
			}, function () {
				// once built, deploy
				console.log('Deploying...'.yellow);
				shell.command(__dirname + '/../../bin/fruitstrap', ['install', '--bundle=' + pwd + '/build/iphone/build/' + configuration + '-iphoneos/' + tiapp.name + '.app'], false, function (error, output) {
					if (error) {
						console.log(output.red);
						process.exit();
					}
					process.stdout.write(output);
				});
			});
		});
	}
	else if (argv.android) {
		console.log('Sorry! Not available. Please run command with clti py'.yellow);
	}
	else {
		help();
		return;
	}
}

module.exports.execute = execute;
module.exports.help = help;