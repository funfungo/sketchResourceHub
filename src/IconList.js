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
  UI.message('加载中...');
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
    browserWindow.close();
    
  });

  webContents.on('close', () => {
    browserWindow.close();
  });

  browserWindow.on('blur', () => {
    browserWindow.close();
  });

  browserWindow.loadURL('https://wedesign.oa.com/IconList?sketch=1');
}


// When the plugin is shutdown by Sketch (for example when the user disable the plugin)
// we need to close the webview if it's open
export function onShutdown() {
  const existingWebview = getWebview(webviewIdentifier);
  if (existingWebview) {
    existingWebview.close();
  }
}