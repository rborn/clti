var shell = {},
spawn = require('child_process').spawn,
exec = require('child_process').exec;

shell.command = function (cmd, args, wait, callback, end) {	
	if (!wait) {		
		var ps = spawn(cmd, args);
		if (typeof end === 'function') {
			ps.on('exit', end);
		}
		if (typeof callback === 'function') {
			ps.stdout.setEncoding('utf8');
			ps.stdout.on('data', function (data) {
				callback(false, data);
			});
			ps.stderr.setEncoding('utf8');
			ps.stderr.on('data', function (data) {
				callback(true, data);
			});
		}		
	}
	else {		
		var ps = spawn(cmd, args);
		if (typeof callback === 'function') {
			var error = '', output = '';

			ps.stdout.setEncoding('utf8');
			ps.stdout.on('data', function (data) {
				output += data;
			});
			ps.stderr.setEncoding('utf8');
			ps.stderr.on('data', function (data) {
				error += data;
			});
			ps.on('exit', function () {
				if (error.length === 0) {
					callback(false, output);
				}
				else {
					callback(true, error);
				}
			});
		}
	}
	return ps;
};

shell.osascript = function (cmd, callback) {
	exec('osascript -e \'' + cmd + '\'', function (err, stdout, stderr) {
		if (callback) {
			var error = err !== null;
			callback(error, error ? stderr : stdout);
		}	
	});
}

module.exports = shell;