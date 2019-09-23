import * as fs from '@skpm/fs';

import BrowserWindow from 'sketch-module-web-view';
import { getWebview } from 'sketch-module-web-view/remote';
import UI from 'sketch/ui';
import sketch from 'sketch';
const webviewIdentifier = 'sketchresourcehub.webview';
const document = context.document;
const selection = context.selection;
let layer;


// 图标库
export default function() {
  const options = {
    identifier: webviewIdentifier,
    width: 900,
    height: 600
    // show: false,
    // frame: false
  };

  const browserWindow = new BrowserWindow(options);
  browserWindow.setResizable(false);

  browserWindow.once('ready-to-show', () => {
    browserWindow.show();
  });

  const webContents = browserWindow.webContents;

  webContents.on('did-finish-load', () => {
    UI.message('UI loaded!');
  });

  webContents.on('close', () => {
    browserWindow.close();
  });

  browserWindow.on('blur', () => {
    // browserWindow.close();
  });
  var url = '../Resources/pages/symbol-master/index.html';
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
