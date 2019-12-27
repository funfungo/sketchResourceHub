/**
 * generate html refer to sketch measure
 * pls do not convert some ancient sketch file
 */

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
  transformStyle,
  transformFrame,
  transformText
} from "./sketch-measure/transform";
import {
  appendCss
} from "./sketch-measure/transformCss";

const documentData = context.document.documentData();

//store symbol for multiple use;
const symbolMap = {};
/**
 * get nested symbolInstance style
 * @param {Object} layer symbolInstance
 * @param {*} acc
 * @returns
 */
function transformSymbol(layer) {
  let symbolInstance = layer.sketchObject;
  let symbolID = symbolInstance.symbolID();
  let immutableInstance = symbolInstance.immutableModelObject();
  let immutableMaster = documentData.symbolWithID(symbolID).immutableModelObject();
  let symbolData = immutableMaster.modifiedMasterByApplyingInstance_inDocument_(immutableInstance, nil);
  let symbol = sketch.fromNative(symbolData);
  //只处理一层嵌套symbol,多层忽略
  return recursiveGenerateLayer(symbol.layers, {
    parentPos: layer.frame,
    stop: true
  });
}

let counter = 0;
/**
 *  generate layer data recursively
 *
 * @param {Object} layers
 * @param {Object} extra parent position used to calculate nested layer frame position
 * @returns {Array} layers data array
 */
function recursiveGenerateLayer(layers, extra) {
  counter += layers.length;
  return layers.reduce((acc, layer) => {
    if (layer.hidden) return acc
    let layerInfo = {
      objectID: layer.id,
      type: layer.type.toLowerCase(),
      name: layer.name,
      rotation: layer.transform.rotation
    }
    if(layer.name == "状态"){
      console.log(layer);
    }
    transformFrame(layer, layerInfo, extra.parentPos || {})
    transformStyle(layer, layerInfo);
    if (layer.type === "Text") {
      transformText(layer, layerInfo);
    }
    appendCss(layerInfo);
    acc.push(layerInfo)
    if (layer.type === "SymbolInstance") {
      acc = acc.concat(transformSymbol(layer));
    }
    if (layer.layers && !extra.stop) {
      acc = acc.concat(recursiveGenerateLayer(layer.layers, {
        parentPos: layerInfo.rect
      }));
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

          artboard.layers = recursiveGenerateLayer(layer.layers, {
            artboard
          });
          data.artboards.push(artboard);
          sketch.export(layer, {
            output: path.join(tmpPath, "dist", "preview"),
            "save-for-web": true,
            "use-id-for-name": true,
            scales: 2
          });
        }
      })
    })
    data.artboards.forEach(artboard => {
      NAME_MAP[artboard.objectID] = artboard.slug;
    })
    console.log(data);
    console.log(counter);
    generatePage(data, tmpPath);
  } catch (e) {
    console.log(e);
  }
}

