const path = require("path");
const VueLoaderPlugin = require("vue-loader/lib/plugin");
const entry = require('webpack-glob-entry');
const glob = require('glob');
const HtmlWebpackPlugin = require('html-webpack-plugin');


const entries = getEntries('./pages/**/index.js')
const htmlPlugins = generateHtmlPlugins(entries);

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: entries,
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, '../assets')
  },
  module: {
    rules: [
      // ... other rules
      {
        test: /\.vue$/,
        loader: "vue-loader"
      },
      { test: /\.(eot|woff|ttf)$/, 
        loader: 'file-loader' 
      },
      {
        test: /\.less$/,
        use: [
          'vue-style-loader',
          'css-loader',
          'less-loader'
        ]
      },
      {
        test: /\.css$/,
        loader: 'style-loader!css-loader'
      },
    ]
  },
  plugins: [
    new VueLoaderPlugin()
  ].concat(htmlPlugins),
  node: {
    setImmediate: false
  }
};



function getEntries(path) {
  let entries = {};
  glob.sync(path).forEach(entry => {
    if(/(\pages\/(?:.+[^.js]))/.test(entry)) {
      entries[RegExp.$1] = [entry]
    }
  })
  return entries;
}

function generateHtmlPlugins(entries){
  return Object.keys(entries).map((page) => {
    console.log(page);
    return new HtmlWebpackPlugin({
      filename: `${page}.html`,
      template: page + '.html',
      chunks: [page],
    })
  })
}
