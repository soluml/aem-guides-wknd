// Enable if supporting IE11 or provide alternative
// import 'es6-promise/auto';

const polyfills = [];

// URLSearchParams (https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)
if (!Modernizr.urlsearchparams) {
  polyfills.push(
    import(/* webpackChunkName: "site/resources/polyfill-urlsearchparams" */ 'url-search-params-polyfill')
  );
}

export default Promise.all(polyfills);
