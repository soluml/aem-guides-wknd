const webpack = require('webpack');
const path = require('path');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const SpriteLoaderPlugin = require('svg-sprite-loader/plugin');
const DirectoryNamedWebpackPlugin = require('directory-named-webpack-plugin');
const {BundleAnalyzerPlugin} = require('webpack-bundle-analyzer');

// const appPath = 'apps/thrivent/mcs/clientlibs/';
// const aemPath = 'etc.clientlibs/thrivent/mcs/clientlibs';
// const outputPath = path.resolve(__dirname, '../ui.apps/src/main/content/jcr_root');

// const bundles = {
//   // Bundle targeted at the Content Frame within the Editor
//   // *Currently HMR for this lib is not supported*
//   author: {
//     webpackPath: `${appPath}author/author`,
//     aemPath: `${aemPath}/author`,
//   },
//   // Bundle targeted at the Author Frame within the Editor
//   dialog: {
//     webpackPath: `${appPath}dialog/dialog`,
//     aemPath: `${aemPath}/dialog`,
//   },
//   // Head Bundle (only JS) used for any setup, available everywhere
//   // *Currently HMR for this lib is not supported*
//   head: {
//     webpackPath: `${appPath}head/head`,
//     aemPath: `${aemPath}/head`,
//   },
//   // Main Bundle, available everywhere
//   main: {
//     webpackPath: `${appPath}main/main`,
//     aemPath: `${aemPath}/main`,
//   },
//   // Dependencies for the Main Bundle, available everywhere
//   vendor: {
//     webpackPath: `${appPath}vendor/vendor`,
//     aemPath: `${aemPath}/vendor`,
//     exclusions: ['highlight.js', 'es6-promise', 'url-search-params-polyfill', 'mdn-polyfills'],
//   },
//   // Stuff for the Style Guide, targeted at the Content Frame within the Editor
//   styleguide: {
//     webpackPath: `${appPath}styleguide/styleguide`,
//     aemPath: `${aemPath}/styleguide`,
//   },
//   // Polyfill for the Main Bundle, available everywhere
//   promise: {
//     webpackPath: `${appPath}main/resources/polyfill/promises`,
//     aemPath: `${aemPath}/main/resources/polyfill/promises`,
//   },
// };

// const svgPaths = {
//   webpackPath: `${appPath}main/resources/sprite.svg`,
//   aemPath: `/${aemPath}/main/resources/sprite.svg`,
// };

module.exports = (
  env,
  {mode, report, isTest, port = 8080, aemPort = 4502}
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
        loader: 'babel-loader',
        options: {
          babelrc: true,
          configFile: './.babelrc.js'
        }
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
          use: [{loader: 'less-loader'}]
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
          {
            loader: 'css-loader'
          },
          {
            loader: 'postcss-loader'
          },
          ...use
        ]
      }))
      // {
      //   test: /\.svg$/,
      //   include: [path.resolve(__dirname, 'src/assets')],
      //   use: [
      //     {
      //       loader: 'svg-sprite-loader',
      //       options: {
      //         symbolId: '[name]',
      //         extract: true,
      //         spriteFilename: svgPaths.webpackPath
      //       }
      //     },
      //     {
      //       loader: 'svgo-loader',
      //       options: {
      //         plugins: [{convertPathData: false}]
      //       }
      //     }
      //   ]
      // }
    ]
  },
  entry: {
    'clientlib-site/resources/polyfill/promises': ['es6-promise/auto']
    // [bundles.head.webpackPath]: ['./src/base/head.js'],
    // [bundles.main.webpackPath]: ['svgxuse', './src/base/main.js'],
    // [bundles.styleguide.webpackPath]: ['./src/base/styleguide.js'],
    // [bundles.author.webpackPath]: ['./src/base/author.js'],
    // [bundles.dialog.webpackPath]: ['./src/base/dialog.js'],
  },
  output: {
    filename: '[name].js',
    path: outputPath
  },
  resolve: {
    alias: {
      Main: path.resolve(__dirname, 'src/main'),
      Utils: path.resolve(__dirname, 'src/utils'),
      Src: path.resolve(__dirname, 'src'),
      Svg: path.resolve(__dirname, 'src/assets/svg')
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    plugins: [new DirectoryNamedWebpackPlugin(true)]
  },
  plugins: [
    new webpack.DefinePlugin({
      PROMISE_POLYFILL_PATH: JSON.stringify(
        `${isTest ? `/absolute${outputPath}` : ''}/${
          bundles.promise.webpackPath
        }.js`
      ),
      SPRITE_PATH: JSON.stringify(svgPaths.aemPath)
    }),
    new MiniCssExtractPlugin({
      filename: ({chunk: {name}}) => `${name.replace('/js/', '/css/')}.css`,
      chunkFilename: '[id].css'
    }),
    new SpriteLoaderPlugin(),
    report && new BundleAnalyzerPlugin(),
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
    ],
    splitChunks: {
      cacheGroups: {
        vendors: {
          test({context}) {
            if (/[\\/]node_modules[\\/]/.test(context)) {
              if (
                bundles.vendor.exclusions
                  .map(ex => new RegExp(`/${ex}/?`, 'i'))
                  .some(re => re.test(context))
              ) {
                return false;
              }

              return true;
            }
          },
          reuseExistingChunk: true,
          enforce: true,
          name: bundles.vendor.webpackPath
        }
      },
      chunks: 'all',
      minSize: 0,
      maxSize: 0,
      minChunks: 1
    }
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
