#!/usr/bin/env python
# -*- coding: utf-8 -*-
#
# Build and Launch iPhone Application in Simulator or install
# the application on the device via iTunes
# (this is a stripped version of builder.py used by CLTI)
# 

import os, sys, uuid, subprocess, shutil, signal, string, traceback, imp, filecmp, inspect
import platform, time, re, run, glob, codecs, hashlib, datetime, plistlib
from compiler import Compiler, softlink_for_simulator
from projector import Projector
from xml.dom.minidom import parseString
from xml.etree.ElementTree import ElementTree
from os.path import join, splitext, split, exists
from tools import ensure_dev_path

# the template_dir is the path where this file lives on disk
template_dir = os.path.abspath(os.path.dirname(sys._getframe(0).f_code.co_filename))

# add the parent and the common directory so we can load libraries from those paths too
sys.path.append(os.path.join(template_dir,'../'))
sys.path.append(os.path.join(template_dir,'../common'))
sys.path.append(os.path.join(template_dir, '../module'))
script_ok = False

from tiapp import *
from css import csscompiler
import localecompiler
from module import ModuleDetector
from tools import *

ignoreFiles = ['.gitignore', '.cvsignore']
ignoreDirs = ['.git','.svn', 'CVS']

# need this so unicode works
sys.stdout = codecs.getwriter('utf-8')(sys.stdout)

def version_sort(a,b):
	x = float(a[0:3]) # ignore more than 2 places
	y = float(b[0:3]) # ignore more than 2 places
	if x > y:
		return -1
	if x < y:
		return 1
	return 0

# this will return the version of the iOS SDK that we have installed
def check_iphone_sdk(s):
	found = []
	output = run.run(["xcodebuild","-showsdks"],True,False)
	#print output
	if output:
		for line in output.split("\n"):
			if line[0:1] == '\t':
				line = line.strip()
				i = line.find('-sdk')
				if i < 0: continue
				type = line[0:i]
				cmd = line[i+5:]
				if cmd.find("iphoneos")==0:
					ver = cmd[8:]
					found.append(ver)
	# The sanity check doesn't have to be as thorough as prereq.
	if s in found:
		return s
	# Sanity check failed. Let's find something close.
	return sorted(found,version_sort)[0]

def dequote(s):
	if s[0:1] == '"':
		return s[1:-1]
	return s

def read_project_property(f,prop):
	if os.path.exists(f):
		contents = open(f).read()
		for line in contents.splitlines(False):
			(k,v) = line.split("=")
			if k == prop:
				return v
	return None

def read_project_appid(f):
	return read_project_property(f,'TI_APPID')
	
def read_project_version(f):
	return read_project_property(f,'TI_VERSION')
			
def infoplist_has_appid(f,appid):
	if os.path.exists(f):
		contents = codecs.open(f,encoding='utf-8').read()
		return contents.find(appid)>0
	return False
		
def copy_module_resources(source, target, copy_all=False, force=False):
	if not os.path.exists(os.path.expanduser(target)):
		os.makedirs(os.path.expanduser(target))
	for root, dirs, files in os.walk(source):
		for name in ignoreDirs:
			if name in dirs:
				dirs.remove(name)	# don't visit ignored directories			  
		for file in files:
			if copy_all==False and splitext(file)[-1] in ('.html', '.js', '.css', '.a', '.m', '.c', '.cpp', '.h', '.mm'):
				continue
			if file in ignoreFiles:
				continue
			from_ = os.path.join(root, file)			  
			to_ = os.path.expanduser(from_.replace(source, target, 1))
			to_directory = os.path.expanduser(split(to_)[0])
			if not exists(to_directory):
				os.makedirs(to_directory)
			# only copy if different filesize or doesn't exist
			if not os.path.exists(to_) or os.path.getsize(from_)!=os.path.getsize(to_) or force:
				if os.path.exists(to_): os.remove(to_)
				shutil.copyfile(from_, to_)

# WARNING: This could be a time bomb waiting to happen, because it mangles
# the app bundle name for NO REASON.  Or... does it?
def make_app_name(s):
	r = re.compile('[0-9a-zA-Z_]')
	buf = ''
	for i in s:
		if i=='-':
			buf+='_'
			continue
		if r.match(i)!=None:
			buf+=i
	# if name starts with number, we simply append a k to it
	if re.match('^[0-9]+',buf):
		buf = 'k%s' % buf
	return buf


HEADER = """/**
* Appcelerator Titanium Mobile
* This is generated code. Do not modify. Your changes *will* be lost.
* Generated code is Copyright (c) 2009-2011 by Appcelerator, Inc.
* All Rights Reserved.
*/
#import <Foundation/Foundation.h>
"""

DEFAULTS_IMPL_HEADER= """#import "TiUtils.h"
#import "ApplicationDefaults.h"
 
@implementation ApplicationDefaults
  
+ (NSMutableDictionary*) copyDefaults
{
    NSMutableDictionary * _property = [[NSMutableDictionary alloc] init];\n
"""

FOOTER ="""
@end
"""

def copy_tiapp_properties(project_dir):
	tiapp = ElementTree()
	src_root = os.path.dirname(sys.argv[0])
	assets_tiappxml = os.path.join(project_dir,'tiapp.xml')
	if not os.path.exists(assets_tiappxml):
		shutil.copy(os.path.join(project_dir, 'tiapp.xml'), assets_tiappxml)
	tiapp.parse(open(assets_tiappxml, 'r'))
	impf = open("ApplicationDefaults.m",'w+')
	appl_default = os.path.join(project_dir,'build','iphone','Classes','ApplicationDefaults.m')
	impf.write(HEADER)
	impf.write(DEFAULTS_IMPL_HEADER)
	for property_el in tiapp.findall("property"):
		name = property_el.get("name")
		type = property_el.get("type")
		value = property_el.text
		if name == None: continue
		if value == None: value = ""
		if type == "string":
			impf.write("""    [_property setObject:[TiUtils stringValue:@"%s"] forKey:@"%s"];\n"""%(value,name))
		elif type == "bool":
			impf.write("""    [_property setObject:[NSNumber numberWithBool:[TiUtils boolValue:@"%s"]] forKey:@"%s"];\n"""%(value,name))
		elif type == "int":
			impf.write("""    [_property setObject:[NSNumber numberWithInt:[TiUtils intValue:@"%s"]] forKey:@"%s"];\n"""%(value,name))
		elif type == "double":
			impf.write("""    [_property setObject:[NSNumber numberWithDouble:[TiUtils doubleValue:@"%s"]] forKey:@"%s"];\n"""%(value,name))
		elif type == None:
			impf.write("""    [_property setObject:[TiUtils stringValue:@"%s"] forKey:@"%s"];\n"""%(value,name))
		else:
			print """[WARN] Cannot set property "%s" , type "%s" not supported""" % (name,type)
	if (len(tiapp.findall("property")) > 0) :
		impf.write("\n    return _property;\n}")
	else: 
		impf.write("\n    return NULL;\n}")
	impf.write(FOOTER)
	impf.close()
	if open(appl_default,'r').read() == open('ApplicationDefaults.m','r').read():
		os.remove('ApplicationDefaults.m')
		return False
	else:
		shutil.copyfile('ApplicationDefaults.m',appl_default)
		os.remove('ApplicationDefaults.m')
		return True	

#
# this script is invoked from our tooling but you can run from command line too if 
# you know the arguments
#
# the current pattern is <command> [arguments]
#
# where the arguments are dependent on the command being passed
#	
def main(args):
	global script_ok
	argc = len(args)

	print "[INFO] One moment, building ..."
	sys.stdout.flush()
	start_time = time.time()
	command = args[1].decode("utf-8")
	ensure_dev_path()

	target = 'Debug'
	deploytype = 'development'
	devicefamily = 'iphone'
	debug = False
	build_only = False
	simulator = False
	xcode_build = False
	force_xcode = False
	simtype = devicefamily


	# the run command is when you run from titanium using the run command
	# and it will run the project in the current directory immediately in the simulator
	# from the command line
	if argc < 3:
		print "Usage: %s run <project_dir> [ios_version]" % os.path.basename(args[0])
		sys.exit(1)
	if argc == 3:
		iphone_version = check_iphone_sdk('4.0')
	else:
		iphone_version = dequote(args[3].decode("utf-8"))
	project_dir = os.path.expanduser(dequote(args[2].decode("utf-8")))
	iphonesim = os.path.abspath(os.path.join(template_dir,'ios-sim'))
	iphone_dir = os.path.abspath(os.path.join(project_dir,'build','iphone'))
	tiapp_xml = os.path.join(project_dir,'tiapp.xml')
	ti = TiAppXML(tiapp_xml)
	appid = ti.properties['id']
	name = ti.properties['name']
	command = 'simulator' # switch it so that the rest of the stuff works
		
	app_name = make_app_name(name)
	iphone_dir = os.path.abspath(os.path.join(project_dir,'build','iphone'))
	
	# We need to create the iphone dir if necessary, now that
	# the tiapp.xml allows build target selection
	if not os.path.isdir(iphone_dir):
		if os.path.exists(iphone_dir):
			os.remove(iphone_dir)
		os.makedirs(iphone_dir)
	
	project_xcconfig = os.path.join(iphone_dir,'project.xcconfig')
	target = 'Release'
	ostype = 'os'
	version_file = None
	log_id = None
	provisioning_profile = None
	debughost = None
	debugport = None
	postbuild_modules = []
	
	# starting in 1.4, you don't need to actually keep the build/iphone directory
	# if we don't find it, we'll just simply re-generate it
	if not os.path.exists(iphone_dir):
		from iphone import IPhone
		print "[INFO] Detected missing project but that's OK. re-creating it..."
		iphone_creator = IPhone(name,appid)
		iphone_creator.create(iphone_dir,True)
		sys.stdout.flush()
	
	# we use different arguments dependent on the command
	# pluck those out here
	link_version = check_iphone_sdk(iphone_version)
	deploytype = 'development'
	debug = True
	simulator = command == 'simulator'
	build_only = command == 'build'
	target = 'Debug'
	ostype = 'simulator'
	if argc > 6:
		devicefamily = dequote(args[6].decode("utf-8"))
	if argc > 7:
		simtype = dequote(args[7].decode("utf-8"))
	else:
		# 'universal' helpfully translates into iPhone here... just in case.
		simtype = devicefamily
	if argc > 8:
		# this is host:port from the debugger
		debughost = dequote(args[8].decode("utf-8"))
		if debughost=='':
			debughost = None
			debugport = None
		else:
			debughost,debugport = debughost.split(":")
	
	# setup up the useful directories we need in the script
	build_out_dir = os.path.abspath(os.path.join(iphone_dir,'build'))
	build_dir = os.path.abspath(os.path.join(build_out_dir,'%s-iphone%s'%(target,ostype)))
	app_dir = os.path.abspath(os.path.join(build_dir,name+'.app'))
	binary = os.path.join(app_dir,name)
	sdk_version = os.path.basename(os.path.abspath(os.path.join(template_dir,'../')))
	iphone_resources_dir = os.path.join(iphone_dir,'Resources')
	version_file = os.path.join(iphone_resources_dir,'.version')
	force_rebuild = read_project_version(project_xcconfig)!=sdk_version or not os.path.exists(version_file)
	infoplist = os.path.join(iphone_dir,'Info.plist')
	githash = None
	custom_fonts = []

	if not os.path.exists(build_out_dir): 
		os.makedirs(build_out_dir)
	# write out the build log, useful for debugging
	o = codecs.open(os.path.join(build_out_dir,'build.log'),'w',encoding='utf-8')
	def log(msg):
		print msg
		o.write(msg)
	try:
		buildtime = datetime.datetime.now()
		o.write("%s\n" % ("="*80))
		o.write("Appcelerator Titanium Diagnostics Build Log\n")
		o.write("The contents of this file are useful to send to Appcelerator Support if\n")
		o.write("reporting an issue to help us understand your environment, build settings\n")
		o.write("and aid in debugging. Please attach this log to any issue that you report.\n")
		o.write("%s\n\n" % ("="*80))
		o.write("Starting build at %s\n\n" % buildtime.strftime("%m/%d/%y %H:%M"))
		
		# write out the build versions info
		versions_txt = read_config(os.path.join(template_dir,'..','version.txt'))
		o.write("Build details:\n\n")
		for key in versions_txt:
			o.write("   %s=%s\n" % (key,versions_txt[key]))
		o.write("\n\n")
		
		if versions_txt.has_key('githash'): 
			githash = versions_txt['githash']
			
		o.write("Script arguments:\n")
		for arg in args:
			o.write(unicode("   %s\n" % arg, 'utf-8'))
		o.write("\n")
		o.write("Building from: %s\n" % template_dir)
		o.write("Platform: %s\n\n" % platform.version())

		# print out path to debug
		xcode_path=run.run(["/usr/bin/xcode-select","-print-path"],True,False)
		if xcode_path:
			o.write("Xcode path is: %s\n" % xcode_path)
		else:
			o.write("Xcode path undetermined\n")

		# find the module directory relative to the root of the SDK	
		titanium_dir = os.path.abspath(os.path.join(template_dir,'..','..','..','..'))
		tp_module_dir = os.path.abspath(os.path.join(titanium_dir,'modules','iphone'))
		force_destroy_build = command!='simulator'

		detector = ModuleDetector(project_dir)
		missing_modules, modules = detector.find_app_modules(ti, 'iphone')
		module_lib_search_path, module_asset_dirs = locate_modules(modules, project_dir, app_dir, log)
		common_js_modules = []
		
		if len(missing_modules) != 0:
			print '[ERROR] Could not find the following required iOS modules:'
			for module in missing_modules:
				print "[ERROR]\tid: %s\tversion: %s" % (module['id'], module['version'])
			exit(1)

		# search for modules that the project is using
		# and make sure we add them to the compile
		for module in modules:
			if module.js:
				common_js_modules.append(module)
				continue
			module_id = module.manifest.moduleid.lower()
			module_version = module.manifest.version
			module_lib_name = ('lib%s.a' % module_id).lower()
			# check first in the local project
			local_module_lib = os.path.join(project_dir, 'modules', 'iphone', module_lib_name)
			local = False
			if os.path.exists(local_module_lib):
				module_lib_search_path.append([module_lib_name, local_module_lib])
				local = True
				log("[INFO] Detected third-party module: %s" % (local_module_lib))
			else:
				if module.lib is None:
					module_lib_path = module.get_resource(module_lib_name)
					log("[ERROR] Third-party module: %s/%s missing library at %s" % (module_id, module_version, module_lib_path))
					sys.exit(1)
				module_lib_search_path.append([module_lib_name, os.path.abspath(module.lib).rsplit('/',1)[0]])
				log("[INFO] Detected third-party module: %s/%s" % (module_id, module_version))
			force_xcode = True

			if not local:
				# copy module resources
				img_dir = module.get_resource('assets', 'images')
				if os.path.exists(img_dir):
					dest_img_dir = os.path.join(app_dir, 'modules', module_id, 'images')
					if not os.path.exists(dest_img_dir):
						os.makedirs(dest_img_dir)
					module_asset_dirs.append([img_dir, dest_img_dir])

				# copy in any module assets
				module_assets_dir = module.get_resource('assets')
				if os.path.exists(module_assets_dir): 
					module_dir = os.path.join(app_dir, 'modules', module_id)
					module_asset_dirs.append([module_assets_dir, module_dir])

		full_version = sdk_version
		if 'version' in versions_txt:
			full_version = versions_txt['version']
			if 'timestamp' in versions_txt or 'githash' in versions_txt:
				full_version += ' ('
				if 'timestamp' in versions_txt:
					full_version += '%s' % versions_txt['timestamp']
				if 'githash' in versions_txt:
					full_version += ' %s' % versions_txt['githash']
				full_version += ')'

		print "[INFO] Titanium SDK version: %s" % full_version
		print "[INFO] iPhone Device family: %s" % devicefamily
		print "[INFO] iPhone SDK version: %s" % iphone_version
		
		if simulator or build_only:
			print "[INFO] iPhone simulated device: %s" % simtype
			# during simulator we need to copy in standard built-in module files
			# since we might not run the compiler on subsequent launches
			for module_name in ('facebook','ui'):
				img_dir = os.path.join(template_dir,'modules',module_name,'images')
				dest_img_dir = os.path.join(app_dir,'modules',module_name,'images')
				if not os.path.exists(dest_img_dir):
					os.makedirs(dest_img_dir)
				module_asset_dirs.append([img_dir,dest_img_dir])

			# when in simulator since we point to the resources directory, we need
			# to explicitly copy over any files
			ird = os.path.join(project_dir,'Resources','iphone')
			if os.path.exists(ird): 
				module_asset_dirs.append([ird,app_dir])
				
			# We also need to copy over the contents of 'platform/iphone'
			platform_iphone = os.path.join(project_dir,'platform','iphone')
			if os.path.exists(platform_iphone):
				module_asset_dirs.append([platform_iphone,app_dir])
			
			for ext in ('ttf','otf'):
				for f in glob.glob('%s/*.%s' % (os.path.join(project_dir,'Resources'),ext)):
					custom_fonts.append(f)
				

		create_info_plist(ti, template_dir, project_dir, infoplist)

		applogo = None
		clean_build = False

		# check to see if the appid is different (or not specified) - we need to re-generate
		if read_project_appid(project_xcconfig)!=appid or not infoplist_has_appid(infoplist,appid):
			clean_build = True
			force_xcode = True


		new_lib_hash = None
		lib_hash = None	
		existing_git_hash = None

		# this code simply tries and detect if we're building a different
		# version of the project (or same version but built from different git hash)
		# and if so, make sure we force rebuild so to propagate any code changes in
		# source code (either upgrade or downgrade)
		if os.path.exists(app_dir):
			if os.path.exists(version_file):
				line = open(version_file).read().strip()
				lines = line.split(",")
				v = lines[0]
				log_id = lines[1]
				if len(lines) > 2:
					lib_hash = lines[2]
					existing_git_hash = lines[3]
				if lib_hash==None:
					force_rebuild = True
				else:
					if template_dir==v and force_rebuild==False:
						force_rebuild = False
					else:
						log_id = None
			else:
				force_rebuild = True

		else:
			force_rebuild = True

		o.write("\ngithash=%s, existing_git_hash=%s\n" %(githash,existing_git_hash))
			
		if githash!=existing_git_hash:
			force_rebuild = True

		# we want to read the md5 of the libTiCore.a library since it must match
		# the current one we're building and if not, we need to force a rebuild since
		# that means we've copied in a different version of the library and we need
		# to rebuild clean to avoid linking errors
		source_lib=os.path.join(template_dir,'libTiCore.a')
		fd = open(source_lib,'rb')
		m = hashlib.md5()
		m.update(fd.read(1024)) # just read 1K, it's binary
		new_lib_hash = m.hexdigest()
		fd.close()
		
		if new_lib_hash!=lib_hash:
			force_rebuild=True
			o.write("forcing rebuild since libhash (%s) not matching (%s)\n" % (lib_hash,new_lib_hash))

		lib_hash=new_lib_hash

		# when we force rebuild, we need to re-compile and re-copy source, libs etc
		if force_rebuild:
			o.write("Performing full rebuild\n")
			print "[INFO] Performing full rebuild. This will take a little bit. Hold tight..."
			sys.stdout.flush()
			project = Projector(name,sdk_version,template_dir,project_dir,appid)
			project.create(template_dir,iphone_dir)	
			force_xcode = True
			if os.path.exists(app_dir): shutil.rmtree(app_dir)
			# we have to re-copy if we have a custom version
			create_info_plist(ti, template_dir, project_dir, infoplist)
			# since compiler will generate the module dependencies, we need to 
			# attempt to compile to get it correct for the first time.
			compiler = Compiler(project_dir,appid,name,deploytype)
			compiler.compileProject(xcode_build,devicefamily,iphone_version,True)
		else:
			if simulator:
				softlink_for_simulator(project_dir,app_dir)
			contents="TI_VERSION=%s\n"% sdk_version
			contents+="TI_SDK_DIR=%s\n" % template_dir.replace(sdk_version,'$(TI_VERSION)')
			contents+="TI_APPID=%s\n" % appid
			contents+="OTHER_LDFLAGS[sdk=iphoneos*]=$(inherited) -weak_framework iAd\n"
			contents+="OTHER_LDFLAGS[sdk=iphonesimulator*]=$(inherited) -weak_framework iAd\n"
			contents+="#include \"module\"\n"
			xcconfig = open(project_xcconfig,'w+')
			xccontents = xcconfig.read()
			if contents!=xccontents:
				o.write("writing contents of %s:\n\n%s\n" % (project_xcconfig,contents))
				o.write("old contents\n\n%s\n" % (xccontents))
				xcconfig.write(contents)
				xcconfig.close()
			else:
				o.write("Skipping writing contents of xcconfig %s\n" % project_xcconfig)

		# write out any modules into the xcode project
		# this must be done after project create above or this will be overriden
		link_modules(module_lib_search_path, name, iphone_dir)

		cwd = os.getcwd()

		# check to see if the symlink exists and that it points to the
		# right version of the library
		libticore = os.path.join(template_dir,'libTiCore.a')
		make_link = True
		symlink = os.path.join(iphone_dir,'lib','libTiCore.a')
		if os.path.islink(symlink):
			path = os.path.realpath(symlink)
			if path.find(sdk_version) > 0:
				make_link = False
		if make_link:
			libdir = os.path.join(iphone_dir,'lib')
			if not os.path.exists(libdir): os.makedirs(libdir)
			os.chdir(libdir)
			# a broken link will not return true on os.path.exists
			# so we need to use brute force
			try:
				os.unlink("libTiCore.a")
			except:
				pass
			try:
				os.symlink(libticore,"libTiCore.a")
			except:
				pass
			os.chdir(cwd)

		# if the lib doesn't exist, force a rebuild since it's a new build
		if not os.path.exists(os.path.join(iphone_dir,'lib','libtiverify.a')):
			shutil.copy(os.path.join(template_dir,'libtiverify.a'),os.path.join(iphone_dir,'lib','libtiverify.a'))

		if not os.path.exists(os.path.join(iphone_dir,'lib','libti_ios_debugger.a')):
			shutil.copy(os.path.join(template_dir,'libti_ios_debugger.a'),os.path.join(iphone_dir,'lib','libti_ios_debugger.a'))

		# compile JSS files
		cssc = csscompiler.CSSCompiler(os.path.join(project_dir,'Resources'),devicefamily,appid)
		app_stylesheet = os.path.join(iphone_dir,'Resources','stylesheet.plist')
		asf = codecs.open(app_stylesheet,'w','utf-8')
		asf.write(cssc.code)
		asf.close()

		# compile debugger file
		debug_plist = os.path.join(iphone_dir,'Resources','debugger.plist')
		
		# Force an xcodebuild if the debugger.plist has changed
		force_xcode = write_debugger_plist(debughost, debugport, template_dir, debug_plist)

		if command not in ['simulator', 'build']:
			# compile plist into binary format so it's faster to load
			# we can be slow on simulator
			os.system("/usr/bin/plutil -convert binary1 \"%s\"" % app_stylesheet)
		
		o.write("Generated the following stylecode code:\n\n")
		o.write(cssc.code)
		o.write("\n")

		# generate the Info.plist file with the appropriate device family
		if devicefamily!=None:
			applogo = ti.generate_infoplist(infoplist,appid,devicefamily,project_dir,iphone_version)
		else:
			applogo = ti.generate_infoplist(infoplist,appid,'iphone',project_dir,iphone_version)
			
		# attempt to load any compiler plugins
		if len(ti.properties['plugins']) > 0:
			local_compiler_dir = os.path.abspath(os.path.join(project_dir,'plugins'))
			tp_compiler_dir = os.path.abspath(os.path.join(titanium_dir,'plugins'))
			if not os.path.exists(tp_compiler_dir) and not os.path.exists(local_compiler_dir):
				o.write("+ Missing plugins directory at %s\n" % tp_compiler_dir)
				print "[ERROR] Build Failed (Missing plugins directory). Please see output for more details"
				sys.stdout.flush()
				sys.exit(1)
			compiler_config = {
				'platform':'ios',
				'devicefamily':devicefamily,
				'simtype':simtype,
				'tiapp':ti,
				'project_dir':project_dir,
				'titanium_dir':titanium_dir,
				'appid':appid,
				'iphone_version':iphone_version,
				'template_dir':template_dir,
				'project_name':name,
				'command':command,
				'deploytype':deploytype,
				'build_dir':build_dir,
				'app_name':app_name,
				'app_dir':app_dir,
				'iphone_dir':iphone_dir
			}
			for plugin in ti.properties['plugins']:
				local_plugin_file = os.path.join(local_compiler_dir,plugin['name'],'plugin.py')
				plugin_file = os.path.join(tp_compiler_dir,plugin['name'],plugin['version'],'plugin.py')
				if not os.path.exists(local_plugin_file) and not os.path.exists(plugin_file):
					o.write("+ Missing plugin at %s (checked %s also)\n" % (plugin_file,local_plugin_file))
					print "[ERROR] Build Failed (Missing plugin for %s). Please see output for more details" % plugin['name']
					sys.stdout.flush()
					sys.exit(1)
				o.write("+ Detected plugin: %s/%s\n" % (plugin['name'],plugin['version']))
				print "[INFO] Detected compiler plugin: %s/%s" % (plugin['name'],plugin['version'])
				code_path = plugin_file
				if os.path.exists(local_plugin_file):	
					code_path = local_plugin_file
				o.write("+ Loading compiler plugin at %s\n" % code_path)
				compiler_config['plugin']=plugin
				fin = open(code_path, 'rb')
				m = hashlib.md5()
				m.update(open(code_path,'rb').read()) 
				code_hash = m.hexdigest()
				p = imp.load_source(code_hash, code_path, fin)
				module_functions = dict(inspect.getmembers(p, inspect.isfunction))
				if module_functions.has_key('postbuild'):
					print "[DBEUG] Plugin has postbuild"
					o.write("+ Plugin has postbuild")
					postbuild_modules.append((plugin['name'], p))
				p.compile(compiler_config)
				fin.close()
				
		try:		
			os.chdir(iphone_dir)

			# target the requested value if provided; otherwise, target minimum (4.0)
			# or maximum iphone_version

			if 'min-ios-ver' in ti.ios:
				min_ver = ti.ios['min-ios-ver']
				if min_ver < 4.0:
					print "[INFO] Minimum iOS version %s is lower than 4.0: Using 4.0 as minimum" % min_ver
					min_ver = 4.0
				elif min_ver > float(iphone_version):
					print "[INFO] Minimum iOS version %s is greater than %s (iphone_version): Using %s as minimum" % (min_ver, iphone_version, iphone_version)
					min_ver = float(iphone_version)
			else:
				min_ver = 4.0

			print "[INFO] Minimum iOS version: %s" % min_ver
			deploy_target = "IPHONEOS_DEPLOYMENT_TARGET=%s" % min_ver
			device_target = 'TARGETED_DEVICE_FAMILY=1'  # this is non-sensical, but you can't pass empty string
			
			# No armv6 support above 4.3 or with 6.0+ SDK
			if min_ver >= 4.3 or float(iphone_version) >= 6.0:
				valid_archs = 'armv7 i386'
			else:
				valid_archs = 'armv6 armv7 i386'

			# clean means we need to nuke the build 
			if clean_build or force_destroy_build: 
				print "[INFO] Performing clean build"
				o.write("Performing clean build...\n")
				if os.path.exists(app_dir):
					shutil.rmtree(app_dir)

			if not os.path.exists(app_dir): os.makedirs(app_dir)

			# compile localization files
			# Using app_name here will cause the locale to be put in the WRONG bundle!!
			localecompiler.LocaleCompiler(name,project_dir,devicefamily,deploytype).compile()
			
			# copy any module resources
			if len(module_asset_dirs)>0:
				for e in module_asset_dirs:
					copy_module_resources(e[0],e[1],True)

			# copy CommonJS modules
			for module in common_js_modules:
				#module_id = module.manifest.moduleid.lower()
				#module_dir = os.path.join(app_dir, 'modules', module_id)
				#if os.path.exists(module_dir) is False:
				#	os.makedirs(module_dir)
				shutil.copy(module.js, app_dir)
			
			# copy any custom fonts in (only runs in simulator)
			# since we need to make them live in the bundle in simulator
			if len(custom_fonts)>0:
				for f in custom_fonts:
					font = os.path.basename(f)
					app_font_path = os.path.join(app_dir, font)
					print "[INFO] Detected custom font: %s" % font
					if os.path.exists(app_font_path):
						os.remove(app_font_path)
					try:
						shutil.copy(f,app_dir)
					except shutil.Error, e:
						print "[WARN] Not copying %s: %s" % (font, e)

			install_logo(ti, applogo, project_dir, template_dir, app_dir)
			install_defaults(project_dir, template_dir, iphone_resources_dir)

			extra_args = None

			recompile = copy_tiapp_properties(project_dir)
			# if the anything changed in the application defaults then we have to force  a xcode build.
			if recompile == True:
				force_xcode = recompile

			if devicefamily!=None:
				# Meet the minimum requirements for ipad when necessary
				if devicefamily == 'ipad' or devicefamily == 'universal':
					device_target="TARGETED_DEVICE_FAMILY=2"
					# NOTE: this is very important to run on device -- i dunno why
					# xcode warns that 3.2 needs only armv7, but if we don't pass in 
					# armv6 we get crashes on device
					extra_args = ["VALID_ARCHS="+valid_archs]
				# Additionally, if we're universal, change the device family target
				if devicefamily == 'universal':
					device_target="TARGETED_DEVICE_FAMILY=1,2"

			kroll_coverage = ""
			if ti.has_app_property("ti.ios.enablecoverage"):
				enable_coverage = ti.to_bool(ti.get_app_property("ti.ios.enablecoverage"))
				if enable_coverage:
					kroll_coverage = "KROLL_COVERAGE=1"

			def execute_xcode(sdk,extras,print_output=True):

				config = name
				if devicefamily=='ipad':
					config = "%s-iPad" % config
				if devicefamily=='universal':
					config = "%s-universal" % config

				# these are the arguments for running a command line xcode build
				args = ["xcodebuild","-target",config,"-configuration",target,"-sdk",sdk]
				if extras!=None and len(extras)>0: 
					args += extras
				args += [deploy_target,device_target]
				if extra_args!=None and len(extra_args)>0:
					args += extra_args

				o.write("Starting Xcode compile with the following arguments:\n\n")
				for arg in args: o.write("    %s\n" % arg)
				o.write("\napp_id = %s\n" % appid)
				o.write("\n\n")
				o.flush()

				if print_output:
					print "[DEBUG] compile checkpoint: %0.2f seconds" % (time.time()-start_time)
					print "[INFO] Executing XCode build..."
					print "[BEGIN_VERBOSE] Executing XCode Compiler  <span>[toggle output]</span>"

				# h/t cbarber for this; occasionally the PCH header info gets out of sync
				# with the PCH file if you do the "wrong thing" and xcode isn't
				# smart enough to pick up these changes (since the PCH file hasn't 'changed').
				run.run(['touch', '%s_Prefix.pch' % ti.properties['name']], debug=False)
				
				output = run.run(args,False,False,o)

				if print_output:
					print output
					print "[END_VERBOSE]"
					sys.stdout.flush()

				# Output already written by run.run
				#o.write(output)

				# check to make sure the user doesn't have a custom build location 
				# configured in Xcode which currently causes issues with titanium
				idx = output.find("TARGET_BUILD_DIR ")
				if idx > 0:
					endidx = output.find("\n",idx)
					if endidx > 0:
						target_build_dir = dequote(output[idx+17:endidx].strip())
						if not os.path.samefile(target_build_dir,build_dir):
							o.write("+ TARGET_BUILD_DIR = %s\n" % target_build_dir)
							print "[ERROR] Your TARGET_BUILD_DIR is incorrectly set. Most likely you have configured in Xcode a customized build location. Titanium does not currently support this configuration."
							print "[ERROR] Expected dir %s, was: %s" % (build_dir,target_build_dir)
							sys.stdout.flush()
							sys.exit(1)

				# look for build error
				if output.find("** BUILD FAILED **")!=-1 or output.find("ld returned 1")!=-1 or output.find("The following build commands failed:")!=-1:
					o.write("+ Detected build failure\n")
					print "[ERROR] Build Failed. Please see output for more details"
					sys.stdout.flush()
					sys.exit(1)

				o.write("+ Looking for application binary at %s\n" % binary)

				# make sure binary exists
				if not os.path.exists(binary):
					o.write("+ Missing application binary at %s\n" % binary)
					print "[ERROR] Build Failed (Missing app at %s). Please see output for more details" % binary
					sys.stdout.flush()
					sys.exit(1)

				# look for a code signing error
				error = re.findall(r'Code Sign error:(.*)',output)
				if len(error) > 0:
					o.write("+ Detected code sign error: %s\n" % error[0])
					print "[ERROR] Code sign error: %s" % error[0].strip()
					sys.stdout.flush()
					sys.exit(1)
				
			def run_postbuild():
				try:
					if postbuild_modules:
						for p in postbuild_modules:
							o.write("Running postbuild %s" % p[0])
							print "[INFO] Running postbuild %s..." % p[0]
							p[1].postbuild()
				except Exception,e:
					o.write("Error in post-build: %s" % e)
					print "[ERROR] Error in post-build: %s" % e
					

			# only build if force rebuild (different version) or 
			# the app hasn't yet been built initially
			if ti.properties['guid']!=log_id or force_xcode:
				log_id = ti.properties['guid']
				f = open(version_file,'w+')
				f.write("%s,%s,%s,%s" % (template_dir,log_id,lib_hash,githash))
				f.close()

			debugstr = ''
			if debughost:
				debugstr = 'DEBUGGER_ENABLED=1'
			
			if force_rebuild or force_xcode or not os.path.exists(binary):
				execute_xcode("iphonesimulator%s" % link_version,["GCC_PREPROCESSOR_DEFINITIONS=__LOG__ID__=%s DEPLOYTYPE=development TI_DEVELOPMENT=1 DEBUG=1 TI_VERSION=%s %s %s" % (log_id,sdk_version,debugstr,kroll_coverage)],False)
				
			run_postbuild()
			
			o.write("Finishing build\n")

			script_ok = True

		finally:
			os.chdir(cwd)
	except:
		print "[ERROR] Error: %s" % traceback.format_exc()
		if not script_ok:
			o.write("\nException detected in script:\n")
			traceback.print_exc(file=o)
			o.close()
			sys.exit(1)
		else:
			o.close()

if __name__ == "__main__":
	main(sys.argv)
	sys.exit(0)