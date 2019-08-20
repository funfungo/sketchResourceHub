import * as fs from '@skpm/fs';

import BrowserWindow from 'sketch-module-web-view';
import { getWebview } from 'sketch-module-web-view/remote';
import UI from 'sketch/ui';

const webviewIdentifier = 'sketchresourcehub.webview';
const document = context.document;
const selection = context.selection;
let layer;

export default function() {
  layer = selection[0];

  let svgString = exportLayerAsBitmap(document, layer);
  console.log(svgString);
  console.log(typeof svgString);
  let exportFormat = {
    svg: svgString
  }

  const options = {
    identifier: webviewIdentifier,
    width: 900,
    height: 600,
    show: false
  };

  const browserWindow = new BrowserWindow(options);

  // only show the window when the page has loaded to avoid a white flash
  browserWindow.once('ready-to-show', () => {
    browserWindow.show();
  });

  const webContents = browserWindow.webContents;

  // print a message when the page loads
  webContents.on('did-finish-load', () => {
    UI.message('UI loaded!');
  });

  // add a handler for a call from web content's javascript
  webContents.on('nativeLog', s => {
    UI.message(s);
    webContents
      .executeJavaScript(`setRandomNumber(${JSON.stringify(exportFormat)})`)
      .catch(console.error);
  });

  browserWindow.loadURL(require('../resources/webview.html'));
}

function exportLayerAsBitmap(document, layer) {
  let slice,
    result = {},
    rect = layer.absoluteRect(),
    path = NSTemporaryDirectory() + layer.objectID() + '.svg';

  NSMakeRect(rect.x(), rect.y(), rect.width(), rect.height());
  result.width = rect.width();
  result.height = rect.height();
  slice = MSExportRequest.exportRequestsFromExportableLayer(
    layer
  ).firstObject();
  slice.page = document.currentPage();
  slice.setRect(rect.rect());
  slice.setShouldTrim(false);
  slice.setSaveForWeb(1);
  document.saveArtboardOrSlice_toFile(slice, path);

  return String(fs.readFileSync(path, 'utf8'));
}

// When the plugin is shutdown by Sketch (for example when the user disable the plugin)
// we need to close the webview if it's open
export function onShutdown() {
  const existingWebview = getWebview(webviewIdentifier);
  if (existingWebview) {
    existingWebview.close();
  }
}
