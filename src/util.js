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

export function encodeBase64(filePath) {
  var file = NSData.alloc().initWithContentsOfFile(filePath);
  var SketchContent = file.base64EncodedStringWithOptions(0) + '';
  return SketchContent;
}

export function saveSketchFile(filePath,func) {
 var document = require('sketch/dom').getSelectedDocument();
  var Document = require('sketch/dom').Document;
  document.save(filePath,{
    saveMode: Document.SaveMode.SaveTo
  }, ()=> {
    func();
  })
}

// zip(['-q','-r','-m','-o','-j','/Users/liuxinyu/Desktop/123.zip','/Users/liuxinyu/Desktop/123'])
export function zip(args) {
  args = ['-q','-r','-m'].concat(args);
  console.log(args);
  var task = NSTask.alloc().init();
  task.setLaunchPath("/usr/bin/zip");
  task.setArguments(args);
  var outputPipe = NSPipe.pipe();
  task.setStandardOutput(outputPipe);
  task.launch();
}

