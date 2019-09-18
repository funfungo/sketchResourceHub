function parseText (layer) {
  const textStyle = new TextStyle(layer)
  const text = layer.attributedString.string

  const res = {
    content: text
  }

  const style = textStyle.getTextStyle()
  Object.assign(res, style)

  return res
}

class TextStyle {
  constructor (layer) {
    this.layer = layer
    this.textStyle = layer.style.textStyle || []
    if(layer.style.textStyle){
      this.encodeAttr = layer.style.textStyle.encodedAttributes;
    }else{
      console.log(layer);
    }
  }

  _getStyle () {
    const fontSize = this.encodeAttr ? this.encodeAttr.MSAttributedStringFontAttribute.attributes.size : 14
    const fontFace = this.encodeAttr ? this.encodeAttr.MSAttributedStringFontAttribute.attributes.name : 'undefined'
    const paragraphStyle = this.encodeAttr ? this.encodeAttr.paragraphStyle : {}

    // Default to left
    let textAlign = 'left'
    switch (paragraphStyle.alignment) {
      case 1: {
        textAlign = 'left'
        break
      }
      case 2: {
        textAlign = 'center'
        break
      }
      case 3: {
        textAlign = 'right'
        break
      }
      case 4: {
        textAlign = 'justify'
        break
      }
    }
    let lineHeight = paragraphStyle.maximumLineHeight

    const style = {
      color: this.encodeAttr ? this.encodeAttr.MSAttributedStringColorAttribute : {},
      fontSize,
      fontFace,
      textAlign,
      lineHeight: lineHeight || 1.4 * fontSize,
      letterSpacing: this.encodeAttr ? this.encodeAttr.kerning == null ? 0 : this.encodeAttr.kerning : 0
    }

    return style
  }

  getTextStyle () {
    return this._getStyle()
  }
}

module.exports = parseText
