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

export default function() {
  const options = {
    parent: sketch.getSelectedDocument(),
    modal: true,
    identifier: webviewIdentifier,
    width: 600,
    height: 460,
    show: false,
    frame: false,
    titleBarStyle: 'hiddenInset',
    minimizable: false,
    maximizable: false
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
    console.log(versionList);
    NSUserDefaults.standardUserDefaults().setObject_forKey(JSON.stringify(versionList), uiKitUrlKey);
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


  browserWindow.loadURL('http://localhost:8081/SyncSymbol?sketch=1');
}


export function onShutdown() {
  const existingWebview = getWebview(webviewIdentifier);
  if (existingWebview) {
    existingWebview.close();
  }
}
