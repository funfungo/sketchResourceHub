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

const webviewIdentifier = "wecloud.webview";
const Document = require("sketch/dom").Document;
const Settings = require('sketch/settings')
const picFormat = "jpg";
let tmpPath, zipUrl;
if (!Settings.settingForKey('scale')) {
  Settings.setSettingForKey('scale', 1)
  Settings.setSettingForKey('unit', "px")
}
export default function () {
  const document = require("sketch/dom").getSelectedDocument();
  const documentId = document.id;
  const documentName = decodeURIComponent(
    document.path.substr(document.path.lastIndexOf("/") + 1)
  );
  console.log(documentId);
  const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const options = {
    parent: sketch.getSelectedDocument(),
    // modal: true,
    identifier: webviewIdentifier,
    width: 320,
    height: 785,
    show: false,
    // frame: false,
    // titleBarStyle: "hidden",
    remembersWindowFrame: true,
    movable: true,
    alwaysOnTop: true,
    minimizable: false,
    maximizable: false
  };
  const browserWindow = new BrowserWindow(options);
  let fileHash;
  let imgAll = [];
  let previewPath;
  let pageId = document.selectedPage.id;

  let previewObj = {
    documentId: documentId,
    documentName: documentName,
    scale: Settings.settingForKey("scale") || 1,
    unit: Settings.settingForKey("unit") || "px",
    md5: "",
    selected: [],
    pluginVersion: "0.0.2",
    pageName: document.selectedPage.name,
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
      let webviewUrl = process.env.NODE_ENV === "development" ? "http://localhost:8081/UploadSketch" : "https://wedesign.oa.com/uploadSketch"
      browserWindow.loadURL(webviewUrl);
    });
  } catch (err) {
    console.error(err);
  }

  browserWindow.once("ready-to-show", () => {
    browserWindow.show();
  });

  browserWindow.once("closed", () => {
    NSFileManager.defaultManager().removeItemAtPath_error(tmpPath, nil);
    NSFileManager.defaultManager().removeItemAtPath_error(zipUrl, nil);
  })

  const webContents = browserWindow.webContents;
  webContents.on("did-finish-load", () => {});
  webContents.on("readyForData", () => {
    webContents
      .executeJavaScript(`previewSketch(${JSON.stringify(previewObj)})`)
      .catch(console.error);
  })
  webContents.on("sketchUpload", s => {
    try {
      // 交互or视觉
      let type = s.type || 1; //1：交互 2：视觉
      if (s.scale && s.unit) {
        console.log("save config");
        saveConfig(s.scale, s.unit);
      }
      let opt = {
        scale: s.scale || "1",
        unit: s.unit || "px"
      }
      // 选中页面or全部页面
      let selected = s.page || "selected";
      let taskName = s.taskName; // sketch file与task同名;
      // let taskName = documentName.split(".")[0];
      let sketchFileUrl = `${tmpPath}/${documentName}`;
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
        .executeJavaScript("stage('导出中...')")
        .catch(console.error);
      console.time("time");
      util.saveSketchFile([decodeURIComponent(document.path), sketchFileUrl]).then(() => {
        console.timeEnd("time");
        if (type == 2) {
          console.time("generate");
          generateHtml(tmpPath + "/html", selected === "selected" ? document.selectedPage.id : "", opt);
          //todo generate symbol icons
          console.timeEnd("generate");
        }
        webContents
          .executeJavaScript("stage('打包中...')")
          .catch(console.error);
        util.zipSketch([zipUrl, tmpPath]).then(() => {
          let data = util.encodeBase64(zipUrl);
          webContents
            .executeJavaScript(
              `callSketchUpload(${JSON.stringify({
          documentId: documentId,
          format: picFormat,
          md5: fileHash,
          taskName: taskName,
          sketchContent: data,
          sketchName: documentName,
          imgIds: imgIds
        })})`
            )
            .catch(err => {
              console.error(err);
            });
        }).catch(err => {
          console.error(err);
        });
      })
    } catch (err) {
      webContents
        .executeJavaScript("emitError('出错啦...')")
        .catch(console.error);
      setTimeout(onShutdown, 2000);
    }
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


function saveConfig(scale, unit) {
  Settings.setSettingForKey('scale', scale);
  Settings.setSettingForKey('unit', unit);
}

export function onShutdown() {
  NSFileManager.defaultManager().removeItemAtPath_error(tmpPath, nil);
  NSFileManager.defaultManager().removeItemAtPath_error(zipUrl, nil);
  const existingWebview = getWebview(webviewIdentifier);
  if (existingWebview) {
    existingWebview.close();
  }
}
