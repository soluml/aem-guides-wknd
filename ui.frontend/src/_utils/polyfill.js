export default function() {
  const polyfills = [];

  // URLSearchParams (https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)
  if (!Modernizr.urlsearchparams) {
    polyfills.push(
      import(/* webpackChunkName: "site/resources/polyfill-urlsearchparams" */ 'url-search-params-polyfill')
    );
  }

  return Promise.all(polyfills);
}
