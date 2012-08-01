var log = require('../log.js'),
	pathExists = require('../path.js').pathExists,
	expandPath = require("../path.js").expandPath,
	path = require('path'),
	string = require('../string.js');
	fs = require('fs');

function resolveSDKVersion (titanium, environ, config, args, params)
{
	if (!environ.sdk || environ.sdk.length == 0)
	{
		log.error("No SDK versions detected",3);
	}

	var project_dir = expandPath(params.d || params.dir || process.env.PWD);
	
	// SDK version resolution order:
	//
	// 1. look at the command line
	// 2. look at tiapp.xml in current project
	// 3. use the latest from environment
	//
	
	var ver = environ.sdk[0].version; // latest
	
	if (params.version)
	{
		ver = params.version;
	}
	else
	{
		// check to see if the project directory is passed in and if not, assume the current working directory
		var xml = path.join(project_dir,'tiapp.xml');
		if (pathExists(xml))
		{
			// just do some poor man parsing which is fast
			var fc = fs.readFileSync(xml,'utf-8');
			var x = fc.indexOf('<sdk-version>');
			if (x > 0)
			{
				var y = fc.indexOf('</sdk-version>',x);
				ver = fc.substring(x+13,y);
			}
		}
	}
	
	// make sure we have the full path
	var found = false;
	var sdkPath = null;
	for (var c=0;c<environ.sdk.length;c++)
	{
		if (environ.sdk[c].version == ver)
		{
			sdkPath = environ.sdk[c].path;
			found = true;
			break;
		}
	}
	
	if (!found)
	{
		log.error("Couldn't find the SDK version: " + ver.bold.cyan,3);
	}
	
	return {version:ver,path:sdkPath,projectDir:project_dir};
}

module.exports.resolveSDKVersion = resolveSDKVersion;
