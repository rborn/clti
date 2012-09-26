var string = require('../string'),
shell = require('../shell'),
logWatcher = require('../helper').logWatcher;

function help () {
	// print any additional arguments
	console.log([
		"Command options:".bold.yellow,
		"",
		"  " + string.rpad("--ios|android", 20) + "Deploys app on an iOS / Android device".grey,
		"",
		"  Optional (iOS):\n".bold,
		"  " + string.rpad("--universal|ipad", 20) + "Universal / iPad only buil".grey,
		"  " + string.rpad("--debug", 20) + "Builds using debug configuration (only iOS)".grey
	].join("\n"));
	
	console.log();
}

function execute (argv, cfg, tiapp, py) {
	if (argv.ios) {

		shell.command('xcodebuild', ['-showsdks'], true, function (error, output) {
			if (error) {
				console.log(output.red);
				process.exit();
			}

			// get installed iOS SDK and compare with user's arguments
			var sdkffound = typeof argv.sdk === 'undefined',
			sdk, sdkmajor, 
			lines = output.split('\n'), l = lines.length - 1, line, lineSdk, 
			token = '-sdk iphoneos', tokenIndex;
			while (l--) {
				line = lines[l];
				tokenIndex = line.indexOf(token);			

				if (line.indexOf('\t') === 0  &&  tokenIndex > 0) {
					lineSdk = line.substring(tokenIndex + token.length, line.length);

					if (!sdkffound) {
						sdkffound = lineSdk === argv.sdk;
						if (sdkffound) {
							sdk = lineSdk;
						}
					}
					if (!sdkmajor) {
						sdkmajor = lineSdk;	
					}
					if (sdkffound) {
						break;
					}
				}
			}
			if (!sdkffound) {
				console.log('iOS SDK not found!'.red);
				process.exit();
			}
			sdk = argv.sdk ? sdk : sdkmajor;

			var pwd =  process.cwd(),
			family = (argv.ipad ? 'ipad' : (argv.universal ? 'universal' : 'iphone')),
			configuration = argv.debug ? 'Debug' : 'Release';

			// execute builder_clti
			shell.command(py, [argv.debug ? 'install' : 'adhoc', sdk, pwd, tiapp.id, tiapp.name, family], false, logWatcher, function (code) {
				if (code === 0) {
					console.log('Deploying...'.yellow);
					shell.command(__dirname + '/../../bin/fruitstrap', ['install', '--bundle=' + pwd + '/build/iphone/build/' + configuration + '-iphoneos/' + tiapp.name + '.app'], false, function (error, output) {
						if (error) {
							console.log(output.red);
							process.exit();
						}
						process.stdout.write(output);
					});
				}
				else {
					console.log('Something went wrong'.red);
				}
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