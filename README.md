## Overview

[CLTI](https://github.com/iamyellow/clti) stands for (C)ommand(L)ine(T)itanium(I)ntertace, and was originally a fork of [Titanium](https://github.com/appcelerator/titanium), but after changing a lot of stuff, it cannot be considered a fork anymore. Now it's just a wrapper for Titanium's SDK python scripts.

## Notice

- I'm on a Mac (running ML), so I guess it won't run in Windows / Linux / maybe OS X < 10.8.

## CLTI install

`clti` requires `npm`, the [node package manager](http://npmjs.org), but I have not published in npm registry. What works for me is just link it...

	[sudo] npm link

So in order to install, just clone this repo, go to the directory and run that command. Uninstall is also easy:

	[sudo] npm uninstall clti -g

## Use

	// First of all you must configure CLTI, telling where is Titanium and which is the default SDK.
	clti config --ti=/Library/Application Support/Titanium --sdk=2.1.2.GA

	// help
	clti 

	// run (must be in the project root directory)
	clti run --iphone
	clti run --ipad
	clti run --android
	// forcing rebuild
	clti run --iphone -f

	// deploy to idevice using fruitstrap (the device must be plugged)
	clti deploy --ios
	// universal
	clti deploy --ios --universal
	// ipad-only app
	clti deploy --ios --ipad
	// builds with Debug configuration
	clti deploy --ios --debug

	// run the project in the simulator using the original python script titanium.py, using the default sdk
	clti py run --platform=iphone

## License

This project is open source and provided under the Apache Public License (version 2). Please make sure you see the `LICENSE` file
included in this distribution for more details on the license.  Also, please take notice of the privacy notice at the end of the file.

#### (C) Copyright 2012, [iamyellow.net](http://iamyellow.net) Inc. All Rights Reserved.