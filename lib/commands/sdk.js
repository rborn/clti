var shell = require('../shell'),
string = require('../string'),
tsm = require('tsm'),
API = {};

API.help = function () {
	console.log([
		"Command options:".bold.yellow,
		"",
		"  " + string.rpad("--ls", 20) + "List Titanium SDK stable releases".grey,
		"  " + string.rpad("--update", 20) + "Update installed to the latest build".grey,
		"  " + string.rpad("--install=X.X.X", 20) + "Install X.X.X SDK".grey,
		"  " + string.rpad("--uninstall=X.X.X", 20) + "Uninstall X.X.X SDK".grey,
	].join("\n"));
	
	console.log();
};

function bs (d1, d2) {
	var d1n = d1.version.replace(/\./g, '') | 0, d2n = d2.version.replace(/\./g, '') | 0;
	if (d1n > d2n) {
		return 1;
	}
	else if (d1n < d2n) {
		return -1;
	}
	return 0;
}

API.execute = function (argv, cfg) {
	if (argv.ls) {
		tsm.list({
			dir: cfg.ti,
			available: true, 
			os: 'osx'
		}, function (error, builds) {
			if (error !== null) {
				console.log(error);
				return;
			}
			
			builds.sort(bs);

			var l = builds.length - 1, output = '', last;
			while (l--) {
				if (last !== builds[l].version && builds[l].git_branch !== 'master') {
					output += (output.length === 0 ? '' : ', ') + builds[l].version;
					last = builds[l].version;
				}				
			}
			console.log('Available SDKs are: '.yellow + output + '\n');
		});
		return;
	}
	API.help();
};

module.exports = API;