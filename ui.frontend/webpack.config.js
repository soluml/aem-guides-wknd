const webpack = require('webpack');
const path = require('path');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const SpriteLoaderPlugin = require('svg-sprite-loader/plugin');
const DirectoryNamedWebpackPlugin = require('directory-named-webpack-plugin');
const SriPlugin = require('webpack-subresource-integrity');
const AssetsPlugin = require('assets-webpack-plugin');
const {BundleAnalyzerPlugin} = require('webpack-bundle-analyzer');

const appPath = path.resolve(__dirname, 'dist');
const aemPath = '/etc.clientlibs/wknd/clientlibs';
const dynamicClientlibPrefix = 'webpack-clientlib-';
const spritePath = 'site/resources/sprite.svg';
const automaticNameDelimiter = '~';

module.exports = (
  env,
  {
    mode = 'development',
    port = 8080,
    aemPort = 4502,
    showReport = false,
    isTest = false,
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
    author: ['Utils/modernizr', './src/author'],
    dialog: ['Utils/modernizr', './src/dialog'],
    site: ['svgxuse', 'Utils/modernizr', './src/site'],
    siteHead: ['Utils/modernizr', './src/siteHead'],
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
      Components: path.resolve(
        __dirname,
        '../ui.apps/src/main/content/jcr_root/apps/wknd/components'
      ),
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
      filename: ({chunk}) => `${chunk.name.replace('/js/', '/css/')}.css`,
      chunkFilename: '[id].css',
    }),
    new SpriteLoaderPlugin(),
    new SriPlugin({hashFuncNames: ['sha256']}),
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
          clientLibRoot: path.resolve(
            __dirname,
            '../ui.apps/src/main/content/jcr_root/apps/wknd/clientlibs'
          ),
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
                    longCacheKey += file.replace('sha256-', '');
                  }

                  return acc;
                },
                {}
              );

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
    splitChunks: {
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
    },
  },
  devServer: {
    hot: true,
    open: true,
    openPage: 'content/wknd/en.html',
    port,
    publicPath: '/static/',
    proxy: [
      {
        context: ['**', '!/static/**'],
        target: `http://localhost:${aemPort}`,
        bypass(req, res) {
          const baseName = path.basename(req.url);
          const localAppPath = path.relative(__dirname, appPath);

          // hot-update.json file is in the `/static/` root
          if (baseName.includes('hot-update.json')) {
            // i.e. /static/38aef42fe50485ef5f9c.hot-update.json
            return `/static/${baseName}`;
          }

          //   // Proxy HMR requests back to Webpack
          //   if (baseName.includes('hot-update')) {
          //     // The other hot update files (ex. BUNDLE.hot-update.js) are in the `/static/${localAppPath}` folder
          //     const fileName = path
          //       .basename(req.url)
          //       .split('.')
          //       .shift();

          //     // i.e. /static/apps/APP/clientlibs/site/site.fd3f23c87cc7b89841ee.hot-update.js
          //     return `/static/${localAppPath}/${fileName}/${baseName}`;
          //   }

          // Proxy AEM clientlibs back to Webpack
          if (req.url.includes(`${aemPath}/${dynamicClientlibPrefix}`)) {
            if (req.url.endsWith('.css')) {
              // Hide CSS, HMR uses in DOM <style> tags
              res.send('');
            } else {
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

              console.log(req.url);
              console.log(baseName);
              console.log(`/static/${localAppPath}/${finalPath}`);
              console.log();

              return `/static/${localAppPath}/${finalPath}`;
            }
          }
        },
      },
    ],
  },
});
