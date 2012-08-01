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

module.exports.execute = execute;