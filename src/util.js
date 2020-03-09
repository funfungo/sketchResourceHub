import child_process from '@skpm/child_process'; // ⚠️ The version 0.4.* requires Sketch 54 or above
import * as fs from '@skpm/fs';
import path from '@skpm/path';

export function rgb(a) {
  if(a.indexOf('rgba(') > -1){
    var rgba = a.replace('rgba(','').replace(')','');
    rgba = rgba.replace(/\s/g,"").split(',');
    return rgba;
  }else{
    var sColor = a.toLowerCase();
      if (sColor.length === 4) {
          var sColorNew = "#";
          for (var i = 1; i < 4; i += 1) {
              sColorNew += sColor.slice(i, i + 1).concat(sColor.slice(i, i + 1));
          }
          sColor = sColorNew;
      }
      //处理六位的颜色值
      var sColorChange = [];
      for (var i = 1; i < 7; i += 2) {
          sColorChange.push(parseInt("0x" + sColor.slice(i, i + 2)));
      }
      return sColorChange;
  }
}

export function getLibraries() {
  let libraries = Array.from(NSApp.delegate().librariesController().libraries())
  .filter(lib => !!lib.locationOnDisk() && !!lib.enabled() && !!lib.libraryID())
  .map(lib => ({
    libraryId: String(lib.libraryID()),
    name: String(lib.name()),
    sketchFilePath: String(lib.locationOnDisk().path()),
  }))
  .filter((lib, index, self) => {
    let firstWithId = self.findIndex(l => l.libraryId === lib.libraryId) === index;
    if (!firstWithId) {
    }
    return firstWithId;
  });
  return libraries;
}

export function loadDocFromSketchFile(filePath) {
  let doc = MSDocument.new();
  doc.readDocumentFromURL_ofType_error_(
      NSURL.fileURLWithPath(filePath),
      'com.bohemiancoding.sketch.drawing',
      null);
  
  return doc;
}

export function getLayerImage(context, layer) {
  let tempPath = NSTemporaryDirectory().stringByAppendingPathComponent(
      NSUUID.UUID().UUIDString() + '.png');
  captureLayerImage(context.document, layer, tempPath);
  return NSImage.alloc().initWithContentsOfFile(tempPath);
}

export function captureLayerImage(context, layer, destPath, type) {
  let air = layer.absoluteInfluenceRect();
  let rect = NSMakeRect(air.origin.x, air.origin.y, air.size.width, air.size.height);
  let exportRequest = MSExportRequest.exportRequestsFromLayerAncestry_inRect_(
      MSImmutableLayerAncestry.ancestryWithMSLayer_(layer),
      rect // we pass this to avoid trimming
      ).firstObject();
  if(type){
    exportRequest.format = type;
  }else{
    exportRequest.format = 'png';
  }
  exportRequest.scale = 2;
  if (!(layer instanceof MSArtboardGroup || layer instanceof MSSymbolMaster)){
    exportRequest.includeArtboardBackground = false;
  }
  context.document.saveArtboardOrSlice_toFile_(exportRequest, destPath);
}


export function arrayFromNSArray(nsArray) {
  let arr = [];
  let count = nsArray.count();
  for (let i = 0; i < count; i++) {
    arr.push(nsArray.objectAtIndex(i));
  }
  return arr;
}

export function mkdirpSync(path, mode) {
  mode = mode || 0o777;
  let err = MOPointer.alloc().init();
  let fileManager = NSFileManager.defaultManager();
  fileManager.createDirectoryAtPath_withIntermediateDirectories_attributes_error(path, true, {
    NSFilePosixPermissions: mode
  }, err);

  if (err.value() !== null) {
    throw new Error(err.value());
  }
}

export function findSymbolMaster(context) {
  var pages = context.document.pages();
  var ret = [];
  for (var i = 0; i < pages.count(); i++) {
    if(pages.objectAtIndex(i).name() == 'Symbols'){
      var symbols = pages.objectAtIndex(i).layers();
      for (var k = 0; k < symbols.count(); k++) {
        if(symbols.objectAtIndex(k).className() == 'MSSymbolMaster'){
          ret.push(symbols.objectAtIndex(k));
        }
      }
    }
  }
  return ret;
}

export function findPagesMaster(context) {
  var page = context.document.currentPage();
  var ret = [];
  var symbols = page.layers();
  for (var k = 0; k < symbols.count(); k++) {
    if(symbols.objectAtIndex(k).className() == 'MSArtboardGroup'){
      var s = symbols.objectAtIndex(k).layers();
      for(var i = 0; i <s.count(); i++){
        if(s.objectAtIndex(i).className() == 'MSSymbolInstance'){
          ret.push(s.objectAtIndex(i));
        }
      }
    }else if(symbols.objectAtIndex(k).className() == 'MSSymbolInstance'){
      ret.push(symbols.objectAtIndex(k))
    }
    
  }
  return ret;
}

export function encodeBase64(filePath) {
  var file = NSData.alloc().initWithContentsOfFile(filePath);
  var SketchContent = file.base64EncodedStringWithOptions(0) + '';
  return SketchContent;
}

export function saveSketchFile(args) {
 // var document = require('sketch/dom').getSelectedDocument();
 //  var Document = require('sketch/dom').Document;
 //  document.save(filePath,{
 //    saveMode: Document.SaveMode.SaveTo
 //  }, ()=> {
 //    func();
 //  })

  return new Promise((resolve, reject) => {
    const task = child_process.spawn('cp', [
      args[0],
      args[1]
    ]);
    task.stdout.on('data', data => {
      console.log(`stdout: ${data}`);
    });
    task.stderr.on('data', data => {
      console.error(`stderr: ${data}`);
    });
    task.on('close', resolve);
    task.on('exit', resolve);
    task.on('error', reject);
  });
}

export function zipSketch(args) {
  return new Promise((resolve, reject) => {
    const task = child_process.spawn('zip', [
      '-q',
      '-r',
      '-m',
      args[0],
      args[1]
    ]);
    task.stdout.on('data', data => {
      console.log(`stdout: ${data}`);
    });
    task.stderr.on('data', data => {
      console.error(`stderr: ${data}`);
    });
    task.on('close', resolve);
    task.on('exit', resolve);
    task.on('error', reject);
  });
}

export function dialog(context) {
    var iconImage = NSImage.alloc().initByReferencingFile(context.plugin.urlForResourceNamed("icon.png").path());
    var alert = COSAlertWindow.new();
    if (iconImage) {
        alert.setIcon(iconImage);
    }
    return alert;
}

export function errorDialog(context,content) {
    var iconImage = NSImage.alloc().initByReferencingFile(context.plugin.urlForResourceNamed("icon.png").path());
    var alert = COSAlertWindow.new();
    if (iconImage) {
        alert.setIcon(iconImage);
    }
    alert.addButtonWithTitle(_(context).checkForUpdate.m9);

    alert.setMessageText(_(context).checkForUpdate.m10);
    alert.setInformativeText(content);
    return alert.runModal();
}

export function createRadioButtons(options, selectedItem) {
    var ui = NSRadioButton;
    var type = NSRadioModeMatrix;

    var rows = Math.ceil(options.length / 2);
    var columns = ((options.length < 2) ? 1 : 2);

    var selectedRow = Math.floor(selectedItem / 2);
    var selectedColumn = selectedItem - (selectedRow * 2);

    var buttonCell = NSButtonCell.alloc().init();
    buttonCell.setButtonType(ui);


    var buttonMatrix = NSMatrix.alloc().initWithFrame_mode_prototype_numberOfRows_numberOfColumns(NSMakeRect(20.0, 20.0, 300.0, rows * 25),type,buttonCell,rows,columns);
    buttonMatrix.setCellSize(NSMakeSize(140, 20));

    for (var i = 0; i < options.length; i++) {
        buttonMatrix.cells().objectAtIndex(i).setTitle(options[i]);
        buttonMatrix.cells().objectAtIndex(i).setTag(i);
    }

    if (rows * columns > options.length) {
      buttonMatrix.cells().objectAtIndex().setTransparent(true);
      buttonMatrix.cells().objectAtIndex().setEnabled(false);

    }
    buttonMatrix.selectCellAtRow_column(selectedRow,selectedColumn);
    return buttonMatrix;
}

export function createRadioButtons2(options, selectedItem) {
    var ui = NSRadioButton;
    var type = NSRadioModeMatrix;

    var rows = Math.ceil(options.length / 3);
    var columns = 3;

    var selectedRow = Math.floor(selectedItem / 3);
    var selectedColumn = selectedItem - (selectedRow * 3);

    var buttonCell = NSButtonCell.alloc().init();
    buttonCell.setButtonType(ui);


    var buttonMatrix = NSMatrix.alloc().initWithFrame_mode_prototype_numberOfRows_numberOfColumns(NSMakeRect(20.0, 20.0, 300.0, rows * 25),type,buttonCell,rows,columns);
    buttonMatrix.setCellSize(NSMakeSize(90, 20));

    for (var i = 0; i < options.length; i++) {
      buttonMatrix.cells().objectAtIndex(i).setTitle(options[i]);
      buttonMatrix.cells().objectAtIndex(i).setTag(i);
    }

    if (rows * columns > options.length) {
      buttonMatrix.cells().objectAtIndex().setTransparent(true);
      buttonMatrix.cells().objectAtIndex().setEnabled(false);
    }
    buttonMatrix.selectCellAtRow_column(selectedRow,selectedColumn);
    return buttonMatrix;
}

// function createArtboard(context, obj) {
//     var doc = context.document;

//     var artboard = [MSArtboardGroup new];

//     [artboard setName: obj.name];

//     var frame = [artboard frame];

//     [frame setX: obj.x];
//     [frame setY: obj.y];
//     [frame setWidth: obj.width];
//     [frame setHeight: obj.height];

//     [[doc currentPage] addLayer: artboard];

//     return artboard;
// }

// zip(['-q','-r','-m','-o','-j','/Users/liuxinyu/Desktop/123.zip','/Users/liuxinyu/Desktop/123'])
export function zip(args) {
  args = ['-q','-r','-m'].concat(args);
  var task = NSTask.alloc().init();
  task.setLaunchPath("/usr/bin/zip");
  task.setArguments(args);
  var outputPipe = NSPipe.pipe();
  task.setStandardOutput(outputPipe);
  task.launch();
}

export function openURL(url) {
  NSWorkspace.sharedWorkspace().openURL(NSURL.URLWithString(NSString.stringWithString(url).stringByAddingPercentEscapesUsingEncoding(NSUTF8StringEncoding)));
}


