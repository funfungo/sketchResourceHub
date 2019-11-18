import * as fs from '@skpm/fs';

import BrowserWindow from 'sketch-module-web-view';
import { getWebview } from 'sketch-module-web-view/remote';
import UI from 'sketch/ui';
import sketch from 'sketch';
const webviewIdentifier = 'sketchresourcehub.webview';
const document = context.document;
const selection = context.selection;
let layer;

var sketchSaveUrlKey = 'com.sketchplugins.wechat.sketchSaveUrl';

// 图标库
export default function() {
  UI.message('加载中...');
  const options = {
    identifier: webviewIdentifier,
    width: 900,
    height: 600
  };

  const browserWindow = new BrowserWindow(options);
  browserWindow.setResizable(false);

  browserWindow.once('ready-to-show', () => {
    browserWindow.show();
  });

  const webContents = browserWindow.webContents;

  webContents.on('did-finish-load', () => {
  });

  function chooseFilePath() {
    var save = NSOpenPanel.openPanel();
    save.setAllowsOtherFileTypes(true);
    save.setMessage('选择 SKETCH 文件存储目录');
    save.setCanChooseDirectories(true);
    save.setCanChooseFiles(false);
    save.setExtensionHidden(false);
    save.setCanCreateDirectories(true);
    if (save.runModal()) {
      return save.URL().path();
    } else {
      return false;
    }  
  }

  function writeDirectory(filePath) {
    NSFileManager
      .defaultManager()
      .createDirectoryAtPath_withIntermediateDirectories_attributes_error(filePath, true, nil, nil);
  }


  webContents.on('openSketch', data => {

  });

  webContents.on('SketchDownload', (obj) => {

    // 默认目录

    var saveUrl = NSUserDefaults.standardUserDefaults().objectForKey(sketchSaveUrlKey) || '';
    if(!saveUrl){
      var saveUrl = chooseFilePath();
      NSUserDefaults.standardUserDefaults().setObject_forKey(saveUrl,sketchSaveUrlKey);
    }

    var folder = [];
    for(var i = 1; i < obj.navs.length;i++){
      folder.push(obj.navs[i].FolderName.split(',')[obj.navs[i].FolderName.split(',').length-1]);
    }

    var SketchContent = NSData.alloc().initWithBase64EncodedString_options(obj.SketchContent,0);
    var basePath = saveUrl + '/' + folder.join('/') + '/';
    var dataPath = basePath + obj.SketchName + '.sketch';
    writeDirectory(basePath);

    SketchContent.writeToFile_atomically(dataPath, true);
    UI.message('保存成功');
    var Document = require('sketch/dom').Document;
    Document.open(dataPath, (err, document) => {
      if (err) {
      }
    })
  });

  webContents.on('close', () => {
    browserWindow.close();
  });

  browserWindow.on('blur', () => {
    // browserWindow.close();
  });
  var url = 'https://wedesign.oa.com/SketchList??sketch=1&id=0';
  browserWindow.loadURL(url);
}


// When the plugin is shutdown by Sketch (for example when the user disable the plugin)
// we need to close the webview if it's open
export function onShutdown() {
  const existingWebview = getWebview(webviewIdentifier);
  if (existingWebview) {
    existingWebview.close();
  }
}
