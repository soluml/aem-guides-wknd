const webpack = require('webpack');
const path = require('path');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const SpriteLoaderPlugin = require('svg-sprite-loader/plugin');
const DirectoryNamedWebpackPlugin = require('directory-named-webpack-plugin');
const SriPlugin = require('webpack-subresource-integrity');
const md5 = require('md5');
const AssetsPlugin = require('assets-webpack-plugin');
const {BundleAnalyzerPlugin} = require('webpack-bundle-analyzer');
const browserlist = require('browserslist')();

/* NOTE: Start Configurable Properties */
const appPath = path.resolve(__dirname, 'dist');
const aemPath = '/etc.clientlibs/wknd/clientlibs';
const spritePath = 'site/resources/sprite.svg';
const componentPath = path.resolve(
  __dirname,
  '../ui.apps/src/main/content/jcr_root/apps/wknd/components'
);
const clientlibPath = path.resolve(
  __dirname,
  '../ui.apps/src/main/content/jcr_root/apps/wknd/clientlibs'
);
const hmrOpenPage = 'content/wknd/en.html';
const dynamicClientlibPrefix = 'webpack-clientlib-';
const automaticNameDelimiter = '~';
/* NOTE: End Configurable Properties */

const allEntryDependencies = ['Utils/modernizr'].concat(
  browserlist.includes('ie 11') ? ['es6-promise/auto'] : []
);

module.exports = (
  env,
  {mode = 'development', port = 8080, aemPort = 4502, showReport = false}
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
          path.resolve(__dirname, 'test'),
        ],
        loader: 'babel-loader',
      },
      ...[
        {
          test: /\.(sa|sc|c)ss$/,
          use: [
            {
              loader: 'sass-loader',
              options: {
                implementation: require('sass'), //eslint-disable-line global-require
                importer: require('node-sass-glob-importer')(), //eslint-disable-line global-require
              },
            },
          ],
        },
        {
          test: /\.less$/,
          use: ['less-loader'],
        },
      ].map(({test, use}) => ({
        test,
        use: [
          mode === 'production'
            ? {loader: MiniCssExtractPlugin.loader}
            : {
                loader: 'style-loader',
                options: {
                  hmr: true,
                  attrs: {'data-hmr': 'webpack'},
                },
              },
          'css-loader',
          'postcss-loader',
          ...use,
        ],
      })),
      {
        test: /\.svg$/,
        include: [path.resolve(__dirname, 'src/_assets')],
        use: [
          {
            loader: 'svg-sprite-loader',
            options: {
              symbolId: '[name]',
              extract: true,
              spriteFilename: `${appPath}/${dynamicClientlibPrefix}${spritePath}`,
            },
          },
          {
            loader: 'svgo-loader',
            options: {
              plugins: [{convertPathData: false}],
            },
          },
        ],
      },
    ],
  },
  entry: {
    author: allEntryDependencies.concat(['./src/author']),
    dialog: allEntryDependencies.concat(['svgxuse', './src/dialog']),
    site: allEntryDependencies.concat(['svgxuse', './src/site']),
    siteHead: allEntryDependencies.concat(['./src/siteHead']),
  },
  output: {
    filename: '[name].js',
    chunkFilename: '[name].js',
    path: appPath,
    crossOriginLoading: 'anonymous',
  },
  resolve: {
    alias: {
      Src: path.resolve(__dirname, 'src'),
      Components: componentPath,
      Utils: path.resolve(__dirname, 'src/_utils'),
      Svg: path.resolve(__dirname, 'src/_assets/svg'),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    plugins: [new DirectoryNamedWebpackPlugin(true)],
  },
  plugins: [
    new webpack.DefinePlugin({
      SPRITE_PATH: JSON.stringify(
        `${aemPath}/${dynamicClientlibPrefix}${spritePath}`
      ),
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css',
      chunkFilename: '[id].css',
    }),
    new SpriteLoaderPlugin(),
    mode === 'production' && new SriPlugin({hashFuncNames: ['sha256']}),
    new AssetsPlugin({
      filename: 'clientlib.config.js',
      fileTypes: ['js', 'css'],
      includeManifest: true,
      integrity: true,
      manifestFirst: true,
      update: true,
      processOutput(bundles) {
        const clientlibPrefix = 'clientlib.';
        const config = {
          context: appPath,
          clientLibRoot: clientlibPath,
          libs: Object.entries(bundles)
            .sort(([a]) =>
              (a.includes(automaticNameDelimiter) || a.includes('/resources/')
                ? 1
                : -1)
            )
            .reduce((acc, cur) => {
              const name = cur[0];

              if (name.includes('/resources/')) {
                // Add to the resources of another clientlib
                const clientlibName = name.split('/resources/').shift();
                const clientlib = acc.find(c => c[0] === clientlibName);

                clientlib[1].resources = `${clientlibName}/resources/**/*`;

                return acc;
              }

              return [...acc, cur];
            }, [])
            .map(([name, files]) => {
              let longCacheKey = '';
              let dependencies;
              const assets = Object.entries(files).reduce(
                (acc, [category, file]) => {
                  if (category === 'js' || category === 'css') {
                    return {...acc, [category]: [file]};
                  }

                  if (category.endsWith('Integrity')) {
                    longCacheKey += file;
                  }

                  return acc;
                },
                {}
              );

              if (longCacheKey) {
                longCacheKey = md5(longCacheKey);
              } else {
                longCacheKey = Date.now();
              }

              // Determine Dependencies
              if (!name.includes(automaticNameDelimiter)) {
                dependencies = Object.entries(bundles)
                  .reverse()
                  .reduce((acc, [libName]) => {
                    if (
                      libName.includes(automaticNameDelimiter) &&
                      libName.split(automaticNameDelimiter).includes(name)
                    ) {
                      acc.push(clientlibPrefix + libName);
                    }

                    return acc;
                  }, []);
              }

              return {
                allowProxy: true,
                assets,
                categories: [clientlibPrefix + name],
                dependencies,
                cssProcessor: '[default:none,min:none]',
                jsProcessor: '[default:none,min:none]',
                longCacheKey,
                name: dynamicClientlibPrefix + name,
                serializationFormat: 'xml',
              };
            }),
        };

        return `module.exports = ${JSON.stringify(config, null, 2)}`;
      },
    }),
    showReport && new BundleAnalyzerPlugin(),
    mode !== 'production' && new webpack.HotModuleReplacementPlugin(),
  ].filter(p => p),
  optimization: {
    minimize: mode === 'production',
    minimizer: [
      new UglifyJSPlugin({
        uglifyOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
          },
          output: {
            comments: false,
          },
          mangle: true,
          ie8: false,
        },
      }),
    ],
    splitChunks:
      mode === 'production'
        ? {
            // Don't split anything that's a resource to a clientlib
            chunks: chunk => !/^.+\/resources\//i.test(chunk.name),
            automaticNameDelimiter,
            name: true,
            minChunks: 1,
            minSize: 0,
            maxSize: 0,
            maxInitialRequests: 20,
            cacheGroups: {
              vendors: {
                test: /[\\/]node_modules[\\/]/,
                reuseExistingChunk: true,
                enforce: true,
              },
            },
          }
        : undefined,
  },
  devServer: {
    hot: true,
    open: true,
    openPage: hmrOpenPage,
    port,
    publicPath: '/static/',
    proxy: [
      {
        context: ['**', '!/static/**'],
        target: `http://localhost:${aemPort}`,
        bypass(req, res) {
          const baseName = path.basename(req.url);

          // hot-update.json file is in the `/static/` root
          if (baseName.includes('hot-update')) {
            // i.e. /static/38aef42fe50485ef5f9c.hot-update.json
            // OR
            // i.e. /static/apps/APP/clientlibs/site/site.fd3f23c87cc7b89841ee.hot-update.js
            return `/static/${baseName}`;
          }

          // Proxy AEM clientlibs back to Webpack
          if (req.url.includes(`${aemPath}/${dynamicClientlibPrefix}`)) {
            if (req.url.endsWith('.css')) {
              // Hide CSS, HMR uses in DOM <style> tags
              res.setHeader('Content-Type', 'text/css');
              res.send('');
            } else if (baseName.includes(automaticNameDelimiter)) {
              // Don't serve split libraries as those are production only
              res.setHeader('Content-Type', 'application/javascript');
              res.send('');
            } else {
              const fileName = baseName.split('.').shift();
              const finalPath = `${fileName.replace(
                dynamicClientlibPrefix,
                ''
              )}${path.extname(baseName)}`;

              return `/static/${finalPath}`;
            }
          }
        },
      },
    ],
  },
});
