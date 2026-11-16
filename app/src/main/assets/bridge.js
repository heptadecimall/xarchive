// Injected by the Android shell before the page's own scripts run.
(function () {
  if (window.__xaBridge || !window.XArchiveNative) return;
  window.__xaBridge = true;

  // The Android shell already keeps the page clear of the status / navigation bars,
  // so drop viewport-fit=cover to stop the page adding the same space a second time.
  function fixViewport() {
    var m = document.querySelector('meta[name=viewport]');
    if (m && /viewport-fit\s*=\s*cover/.test(m.content)) {
      m.content = m.content.replace(/,?\s*viewport-fit\s*=\s*cover/, '');
    }
  }
  // Belt and braces: some WebView versions still report safe-area insets, so zero them in the CSS.
  function zeroSafeArea() {
    var st = document.querySelectorAll('style');
    for (var i = 0; i < st.length; i++) {
      var t = st[i].textContent;
      if (t.indexOf('safe-area-inset') >= 0) {
        st[i].textContent = t.replace(/env\(\s*safe-area-inset-[a-z]+\s*(,[^)]*)?\)/g, '0px');
      }
    }
  }
  fixViewport();
  document.addEventListener('DOMContentLoaded', function () { fixViewport(); zeroSafeArea(); });

  // Service workers are unnecessary inside the app (files are bundled).
  try {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register = function () { return Promise.resolve({}); };
    }
  } catch (e) {}

  // Clipboard: route through the native clipboard so "Copy data" always works.
  try {
    var cb = navigator.clipboard || {};
    cb.writeText = function (t) {
      try { XArchiveNative.copyText(String(t)); return Promise.resolve(); }
      catch (e) { return Promise.reject(e); }
    };
    if (!navigator.clipboard) Object.defineProperty(navigator, 'clipboard', { value: cb });
  } catch (e) {}

  // Downloads: WebView can't save blob: links, so hand the content to Android.
  var origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    var href = this.href || '';
    if (this.hasAttribute('download') && (href.indexOf('blob:') === 0 || href.indexOf('data:') === 0)) {
      var name = this.getAttribute('download') || 'download';
      fetch(href).then(function (r) { return r.blob(); }).then(function (b) {
        var fr = new FileReader();
        fr.onload = function () {
          var s = String(fr.result), i = s.indexOf(',');
          XArchiveNative.saveFile(name, b.type || 'application/octet-stream', s.slice(i + 1));
        };
        fr.readAsDataURL(b);
      });
      return;
    }
    return origClick.apply(this, arguments);
  };
})();
