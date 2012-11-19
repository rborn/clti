/*jshint node:true */
/*global require: true */
"use strict";

var string = require('../string'),
shell = require('../shell'),
logWatcher = require('../helper').logWatcher,
getProvisioningData = require('../helper').getProvisioningData;

function help () {
	// print any additional arguments
	console.log([
		"Command options:".bold.yellow,
		"",
		"  " + string.rpad("--ios|android", 20) + "Deploys app on an iOS / Android device".grey,
		"",
		"  Optional (iOS):\n".bold,
		"  " + string.rpad("--universal|ipad", 20) + "Universal / iPad only build".grey
	].join("\n"));
	
	console.log();
}

function execute (argv, cfg, tiapp, py) {
	if (argv.ios) {
		getProvisioningData(false, argv, tiapp, function (error, data) {
			if (error) {
				console.log(data.red);
				process.exit(1);
			}

			var pwd =  process.cwd(),
			family = (argv.ipad ? 'ipad' : (argv.universal ? 'universal' : 'iphone'));

			// execute builder_clti
			shell.command(py, ['install', data.sdk, pwd, tiapp.id, tiapp.name, data.profile, data.identity, family], false, logWatcher, function (code) {
				if (code === 0) {
					console.log('Deploying...'.yellow);
					shell.command(__dirname + '/../../bin/fruitstrap', ['install', '--bundle=' + pwd + '/build/iphone/build/Debug-iphoneos/' + tiapp.name + '.app'], false, function (error, output) {
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

exports.execute = execute;
exports.help = help;