var 
spawn = require('child_process').spawn,
string = require('../string');

function say (data) {
	var out = string.trim('' + data);
	console.log(out);
}

module.exports.execute = function (argv, cfg) {
	var $titanium_args = [];
	for (var i = 3, l = argv.length; i < l; i++) {
		$titanium_args.push(argv[i]);
	}

	var py = cfg.ti + '/mobilesdk/osx/' + cfg.sdk + '/titanium.py',
	$titanium = spawn(py, $titanium_args);
	$titanium.stdout.on('data', say);
	$titanium.stderr.on('data', say);
};