## Overview

[CLTI](https://github.com/iamyellow/clti) is a [Command Line Tool (CLI)](http://en.wikipedia.org/wiki/Command-line_interface) I use for working with [Appcelerator Titanium](https://github.com/appcelertor). It means it only fits my needs (but maybe somebody's else needs too). So, as I'm on a Mac (running ML) I guess it won't run in Windows / Linux.

Originally `CLTI` was a fork of [Titanium](https://github.com/appcelerator/titanium), but after too much changes I cannot consider a real fork anymore.

## CLTI install

`clti` requires `npm`, the [node package manager](http://npmjs.org), but I have not published in npm registry. What works for me is just link it...

	[sudo] npm link

So in order to install, just clone this repo, go to the directory and run that command. Uninstall is also easy:

	[sudo] npm uninstall clti -g

## Use

First of all you must configure CLTI, telling where is Titanium and which is the default SDK.

	clti config --ti=/Library/Application Support/Titanium --sdk=2.1.2.GA

Now type run CLTI and just try ;)

## License

This project is open source and provided under the Apache Public License (version 2). Please make sure you see the `LICENSE` file
included in this distribution for more details on the license.  Also, please take notice of the privacy notice at the end of the file.

#### (C) Copyright 2012, [iamyellow.net](http://iamyellow.net) Inc. All Rights Reserved.