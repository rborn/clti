var log = require('../log.js'),
	string = require('../string.js'),
	helper = require('./helper'),
	spawn = require('child_process').spawn;

function help(titanium, environ, config, args, params)
{
	// print any additional arguments
	console.log([
		"Sub-commands:".cyan.bold.underline,
		"",
		"  " + string.rpad("iphone",15) + "in the iphone simulator".grey,
		"  " + string.rpad("android",15) + "in the android emulator".grey,
	].join("\n"));
	console.log();
}

function execute (titanium, environ, config, args, params)
{
	var sdk = helper.resolveSDKVersion(titanium, environ, config, args, params),
	$titanium,
	out;

	if (args[0] === 'iphone') {
		$titanium = spawn(sdk.path + '/titanium.py', ['run', '--platform=iphone']);
	}
	else if (args[0] === 'android') {
		$titanium = spawn(sdk.path + '/titanium.py', ['run', '--platform=android']);
	}
	else {
		help();
		return;
	}

	$titanium.stdout.on('data', function (data) {
		out = '' + data,
		error = out.indexOf('[ERROR]') === 0,
		debug = out.indexOf('[DEBUG]') === 0,
		info = out.indexOf('[INFO]') === 0,
		color = error ? 'red' : (debug ? 'yellow' : 'white');

		console.log(out[color]);
	});

	$titanium.stderr.on('data', function (data) {
	  console.log('' + data);
	});

	$titanium.on('exit', function (code) {
	});
}

module.exports.execute = execute;
module.exports.help = help;