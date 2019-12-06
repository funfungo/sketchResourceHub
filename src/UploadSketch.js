import * as fs from '@skpm/fs';

import BrowserWindow from 'sketch-module-web-view';
import {
  getWebview
} from 'sketch-module-web-view/remote';
import UI from 'sketch/ui';
import sketch from 'sketch';
import * as util from './util';
import {
  generateHtml
} from './GenerateHtml';


const webviewIdentifier = 'sketchresourcehub.webview';

export default function () {

  var document = require('sketch/dom').getSelectedDocument();
  var sketchName = '';

  if (document.path == undefined) {
    sketchName = '未命名';
    return;
  } else {
    sketchName = decodeURIComponent(document.path.substr(document.path.lastIndexOf('/') + 1)).replace('.sketch', '');
  }

  //using system temp path;
  let previewPath = NSTemporaryDirectory() + sketchName + '/';

  //export page preview
  let scale = 0.5;
  sketch.export(document.pages, {
    output: previewPath,
    format: "png",
    "save-for-web": true,
    "use-id-for-name": true,
    "scales": scale // preview img compress
  })

  let previewObj = {
    sketchName: encodeURIComponent(sketchName),
    selected: [],
    all: [],
  };


  //format data
  document.pages.forEach(page => {
    //skip symbol master page
    if (page.name === 'Symbols') return;
    let previewImg = previewPath + page.id + '@' + scale + 'x.png';
    let url = NSURL.fileURLWithPath(previewImg),
      bitmap = NSData.alloc().initWithContentsOfURL(url),
      base64 = bitmap.base64EncodedStringWithOptions(0) + '';
    let img = {
      name: page.id,
      base64: "data:image/jpg;base64," + base64,
    }
    previewObj.all.push(img);
    if (page.selected) {
      previewObj.selected.push(img);
    }
  })

  const options = {
    parent: sketch.getSelectedDocument(),
    modal: true,
    identifier: webviewIdentifier,
    width: 400,
    height: 900,
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
    webContents
      .executeJavaScript(`previewSketch(${JSON.stringify(previewObj)})`)
      .catch(console.error);
  });

  webContents.on('sketchUpload', s => {
    let sketchName = s.sketchName;
    let exportType = s.type;

    let path = decodeURIComponent(document.path);
    let basePath = '/tmp/' + sketchName + '/';
    let zipUrl = basePath.substr(0, basePath.length - 1) + '.zip';
    util.mkdirpSync(basePath);
    util.mkdirpSync(basePath + 'sketch/');
    util.mkdirpSync(basePath + 'html/');
    let sketchFileUrl = basePath + 'sketch/' + sketchName + '.sketch';
    util.saveSketchFile([path, sketchFileUrl]).then(() => {
      const fileHash = String(
        NSFileManager.defaultManager()
        .contentsAtPath(sketchFileUrl)
        .sha1AsString()
      );
      let symbols = util.findPagesMaster(context);
      util.mkdirpSync(basePath + 'symbolpng');
      util.mkdirpSync(basePath + 'symbolsvg');
      symbols.forEach((symbol, item) => {
        util.captureLayerImage(context, symbol, basePath + 'symbolpng/' + symbol.name().replace(/\//ig, '_') + '.png');
        util.captureLayerImage(context, symbol, basePath + 'symbolsvg/' + symbol.name().replace(/\//ig, '_') + '.svg', 'svg');
      })

      if (exportType == 1) {

      } else if (exportType == 2) {
        generateHtml(sketchFileUrl, basePath + 'html/').then(() => {
          util.zipSketch([zipUrl, basePath.substr(0, basePath.length - 1)]).then(() => {
            let data = util.encodeBase64(zipUrl);
            webContents
              .executeJavaScript(`callSketchUpload(${JSON.stringify({sketchContent:data,md5:fileHash})})`)
              .catch(console.error);
          });
        });
      }


    });
  });


  webContents.on('openURL', s => {
    util.openURL(s);
  });


  webContents.on('closeWindow', s => {
    NSFileManager.defaultManager().removeItemAtPath_error('/tmp/' + sketchName, nil)
    browserWindow.close();
  });

  // browserWindow.loadURL('https://wedesign.oa.com/UploadSketch?sketch=1');
  browserWindow.loadURL('http://localhost:8081/UploadSketch?sketch=1');
}

export function onShutdown() {
  const existingWebview = getWebview(webviewIdentifier);
  if (existingWebview) {
    existingWebview.close();
  }
}
