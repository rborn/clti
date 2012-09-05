var 
// builtin
fs = require('fs'),
// 3rd parties
optimist = require('optimist'),
colors = require('colors'),
parser = require('xml2json'),
// custom
config_file = process.env['HOME'] + '/.clti',
commands = require('./commands').commands;

function prompt () {
	var prompt = [
		"   ____ _   _____ ___ ",
		"  / ___| | |_   _|_ _|",
		" | |   | |   | |  | | ",
		" | |___| |___| |  | | ",
		"  \\____|_____|_| |___|"		                      
	];
	console.log(prompt.join("\n").yellow);
	console.log();
}

module.exports.start = function () {

	// which command?
	var cmd = optimist.argv._.length < 1 ? 'help' : optimist.argv._[0];

	// is help? then show help
	if (cmd === 'help') {
		prompt();
		require('./commands/help.js').execute();
		return;
	}

	if (cmd === 'config') {
		prompt();
		require('./commands/config.js').execute(optimist.argv, {
			file: config_file
		});
		return;
	}

	// clti configured?
	var cfged = false, cfg;
	if (fs.existsSync(config_file)) {
		try {
			cfg = JSON.parse(fs.readFileSync(config_file, 'utf8'));
			if (typeof cfg.ti === 'string' && typeof cfg.sdk === 'string') {				
				cfged = true;
			}
		}
		catch (err) {
			console.error(err);
			return;
		}
	}
	if (!cfged) {
		prompt();
		require('./commands/config.js').help(true);
		return;
	}

	// is help? command not found?
	if (optimist.argv._.length < 1 || !commands[cmd]) {
		prompt();
		require('./commands/help.js').execute();
		return;
	}

	// bypass clti
	if (cmd === 'py') {
		console.log(('\nUsing Titanium SDK ' + cfg.sdk).bold.yellow + '\n');
		require('./commands/titanium.js').execute(process.argv, cfg);
		return;
	}

	// get the tiapp
	var tiapp;
	try {
		tiapp = JSON.parse(parser.toJson(fs.readFileSync(process.env.PWD + '/tiapp.xml', 'utf-8')))['ti:app'];
	}
	catch (err) {
		console.error("Are you in a titanium project root directory? or is tiapp.xml ok?".red);
		return;
	}

	prompt();
	require('./commands/'+cmd+'.js').execute(optimist.argv, cfg, tiapp);
};