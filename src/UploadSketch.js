import * as fs from '@skpm/fs';

import BrowserWindow from 'sketch-module-web-view';
import { getWebview } from 'sketch-module-web-view/remote';
import UI from 'sketch/ui';
import sketch from 'sketch';


const webviewIdentifier = 'sketchresourcehub.webview';

export default function() {
  var document = require('sketch/dom').getSelectedDocument();
  var Document = require('sketch/dom').Document;
  var SketchName = '';
  if(document.path == undefined){
    SketchName = '未命名.sketch';
  }else{
    SketchName = decodeURIComponent(document.path.substr(document.path.lastIndexOf('/')+1))
  }
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
  webContents.on('did-finish-load', () => {
    document.save('/tmp/' + SketchName,{
      saveMode: Document.SaveMode.SaveTo
    }, err => {

      var file = NSData.alloc().initWithContentsOfFile('/tmp/' + SketchName);
      var SketchContent = file.base64EncodedStringWithOptions(0) + '';
      var obj = {
        SketchName: encodeURIComponent(SketchName),
        SketchContent: SketchContent 
      };

      webContents
      .executeJavaScript(`SketchFile(${JSON.stringify(obj)})`)
      .catch(console.error);
    })
    
  });

  webContents.on('closeWindow', s => {
    NSFileManager.defaultManager().removeItemAtPath_error('/tmp/' + SketchName,nil)
    browserWindow.close();
  });


  browserWindow.loadURL('http://localhost:8081/UploadSketch?sketch=1');
}

export function onShutdown() {
  const existingWebview = getWebview(webviewIdentifier);
  if (existingWebview) {
    existingWebview.close();
  }
}
