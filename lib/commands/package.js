var string = require('../string'),
shell = require('../shell'),
logWatcher = require('../helper').logWatcher,
fs = require('fs'),
PROFILES_DIR = process.env['HOME'] + '/Library/MobileDevice/Provisioning Profiles/';

function help () {
	// print any additional arguments
	console.log([
		"Command options:".bold.yellow,
		"",
		"  " + string.rpad("--ios|android", 20) + "Packages app for iOS / Android".grey,
		"",
		"  Optional (iOS):\n".bold,
		"  " + string.rpad("--universal|ipad", 20) + "Universal / iPad only buil".grey
	].join("\n"));
	
	console.log();
}

function execute (argv, cfg, tiapp, py) {
	if (argv.ios) {
		var l;

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

			// identities to code sign
			shell.command('security', ['find-identity', '-p', 'codesigning', '-v'], true, function (error, output) {
				if (error) {
					console.log(output.red);
					process.exit();
				}

				var identities = [], selectedIdentity,
				profiles = [], selectedProfile;

				var lines = output.split('\n'),
				line, quoteIndex;			

				console.log('\nPlease, type the number of an identity:'.yellow);
				l = lines.length - 1;
				while (l--) {
					line = lines[l];
					quoteIndex = line.indexOf('"')

					if (quoteIndex < 0) {
						continue;
					}
					
					line = line.substring(quoteIndex + 1, line.indexOf('"', quoteIndex + 1));
					console.log('[' + (identities.length) + '] ' + line);
					
					identities.push(line);
				}
				if (identities.length === 0) {
					console.log('No identities found!\n'.error);
					process.exit(0);
				}

				// ask for idenity
				process.stdin.resume();
				process.stdin.setEncoding('utf8');

				var step = 0;
				function waitInput (value) {
					var v = parseInt(value);
					
					if (step === 0) {
						if (typeof v === 'number' && v < identities.length && v >= 0) {
							selectedIdentity = identities[v];

							// now it's time to selecte the mobile provisioning profile
							fs.readdir(PROFILES_DIR, function (err, files) {
								if (err !== null) {
									console.log('Error searching for provisioning profiles'.red);
									console.log(err);
									process.exit();
									return;
								}

								var xml, nameIndex;

								console.log('\nNow type the number of the provisioning profile you want to embed:'.yellow);
								l = files.length - 1;
								while (l--)	{
									xml = fs.readFileSync(PROFILES_DIR + files[l], 'utf8');
									xml = xml.substring(xml.indexOf('<?xml'), xml.indexOf('</plist>') + 8);
									nameIndex = xml.indexOf('<key>Name</key>');

									if (xml.indexOf(tiapp.id) > 0) {								
										console.log('[' + (profiles.length) + '] ' + xml.substring(xml.indexOf('<string>', nameIndex) + 8, xml.indexOf('</string>', nameIndex)));
										profiles.push(files[l].substring(0, files[l].indexOf('.')));
									}				
								}
								if (profiles.length === 0) {
									console.log('No profiles found!\n'.error);
									process.exit(0);
								}
								step = 1;
							});
						}
						else {
							console.log('Wrong number!'.red);
						}
					}
					else if (step === 1) {
						if (typeof v === 'number' && v < profiles.length && v >= 0) {
							selectedProfile = profiles[v];
							
							// stop asking for user input
							process.stdin.pause();

							var pwd =  process.cwd(),
							family = (argv.ipad ? 'ipad' : (argv.universal ? 'universal' : 'iphone'));

							// execute builder_clti
							shell.command(py, ['distribute', sdk, pwd, tiapp.id, tiapp.name, selectedProfile, selectedIdentity, family], false, logWatcher, function (code) {
								if (code !== 0) {
									console.log('Something went wrong'.red);
								}
							});
						}
						else {
							console.log('Wrong number!'.red);
						}
					} 
				} // end of waitInput
				process.stdin.on('data', waitInput);
			}); // end of security
		}); // end xcodebuild -showsdks		
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