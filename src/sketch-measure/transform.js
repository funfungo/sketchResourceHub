import {
  toHex,
  convertRGBToHex,
  toPercentage,
  round
} from "./utils";

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

function transformRadius(points) {
  if (!points || points.length === 0) return 0;
  return points[0].cornerRadius;
}

function restrictFrameMask(parentPos, frame) {
  return {
    x: frame.x < 0 ? parentPos.x : frame.x + (parentPos.x || 0),
    y: frame.y < 0 ? parentPos.y : frame.y + (parentPos.y || 0),
    width: round(parentPos.width < frame.width ? parentPos.width : frame.width, 1),
    height: round(parentPos.height < frame.height ? parentPos.height : frame.height, 1)
  }
}
/**
 * Transform frame, get position & size
 * @param  {Object} layer  layer data
 * @param  {Object} result object to save transformed result
 * @param  {Object} pos    parent layer"s position
 * @return {Undefined}
 */
export function transformFrame(layer, result, parentPos) {
  const frame = layer.frame;
  let rect = {
    x: frame.x + (parentPos.x || 0),
    y: frame.y + (parentPos.y || 0),
    width: round(frame.width, 1),
    height: round(frame.height, 1)
  };
  if (layer.sketchObject.isMasked && layer.sketchObject.isMasked()) {
    rect = restrictFrameMask(parentPos, layer.frame);
  };
  result.rect = rect;
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


/**
 * Transform main style info: border/shadow/fill/opacity
 * @param  {Object} layer  layer
 * @param  {Object} result result
 * @return {Undefined}
 */
export function transformStyle(layer, result) {
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

export function transformText(layer, result) {
  const textInfo = parseText(layer, result);
  result.color = textInfo.color;
  // TODO 区分 fillcolor 和text color, 需要前端展示数据结构的变化
  delete textInfo.color;
  Object.assign(result, textInfo);
}


/**
 * Transform exportable for slices & symbols (has export size)
 * @param  {Object} layer  layer data
 * @param  {Object} result result
 * @return {Undefined}
 */
export function transformExportable(layer, result) {
  const type = result.type;
  if (
    layer.exportFormats.length
  ) {
    result.exportable = layer.exportFormats.map(v => {
      const prefix = v.prefix || "";
      const suffix = v.suffix || "";
      let path = v.size.split("x")[0] == 1 ? `assets/${prefix}${layer.name}${suffix}.${v.fileFormat}` : `assets/${prefix}${layer.name}${suffix}@${v.size}.${v.fileFormat}`;
      return {
        name: layer.name,
        format: v.fileFormat,
        scale: v.size,
        path: path
      };
    });
  }
}
