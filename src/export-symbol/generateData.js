import fs from "@skpm/fs";
import path from "@skpm/path";
import yaml from "js-yaml";

import * as util from "./util";
// import * as colorUtil from './color-util';
import {ProgressReporter} from './progress-reporter';

const INDEX_FORMAT_VERSION = 4;
const FORCE_REBULD = false;

export async function generateData({onProgress}) {
  let libraries = findLib();

  let progressReporter = new ProgressReporter();
  progressReporter.on('progress', progress => {
    onProgress(progress);
  });
  let childProgressReporters = progressReporter.makeChildren(libraries.length);
  let compositeIndex = {libraries : []};
  for( let [i,lib] of libraries.entries()){
    let fileHash = String(
      NSFileManager.defaultManager()
        .contentsAtPath(lib.sketchFilePath)
        .sha1AsString()
    );

    let cachePath = path.join(util.getPluginCachePath(), lib.libraryId);
    let libraryIndex = null;
    let indexCachePath = path.join(cachePath, "index.json");

    try {
      libraryIndex = JSON.parse(
        fs.readFileSync(indexCachePath, { encoding: "utf8" })
      );
    } catch (e) {}

    if (
      FORCE_REBULD ||
      !libraryIndex ||
      !libraryIndex.archiveVersion ||
      libraryIndex.fileHash !== fileHash ||
      (libraryIndex.formatVersion || 0) < INDEX_FORMAT_VERSION
    ) {
      let doc = util.loadDocFromSketchFile(lib.sketchFilePath);
      doc.setFileURL(NSURL.fileURLWithPath(lib.sketchFilePath));

      libraryIndex = await buildSymbolIndexFormLibrary(lib.libraryId, lib.name, doc, childProgressReporters[i], cachePath);
      // cache the index
      util.mkdirpSync(path.dirname(indexCachePath));
      fs.writeFileSync(indexCachePath,
          JSON.stringify(Object.assign(libraryIndex, {
            archiveVersion: Number(MSArchiveHeader.metadataForNewHeader()['version']),
            formatVersion: INDEX_FORMAT_VERSION,
            fileHash
          })),
          {encoding: 'utf8'});
    }
    compositeIndex.libraries.push(libraryIndex);
  }
  return compositeIndex;
}
async function buildSymbolIndexFormLibrary(libraryId, defaultLibName, document, progressReporter, cachePath) {
  let libraryIndex = { id: libraryId, name:defaultLibName, sections: [] };
  // let cachePath = path.join(util.getPluginCachePath(), libraryId,);
  let allLayers = util.getAllSymbolLayers(document);
  progressReporter.total = allLayers.length;
  // allTextLayers.reverse();
  for( let layer of allLayers){
    progressReporter.increment();
    let parsedName = parseLayerName(String(layer.name()));
    let layerId = String(layer.objectID());
    let id = libraryId + "." + layerId;
    let layerInfo = {
      type: "layer",
      id,
      layer,
      name: parsedName,
      imagePath: path.join(cachePath, layerId + ".png"),
      contentPath: path.join(cachePath, layerId + ".json"),
      width: Number(layer.absoluteInfluenceRect().size.width),
      height: Number(layer.absoluteInfluenceRect().size.height)
    };
    util.captureLayerImage(document, layer, layerInfo.imagePath);

    let imm = layer.immutableModelObject();
    let serializedLayer = JSON.parse(
      MSJSONDataArchiver.archiveStringWithRootObject_error_(imm, null)
    );
    fs.writeFileSync(layerInfo.contentPath, JSON.stringify(serializedLayer), {
      encoding: "utf8"
    });
    libraryIndex.sections.push(layerInfo);
    await util.unpeg();
  }

  return libraryIndex;
}
function findLib() {
  let libraries = Array.from(
    NSApp.delegate()
      .librariesController()
      .libraries()
  )
    .filter(
      lib =>
        !!lib.locationOnDisk() &&
        !!lib.enabled() &&
        !!lib.libraryID() &&
        lib.name().match(/Weui/i)
    )
    .map(lib => ({
      libraryId: String(lib.libraryID()),
      name: String(lib.name()),
      sketchFilePath: String(lib.locationOnDisk().path())
    }))
    // filter out duplicate library IDs
    .filter((lib, index, self) => {
      let firstWithId =
        self.findIndex(l => l.libraryId === lib.libraryId) === index;
      if (!firstWithId) {
        log(
          `Library at ${lib.sketchFilePath} not shown, there's already a library ` +
            `with ID ${lib.libraryId} in the list of libraries.`
        );
      }
      return firstWithId;
    });
    console.log(typeof libraries);
  return libraries;
}

function parseLayerName(name) {
  return name;
}
