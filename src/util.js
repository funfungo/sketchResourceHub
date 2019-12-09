import child_process from '@skpm/child_process'; // ⚠️ The version 0.4.* requires Sketch 54 or above
import * as fs from '@skpm/fs';
import path from '@skpm/path';

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


