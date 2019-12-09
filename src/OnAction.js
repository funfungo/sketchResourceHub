var selectionDom = "com.sketchplugins.wechat.selectionDom";
var toolbarAutoShow = "com.sketchplugins.wechat.toolbarautoshow1";
var updateAutoShow = "com.sketchplugins.wechat.updateAutoShow";

import * as fs from '@skpm/fs';

import BrowserWindow from 'sketch-module-web-view';
import { getWebview } from 'sketch-module-web-view/remote';
import UI from 'sketch/ui';
import sketch from 'sketch';
var Library = require('sketch/dom').Library;

const webviewIdentifier = 'sketchresourcehub.webview';
const document = context.document;
const selection = context.selection;
var layer;
var uiKitUrlKey = "com.sketchplugins.wechat.newuikiturl";

function writeDirectory(filePath) {
  NSFileManager
    .defaultManager()
    .createDirectoryAtPath_withIntermediateDirectories_attributes_error(filePath, true, nil, nil);
}

function networkRequest(args) {
    var task = NSTask.alloc().init();
    task.setLaunchPath("/usr/bin/curl");
    task.setArguments(args);
    var outputPipe = NSPipe.pipe();
    task.setStandardOutput(outputPipe);
    task.launch();
    var responseData = outputPipe.fileHandleForReading().readDataToEndOfFile();
    return responseData;
}

export default function() {
    var toolbarAuto = NSUserDefaults.standardUserDefaults().objectForKey(toolbarAutoShow) || '';
    if (toolbarAuto != 'false') {
        // toolbar(context, true);
    }
    var syncWeChatKey = 'com.sketchplugins.wechat.syncWeChatKey';
    var syncWeChatTime = 'com.sketchplugins.wechat.syncWeChatTime';
    var uiKitUrlKey = "com.sketchplugins.wechat.newuikiturl";

    var uiKitUrlSave = "com.sketchplugins.wechat.newuikitsaveurl";
    var uiKitLocalSave = 'com.sketchplugins.wechat.newuikitdatabasePath';


    // var time = NSUserDefaults.standardUserDefaults().objectForKey(syncWeChatTime);
    // var myDate = new Date();
    // var toDay = myDate.toLocaleDateString();
    // if(toDay == time){
    //     return;
    // }else{
    //     NSUserDefaults.standardUserDefaults().setObject_forKey(toDay, syncWeChatTime);
    // }

    var versionList = NSUserDefaults.standardUserDefaults().objectForKey(uiKitUrlKey) || '{}';
    versionList = JSON.parse(versionList);
    if(Object.keys(versionList).length == 0){
    	return;
    }


    var url = 'https://wedesign.oa.com/static/SymbolVersion.json';
    var openFlag = false;

    var returnData = networkRequest([url]);
	var jsonData = NSString.alloc().initWithData_encoding(returnData,NSUTF8StringEncoding);

    jsonData = JSON.parse(jsonData);

    var message = jsonData.message;
	message.forEach((symbol,item)=> {
	  if(versionList && versionList[symbol.SketchName]){
	    message[item].OldVersion = versionList[symbol.SketchName].Version;
	    if(message[item].OldVersion != message[item].Version){
	    	openFlag = true;
	    }
	  }
	})

	if(openFlag){
		const options = {
		    identifier: webviewIdentifier,
		    width: 900,
		    height: 600
		};

		const browserWindow = new BrowserWindow(options);

		browserWindow.once('ready-to-show', () => {
			browserWindow.show();
		});

		const webContents = browserWindow.webContents;


		webContents.on('SymbolDownload', (obj) => {
			var SketchContent = NSData.alloc().initWithBase64EncodedString_options(obj.SketchContent,0);
			var basePath = '/Users/Shared/sketchFile/symbol/';
			writeDirectory(basePath);
			var dataPath = basePath + obj.SketchName + '.sketch';
			SketchContent.writeToFile_atomically(dataPath, true);
			var library = Library.getLibraryForDocumentAtPath(dataPath);
			var versionList = NSUserDefaults.standardUserDefaults().objectForKey(uiKitUrlKey) || {};
			delete obj['SketchContent'];
			versionList[obj.SketchName] = obj;
			NSUserDefaults.standardUserDefaults().setObject_forKey(JSON.stringify(versionList), uiKitUrlKey);
			webContents
			  .executeJavaScript(`successUpload(${JSON.stringify(versionList)})`)
			  .catch(console.error);
		});

		webContents.on('did-finish-load', () => {
			var versionList = JSON.parse(NSUserDefaults.standardUserDefaults().objectForKey(uiKitUrlKey)) || {};
			webContents
			  .executeJavaScript(`getSymbolList(${JSON.stringify(versionList)})`)
			  .catch(console.error);
			});



			webContents.on('closeWindow', s => {
			browserWindow.close();
		});


		browserWindow.loadURL('https://wedesign.oa.com/SymbolList?sketch=1');
	}

};