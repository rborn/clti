var 
// builtin
fs = require('fs'),
// 3rd parties
optimist = require('optimist').string(['sdk', 'sdksim']),
colors = require('colors'),
parser = new (require('xml2js')).Parser({
	trim: true,
	normalize: true,
	explicitArray: false
}),
// custom
shell = require('./shell'),
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

	// bypass sdk
	if (cmd === 'sdk') {
		prompt();
		require('./commands/sdk.js').execute(optimist.argv, cfg);
		return;
	}

	var cwd;
	while(!fs.existsSync(process.cwd() + '/tiapp.xml') && (process.chdir('../'), (cwd = process.cwd()) !== '/'));

	// get the tiapp
	fs.readFile(process.cwd() + '/tiapp.xml', 'utf-8', function (err, xml) {
		if (err !== null) {
			console.error("Are you in a titanium project root directory? or is tiapp.xml ok?".red);
			return;
		}

		parser.parseString(xml, function (err, tiapp) {
			if (err !== null) {
				console.error("Error parsing tiapp.xml, is it ok?".red);
				return;
			}
			
			// copy builder_clti
			var py = cfg.ti + '/mobilesdk/osx/' + cfg.sdk + '/iphone/builder_clti.py';
			shell.command('cp', [__dirname + '/../bin/builder.py', py], true, function (error, output) {
				if (error) {
					console.log(output.red);
					process.exit();
				}

				// execute command
				prompt();
				require('./commands/'+cmd+'.js').execute(optimist.argv, cfg, tiapp['ti:app'], py);
			});			
		})
	});	
};