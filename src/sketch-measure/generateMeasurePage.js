// const { createReadStream, createWriteStream, readFileSync } = require('fs')
// const { resolve } = require('path')
// const { Readable } = require('stream')
// const mkdirp = require('mkdirp')
import * as fs from '@skpm/fs';
import path from '@skpm/path';


//TODO
function copy (src, dest) {
  let err = MOPointer.alloc().init();
  let fileManager = NSFileManager.defaultManager();
  let parentPath = dest.slice(0, dest.lastIndexOf('/'))
  // if file path does not exist, creat it
  if(! fileManager.fileExistsAtPath(parentPath)){
    fileManager.createDirectoryAtPath_withIntermediateDirectories_attributes_error(parentPath, true, null, err);
  }else if(fileManager.fileExistsAtPath(dest)){
    // if file already exist, delete it first
    fileManager.removeItemAtPath_error(dest, err);
  }
  // if(fileManager.fileExistsAtPath)
  fileManager.copyItemAtPath_toPath_error(src, dest, err);
  if (err.value() !== null) {
    console.log(String(err.value()));
  }
}

function copyAssets (dest) {
  const sourcePath = context.plugin.urlForResourceNamed("template").path();
  const files = [
    'index.css',
    'index.js',
    'jQuery.js',
    'normalize.css'
  ]
  files.forEach(file => {
    copy(path.join(sourcePath, file),  path.join(dest, 'dist', file));
  })
}

let INDEX_HTML
function generateIndexHtml (data, dest) {
  let err = MOPointer.alloc().init();
  if (!INDEX_HTML) {
    INDEX_HTML = fs.readFileSync(path.join(context.plugin.urlForResourceNamed("template").path(), 'index.html'), {
      encoding: 'utf8'
    }).toString()
  }
  const html = INDEX_HTML.replace(/__data__/, JSON.stringify(data, null, 2))
  const nsHtml = NSMutableString.stringWithString(html);
  nsHtml.writeToFile_atomically_encoding_error(path.join(dest,'index.html'), true, NSUTF8StringEncoding, err);
  if (err.value() !== null) {
    console.log(String(err.value()));
  }
}

export function generatePage (data, dest) {
  copyAssets(dest);
  generateIndexHtml(data, path.join(dest,'dist'));
}
