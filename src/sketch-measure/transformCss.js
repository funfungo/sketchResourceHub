/**
 * 通过输出的数据生成图层相应的css信息
 * author: nikkfang
 */



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
export function appendCss(result) {
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
