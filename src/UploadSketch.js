import * as fs from '@skpm/fs';

import BrowserWindow from 'sketch-module-web-view';
import { getWebview } from 'sketch-module-web-view/remote';
import UI from 'sketch/ui';
import sketch from 'sketch';
import * as util from './util';
import { generateHtml } from './GenerateHtml';


const webviewIdentifier = 'sketchresourcehub.webview';

export default function() {
  var document = require('sketch/dom').getSelectedDocument();
  var Document = require('sketch/dom').Document;
  var SketchName = '';
  if(document.path == undefined){
    SketchName = '未命名';
  }else{
    SketchName = decodeURIComponent(document.path.substr(document.path.lastIndexOf('/')+1)).replace('.sketch','');
  }
  var basePath = '/tmp/' + SketchName + '/';
  var zipUrl = basePath.substr(0,basePath.length-1) + '.zip';

  const options = {
    parent: sketch.getSelectedDocument(),
    modal: true,
    identifier: webviewIdentifier,
    width: 600,
    height: 530,
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
    var obj = {
      SketchName: encodeURIComponent(SketchName)
    };
    webContents
      .executeJavaScript(`sketchName(${JSON.stringify(obj)})`)
      .catch(console.error);
  });

  webContents.on('sketchUpload', s => {
    

    util.mkdirpSync(basePath);
    util.mkdirpSync(basePath + 'sketch/');
    util.mkdirpSync(basePath + 'html/');
    var sketchFileUrl = basePath + 'sketch/' + SketchName + '.sketch';
    util.saveSketchFile(sketchFileUrl ,() => {
      var symbols = util.findSymbolMaster(context);
      util.mkdirpSync(basePath + 'symbolpng');
      util.mkdirpSync(basePath + 'symbolsvg');
      symbols.forEach((symbol,item) => {
        util.captureLayerImage(context, symbol, basePath + 'symbolpng/' + symbol.name().replace(/\//ig,'_') + '-----' + symbol.objectID() + '.png');
        util.captureLayerImage(context, symbol, basePath + 'symbolsvg/' + symbol.name().replace(/\//ig,'_') + '-----' + symbol.objectID() + '.svg', 'svg');
      })
      generateHtml(sketchFileUrl,basePath + 'html/');

      util.zipSketch([zipUrl,basePath.substr(0,basePath.length-1)]).then(()=>{
        var data = util.encodeBase64(zipUrl);
        webContents
        .executeJavaScript(`callSketchUpload(${JSON.stringify({SketchContent:data})})`)
        .catch(console.error);
      });

    });

    

    
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
