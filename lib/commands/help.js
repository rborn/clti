/*
 * Copyright (c) 2012, Appcelerator, Inc.  All Rights Reserved.
 * See the LICENSE file for more information.
 */

var 
commands = require('../commands.js').commands,
string = require('../string');

function execute () {
	var list = [];
	for (var k in commands) { list.push('  ' + string.rpad(k,15) + commands[k].grey) }
	
	var prompt = [
		"Available commands:".yellow.bold,
		"",
		list.join("\n"),
		""
	];
	console.log(prompt.join("\n"));
}

exports.execute = execute;