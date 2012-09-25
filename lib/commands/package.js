var string = require('../string'),
shell = require('../shell'),
fs = require('fs'),
PROFILES_DIR = process.env['HOME'] + '/Library/MobileDevice/Provisioning Profiles/';

function help () {
	// print any additional arguments
	console.log([
		"Command options:".bold.yellow,
		"",
		"  " + string.rpad("--ios|android", 15) + "Packages app for iOS / Android".grey,
		"  " + string.rpad("--universal", 15) + "As universal app (only iOS)".grey,
		"  " + string.rpad("--ipad", 15) + "As iPad app (only iOS)".grey
	].join("\n"));
	
	console.log();
}

function execute (argv, cfg, tiapp) {
	if (argv.ios) {
		var l, v;
		
		// identities to code sign
		shell.command('security', ['find-identity', '-p', 'codesigning', '-v'], true, function (error, output) {
			if (error) {
				console.log(output.red);
				process.exit();
			}

			var lines = output.split('\n'),			
			line, quoteIndex,
			identities = [];

			console.log('Please, type the number of an identity:'.yellow);
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

			// wait for the option
			process.stdin.resume();
			process.stdin.setEncoding('utf8');
			process.stdin.once('data', function (value) {
				v = parseInt(value);
				
				if (typeof v === 'number' && v < identities.length && v >= 0) {
					var identity = identities[v];

					// now it's time to selecte the mobile provisioning profile
					fs.readdir(PROFILES_DIR, function (err, files) {
						if (err !== null) {
							console.log('Error searching for provisioning profiles'.red);
							console.log(err);
							process.exit(2);
							return;
						}

						var profiles = [], 
						xml, nameIndex;

						console.log('\nNow type the number of the provisioning profile you want to embed:'.yellow);
						l = files.length - 1;
						while (l--)	{
							xml = fs.readFileSync(PROFILES_DIR + files[l], 'utf8');
							xml = xml.substring(xml.indexOf('<?xml'), xml.indexOf('</plist>') + 8);
							nameIndex = xml.indexOf('<key>Name</key>');

							if (xml.indexOf(tiapp.id) > 0) {								
								console.log('[' + (profiles.length) + '] ' + xml.substring(xml.indexOf('<string>', nameIndex) + 8, xml.indexOf('</string>', nameIndex)));
								profiles.push(files[l]);
							}				
						}
						if (profiles.length === 0) {
							console.log('No profiles found!\n'.error);
							process.exit(0);
						}

						process.stdin.resume();
						process.stdin.setEncoding('utf8');
						process.stdin.once('data', function (value) {
							v = parseInt(value);
							
							if (typeof v === 'number' && v < profiles.length && v >= 0) {
								var pwd =  process.cwd(),
								target = tiapp.name + (argv.ipad ? '-iPad' : (argv.universal ? '-universal' : ''));

								process.chdir(pwd + '/build/iphone');

								// clean
								console.log('\nCleaning...'.yellow);
								shell.command('xcodebuild', ['-target', target, 'clean'], false, function (error, output) {
									if (error) {
										console.log(output.red);
										process.exit();
									}
									process.stdout.write(output);

								}, function () {
									console.log('Building...\n'.yellow);

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
										console.log('Signing...\n'.yellow);
										
										var anyError = false;
										shell.command('/usr/bin/xcrun', ['-sdk', 'iphoneos', 'PackageApplication', '-v', pwd + '/build/iphone/build/Release-iphoneos/' + tiapp.name + '.app', '-o', pwd + '/' + tiapp.name + '.ipa', '--sign', identity, '--embed', PROFILES_DIR + profiles[v]], false, function (error, output) {
											if (error) {
												anyError = error;
												console.log(output.red);												
											}
											else {
												process.stdout.write(output);
											}											
										}, function () {
											if (!anyError) {
												console.log('Done! The IPA file is inside the project root directory!'.green)
											}											
											process.exit();
										});
									});
								});
							}
							else {
								console.log('Wrong number!'.red);
							}
						});
					});
				}
				else {
					console.log('Wrong number!'.red);
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