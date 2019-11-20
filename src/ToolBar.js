import * as fs from '@skpm/fs';

import BrowserWindow from 'sketch-module-web-view';
import { getWebview } from 'sketch-module-web-view/remote';
import UI from 'sketch/ui';
import sketch from 'sketch';


const webviewIdentifier = 'sketchresourcehub.webview';
const document = context.document;
const selection = context.selection;
var layer;

function addButton(rect, name, callAction) {
    var button = NSButton.alloc().initWithFrame(rect),
        image = getImage(rect.size, name);
    button.setImage(image);
    button.setBordered(false);
    button.sizeToFit();
    button.setButtonType(NSMomentaryChangeButton)
    button.setCOSJSTargetFunction(callAction);
    button.setAction("callAction:");
    return button;
}

function getImage(size, name) {
    var pluginSketch = context.plugin.url().URLByAppendingPathComponent("Contents").URLByAppendingPathComponent("Resources").URLByAppendingPathComponent("toolbar");
    var isRetinaDisplay = NSScreen.mainScreen().backingScaleFactor() > 1 ? true : false;
    var suffix = isRetinaDisplay ? '@2x' : '';
    var imageURL = pluginSketch.URLByAppendingPathComponent(name + suffix + '.png');
    var image = NSImage.alloc().initWithContentsOfURL(imageURL);
    return image;
}

export default function() {
  let contentView = context.document.documentWindow().contentView(),
          splitView = contentView.subviews().objectAtIndex(0),
          newStackView = NSStackView.alloc().initWithFrame(NSMakeRect(0, 0, 100, 0))
       splitView.insertArrangedSubview_atIndex(newStackView, 2)
   coscript.setShouldKeepAround(true);
   var closeButton = addButton(NSMakeRect(20, 53, 30, 30), "close",
        function (sender) {
          coscript.setShouldKeepAround(false);
          context.document.showMessage(1);
          newStackView.removeFromSuperview()
            // if (toolbarAuto != 'false') {
            //     var settingsWindow = dialog(context);
            //     settingsWindow.addButtonWithTitle(i18.m1);
            //     settingsWindow.addButtonWithTitle(i18.m2);
            //     settingsWindow.setMessageText(i18.m3);
            //     settingsWindow.addTextLabelWithValue(i18.m4);
            //     settingsWindow.addTextLabelWithValue(i18.m5);
            //     var response = settingsWindow.runModal();
            //     if (response == "1000") {
            //         NSUserDefaults.standardUserDefaults().setObject_forKey('true', toolbarAutoShow);
            //     } else {
            //         NSUserDefaults.standardUserDefaults().setObject_forKey('false', toolbarAutoShow);
            //     }
            // }
        });
    newStackView.addSubview(closeButton);

  // newStackView.removeFromSuperview()
}

export function onShutdown() {
  const existingWebview = getWebview(webviewIdentifier);
  if (existingWebview) {
    existingWebview.close();
  }
}
