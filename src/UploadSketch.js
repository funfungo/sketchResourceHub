import * as fs from "@skpm/fs";

import BrowserWindow from "sketch-module-web-view";
import {
  getWebview
} from "sketch-module-web-view/remote";
import sketch from "sketch";
import * as util from "./util";
import {
  generateHtml
} from "./GenerateHtml";

const webviewIdentifier = "sketchresourcehub.webview";
const Document = require("sketch/dom").Document;
export default function () {
  const document = require("sketch/dom").getSelectedDocument();
  const documentId = document.id;
  const documentName = decodeURIComponent(
    document.path.substr(document.path.lastIndexOf("/") + 1)
  );
  console.log(documentId);

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
  let fileHash;
  let imgAll = [];
  let tmpPath, zipUrl, previewPath;

  let previewObj = {
    documentId: documentId,
    documentName: documentName,
    md5: "",
    selected: [],
    all: []
  };
  //先保存文件
  document.save(err => {
    fileHash = String(
      NSFileManager.defaultManager()
      .contentsAtPath(decodeURIComponent(document.path))
      .sha1AsString()
    );
    tmpPath = "/tmp/" + documentId + "_" + fileHash;
    previewObj.md5 = fileHash;
    zipUrl = tmpPath + ".zip";
    previewPath = tmpPath + "/preview/";

    //export page preview
    sketch.export(document.pages, {
      output: previewPath,
      "save-for-web": true,
      "use-id-for-name": true,
      formats: "jpg",
      compression: 1.0,
      scales: 0.2 // preview img compress
    });

    document.pages.forEach(page => {
      //skip symbol master page
      if (page.isSymbolsPage()) return;
      imgAll.push(page.id); //记录所有page的id
      let previewImg = previewPath + page.id + "@0.2x.jpg";
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

    //debug
    // console.time("generate");
    // generateHtml(tmpPath + "/html", document.selectedPage.id);
    // console.timeEnd("generate");

    // browserWindow.loadURL('https://wedesign.oa.com/uploadSketch?sketch=1');
    browserWindow.loadURL("http://localhost:8081/UploadSketch?sketch=1");
  });


  browserWindow.once("ready-to-show", () => {
    browserWindow.show();
  });

  const webContents = browserWindow.webContents;
  webContents.on("did-finish-load", () => {
  });
  webContents.on("readyForData", () => {
    webContents
      .executeJavaScript(`previewSketch(${JSON.stringify(previewObj)})`)
      .catch(console.error);
  })
  webContents.on("sketchUpload", s => {
    // 交互or视觉
    let type = s.type || 1; //1：交互 2：视觉
    // 选中页面or全部页面
    let selected = s.page || "selected";
    let sketchFileUrl = tmpPath + "/" + documentName;
    let imgIds;

    // 导出上传页面两倍缩略图（文件大时耗时长，尽量单个页面上传）
    console.time("export");
    if (selected === "selected") {
      sketch.export(document.selectedPage, {
        output: previewPath,
        "save-for-web": true,
        "use-id-for-name": true,
        formats: "jpg",
        compression: 0.7,
        scales: 1
      });
      imgIds = [document.selectedPage.id];
    } else {
      sketch.export(document.pages, {
        output: previewPath,
        "save-for-web": true,
        "use-id-for-name": true,
        formats: "jpg",
        compression: 0.7,
        scales: 1,
      });
      imgIds = imgAll;
    }
    console.timeEnd("export");
    console.log(imgIds);
    util.saveSketchFile([decodeURIComponent(document.path), sketchFileUrl]).then(() => {
      if (type == 2) {
        console.time("generate");
        generateHtml(tmpPath + "/html", selected === "selected" ? document.selectedPage.id : "");
        //todo generate symbol icons
        console.timeEnd("generate");
      }
      // 压缩上传到web
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
    })

  });

  webContents.on("openURL", s => {
    util.openURL(s);
  });

  webContents.on("closeWindow", s => {
    NSFileManager.defaultManager().removeItemAtPath_error(tmpPath, nil);
    NSFileManager.defaultManager().removeItemAtPath_error(zipUrl, nil);
    browserWindow.close();
  });

}

export function onShutdown() {
  const existingWebview = getWebview(webviewIdentifier);
  if (existingWebview) {
    existingWebview.close();
  }
}
