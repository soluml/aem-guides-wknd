import polyfills from 'Utils/polyfill';
import './dialog.scss';

polyfills.then(() => {
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
