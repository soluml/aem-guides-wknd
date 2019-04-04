export default function(cb) {
  const script = document.createElement('script');
  const listener = () => {
    cb();
    script.removeEventListener('load', listener);
  };

  script.addEventListener('load', listener);
  script.src = PROMISE_POLYFILL_PATH;
  document.head.appendChild(script);
}
