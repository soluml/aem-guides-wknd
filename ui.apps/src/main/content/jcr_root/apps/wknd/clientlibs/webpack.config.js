const webpack = require('webpack');
const path = require('path');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const SpriteLoaderPlugin = require('svg-sprite-loader/plugin');
const DirectoryNamedWebpackPlugin = require('directory-named-webpack-plugin');
const AssetsPlugin = require('assets-webpack-plugin');
const {BundleAnalyzerPlugin} = require('webpack-bundle-analyzer');

const appPath = path.resolve(__dirname, 'dist');
const aemPath = '/etc.clientlibs/wknd/clientlibs';

module.exports = (
  env,
  {
    mode = 'development',
    port = 8080,
    aemPort = 4502,
    showReport = false,
    isTest = false
  }
) => ({
  mode,
  target: 'web',
  devtool: mode !== 'production' && 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.(j|t)sx?$/,
        include: [
          path.resolve(__dirname, 'src'),
          path.resolve(__dirname, 'test')
        ],
        loader: 'babel-loader'
      },
      ...[
        {
          test: /\.(sa|sc|c)ss$/,
          use: [
            {
              loader: 'sass-loader',
              options: {
                implementation: require('sass'), //eslint-disable-line global-require
                importer: require('node-sass-glob-importer')() //eslint-disable-line global-require
              }
            }
          ]
        },
        {
          test: /\.less$/,
          use: ['less-loader']
        }
      ].map(({test, use}) => ({
        test,
        use: [
          mode === 'production'
            ? {loader: MiniCssExtractPlugin.loader}
            : {
                loader: 'style-loader',
                options: {
                  hmr: true,
                  attrs: {'data-hmr': 'webpack'}
                }
              },
          'css-loader',
          'postcss-loader',
          ...use
        ]
      }))
    ]
  },
  entry: {
    author: ['./src/author']
    // 'clientlib-dialog/dialog': ['./dialog/index'],
    // 'clientlib-site/resources/polyfill/promises': ['es6-promise/auto'],
    // 'clientlib-site/site': ['svgxuse', './site/index'],
    // 'clientlib-siteHead/siteHead': ['./siteHead/index']
  },
  output: {
    filename: '[name].[hash].js',
    path: appPath
  },
  resolve: {
    alias: {
      Src: path.resolve(__dirname, 'src'),
      Components: path.resolve(__dirname, '../components'),
      Svg: path.resolve(__dirname, 'src/assets/svg')
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    plugins: [new DirectoryNamedWebpackPlugin(true)]
  },
  plugins: [
    // new webpack.DefinePlugin({
    //   PROMISE_POLYFILL_PATH: JSON.stringify(
    //     `${test ? `/absolute${outputPath}` : ''}/${bundles.promise.webpackPath}.js`
    //   ),
    //   SPRITE_PATH: JSON.stringify(svgPaths.aemPath),
    // }),
    new MiniCssExtractPlugin({
      filename: ({chunk}) =>
        `${chunk.name.replace('/js/', '/css/')}.${chunk.hash}.css`,
      chunkFilename: '[id].css'
    }),
    //new SpriteLoaderPlugin(),
    new AssetsPlugin({
      filename: 'clientlib.config.js',
      fileTypes: ['js', 'css'],
      integrity: true,
      update: true,
      processOutput(bundles) {
        const config = {
          context: appPath,
          clientLibRoot: __dirname,
          libs: Object.entries(bundles).map(([name, files]) => {
            let longCacheKey = '';
            const assets = Object.entries(files).reduce(
              (acc, [category, file]) => {
                longCacheKey += file.split('.')[1];

                return {...acc, [category]: [file]};
              },
              {}
            );

            return {
              allowProxy: true,
              assets,
              categories: [`clientlib.${name}`],
              cssProcessor: '[default:none,min:none]',
              jsProcessor: '[default:none,min:none]',
              longCacheKey,
              name: `webpack-clientlib-${name}`,
              serializationFormat: 'xml'
            };
          })
        };

        return `module.exports = ${JSON.stringify(config, null, 2)}`;
      }
    }),
    showReport && new BundleAnalyzerPlugin(),
    mode !== 'production' && new webpack.HotModuleReplacementPlugin()
  ].filter(p => p),
  optimization: {
    minimize: mode === 'production',
    minimizer: [
      new UglifyJSPlugin({
        uglifyOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true
          },
          output: {
            comments: false
          },
          mangle: true,
          ie8: false
        }
      })
    ]
  },
  devServer: {
    hot: true,
    open: true,
    openPage: 'content/thrivent/mcs/en/index.html',
    port,
    publicPath: '/static/',
    proxy: [
      {
        context: ['**', '!/static/**'],
        target: `http://localhost:${aemPort}`,
        bypass(req, res) {
          const baseName = path.basename(req.url);

          // hot-update.json file is in the `/static/` root
          if (baseName.includes('hot-update.json')) {
            // i.e. /static/38aef42fe50485ef5f9c.hot-update.json
            return `/static/${baseName}`;
          }

          // Proxy HMR requests back to Webpack
          if (baseName.includes('hot-update')) {
            // The other hot update files (ex. BUNDLE.hot-update.js) are in the `/static/${appPath}` folder
            const fileName = path
              .basename(req.url)
              .split('.')
              .shift();

            // i.e. /static/apps/thrivent/mcs/clientlibs/main/main.fd3f23c87cc7b89841ee.hot-update.js
            return `/static/${appPath}${fileName}/${baseName}`;
          }

          // Proxy AEM clientlibs back to Webpack
          if (req.url.includes(aemPath)) {
            if (req.url.endsWith('.css')) {
              // Hide CSS, HMR uses in DOM <style> tags
              res.send('');
            } else {
              if (baseName.startsWith('head')) {
                return false;
              }

              const filePath = req.url
                .split(aemPath)
                .pop()
                .substr(1);
              let finalPath = filePath;

              // AEM clientlibs may be versioned, strip that out for Webpack
              if (filePath.split('.').length > 2) {
                const fileName = filePath.split('.').shift();

                finalPath = `${fileName}/${fileName}${path.extname(filePath)}`;
              }

              return `/static/${appPath}${finalPath}`;
            }
          }
        }
      }
    ]
  }
});
