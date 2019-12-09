import * as fs from "@skpm/fs";

import BrowserWindow from "sketch-module-web-view";
import { getWebview } from "sketch-module-web-view/remote";
import UI from "sketch/ui";
import sketch from "sketch";
import * as util from "./util";
import { generateHtml } from "./GenerateHtml";

const webviewIdentifier = "sketchresourcehub.webview";
const Document = require("sketch/dom").Document;
export default function() {
  const document = require("sketch/dom").getSelectedDocument();
  const documentId = document.id;
  const documentName = decodeURIComponent(
    document.path.substr(document.path.lastIndexOf("/") + 1)
  );

  const fileHash = String(
    NSFileManager.defaultManager()
      .contentsAtPath(decodeURIComponent(document.path))
      .sha1AsString()
  );

  //using system temp path;
  const tmpPath = "/tmp/" + documentId + "_" + fileHash;
  const zipUrl = tmpPath + ".zip";

  //TODO 判断文件夹已存在，不再重复导出

  const previewPath = tmpPath + "/preview/";
  
  const imgIds = [];

  //export page preview
  let scale = 0.5;
  sketch.export(document.pages, {
    output: previewPath,
    format: "png",
    "save-for-web": true,
    "use-id-for-name": true,
    scales: scale // preview img compress
  });

  let previewObj = {
    id: documentId,
    selected: [],
    all: []
  };
  //format data
  document.pages.forEach(page => {
    //skip symbol master page
    if (page.isSymbolsPage()) return;
    imgIds.push(page.id); //记录所有page的id
    let previewImg = previewPath + page.id + "@" + scale + "x.png";
    let url = NSURL.fileURLWithPath(previewImg),
      bitmap = NSData.alloc().initWithContentsOfURL(url),
      base64 = bitmap.base64EncodedStringWithOptions(0) + "";

    let img = {
      name: page.id,
      base64: "data:image/jpg;base64," + base64
    };
    previewObj.all.push(img);
    if (page.selected) {
      previewObj.selected.push(img);
    }
  });

  const options = {
    parent: sketch.getSelectedDocument(),
    modal: true,
    identifier: webviewIdentifier,
    width: 400,
    height: 900,
    show: false,
    frame: false,
    titleBarStyle: "hiddenInset",
    minimizable: false,
    maximizable: false
  };

  const browserWindow = new BrowserWindow(options);

  browserWindow.once("ready-to-show", () => {
    browserWindow.show();
  });

  const webContents = browserWindow.webContents;
  webContents.on("did-finish-load", () => {
    webContents
      .executeJavaScript(`previewSketch(${JSON.stringify(previewObj)})`)
      .catch(console.error);
  });

  webContents.on("sketchUpload", s => {
    let type = s.type || 1;
    let selected = s.page || "selected";

    let sketchFileUrl = tmpPath + "/" + documentName;

    console.time("export");
    if (selected === "selected") {
      sketch.export(document.selectedPage, {
        output: previewPath,
        format: "png",
        "save-for-web": true,
        "use-id-for-name": true,
        scales: 2
      });
      imgIds = [document.selectedPage.id];
    } else {
      sketch.export(document.pages, {
        output: previewPath,
        format: "png",
        "save-for-web": true,
        "use-id-for-name": true,
        scales: 2
      });
    }
    console.timeEnd("export");

    util.saveSketchFile([document.path, sketchFileUrl]).then(() => {
      if (type === 2) {
        // 设计稿导出标注
        // 导出symbol icons
        let symbols = util.findPagesMaster(context);
        util.mkdirpSync(tmpPath + "/symbolpng");
        util.mkdirpSync(tmpPath + "/symbolsvg");
      }

      util.zipSketch([zipUrl, tmpPath]).then(() => {
        let data = util.encodeBase64(zipUrl);
        webContents
          .executeJavaScript(
            `callSketchUpload(${JSON.stringify({
              documentId: documentId,
              md5: fileHash,
              sketchContent: data,
              sketchName: documentName,
              imgIds: imgIds
            })})`
          )
          .catch(console.error);
      });
    });

    // util.saveSketchFile([path, sketchFileUrl]).then(() => {
    //   const fileHash = String(
    //     NSFileManager.defaultManager()
    //       .contentsAtPath(sketchFileUrl)
    //       .sha1AsString()
    //   );

    //   symbols.forEach((symbol, item) => {
    //     util.captureLayerImage(
    //       context,
    //       symbol,
    //       basePath + "symbolpng/" + symbol.name().replace(/\//gi, "_") + ".png"
    //     );
    //     util.captureLayerImage(
    //       context,
    //       symbol,
    //       basePath + "symbolsvg/" + symbol.name().replace(/\//gi, "_") + ".svg",
    //       "svg"
    //     );
    //   });

    // generateHtml(sketchFileUrl, basePath + "html/").then(() => {
    //       util
    //         .zipSketch([zipUrl, basePath.substr(0, basePath.length - 1)])
    //         .then(() => {
    //           let data = util.encodeBase64(zipUrl);
    //           webContents
    //             .executeJavaScript(
    //               `callSketchUpload(${JSON.stringify({
    //                 sketchContent: data,
    //                 md5: fileHash
    //               })})`
    //             )
    //             .catch(console.error);
    //         });
    //     });
    // });
  });

  webContents.on("openURL", s => {
    util.openURL(s);
  });

  webContents.on("closeWindow", s => {
    NSFileManager.defaultManager().removeItemAtPath_error(zipUrl, nil);
    browserWindow.close();
  });

  // browserWindow.loadURL('https://wedesign.oa.com/UploadSketch?sketch=1');
  browserWindow.loadURL("http://localhost:8081/UploadSketch?sketch=1");
}

export function onShutdown() {
  const existingWebview = getWebview(webviewIdentifier);
  if (existingWebview) {
    existingWebview.close();
  }
}
