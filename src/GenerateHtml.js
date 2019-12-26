const sketch = require("sketch/dom");
const document = sketch.getSelectedDocument();
import {
  getSlug
} from "./sketch-measure/utils";
import path from "@skpm/path";
import {
  generatePage
} from "./sketch-measure/generateMeasurePage";
import {
  generatePreviewImages,
  generateSliceImages,
  rename
} from "./sketch-measure/generateImages";
import {
  transformStyle,
  transformFrame,
  transformText
} from "./sketch-measure/transform";
import {
  appendCss
} from "./sketch-measure/transformCss";

const documentData = context.document.documentData();

/**
 * get nested symbolInstance style
 * @param {Object} layer symbolInstance
 * @param {*} acc
 * @returns
 */
function transformSymbol(layer, acc) {
  let symbolInstance = layer.sketchObject;
  let symbolID = symbolInstance.symbolID();
  let immutableInstance = symbolInstance.immutableModelObject();
  let immutableMaster = documentData.symbolWithID(symbolID).immutableModelObject();
  let symbolData = immutableMaster.modifiedMasterByApplyingInstance_inDocument_(immutableInstance, nil);
  let symbol = sketch.fromNative(symbolData);
  acc = acc.concat(recursiveGenerateLayer(symbol.layers, {
    parentPos: layer.frame
  }));
  return acc;
}
function recursiveGenerateLayer(layers, extra) {
  return layers.reduce((acc, layer) => {
    if (layer.hidden) return acc
    let layerInfo = {
      objectID: layer.id,
      type: layer.type.toLowerCase(),
      name: layer.name,
      rotation: layer.transform.rotation
    }
    if (layer.name == "test") {
      console.log(layer);
    }
    transformStyle(layer, layerInfo);
    transformFrame(layer, layerInfo, extra.parentPos || {})
    if (layer.type === "Text") {
      transformText(layer, layerInfo);
    }
    appendCss(layerInfo);
    acc.push(layerInfo)
    if (layer.layers) {
      acc = acc.concat(recursiveGenerateLayer(layer.layers, {
        parentPos: layerInfo.rect
      }));
    }
    if (layer.type === "SymbolInstance") {
      acc = acc.concat(transformSymbol(layer, acc));
    }
    return acc;
  }, [])
}

export function generateHtml(filePath, tmpPath, currentPage) {
  let data = {
    scale: "1",
    unit: "px",
    colorFormat: "color-hex",
    artboards: []
  };
  let NAME_MAP = {};
  try {
    document.pages.forEach(page => {
      if (page.id !== currentPage) return;
      let pageName = page.name;
      let pageObjectID = page.id;
      page.layers.forEach(layer => {
        if (layer.type === "Artboard") {
          let artboard = {
            pageName: pageName,
            pageObjectID: pageObjectID,
            name: layer.name,
            slug: getSlug(pageName, layer.name),
            objectID: layer.id,
            width: layer.frame.width,
            height: layer.frame.height,
            imagePath: `preview/${layer.id}@2x.png`,
            layers: []
          }

          artboard.layers = recursiveGenerateLayer(layer.layers, {});
          data.artboards.push(artboard);
        }
      })
    })
    data.artboards.forEach(artboard => {
      NAME_MAP[artboard.objectID] = artboard.slug;
    })
    generatePage(data, tmpPath);
    return generatePreviewImages(filePath, path.join(tmpPath, "dist", "preview"));
  } catch (e) {
    console.log(e);
  }


}
