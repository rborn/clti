var 
string = require('../string.js'),
spawn = require('child_process').spawn;

function help (tiapp, env, args) {
	// print any additional arguments
	console.log([
		"run sub-commands:".bold.underline,
		"",
		"  " + string.rpad("iphone",15) + "in the iphone simulator".grey,
		"  " + string.rpad("android",15) + "in the android emulator".grey,
	].join("\n"));
	console.log();
}

function trim (str) {
	return str.replace(/^\s+|\s+$/g,"");
}

function execute (tiapp, env, args) {
	if (args[0] === 'iphone') {
		console.log(('running ' + tiapp.name + '...').yellow);

		$titanium = spawn(env.sdk + '/titanium.py', ['run', '--platform=iphone']);
		//$titanium = spawn(sdk.path + '/iphone/builder.py', ['run', path.resolve('.')]);
	}
	else if (args[0] === 'android') {
		$titanium = spawn(env.sdk + '/titanium.py', ['run', '--platform=android']);
	}
	else {
		help(tiapp, env, args);
		return;
	}

	$titanium.stdout.on('data', function (data) {
		out = trim('' + data),
		error = out.indexOf('[ERROR]') === 0,
		debug = out.indexOf('[DEBUG]') === 0,
		info = out.indexOf('[INFO]') === 0,
		log = out.indexOf('[LOG]') === 0,
		color = error ? 'red' : (debug ? 'yellow' : (info ? 'magenta' : (log  ? 'cyan' : 'white')));

		console.log(out[color]);
	});

	$titanium.stderr.on('data', function (data) {
	});

	$titanium.on('exit', function (code) {
	});
}

module.exports.execute = execute;
module.exports.help = help;