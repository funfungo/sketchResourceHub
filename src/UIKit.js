if (!global._babelPolyfill) {
  require("babel-polyfill");
}

import * as fs from "@skpm/fs";
import path from '@skpm/path';
import BrowserWindow, { fromId } from "sketch-module-web-view";
import { getWebview } from "sketch-module-web-view/remote";
import { generateData } from "./export-symbol/generateData";
import * as libraries from './export-symbol/libraries';
import * as util from './export-symbol/util';
const webviewIdentifier = "sketchresourcehub.webview";
const document = context.document;
const selection = context.selection;
let layer;

const THREAD_DICT_KEY = "WeuiUIKit.BrowserWindow";

export default function() {
  // const browserWindow = new BrowserWindow(options);
  // browserWindow.setResizable(false);

  // browserWindow.once("ready-to-show", () => {
  //   browserWindow.show();
  // });

  // const webContents = browserWindow.webContents;

  // webContents.on("did-finish-load", () => {
  //   UI.message("UI loaded!");
  //   generateData();
  // });

  // webContents.on("close", () => {
  //   browserWindow.close();
  // });

  // browserWindow.on("blur", () => {
  //   browserWindow.close();
  // });
  // var url = "../Resources/pages/symbol-master/index.html";
  // browserWindow.loadURL(url);

  let window = new UIKit(context);
  window.showHide();
}

// When the plugin is shutdown by Sketch (for example when the user disable the plugin)
// we need to close the webview if it's open
export function onShutdown() {
  const existingWebview = getWebview(webviewIdentifier);
  if (existingWebview) {
    existingWebview.close();
  }
}

class UIKit {
  constructor(context) {
    this.context = context;
  }
  /**
   * Shows or hides the Stickers window (if already shown).
   * The state is stored in the main thread's threadDictionary.
   */
  showHide() {
    let browserWindow = this.getPersistedObj();
    if (browserWindow) {
      browserWindow.close();
      this.setPersistedObj(null);
    } else {
      this.createAndShow();
    }
  }

  createAndShow() {
    let docWindow = this.context.document.documentWindow();
    this.browserWindow = new BrowserWindow({
      backgroundColor: "#ffffffff",
      identifier: webviewIdentifier,
      width: 800,
      height: 600,
      show: false,
      alwaysOnTop: true,
      frame: true,
      hasShadow: true,
      acceptsFirstMouse: true
    });

    this.webContents = this.browserWindow.webContents;
    this.setupWebAPI();

    this.browserWindow.on("closed", () => {
      this.setPersistedObj(null);
      coscript.setShouldKeepAround(false);
    });

    this.browserWindow.on("blur", () => {
      this.browserWindow.close();
    });

    // this.browserWindow.setResizable(false);
    // this.browserWindow._panel.setFrame_display_animate_(
    //   docWindow.frame(),
    //   false,
    //   false
    // );

    this.browserWindow._panel.setHidesOnDeactivate(false);

    this.browserWindow.once("ready-to-show", () => {
      this.browserWindow.show();
      docWindow.addChildWindow_ordered_(
        this.browserWindow._panel,
        NSWindowAbove
      );
    });

    this.browserWindow.loadURL("../Resources/pages/symbol-master/index.html");
    this.setPersistedObj(this.browserWindow);
  }

  getPersistedObj() {
    let threadDict = NSThread.mainThread().threadDictionary();
    return threadDict[THREAD_DICT_KEY];
  }

  setPersistedObj(obj) {
    let threadDict = NSThread.mainThread().threadDictionary();
    if (obj) {
      threadDict[THREAD_DICT_KEY] = obj;
    } else {
      threadDict.removeObjectForKey(THREAD_DICT_KEY);
    }
  }

  runWebCallback(callbackName, ...args) {
    let js =
      `window['${callbackName}'](` +
      args.map(arg => JSON.stringify(arg)).join(", ") +
      `);`;
    try {
      this.webContents.executeJavaScript(js).catch(console.error);
    } catch (e) {
      log(e.message);
      log(e);
    }
  }

  getStickerCachedImagePath(stickerId) {
    let [libraryId, layerId] = stickerId.split(/\./, 2);
    return path.join(util.getPluginCachePath(), libraryId, layerId + '.png');
  }


  getStickerCachedContentPath(stickerId) {
    let [libraryId, layerId] = stickerId.split(/\./, 2);
    return path.join(util.getPluginCachePath(), libraryId, layerId + '.json');
  }

  /**
   * Triggers the beginning of a drag operation on the given sticker ID
   */
  startDragging(libraryId, archiveVersion, stickerId, rect, srcView) {
    let library = libraries.getLibraryById(libraryId, { onlyEnabled: true });
    let image = NSImage.alloc().initWithContentsOfFile(
      this.getStickerCachedImagePath(stickerId)
    );

    // deserialize layer
    let serializedLayerJson = fs.readFileSync(
      this.getStickerCachedContentPath(stickerId),
      { encoding: "utf8" }
    );
    let decodedImmutableObj = MSJSONDataUnarchiver.unarchiveObjectWithString_asVersion_corruptionDetected_error(
      serializedLayerJson,
      archiveVersion || 999,
      null,
      null
    );
    let layer = decodedImmutableObj.newMutableCounterpart();

    // create a dummy document and import the layer into it, so that
    // foreign symbols can be created in it and sent along with the layer
    // to the pasteboard
    let dummyDocData = MSDocumentData.alloc().init();
    dummyDocData.addBlankPage().addLayer(layer);

    // import any symbols and shared styles used in library (either from the library itself or
    // other libraries referenced from the library... i.e. nested libraries)
    libraries.replaceSymbolsAndSharedStylesInLayerWithLibrary(
      dummyDocData,
      layer,
      library
    );

    // initiate cocoa drag operation
    // let pbItem = NSPasteboardItem.new();
    // pbItem.setData_forType_(
    //     image.TIFFRepresentation(),
    //     NSPasteboardTypePNG);
    let dragItem = NSDraggingItem.alloc().initWithPasteboardWriter(image);
    // pbItem.release();
    dragItem.setDraggingFrame_contents_(
      NSMakeRect(0, 0, rect.width, rect.height),
      image
    );
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
      NSArray.arrayWithObject(dragItem.autorelease()),
      event,
      srcView
    );
    draggingSession.setAnimatesToStartingPositionsOnCancelOrFail(false);
    draggingSession.setDraggingFormation(NSDraggingFormationNone);

    // copy to pasteboard
    let dpb = NSPasteboard.pasteboardWithName(NSDragPboard);
    dpb.clearContents();
    try {
      let newPbLayers = MSPasteboardLayers.pasteboardLayersWithLayers([layer]);
      MSPasteboardManager.writePasteboardLayers_toPasteboard(newPbLayers, dpb);
    } catch (err) {
      throw err;
    }
  }

  setupWebAPI() {
    let libraryIndexesById = {};

    this.webContents.on("loadKit", (callbackName, progressCallbackName) => {
      console.time("test");
      generateData({
        onProgress: progress => {
          this.runWebCallback(progressCallbackName, progress);
        }
      })
        .then(index => {
          index.libraries.forEach(libraryIndex => {
            libraryIndexesById[libraryIndex.id] = libraryIndex;
          });
          this.runWebCallback(callbackName, index);
          console.timeEnd("test");
        })
        .catch(e => {
          log(e);
        });
    });

    this.webContents.on("requestLayerImageUrl", (id, callbackName) => {
      let imagePath = this.getStickerCachedImagePath(id);
      // let url = nsImageToDataUri(NSImage.alloc().initWithContentsOfFile(imagePath));
      let url = "file://" + imagePath;
      this.runWebCallback(callbackName, id, url);
    });

    // add a handler for a call from web content's javascript
    this.webContents.on("startDragging", (section) => {
      console.log(section);
      let rect = {
        width: section.width,
        height: section.height
      }
      try {
        let [libraryId, layerId] = section.id.split(/\./, 2);
        let archiveVersion = libraryIndexesById[libraryId].archiveVersion;
        this.startDragging(
          libraryId,
          archiveVersion,
          section.id,
          rect,
          this.browserWindow._webview
        );
      } catch (e) {
        // TODO: do this everywhere somehow
        log(e.message);
        log(e);
      }
      this.browserWindow.close();
    });

    this.webContents.on("openUrl", url => {
      NSWorkspace.sharedWorkspace().openURL(NSURL.URLWithString(url));
    });

    this.webContents.on("close", () => this.browserWindow.close());
  }

}
