## Overview

[CLTI](https://github.com/iamyellow/clti) stands for (C)ommand(L)ine(T)itanium(I)ntertace, and was originally a fork of [Titanium](https://github.com/appcelerator/titanium), but after changing a lot of stuff, it cannot be considered a fork anymore. Now it's just a wrapper for Titanium's SDK python scripts.

## Notice

- My priority is make this work for iOS, so the start focus is on it.
- I'm on a Mac (running ML), so I guess it won't run in Windows / Linux / maybe OS X < 10.8.

## Installation

NPM [node package manager](http://npmjs.org) is required! Then:
	
	[sudo] npm install clti -g

It's also possible to install CLTI clonning this repo and just linking it:

	git clone https://github.com/iamyellow/clti
	cd clti
	[sudo] npm link

Uninstall:

	[sudo] npm uninstall clti -g

## Use

	// CONFIG
	// First of all you must configure CLTI, telling where is Titanium and which is the default SDK.
	clti config --ti=/Library/Application Support/Titanium --sdk=2.1.2.GA

	// HELP
	clti 

	// You MUST be in a Ti project root directory

	// RUN
	clti run --iphone
	clti run --ipad
	clti run --android
	// forcing rebuild
	clti run --iphone -f

	// DEPLOY
	clti deploy --ios
	// universal
	clti deploy --ios --universal
	// ipad-only app
	clti deploy --ios --ipad
	// builds with Debug configuration
	clti deploy --ios --debug

	// PACKAGE
	// CLTI prompts asking you to choose an identity and a mobile certificate :)
	clti package --ios 
	// universal
	clti package --ios --universal
	// ipad-only
	clti package --ios --ipad

	// BYPASS (use Titanium SDK Python scripts: titanium.py)
	// (e.g. Run the project in the simulator)
	clti py run --platform=iphone

## License

This project is open source and provided under the Apache Public License (version 2). Please make sure you see the `LICENSE` file
included in this distribution for more details on the license.  Also, please take notice of the privacy notice at the end of the file.

#### (C) Copyright 2012, [iamyellow.net](http://iamyellow.net) Inc. All Rights Reserved.