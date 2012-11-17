var shell = require('../shell');

module.exports.execute = function (argv, cfg, tiapp) {
	var sdk = tiapp['sdk-version'];

	console.log(('\nUsing Titanium SDK ' + sdk).bold.yellow + '\n');

	var cmd_args = [];
	for (var i = 1, l = argv._.length; i < l; i++) {
		cmd_args.push(argv._[i]);
	}

	shell.command(cfg.ti + '/mobilesdk/osx/' + sdk + '/titanium.py', cmd_args, false, function (error, output) {
		console.log(output);
	});
};