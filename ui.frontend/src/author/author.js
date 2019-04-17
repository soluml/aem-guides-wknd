import polyfills from 'Utils/polyfill';
import './author.scss';

polyfills.then(() => {
  let req = require.context('Components', true, /\.author\.js$/);
  req.keys().forEach(req);

  // Development HMR
  if (process.env.NODE_ENV === 'development') {
    if (module.hot) {
      module.hot.accept(req.id, () => {
        req = require.context('Components', true, /\.author\.js$/);
        req.keys().forEach(req);
      });
    }
  }
});
