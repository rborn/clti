var 
string = require('../string.js'),
spawn = require('child_process').spawn;

function help () {
	// print any additional arguments
	console.log([
		"Command options:".bold.yellow,
		"",
		"  " + string.rpad("--iphone",15) + "In the iphone simulator".grey,
		"  " + string.rpad("--android",15) + "In the android emulator".grey//,
		//"  " + string.rpad("idevice",15) + "install the app using fruitstrap".grey
	].join("\n"));
	
	console.log();
}

function execute (argv, cfg, tiapp) {
	var $titanium;

	if (argv.iphone) {
		console.log(('running ' + tiapp.name + '...').yellow);

		$titanium = spawn(cfg.ti + '/mobilesdk/osx/' + tiapp['sdk-version'] + '/titanium.py', ['run', '--platform=iphone']);
		//$titanium = spawn(sdk.path + '/iphone/builder.py', ['run', path.resolve('.')]);
	}
	else if (argv.android) {
		$titanium = spawn(cfg.ti + '/mobilesdk/osx/' + tiapp['sdk-version'], ['run', '--platform=android']);
	}
	/*else if (args[0] === 'idevice') {
		$titanium = spawn(__dirname + '/../../bin/fruitstrap', ['list-devices', '-v']);
	}*/	
	else {
		help();
		return;
	}

	$titanium.stdout.on('data', function (data) {
		var out = string.trim('' + data),
		error = out.indexOf('[ERROR]') === 0,
		debug = out.indexOf('[DEBUG]') === 0,
		info = out.indexOf('[INFO]') === 0,
		log = out.indexOf('[LOG]') === 0,
		color = error ? 'red' : (debug ? 'yellow' : (info ? 'magenta' : (log  ? 'cyan' : 'white')));

		console.log(out[color]);
	});

	$titanium.stderr.on('data', function (data) {
		console.error(data + '');
	});

	$titanium.on('exit', function (code) {
	});
}

module.exports.execute = execute;
module.exports.help = help;