var string = require('../string.js'),
shell = require('../shell');

function help () {
	// print any additional arguments
	console.log([
		"Command options:".bold.yellow,
		"",
		"  " + string.rpad("--DEVICE", 15) + "DEVICE could be: ios / android".grey,
		"",
		"  When iOS you must specify device family:",
		"  --iphone|iphone4|iphone5|ipad|ipad3",
		"",
		"  Optional:",
		"  " + string.rpad("-f", 15) + "Force clean build".grey,
		"  " + string.rpad("-x", 15) + "eXtreme and ExPERIMENTAL fast run. Needs a previous 'normal' run (only iOS)".grey,
		"  " + string.rpad("--sdk=X.Y[.Z]", 15) + "iOS SDK version (only iOS)".grey
	].join("\n"));
	
	console.log();
}


var currentColor = 'white';

function logWatcher (error, output) {
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
		else if (line.indexOf('LOG') > 0) {
			currentColor = 'yellow';
		}
		else if (line.indexOf('DEBUG') > 0) {
			currentColor = 'grey';
		}
		else if (line.indexOf('INFO') > 0) {
			currentColor = 'white';
		}
		else if (line.indexOf('TRACE') > 0) {
			currentColor = 'grey';
		}
		console.log(line[currentColor]);
	}	
}

function execute (argv, cfg, tiapp) {
	if (argv.ios && (argv.iphone || argv.iphone4 || argv.iphone5 || argv.ipad || argv.ipad3)) {
		
		function run () {
			var family = argv.iphone || argv.iphone4 || argv.iphone5 ? 'iphone' : 'ipad',
			device = (function () {
				var device;
				if (argv.iphone) {
					device = 'iPhone';
				}
				else if (argv.iphone4) {
					device = 'iPhone (Retina 3.5-inch)';
				}
				else if (argv.iphone5) {
					device = 'iPhone (Retina 4-inch)';
				}
				else if (argv.ipad) {
					device = 'iPad';
				}
				else if (argv.ipad3) {
					device = 'iPad (Retina)';
				}
				else {
					device = 'iPhone';
				}
				return device;
			})();

			shell.command('xcodebuild', ['-showsdks'], true, function (error, output) {
				if (error) {
					console.log(output.red);
					process.exit();
				}

				// getting the iOS SDK
				var ios,
				lines = output.split('\n'),
				l = lines.length - 1, line, 
				token = '-sdk iphonesimulator', tokenIndex, 
				ffound = false, major;
				
				while (l-- && !ffound) {
					if (line = lines[l], tokenIndex = line.indexOf(token), line.indexOf('\t') === 0 &&  tokenIndex > 0) {
						ios = line.substring(tokenIndex + token.length, line.length);					
						ffound = parseFloat(ios) === argv.sdk;
						major = major ? major : ios;
					}
				}
				if (!ffound && argv.sdk) {
					console.log('iOS SDK not found!'.red);
					process.exit();
				}

				ios = ffound ? ios : major;
				console.log(('Using iOS SDK ' + ios + '...').cyan);

				// get XCode path
				var tail;
				shell.command('/usr/bin/xcode-select', ['-print-path'], true, function (error, output) {
					if (error) {
						console.log(output.red);
						process.exit();
					}
					var xcodePath = output.replace('\n', '');

					// copy fake py without simulator stuff
					var py = cfg.ti + '/mobilesdk/osx/' + cfg.sdk + '/iphone/builder_clti.py';
					shell.command('cp', [__dirname + '/../../bin/builder.py', py], true, function (error, output) {
						if (error) {
							console.log(output.red);
							process.exit();
						}
						
						// execute old Ti stuff 
						shell.command(py, ['run', process.cwd()], false, logWatcher, function (error, output) {
							if (error) {
								console.log(output.red);
								process.exit();
							}

							shell.command('osascript', [__dirname + '/../../bin/set_device.scrpt', device], true, function (error, output) {
								if (error) {
									console.log(output.red);
									process.exit();
								}

								// execute waxim						
								shell.command(__dirname + '/../../bin/waxsim', ['-f', family, process.cwd() + '/build/iphone/build/Debug-iphonesimulator/' + tiapp.name + '.app'], false, function (error, output) {
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
										shell.command('find', [process.env['HOME'] + '/Library/Application Support/iPhone Simulator/' + ios + '/Applications', '-name', tiapp.guid + '.log'], true, function (error, output) {
											if (error) {
												console.log(output.red);
												process.exit();
											}

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
								}, function () {
									if (tail) {
										console.log('Killing logger process...'.cyan);						
										tail.kill('SIGINT');
									}
									process.exit();
								}); // end of waxim
							}); // end osascript
						}); // end of builder_clti.py run
					}); // end of cp builder_clti.py
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
		console.log('Sorry! Not available. Please run command with clti py'.yellow);
	}
	else {
		help();
		return;
	}
}

module.exports.execute = execute;
module.exports.help = help;