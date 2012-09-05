var 
shell = require('shelljs'),
string = require('../string');

module.exports.execute = function (argv, cfg) {
	var cmd_args = '';
	for (var i = 3, l = argv.length; i < l; i++) {
		cmd_args += ' ' + argv[i];
	}

	shell.silent(false);
	shell.exec(string.cliEscape(cfg.ti) + '/mobilesdk/osx/' + cfg.sdk + '/titanium.py' + cmd_args, {
		async: true
	});
};