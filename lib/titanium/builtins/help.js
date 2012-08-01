/*
 * Copyright (c) 2012, Appcelerator, Inc.  All Rights Reserved.
 * See the LICENSE file for more information.
 */

/**
 * command: help
 * purpose: display help for this CLI
 *
 */
var builtins = require('./builtins.js').builtins,
	externals = require('../externals/externals.js').externals,
	log = require('../log.js'),
	string = require('../string.js');

function execute (titanium, environ, config, args, params)
{	 	
	if (args.length === 0) {
		// make a listing of all available commands
		var commands = [];
		for (var k in builtins) { commands.push('  ' + string.rpad(k,15) + builtins[k].grey) }
		for (var k in externals) { commands.push('  ' + string.rpad(k,15) + externals[k].grey) }
		var prompt = [
			"Available Commands:".cyan.underline.bold,
			"",
			commands.join("\n"),
			""
		];
		console.log(prompt.join("\n"));
	}
	else if (args.length > 0) {
		var cmd = args[0];

		if (builtins[cmd])
		{
			console.log("Command:".cyan.bold.underline);
			console.log();
			console.log('  ' + string.rpad(cmd,15)  + builtins[cmd].grey);
			console.log();
			require('./'+cmd+'.js').help(titanium, environ, config, args, params, cmd);
		}
		else if (externals[cmd])
		{
			console.log("Command:".cyan.bold.underline);
			console.log();
			console.log('  ' + string.rpad(cmd,15)  + externals[cmd].grey);
			console.log();
			require('../externals/'+cmd+'.js').help(titanium, environ, config, args, params, cmd);
		}
		else 
		{
			// don't have that command
			log.error("I don't support the command "+cmd.red.bold);
		}
	}
	
}

module.exports.execute = execute;