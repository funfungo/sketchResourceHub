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
const picFormat = "jpg";

export default function () {
  const document = require("sketch/dom").getSelectedDocument();
  const documentId = document.id;
  const documentName = decodeURIComponent(
    document.path.substr(document.path.lastIndexOf("/") + 1)
  );
  console.log(documentId);
  const pages = document.pages;
  const selectedPage = document.selectedPage;
  const options = {
    parent: sketch.getSelectedDocument(),
    modal: true,
    identifier: webviewIdentifier,
    width: 400,
    height: 1000,
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
  let pageId, pageName;

  let previewObj = {
    documentId: documentId,
    documentName: documentName,
    md5: "",
    selected: [],
    all: []
  };
  try {
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
      pageId = document.selectedPage.id;
      pageName = document.selectedPage.name;
      // 先去掉不需要上传的页面
      document.pages.forEach(page => {
        if (page.id === pageId || page.isSymbolsPage()) {
          return;
        };
        page.remove();
      })
      //export page preview
      sketch.export(document.selectedPage, {
        output: previewPath,
        "save-for-web": true,
        "use-id-for-name": true,
        formats: picFormat,
        compression: 1.0,
        scales: 0.2 // preview img compress
      });
      let previewImg = `${previewPath}${pageId}@0.2x.jpg`;
      let url = NSURL.fileURLWithPath(previewImg),
        bitmap = NSData.alloc().initWithContentsOfURL(url),
        base64 = bitmap.base64EncodedStringWithOptions(0) + "";
      let img = {
        name: pageId,
        base64: "data:image/jpg;base64," + base64
      };
      previewObj.selected.push(img);
      // browserWindow.loadURL('https://wedesign.oa.com/uploadSketch');
      browserWindow.loadURL("http://localhost:8081/UploadSketch");
    });
  } catch (err) {
    console.error(err);
  }

  browserWindow.once("ready-to-show", () => {
    browserWindow.show();
  });

  const webContents = browserWindow.webContents;
  webContents.on("did-finish-load", () => {});
  webContents.on("readyForData", () => {
    webContents
      .executeJavaScript(`previewSketch(${JSON.stringify(previewObj)})`)
      .catch(console.error);
  })
  webContents.on("sketchUpload", s => {
    // 交互or视觉
    let type = s.type || 1; //1：交互 2：视觉
    let opt = {
      scale: s.scale || "1",
      unit: s.unit || "px"
    }
    // 选中页面or全部页面
    let selected = s.page || "selected";
    let taskName = s.taskName; // sketch file与task同名;
    let sketchFileUrl = tmpPath + "/" + taskName + ".sketch";
    let imgIds;
    webContents
      .executeJavaScript("stage('导出缩略图...')")
      .catch(console.error);

    if (selected === "selected") {
      sketch.export(document.selectedPage, {
        output: previewPath,
        "save-for-web": true,
        "use-id-for-name": true,
        formats: picFormat,
        compression: 0.7,
        scales: 1
      });
      imgIds = [document.selectedPage.id];
    } else {
      sketch.export(document.pages, {
        output: previewPath,
        "save-for-web": true,
        "use-id-for-name": true,
        formats: picFormat,
        compression: 0.7,
        scales: 1,
      });
      imgIds = imgAll;
    }

    webContents
      .executeJavaScript("stage('打包中...')")
      .catch(console.error);

    console.time("time");
    document.save(sketchFileUrl, {
      saveMode: Document.SaveMode.SaveTo,
    }, err => {
      console.timeEnd("time");
      if (type == 2) {
        webContents
          .executeJavaScript("stage('导出标注中...')")
          .catch(console.error);
        console.time("generate");
        generateHtml(tmpPath + "/html", selected === "selected" ? document.selectedPage.id : "", opt);
        //todo generate symbol icons
        console.timeEnd("generate");
      }

      util.zipSketch([zipUrl, tmpPath]).then(() => {
        let data = util.encodeBase64(zipUrl);
        webContents
          .executeJavaScript(
            `callSketchUpload(${JSON.stringify({
          documentId: documentId,
          format: picFormat,
          md5: fileHash,
          sketchContent: data,
          sketchName: `${taskName}.sketch`,
          imgIds: imgIds
        })})`
          )
          .catch(console.error);
      });
    });
  });

  webContents.on("openURL", s => {
    util.openURL(s);
  });

  webContents.on("closeWindow", s => {
    NSFileManager.defaultManager().removeItemAtPath_error(tmpPath, nil);
    NSFileManager.defaultManager().removeItemAtPath_error(zipUrl, nil);
    document.pages = pages;
    document.selectedPage = selectedPage;
    browserWindow.close();
  });
}

export function onShutdown() {
  const existingWebview = getWebview(webviewIdentifier);
  if (existingWebview) {
    existingWebview.close();
  }
}
