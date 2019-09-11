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
  UI.message('加载中');
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
    // UI.message('UI loaded!');
  });


  webContents.on('sendImage', data => {
    let path = NSTemporaryDirectory() + data.IconName;
    let srcView = browserWindow._webview;
    fs.writeFileSync(path, data.IconContent);
    let image = NSURL.fileURLWithPath(path);
    let dragItem = NSDraggingItem.alloc().initWithPasteboardWriter(image);

    dragItem.setDraggingFrame_contents_(NSMakeRect(0, 0, 100, 100), image);
    let mouse = NSEvent.mouseLocation();
    let event = NSEvent.eventWithCGEvent(
      CGEventCreateMouseEvent(
        null,
        kCGEventLeftMouseDown,
        CGPointMake(
          mouse.x - srcView.window().frame().origin.x,
          NSHeight(
            NSScreen.screens()
              .firstObject()
              .frame()
          ) -
            mouse.y +
            srcView.window().frame().origin.y
        ),
        kCGMouseButtonLeft
      )
    );
    let draggingSession = srcView.beginDraggingSessionWithItems_event_source_(
        NSArray.arrayWithObject(dragItem.autorelease()), event, srcView);
    draggingSession.setAnimatesToStartingPositionsOnCancelOrFail(false);
    draggingSession.setDraggingFormation(NSDraggingFormationNone);

    let layer = createSymbolLayer(data);
    let dpb = NSPasteboard.pasteboardWithName(NSDragPboard);
    dpb.clearContents();
    try {
      let newPbLayers = MSPasteboardLayers.pasteboardLayersWithLayers([layer]);
      MSPasteboardManager.writePasteboardLayers_toPasteboard(newPbLayers, dpb);
    } catch (err) {
      throw err;
    }

    browserWindow.close();

  });

  webContents.on('close', () => {
    browserWindow.close();
  });

  browserWindow.on('blur', () => {
    // browserWindow.close();
  });
  var url = 'https://wedesign.oa.com/IconList?sketch=1';
  log(url);
  browserWindow.loadURL(url);
}

/**
* @name getViewBox
* @description get viewBox bound of svg file
* @param svgData
* @returns {width: ,height:}
*/
function getViewBox(svgData) {
  let viewBox = svgData.match(/viewBox="(.*?)"/gm);
  let size;
  let result;
  if (Array.isArray(viewBox)) {
    size = viewBox[0].match(/[+\-]?(?:0|[1-9]\d*)(?:\.\d*)?(?:[eE][+\-]?\d+)?/g);
    result = { width: parseFloat(size[2]), height: parseFloat(size[3]) };
  }

  return result;
}

/**
* @name addRectToResize
* @description add rect to keep proportion on resize
* @param svgString
* @param viewBox
* @returns {String}
*/

function addRectToResize(svgString, viewBox) {
  const addrect = `<rect width="${viewBox.width}" height="${viewBox.height}" id="delete-me"/></svg>`;
  return NSString.stringWithString(svgString.replace('</svg>', addrect));
}

/**
 * @name removeDeleteMeRect
 * @description remove rect used to keep proportion on resize
 * @param rootObject
 * @returns {*}
 */
function removeDeleteMeRect(rootObject) {
  const scope = rootObject.children(),
    predicateTextLayers = NSPredicate.predicateWithFormat('(name == %@)', 'delete-me');
  const layers = scope.filteredArrayUsingPredicate(predicateTextLayers);

  if (!layers.length)
    return rootObject
      .firstLayer()
      .lastLayer()
      .removeFromParent();

  const loop = layers.objectEnumerator();
  let layer;
  while ((layer = loop.nextObject())) {
    layer.removeFromParent();
  }
}


/**
* @name createSymbolLayer
* @description format symbolLayer from svg data
* @param data svg xml data
* @returns {*}
*/
function createSymbolLayer(data){
  // get original svg viewBox
  let viewBox = getViewBox(data.IconContent);
  let svgString = NSString.stringWithString(data.IconContent);

  // keep original size by adding a redundant rect
  let svgData = addRectToResize(svgString, viewBox);

  // export layer
  let svgImporter = MSSVGImporter.svgImporter();
  svgImporter.prepareToImportFromData(svgData.dataUsingEncoding(NSUTF8StringEncoding));
  let svgLayer = svgImporter.importAsLayer();
  svgLayer.setName(data.IconName);

  //add meta info to track icon update
  // Settings.setLayerSettingForKey(svgLayer,'id',data.id);
  // Settings.setLayerSettingForKey(svgLayer,'md5',data.md5);

  // remove the redundant rect;
  removeDeleteMeRect(svgLayer);
  return svgLayer;
}


// When the plugin is shutdown by Sketch (for example when the user disable the plugin)
// we need to close the webview if it's open
export function onShutdown() {
  const existingWebview = getWebview(webviewIdentifier);
  if (existingWebview) {
    existingWebview.close();
  }
}
