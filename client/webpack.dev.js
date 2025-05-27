// webpack.dev.js
const path = require('path');
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'dist'),
      watch: true,          // watch all files in dist
    },
    liveReload: true,       // reload page on change
    hot: false,             // disable HMR
    open: true,             // auto-open browser
    port: 3000,
  },
});
