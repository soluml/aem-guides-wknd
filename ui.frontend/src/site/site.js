import polyfills from 'Utils/polyfill';
import './grid.less';
import './site.scss';

polyfills.then(() => {
  // Load: this does NOT include .jsx files as components should be included via other files
  let req = require.context('Components', true, /\.site\.js$/);
  req.keys().forEach(req);

  // Development HMR
  if (process.env.NODE_ENV === 'development') {
    if (module.hot) {
      module.hot.accept(req.id, () => {
        //Clean jQuery event delegations in content frame
        try {
          $(document).off();
          $(window).off();
        } catch {
          //
        }

        req = require.context('Components', true, /\.site\.js$/);
        req.keys().forEach(req);
      });
    }
  }
});
