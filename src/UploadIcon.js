import * as fs from '@skpm/fs';

import BrowserWindow from 'sketch-module-web-view';
import { getWebview } from 'sketch-module-web-view/remote';
import UI from 'sketch/ui';
import sketch from 'sketch';


const webviewIdentifier = 'sketchresourcehub.webview';
const document = context.document;
const selection = context.selection;
var layer;

export default function() {
  if(selection.length == 0 || selection.length > 1){
    return UI.message('请选择一个 Icon 上传');
  }else if(selection.length == 1){
    UI.message('加载中...');
  }
  layer = selection[0];

  let exportFormat = exportLayerAsBitmap(document, layer);

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
    // UI.message('UI loaded!');
  });


  webContents.on('showSvg', s => {
    webContents
      .executeJavaScript(`showSvg(${JSON.stringify(exportFormat)})`)
      .catch(console.error);
  });

  webContents.on('closeWindow', s => {
    browserWindow.close();
  });


  browserWindow.loadURL('https://wedesign.oa.com/UploadIcon?sketch=1');
}

function exportLayerAsBitmap(document, layer) {
  let slice,
    rect = layer.absoluteRect(),
    path = NSTemporaryDirectory() + layer.objectID() + '.svg';

  NSMakeRect(rect.x(), rect.y(), rect.width(), rect.height());

  slice = MSExportRequest.exportRequestsFromExportableLayer(
    layer
  ).firstObject();
  slice.page = document.currentPage();
  slice.setRect(rect.rect());
  slice.setShouldTrim(false);
  slice.setSaveForWeb(1);
  document.saveArtboardOrSlice_toFile(slice, path);
  let ret = {
    IconContent: encodeURIComponent(String(fs.readFileSync(path, 'utf8'))),
    IconName: encodeURIComponent(layer.name()),
    Width: rect.width(),
    Height: rect.height()
  }

  return ret;
}

export function onShutdown() {
  const existingWebview = getWebview(webviewIdentifier);
  if (existingWebview) {
    existingWebview.close();
  }
}
