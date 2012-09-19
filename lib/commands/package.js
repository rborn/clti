var 
string = require('../string.js'),
fs = require('fs'),
shell = require('shelljs'),
spawn = require('child_process').spawn,
PROFILES_DIR = process.env['HOME'] + '/Library/MobileDevice/Provisioning\ Profiles/';

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
		shell.silent(true);
		var identitiesCmd = shell.exec('security find-identity -p codesigning -v', {
			async: true
		});
		identitiesCmd.stdout.on('data', function (data) { 
			var lines = data.split('\n'),			
			line, quoteIndex,
			identities = [];

			console.log('Please, type the number of an identity:'.yellow);
			l = lines.length - 1;
			while (l--) {
				line = lines[l];
				quoteIndex = line.indexOf('"')

				if (quoteIndex < 0) continue;
				
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
					shell.silent(false);
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

								console.log('\nCleaning...'.yellow);
								spawn('xcodebuild', ['-target=' + target, 'clean']).on('exit', function (code) {
									console.log('Building...\n'.yellow);
									var build_cmd = spawn('xcodebuild', ['-target=' + target, '-configuration=Release', '-sdk=iphoneos', '-arch="armv6 armv7"']),
									build_cmd_done = false, killed = false, error = false;

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
											console.log('Signing...\n'.yellow);
											
											shell.silent(false);
											shell.exec('/usr/bin/xcrun -sdk iphoneos PackageApplication ' + pwd + '/build/iphone/build/Release-iphoneos/' + tiapp.name + '.app -o ' + pwd + '/' + tiapp.name + '.ipa --sign "' + identity + '" --embed ' + string.cliEscape(PROFILES_DIR + profiles[v]));
											process.exit(0);
										}
									});

									function endCommands () {
										console.log('[User interrupted]\n'.bold.red);
										killed = true;
										if (build_cmd_done) {
											build_cmd.kill();
										}
										process.exit(0);	
									}
									process.on("uncaughtException", endCommands);
									process.on("SIGINT", endCommands);
									process.on("SIGTERM", endCommands);
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
	}
	else {
		help();
		return;
	}
}

module.exports.execute = execute;
module.exports.help = help;