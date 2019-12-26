const sketch = require('sketch/dom');
const document = sketch.getSelectedDocument();
const {
  toHex,
  convertRGBToHex,
  toPercentage,
  round,
  getSlug
} = require("./sketch-measure/utils");
const documentData = context.document.documentData();
import path from '@skpm/path';
import { generatePage } from './sketch-measure/generateMeasurePage';
import {
  generatePreviewImages,
  generateSliceImages,
  rename
} from './sketch-measure/generateImages';
/**
 * Layer Types.
 * @type {Object}
 */
const TYPE_MAP = {
  text: "text",
  // slice: 'slice',
  symbolInstance: "symbol",
  shape: "shape"
};
const FONT_WEIGHT = {
  2: "100",
  3: "200",
  4: "300",
  6: "500",
  7: "600",
  8: "700",
  5: "400"
};

function transformCSSColor(color) {
  if (color) {
    return color.a === 1 ? color["color-hex"].split(" ")[0] : color["css-rgba"];
  }
}

function transformCSSRadius(radius) {
  if (radius) {
    return `border-radius: ${radius}px;`;
  }
}

function transformCSSBorder(border) {
  if (border && border.length) {
    const {
      thickness,
      color
    } = border[0];

    return `border: ${thickness}px solid ${transformCSSColor(color)};`;
  }
}

function transformCSSBackground(fills) {
  if (fills && fills.length) {
    const {
      color
    } = fills[0];

    return `background: ${transformCSSColor(color)};`;
  }
}

function transformCSSShadow(shadows) {
  if (shadows && shadows.length) {
    const {
      offsetX,
      offsetY,
      blurRadius,
      color
    } = shadows[0];

    return `box-shadow: ${offsetX}px ${offsetY}px ${blurRadius}px ${transformCSSColor(
      color
    )};`;
  }
}

function transformCSSOpacity(opacity) {
  if (opacity && opacity !== 1) {
    return `opacity: ${opacity};`;
  }
}
/**
 * append css info
 * @param  {Object} layer layer
 * @param  {Object} layer result
 * @return {Undefined}
 */
function appendCss(result) {
  let tmp = [];
  const {
    type
  } = result;

  if (type) {
    switch (type) {
      case TYPE_MAP.shape:
        tmp = [
          `width: ${result.rect.width}px;`,
          `height: ${result.rect.height}px;`,
          transformCSSBackground(result.fills),
          transformCSSBorder(result.borders),
          transformCSSRadius(result.radius),
          transformCSSShadow(result.shadows),
          transformCSSOpacity(result.opacity)
        ];
        break;
      case TYPE_MAP.text:
        tmp = [
          `font-size: ${result.fontSize};`,
          `font-family: ${result.fontFace};`,
          `font-weight: ${FONT_WEIGHT[result.fontWeight]};`,
          `color: ${transformCSSColor(result.color)};`
        ];
        break;
      default:
        tmp = [
          `width: ${result.rect.width};`,
          `height: ${result.rect.height};`
        ];
        break;
    }
  }
  result.css = tmp.filter(t => t);
}


/**
 * Transform layer.style.shadows
 * @param  {Array} shadows shadow style list
 * @return {Array}         transformed shadow style
 */
function transformShadows(shadows, inner) {
  if (!shadows || !shadows.length) return [];
  return shadows
    .filter(v => v.enabled)
    .map(v => {
      return {
        type: inner ? "inner" : "outer",
        offsetX: v.x,
        offsetY: v.y,
        blurRadius: v.blur,
        spread: v.spread,
        color: transformColor(v.color)
      };
    });
}

/**
 * Transform color
 * @param  {Object} color sketch color object
 * @return {Object}       transformed color object
 */
function transformColor(color) {
  // color: #d8d8d8ff
  if (!color) return null;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const a = parseInt(color.slice(7), 16) / 255;
  return {
    r,
    g,
    b,
    a,
    "color-hex": `#${convertRGBToHex(r, g, b)} ${toPercentage(a, 0)}`,
    "argb-hex": `#${toHex(a * 255, 2)}${convertRGBToHex(r, g, b)}`,
    "css-rgba": `rgba(${r},${g},${b},${a.toFixed(2)})`,
    "ui-color": `(r:${(r/255).toFixed(2)} g:${(g/255).toFixed(
      2
    )} b:${(b/255).toFixed(2)} a:${a.toFixed(2)})`
  };
}

function transformGradient(gradient) {
  const stops = gradient.stops.map(stop => {
    return {
      color: transformColor(stop.color),
      position: stop.position
    };
  });
  const data = {
    type: gradient.gradientType.toLowerCase(),
    colorStops: stops,
    from: gradient.from,
    to: gradient.to
  };
  return data;
}

function transformPosition(position) {
  const parts = position.slice(1, -1).split(/,\s*/);
  return {
    x: +parts[0],
    y: +parts[1]
  };
}

/**
 * Transform layer.style.borders
 * @param  {Array} borders border style list
 * @return {Array}         transformed border style
 */
function transformBorders(borders) {
  if (!borders || !borders.length) return [];
  return borders
    .filter(v => v.enabled)
    .map(v => {
      const fillType = v.fillType.toLowerCase();
      const borderData = {
        fillType,
        position: v.position.toLowerCase(),
        thickness: v.thickness
      };
      if (fillType === "color") {
        borderData.color = transformColor(v.color);
      } else if (fillType === "gradient") {
        borderData.gradient = transformGradient(v.gradient);
      }
      return borderData;
    });
}
/**
 * Transform layer.style.fills
 * @param  {Array} fills fill style list
 * @return {Array}         transformed fill style
 */
function transformFills(fills) {
  if (!fills || !fills.length) return [];
  return fills
    .filter(v => v.enabled)
    .map(v => {
      const fillType = v.fillType;
      const fillData = {
        fillType: v.fillType.toLowerCase()
      };
      if (fillType === "Color") {
        fillData.color = transformColor(v.color);
      } else if (fillType === "Gradient") {
        fillData.gradient = transformGradient(v.gradient);
      }
      return fillData;
    });
}

function transformRadius(points){
  if(!points || points.length === 0) return 0;
  return points[0].cornerRadius;
}
/**
 * Transform main style info: border/shadow/fill/opacity
 * @param  {Object} layer  layer
 * @param  {Object} result result
 * @return {Undefined}
 */
function transformStyle(layer, result) {
  const style = layer.style;
  let opacity;
  if (style) {
    result.borders = transformBorders(style.borders);
    result.fills = transformFills(style.fills);
    result.shadows = transformShadows(style.shadows).concat(
      transformShadows(style.innerShadows, true)
    );
    result.radius = transformRadius(layer.points);
    opacity = style.opacity;
  }
  if (opacity == null && result.type !== "slice") {
    opacity = 1;
  }
  result.opacity = opacity;
}

/**
 * Transform frame, get position & size
 * @param  {Object} layer  layer data
 * @param  {Object} result object to save transformed result
 * @param  {Object} pos    parent layer's position
 * @return {Undefined}
 */
function transformFrame(layer, result, {
  x,
  y
}) {
  const frame = layer.frame;
  result.rect = {
    width: round(frame.width, 1),
    height: round(frame.height, 1),
    x: frame.x + (x || 0),
    y: frame.y + (y || 0)
  };
}

function parseText(layer) {
  return {
    color: transformColor(layer.style.textColor),
    fontSize: layer.style.fontSize,
    fontFace: layer.style.fontFamily,
    textAlign: layer.style.alignment,
    lineHeight: (layer.style.lineHeight || 1.4 * layer.style.fontSize).toFixed(1),
    letterSpacing: layer.style.kerning,
    content: layer.text,
    fontWeight: layer.style.fontWeight
  }
}

function handleText(layer, result) {
  const textInfo = parseText(layer, result);
  result.color = textInfo.color;
  // TODO 区分 fillcolor 和text color, 需要前端展示数据结构的变化
  delete textInfo.color;
  Object.assign(result, textInfo);
}

function transformSymbol(layer, acc) {
  let symbolInstance = layer.sketchObject;
  let symbolID = symbolInstance.symbolID();
  let immutableInstance = symbolInstance.immutableModelObject();
  let immutableMaster = documentData.symbolWithID(symbolID).immutableModelObject();
  let symbolData = immutableMaster.modifiedMasterByApplyingInstance_inDocument_(immutableInstance, nil);
  let symbol = sketch.fromNative(symbolData);
  acc = acc.concat(recursiveGenerateLayer(symbol.layers, {
    parentPos: symbol.frame
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
    if(layer.name == "test"){
      console.log(layer);
    }
    transformStyle(layer, layerInfo);
    transformFrame(layer, layerInfo, extra.parentPos || {})
    if (layer.type === 'Text') {
      handleText(layer, layerInfo);
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
      // if(page.id !== currentPage) return;
      let pageName = page.name;
      let pageObjectID = page.id;
      page.layers.forEach(layer => {
        if (layer.type === 'Artboard') {
          let artboard = {
            pageName: pageName,
            pageObjectID: pageObjectID,
            name: layer.name,
            slug: getSlug(pageName, layer.name),
            objectID: layer.id,
            width: layer.frame.width,
            height: layer.frame.height,
            imagePath: `preview/${getSlug(pageName, layer.name)}.png`,
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
    generatePreviewImages(filePath, path.join(tmpPath, 'dist', 'preview')).then((images) => {
      let promises = [];
      for (let image of images) {
        const correctName = NAME_MAP[image];
        let task = rename(
          path.join(tmpPath, `dist/preview/${image}@2x.png`),
          path.join(tmpPath, `dist/preview/${correctName}.png`)
        );
        promises.push(task);
      }
      return Promise.all(promises);
    });
    console.log(data);

  } catch (e) {
    console.log(e);
  }


}
