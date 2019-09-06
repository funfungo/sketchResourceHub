import * as fs from '@skpm/fs';
import path from '@skpm/path';
import { parseSketchFile } from './sketch-measure/parseSketchFile';
import { Transformer } from './sketch-measure/transform';
import { generatePage } from './sketch-measure/generateMeasurePage';
import {
  generatePreviewImages,
  generateSliceImages,
  rename
} from './sketch-measure/generateImages';

export function generateHtml() {
  const document = context.document;
  //get current file path and hash;
  const filePath = document.fileURL().path();
  const fileHash = String(
    NSFileManager.defaultManager()
      .contentsAtPath(filePath)
      .sha1AsString()
  );

  // set system temporary path as export dist path;
  const tmpPath = path.join(NSTemporaryDirectory(), fileHash);

  const NAME_MAP = {};
  let transformer;
  // unzip current sketch file task tmpPath
  parseSketchFile(filePath, tmpPath).then(data => {
    transformer = new Transformer(data.meta, data.pages, {
      savePath: tmpPath,
      // Don't export symbol artboard.
      // Because sketchtool doesn't offer cli to export symbols, we can't
      // export single symbol image.
      ignoreSymbolPage: true,
      // From version 47, sketch support library
      foreignSymbols: data.document.foreignSymbols,
      layerTextStyles: data.document.layerTextStyles
    });
    const processedData = transformer.convert();
    processedData.artboards.forEach(artboard => {
      NAME_MAP[artboard.objectID] = artboard.slug;
    });
    generatePage(processedData, tmpPath);
    generatePreviewImages(filePath, path.join(tmpPath, 'dist', 'preview')).then(
      images => {
        return Promise.all(
          images.map(name => {
            const correctName = NAME_MAP[name];
            return rename(
              path.join(tmpPath, `dist/preview/${name}@2x.png`),
              path.join(tmpPath, `dist/preview/${correctName}.png`)
            );
          })
        );
      }
    );
  });
}
