/**
 * generate html refer to sketch measure
 * pls do not convert some ancient sketch file
 */


import path from "@skpm/path";
import {
  getSlug
} from "./sketch-measure/utils";
import {
  generatePage
} from "./sketch-measure/generateMeasurePage";
import {
  transformStyle,
  transformFrame,
  transformText,
  transformExportable
} from "./sketch-measure/transform";
import {
  appendCss
} from "./sketch-measure/transformCss";
const sketch = require("sketch/dom");
const document = sketch.getSelectedDocument();
const documentData = context.document.documentData();
const generateType = ["Artboard", "Group", "SymbolMaster"];
/**
 * detect whether a rect is out sight of range
 *
 * @param {Object} range
 * @param {Object} rect
 * @returns
 */
function outRange(range, rect) {
  return rect.x > range.width || rect.y > range.height || rect.x + rect.width < 0 || rect.y + rect.height < 0
}

/**
 * detect whether a rect is out sight of a frame
 *
 * @param {Object} frame
 * @param {Object} rect
 * @returns
 */
function outFrame(frame, rect) {
  return rect.x > frame.x + frame.width || rect.y > frame.y + frame.height || rect.x + rect.width < frame.x || rect.y + rect.height < frame.y;
}

/**
 * get nested symbolInstance style
 * @param {Object} layer symbolInstance
 * @param {Object} extra
 * @returns
 */
function transformSymbol(layer, extra) {
  let symbolInstance = layer.sketchObject;
  let symbolID = symbolInstance.symbolID();
  let immutableInstance = symbolInstance.immutableModelObject();
  let immutableMaster = documentData.symbolWithID(symbolID).immutableModelObject();
  let symbolData = immutableMaster.modifiedMasterByApplyingInstance_inDocument_(immutableInstance, nil);
  let symbol = sketch.fromNative(symbolData);
  return recursiveGenerateLayer(symbol.layers, {
    artboard: extra.artboard,
    parentPos: extra.parentPos,
  });
}

/**
 *  generate layer data recursively
 *
 * @param {Object} layers
 * @param {Object} extra parent position used to calculate nested layer frame position
 * @returns {Array} layers data array
 */
function recursiveGenerateLayer(layers, extra, data, tmpPath) {
  return layers.reduce((acc, layer) => {
    if (layer.hidden) return acc
    let layerInfo = {
      objectID: layer.id,
      type: layer.type.toLowerCase(),
      name: layer.name,
      rotation: layer.transform.rotation
    }
    transformFrame(layer, layerInfo, extra.parentPos || {})
    // 忽略artboard中不可见的元素
    if (extra.artboard && outRange(extra.artboard, layerInfo.rect)) {
      return acc;
    }
    transformStyle(layer, layerInfo);
    if (layer.type === "Text") {
      transformText(layer, layerInfo);
    }
    if (layer.exportFormats.length > 0) {
      transformExportable(layer, layerInfo);
      if (layerInfo.exportable) {
        layerInfo.exportable.forEach(v => {
          let scale = v.scale.split("x")[0];
          sketch.export(layer, {
            output: path.join(tmpPath, "dist", "assets"),
            progressive: true,
            "save-for-web": true,
            scales: scale
          });
        })
        data.slices.push({
          name: layer.name,
          objectID: layer.id,
          rect: layerInfo.rect,
          exportable: layerInfo.exportable
        })
        console.log(data.slices);
      }


    }
    appendCss(layerInfo);
    acc.push(layerInfo)
    // if (layer.type === "SymbolInstance") {
    //   acc = acc.concat(transformSymbol(layer, {
    //     artboard: extra.artboard,
    //     parentPos: layerInfo.rect
    //   }));
    // }
    if (layer.layers) {
      acc = acc.concat(recursiveGenerateLayer(layer.layers, {
        artboard: extra.artboard,
        parentPos: layerInfo.rect
      }));
    }
    return acc;
  }, [])
}

export function generateHtml(tmpPath, currentPage, opt) {
  let data = {
    scale: opt.scale || "1",
    unit: opt.unit || "px",
    colorFormat: opt.colorFormat || "color-hex",
    artboards: [],
    slices: [],
    colors: []
  };
  // if(opt.exportLayer.type === "Slice")

  let NAME_MAP = {};
  try {
    document.pages.forEach(page => {
      if (page.id !== currentPage) return;
      let pageName = page.name;
      let pageObjectID = page.id;
      for (let i = 0; i < page.layers.length; i++) {
        // 仅导出slice切片范围内的artboard
        let layer = page.layers[i];
        if (opt.exportLayer.type === "Slice" && outFrame(opt.exportLayer.frame, layer.frame)) continue;
        if (generateType.indexOf(layer.type) !== -1) {
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
          }, data, tmpPath);
          data.artboards.push(artboard);
          sketch.export(layer, {
            output: path.join(tmpPath, "dist", "preview"),
            progressive: true,
            "save-for-web": true,
            "use-id-for-name": true,
            scales: 2
          });
        }
      }
    })
    data.artboards.forEach(artboard => {
      NAME_MAP[artboard.objectID] = artboard.slug;
    })
    generatePage(data, tmpPath);
  } catch (e) {
    console.log(e);
  }
}
