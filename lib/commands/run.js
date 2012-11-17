var string = require('../string'),
shell = require('../shell'),
logWatcher = require('../helper').logWatcher,
logWatcherLogCat = require('../helper').logWatcherLogCat;

function help () {
	// print any additional arguments
	console.log([
		"Command options:".bold.yellow,
		"",
		"  " + string.rpad("--ios|android", 20) + "Run iOS simulator / Android emulator".grey,
		"",
		"  Optional (iOS):\n".bold,
		"  " + string.rpad("--universal|ipad", 20) + "Universal / iPad only build".grey,
		"  " + string.rpad("--sim=X.Y[.Z]", 20) + "Simulator device, could be: iphone, iphone4, iphone5, ipad or ipad3".grey,
		"  " + string.rpad("--sdksim=X.Y[.Z]", 20) + "Simulator iOS SDK (only iOS)".grey,
		"  " + string.rpad("--sdk=X.Y[.Z]", 20) + "iOS SDK (only iOS)".grey,
		"  " + string.rpad("-f", 20) + "Force clean build".grey
	].join("\n"));
	
	console.log();
}

function execute (argv, cfg, tiapp, py) {
	if (argv.ios) {
		
		function run () {
			var device = 'iPhone';
			if (argv.sim === 'iphone4') {
				device = 'iPhone (Retina 3.5-inch)';
			}
			else if (argv.sim === 'iphone5') {
				device = 'iPhone (Retina 4-inch)';
			}
			else if (argv.sim === 'ipad') {
				device = 'iPad';
			}
			else if (argv.sim === 'ipad3') {
				device = 'iPad (Retina)';
			}

			shell.command('xcodebuild', ['-showsdks'], true, function (error, output) {
				if (error) {
					console.log(output.red);
					process.exit();
				}

				// get installed iOS SDK and compare with user's arguments
				var sdkffound = typeof argv.sdk === 'undefined', sdksimffound = typeof argv.sdksim === 'undefined',
				sdk, sdksim, sdkmajor, 
				lines = output.split('\n'), l = lines.length - 1, line, lineSdk, 
				token = '-sdk iphonesimulator', tokenIndex;				
				while (l--) {
					line = lines[l];
					tokenIndex = line.indexOf(token);			

					if (line.indexOf('\t') === 0  &&  tokenIndex > 0) {
						lineSdk = line.substring(tokenIndex + token.length, line.length);

						if (!sdksimffound) {
							sdksimffound = lineSdk === argv.sdksim;
							if (sdksimffound) {
								sdksim = lineSdk;
							}
						}
						if (!sdkffound) {
							sdkffound = lineSdk === argv.sdk;
							if (sdkffound) {
								sdk = lineSdk;
							}
						}
						if (!sdkmajor) {
							sdkmajor = lineSdk;	
						}
						if (sdkffound && sdksimffound) {
							break;
						}
					}
				}

				// fired out if any of the sdk haven't been found
				if (!sdksimffound) {
					console.log('Simulator iOS SDK not found!'.red);
					process.exit();
				}
				if (!sdkffound) {
					console.log('iOS SDK not found!'.red);
					process.exit();
				}

				sdk = argv.sdk ? sdk : sdkmajor;
				sdksim = argv.sdksim ? sdksim : sdkmajor;

				// get XCode path
				var tail;
				shell.command('/usr/bin/xcode-select', ['-print-path'], true, function (error, output) {
					if (error) {
						console.log(output.red);
						process.exit();
					}
					
					var xcodePath = output.replace('\n', ''),
					pwd = process.cwd(),
					family = (argv.ipad ? 'ipad' : (argv.universal ? 'universal' : 'iphone'));

					// execute py
					shell.command(py, ['run', pwd, sdk, family], false, logWatcher, function (code) {
						if (code !== 0) {
							console.log('Something went wrong...'.red);
							process.exit();
						}

						// execute applescript to change device type
						shell.command('osascript', [__dirname + '/../../bin/set_device.scrpt', device], true, function (error, output) {
							if (error) {
								console.log(output.red);
								process.exit();
							}

							// execute waxim
							shell.command(__dirname + '/../../bin/waxsim', ['-s', sdksim, '-f', device.indexOf('iPad') === 0 ? 'ipad' : 'iphone', pwd + '/build/iphone/build/Debug-iphonesimulator/' + tiapp.name + '.app'], false, function (error, output) {
								if (error) {
									console.log(output.red);
									process.exit();
								}

								// get the PID from output
								var PID = output.indexOf('PID:') === 0 ? parseInt(output.substring(4, output.length)) : 0;

								// focus simulator when exit
								shell.osascript('tell application "' + xcodePath + '/Platforms/iPhoneSimulator.platform/Developer/Applications/iPhone Simulator.app" to activate', function (error, output) {
									if (error) {
										console.log(output.red);
										process.exit();
									}

									// find log file						
									shell.command('find', [process.env['HOME'] + '/Library/Application Support/iPhone Simulator/' + sdksim + '/Applications', '-name', tiapp.guid + '.log'], true, function (error, output) {
										if (error) {
											console.log(output.red);
											process.exit();
										}

										// kill dead tails, justin case
										shell.command('killall', ['-9', 'tail'], true, function () {

											// start logging
											tail = shell.command('tail', ['-f', output.replace('\n', '')], false, logWatcher);

											function killerQueen () {	
												if (PID > 0) {
													console.log('Killing app process...'.cyan);
													process.kill(PID);
												}
											}

											process.on('SIGUSR', killerQueen);
											process.on('SIGINT', killerQueen);
											process.on('SIGHUP', killerQueen);
										});										
									});
								});
							}, function () {
								if (tail) {
									console.log('Killing logger process...'.cyan);						
									tail.kill('SIGINT');
								}
								process.exit();
							}); // end of waxim
						}); // end osascript
					}); // end of builder_clti.py run
				}); // end of xcode-select
			}); // end of xcodebuild	
		} // end of run ()

		if (argv.f) {
			console.log('Cleaning...'.yellow);
			shell.command('rm', ['-rf', process.cwd() + '/build/iphone'], true, function (error, output) {
				if (error) {
					console.log(output.red);
					process.exit();
				}
				run();
			});
		}
		else {
			run();
		}
	}
	else if (argv.android) {
		function run () {
			// execute py
			shell.command(py + '/titanium.py', ['run', '--platform=android'], false, logWatcher, function (code) {
				if (code !== 0) {
					console.log('Something went wrong...'.red);
					process.exit();
				}

				shell.command('adb', ['logcat', 'dalvikvm:S', 'dalvikvm-heap:S', 'NativeCrypto:S', 'InputManagerService:S', 'Email:S', 'SntpClient:S', 'KeyCharacterMap:S', 'EventLogService:S', 'AndroidRuntime:S', 'PackageManager:S', 'installd:S'], false, logWatcherLogCat, function (code) {
					process.exit();
				});
			}); // end of titanium.py run
		} // end of run ()

		if (argv.f) {
			console.log('Cleaning...'.yellow);
			shell.command('rm', ['-rf', process.cwd() + '/build/android'], true, function (error, output) {
				if (error) {
					console.log(output.red);
					process.exit();
				}
				run();
			});
		}
		else {
			run();
		}
	}
	else {
		help();
		return;
	}
}

module.exports.execute = execute;
module.exports.help = help;