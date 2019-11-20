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

export function generateHtml(filePath,tmpPath) {
  const document = context.document;

  const NAME_MAP = {};
  let transformer;
  // unzip current sketch file task tmpPath
  return parseSketchFile(filePath, tmpPath).then(data => {
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
    return generatePreviewImages(filePath, path.join(tmpPath, 'dist', 'preview'));
  });
}
