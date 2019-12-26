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

export function generateHtml(filePath,tmpPath,currentPage) {
  const document = context.document;

  const NAME_MAP = {};
  let transformer;
  // unzip current sketch file task tmpPath
  console.time("parseSketch")
  return parseSketchFile(filePath, tmpPath).then(data => {
    console.timeEnd("parseSketch")
    transformer = new Transformer(data.meta, data.pages, {
      savePath: tmpPath,
      // Don't export symbol artboard.
      // Because sketchtool doesn't offer cli to export symbols, we can't
      // export single symbol image.
      ignoreSymbolPage: true,
      // From version 47, sketch support library
      foreignSymbols: data.document.foreignSymbols,
      layerTextStyles: data.document.layerTextStyles,
      currentPage: currentPage
    });
    const processedData = transformer.convert();
    processedData.artboards.forEach(artboard => {
      NAME_MAP[artboard.objectID] = artboard.slug;
    });
    console.time("generatePage");
    generatePage(processedData, tmpPath);
    console.timeEnd("generatePage");
    console.time("exportPreview");
    return generatePreviewImages(filePath, path.join(tmpPath, 'dist', 'preview'));
  }).then((images) => {
    console.timeEnd("exportPreview");
    let promises = [];
    for( let image of images){
      const correctName = NAME_MAP[image];
      let task = rename(
        path.join(tmpPath, `dist/preview/${image}@2x.png`),
        path.join(tmpPath, `dist/preview/${correctName}.png`)
      );
      promises.push(task);
    }
    return Promise.all(promises);
  });
}
