var fs = require('fs'),
string = require('../string.js');

function help (should) {
	var msg;
	if (should) {
		msg = 'You MUST configure Titanium\'s home and default SDL first! Please run \'clti config\' with the following parameters:'.red.bold;
	}
	else {
		msg = "Command options:".yellow.bold;
	}

	console.log([
		msg,
		"",
		"  " + string.rpad("--ti=<DIR>", 30) + "Sets Titanium's home".grey,
		"  " + string.rpad("--sdk=X.X.X[.GA]", 30) + "Sets the default Titanium SDK".grey
	].join("\n"));
	console.log();
}

function trim (str) {
	return str.replace(/^\s+|\s+$/g,"");
}

function execute (argv, options) {
	if (!argv.ti && !argv.sdk) {
		help(false);
		return;
	}

	var json;
	if (!fs.existsSync(options.file)) {
		json = {};
	}
	else {
		try {
			json = JSON.parse(fs.readFileSync(options.file, 'utf8'));
		}
		catch (err) {
			console.log(err);
			return;
		}
	}

	if (argv.ti) {
		if (!fs.existsSync(argv.ti)) {
			var err = 'Directory ' + argv.ti + ' does not exist!';
			console.error(err.bold.red);
			return;
		}
		else {
			json.ti = argv.ti;
			if (json.ti[json.ti.length - 1] === '/') {
				json.ti = json.ti.substring(0, json.ti.length - 1);
			}
		}
	}

	if (argv.sdk) {
		if (!json.ti) {
			var err = 'You must set Titanium home first';
			console.error(err.bold.red);
			return;
		}

		if (!fs.existsSync(json.ti + '/mobilesdk/osx/' + argv.sdk)) {
			var err = 'SDK ' + argv.sdk + ' not found';
			console.error(err.bold.red);
			return;
		}

		json.sdk = argv.sdk;
	}
	
	fs.writeFileSync(options.file, JSON.stringify(json), 'utf8');
	console.log('Config saved!'.bold.green)
}

exports.execute = execute;
exports.help = help;