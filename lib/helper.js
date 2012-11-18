/*jshint node:true */
/*global require: true */
"use strict";

var API = {},
shell = require('./shell'),
fs = require('fs'),
plist = require('plist');

// ****************************************************************************************************************
// logging

var currentColor = 'white',
colors = {
	error: 'red',
	warn: 'magenta',
	trace: 'green',
	debug: 'cyan',
	log: 'white',
	info: 'inverse',
	unknown: 'grey'
};
API.logWatcher = function (error, output) {
	if (error) {
		console.log(output.red);
		process.exit();
	}

	var lines = output.split('\n'), line;
	for (var i = 0, l = lines.length; i < l; i++) {
		line = lines[i];
		if (line.length === 0) {
			continue;
		}

		if (line.indexOf('[ERROR') === 0) {
			currentColor = colors.error;
		}
		else if (line.indexOf('[WARN') === 0) {
			currentColor = colors.warn;
		}
		else if (line.indexOf('[TRACE') === 0) {
			currentColor = colors.trace;
		}
		else if (line.indexOf('[DEBUG') === 0) {
			currentColor = colors.debug;
		}
		else if (line.indexOf('[LOG') === 0) {
			currentColor = colors.log;
		}
		else if (line.indexOf('[INFO') === 0) {
			currentColor = colors.info;
		}
		else {
			currentColor = colors.unknown;	
		}
		console.log(line[currentColor]);
	}	
};

API.logWatcherLogCat = function (error, output) {
	if (error) {
		console.log(output.red);
		process.exit();
	}

	var lines = output.split('\n'), line;
	for (var i = 0, l = lines.length; i < l; i++) {
		line = lines[i];
		if (line.length === 0) {
			continue;
		}

		if (line[0] === 'E') {
			currentColor = colors.error;
		}
		else if (line[0] === 'W') {
			currentColor = colors.warn;
		}
		else if (line[0] === 'T') {
			currentColor = colors.trace;
		}
		else if (line[0] === 'D') {
			currentColor = colors.debug;
		}
		else if (line[0] === 'L') {
			currentColor = colors.log;
		}
		else if (line[0] === 'I') {
			currentColor = colors.info;
		}
		else {
			currentColor = colors.unknown;	
		}
		console.log(line[currentColor]);
	}	
};

// ****************************************************************************************************************
// parsing plist provisioning profiles

var PROFILES_DIR = process.env['HOME'] + '/Library/MobileDevice/Provisioning Profiles/';

API.getProvisioningData = function (isDistribution, argv, tiapp, callback) {	
	shell.command('xcodebuild', ['-showsdks'], true, function (error, output) {
		if (error) {
			callback(true, output);
			return;
		}

		// get installed iOS SDK and compare with user's arguments
		var sdkffound = typeof argv.sdk === 'undefined',
		sdk, sdkmajor, 
		lines = output.split('\n'), l = lines.length, line, lineSdk, 
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
			callback(true, 'iOS SDK not found!');
			return;
		}
		sdk = argv.sdk ? sdk : sdkmajor;

		// identities to code sign
		shell.command('security', ['find-identity', '-p', 'codesigning', '-v'], true, function (error, output) {
			if (error) {
				callback(true, output);
				return;
			}

			var identities = [], selectedIdentity,
			profiles = [];

			var lines = output.split('\n'),
			l = lines.length,
			line, quoteIndex;			

			console.log('\nPlease, type the number of an identity:'.yellow);
			while (l--) {
				line = lines[l];
				quoteIndex = line.indexOf('"');

				if (quoteIndex < 0) {
					continue;
				}
				
				line = line.substring(quoteIndex + 1, line.indexOf('"', quoteIndex + 1));
				if (isDistribution && line.indexOf('iPhone Distribution') !== 0) {
					continue;
				}
				console.log('[' + (identities.length) + '] ' + line);
				
				identities.push(line);
			}
			
			if (identities.length === 0) {
				callback(true, 'No identities found!');
				return;
			}

			// ask for idenity
			process.stdin.resume();
			process.stdin.setEncoding('utf8');

			var step = 0;
			function waitInput (value) {
				var v = parseInt(value, 10);
				
				if (step === 0) {
					if (typeof v === 'number' && v < identities.length && v >= 0) {
						selectedIdentity = identities[v];

						// now it's time to selecte the mobile provisioning profile
						fs.readdir(PROFILES_DIR, function (err, files) {
							if (err !== null) {
								callback(true, 'Error searching for provisioning profiles');
								return;
							}

							console.log('\nNow type the number of the provisioning profile you want to embed:'.yellow);
							l = files.length;
							while (l--)	{
								if (files[l] !== '.DS_Store') {
									var xml = fs.readFileSync(PROFILES_DIR + files[l], 'utf8'),
									parsed_plist = plist.parseStringSync(xml.substring(xml.indexOf('<?xml'), xml.indexOf('</plist>') + 8)),
									PlistAppIdPrefix = parsed_plist.ApplicationIdentifierPrefix,
									PlistAppId = parsed_plist.Entitlements['application-identifier'],
									PlistProfile = PlistAppId.replace(PlistAppIdPrefix+'.','').replace('.*','');

									if (tiapp.id.indexOf(PlistProfile) >= 0 ) {
										if (new Date() > new Date(parsed_plist.ExpirationDate) ) {
											console.log(('[' + (profiles.length) + '] ' + parsed_plist.Name + ' EXPIRED!').red);
										}
										else {
											console.log(('[' + (profiles.length) + '] ' + parsed_plist.Name).green);
										}

										profiles.push(files[l].substring(0, files[l].indexOf('.')));
									}
								}
							}
							if (profiles.length === 0) {								
								callback(true, 'No profiles found!');
								return;
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
						// stop asking for user input
						process.stdin.pause();

						// all ok!						
						callback(false, {
							sdk: sdk,
							identity: selectedIdentity,
							profile: profiles[v]
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
};

// ****************************************************************************************************************
// module API

module.exports = API;