if (!global._babelPolyfill) {
  require("babel-polyfill");
}

import * as fs from "@skpm/fs";
import BrowserWindow, { fromId } from "sketch-module-web-view";
import { getWebview } from "sketch-module-web-view/remote";
import UI from "sketch/ui";
import sketch from "sketch";
import { generateData } from "./export-symbol/generateData";
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

  setupWebAPI() {
    let libraryIndexesById = {};

    this.webContents.on("loadKit", (callbackName, progressCallbackName) => {
      console.time("test");
      generateData({
        onProgress: progress =>{
          this.runWebCallback(progressCallbackName, progress)
        }
      }).then(index => {
        this.runWebCallback(callbackName, index);
        console.timeEnd("test");
      }).catch(e =>{
        console.log(e);
      });
    });

    this.webContents.on("openUrl", url => {
      NSWorkspace.sharedWorkspace().openURL(NSURL.URLWithString(url));
    });

    this.webContents.on("close", () => this.browserWindow.close());
  }
}
