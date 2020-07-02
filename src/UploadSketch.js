import * as fs from "@skpm/fs";
import path from "@skpm/path";
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
  let exportLayer = document.selectedPage;
  let pageId = document.selectedPage.id;
  if (document.selectedLayers.length === 1 && document.selectedLayers.layers[0].type === "Slice") {
    exportLayer = document.selectedLayers.layers[0];
    pageId = exportLayer.id;
  }
  const manifest = fs.readFileSync(path.resolve("./manifest.json"));
  const pluginVersion = JSON.parse(manifest).version;
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
  let previewPath;

  let previewObj = {
    documentId: documentId,
    scale: Settings.settingForKey("scale") || 1,
    unit: Settings.settingForKey("unit") || "px",
    md5: "",
    selected: [],
    pluginVersion: pluginVersion,
    pageName: document.selectedPage.name,
    all: []
  };

  try {
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
      sketch.export(exportLayer, {
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
      let webviewUrl = process.env.NODE_ENV === "development" ? "http://localhost:8081/UploadSketch" : "http://cloud.wedesign.oa.com/uploadSketch"
      browserWindow.loadURL(webviewUrl);
    });
  } catch (err) {
    onShutdown();
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
      let type = s.type || 1; //1：交互 2：视觉
      if (s.scale && s.unit) {
        console.log("save config");
        saveConfig(s.scale, s.unit);
      }
      let opt = {
        scale: s.scale || "1",
        unit: s.unit || "px",
        exportLayer: exportLayer
      }
      // 选中页面or全部页面
      let selected = s.page || "selected";
      let taskName = s.taskName; // sketch file与task同名;
      let imgIds;
      let sketchFileUrl = `${tmpPath}/${taskName}.sketch`;

      webContents
        .executeJavaScript("stage('导出缩略图...')")
        .catch(console.error);
      sketch.export(exportLayer, {
        output: previewPath,
        "save-for-web": true,
        "use-id-for-name": true,
        formats: picFormat,
        compression: 0.7,
        scales: 1
      });
      imgIds = [pageId];
      webContents
        .executeJavaScript("stage('导出中...')")
        .catch(console.error);

      util.saveSketchFile([decodeURIComponent(document.path), sketchFileUrl]).then(() => {
        // 处理sketch,保留所需page
        Document.open(sketchFileUrl, (err, newDocument) => {
          newDocument.pages = newDocument.pages.filter((page) => {
            return page.id === document.selectedPage.id || page.isSymbolsPage();
          })
          newDocument.save(sketchFileUrl, err => {
            //导出标注
            if (type == 2) {
              generateHtml(tmpPath + "/html", selected === "selected" ? document.selectedPage.id : "", opt);
              console.timeEnd("generate");
            }
            //流程通知
            webContents
              .executeJavaScript("stage('打包中...')")
              .catch(console.error);
            //打包上传
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
                  sketchName: `${taskName}.sketch`,
                  imgIds: imgIds
                })})`
                )
                .catch(err => {
                  console.error(err);
                });
              newDocument.close();
            }).catch(err => {
              console.error(err);
            });
          });
        })
      }).catch(err => console.log(err));
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
