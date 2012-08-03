var 
// builtin
fs = require('fs'),
path = require('path'),
// 3rd parties
optimist = require("optimist"),
colors = require('colors'),
parser = require('xml2json'),
// custom
commands = require('./commands').commands;

module.exports.start = function () {
	var prompt = [
		"   ____ _   _____ ___ ",
		"  / ___| | |_   _|_ _|",
		" | |   | |   | |  | | ",
		" | |___| |___| |  | | ",
		"  \\____|_____|_| |___|"		                      
	];
	console.log(prompt.join("\n").yellow);
	console.log();
	
	var cmd = optimist.argv._[0],
	args = optimist.argv._.splice(1);

	if (optimist.argv._.length < 1) {
		cmd = 'help';
	}

	// get the tiapp
	var tiapp, sdk;
	try {
		tiapp = JSON.parse(parser.toJson(fs.readFileSync(process.env.PWD + '/tiapp.xml', 'utf-8')))['ti:app'];
		sdk = !tiapp ? tiapp : tiapp['sdk-version'];
	}
	catch (err) {
		console.error("are you in a titanium project root directory? or is tiapp.xml ok?".red);
		process.exit(1);
	}

	// do we have the sdk installed?
	var sdkDir = '/Library/Application Support/Titanium/mobilesdk/osx/' + sdk;
	if (!fs.existsSync(sdkDir)) {
		console.error("you haven't installed the sdk in your system".red);
		process.exit(1);
	}

	if (!commands[cmd] && cmd !== 'help') {
		console.error("couldn't find command " + cmd.grey.bold);
	}
	else {
		require('./commands/'+cmd+'.js').execute(tiapp, {
			sdk: sdkDir
		}, args);
	}
};