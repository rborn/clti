/*
 * Copyright (c) 2012, Appcelerator, Inc.  All Rights Reserved.
 * See the LICENSE file for more information.
 */

function rpad (t, c, ch) {
	if (!ch) ch = ' ';
	var x = c - t.length;
	if (x <= 0) return t;
	var s = t;
	for (var y=0;y<x;y++)
	{
		s+=ch;
	}
	return s;
}

function trim (str) {
	return str.replace(/^\s+|\s+$/g,"");
}

module.exports.trim = trim;
module.exports.rpad = rpad;