const path = require('path')

module.exports = {
  mode: 'production',
  entry: {
    ethpkg: path.resolve('./src/index.ts')
  },
  output: {
    path: path.resolve(__dirname, 'bundles'),
    filename: '[name].js',
    libraryTarget: 'umd',
    library: 'ethpkg',
    umdNamedDefine: true
  },
  node: {
    fs: 'empty',
    child_process: 'empty'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: ['awesome-typescript-loader?module=es6'],
        exclude: [/node_modules/]
      },
      {
        test: /\.js$/,
        loader: "babel-loader"
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.ts']
  }
}