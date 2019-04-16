import promise from 'Utils/promise';
import polyfills from 'Utils/polyfill';
import './dialog.scss';

function setup() {
  polyfills().then(() => {
    // Load: this does NOT include .jsx files as components should be included via other files
    let req = require.context('Components', true, /\.dialog\.js$/);
    req.keys().forEach(req);

    // Development HMR
    if (process.env.NODE_ENV === 'development') {
      if (module.hot) {
        module.hot.accept(req.id, () => {
          req = require.context('Components', true, /\.dialog\.js$/);
          req.keys().forEach(req);
        });
      }
    }
  });
}

Modernizr.promises ? setup() : promise(setup);
