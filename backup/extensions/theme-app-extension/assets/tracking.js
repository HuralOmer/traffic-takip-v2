/* HRL Traffic Tracking - App Proxy Script */
(function () {
  'use strict';

  // ---- helpers -------------------------------------------------------------
  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function getOrSetLS(key, gen) {
    let v = localStorage.getItem(key);
    if (!v) {
      v = gen();
      localStorage.setItem(key, v);
    }
    return v;
  }

  // ---- bootstrap element & endpoints --------------------------------------
  // <script id="hrl-app-proxy" ...> ile geldi; currentScript yoksa id'den al
  var scriptEl = document.currentScript || document.getElementById('hrl-app-proxy');
  if (!scriptEl) {
    console.warn('HRL Tracking: bootstrap script element not found');
    return;
  }

  var u = new URL(scriptEl.src);
  // .../apps/<subpath>/tracking.js  -> basePath = /apps/<subpath>
  var basePath = u.pathname.replace(/\/tracking\.js$/, '');
  var ORIGIN = u.origin;

  var ENDPOINTS = {
    collect: ORIGIN + '/collect',
    config:  ORIGIN + basePath + '/config.json'
  };

  // ---- public namespace ----------------------------------------------------
  var HRL = {
    version: '1.0.0',
    config: {
      shop: (window.Shopify && window.Shopify.shop) || (location.hostname.includes('.myshopify.com') ? location.hostname : 'unknown'),
      endpoints: ENDPOINTS,
      heartbeatMs: 30000
    },
    visitorId: null,
    sessionId: null,
    initialized: false
  };

  window.HRLTracking = HRL; // debug amaçlı

  // ---- core ----------------------------------------------------------------
  function init() {
    if (HRL.initialized) return;
    HRL.initialized = true;

    HRL.visitorId = getOrSetLS('hrl_visitor_id', function () { return uid('v'); });
    // sessionStorage: her oturumda değişir
    HRL.sessionId = sessionStorage.getItem('hrl_session_id') || (function () {
      var v = uid('s');
      sessionStorage.setItem('hrl_session_id', v);
      return v;
    })();

    // (opsiyonel) sunucu konfigürasyonu
    fetch(HRL.config.endpoints.config, { credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (cfg) {
        if (cfg && cfg.settings && typeof cfg.settings.heartbeatInterval === 'number') {
          HRL.config.heartbeatMs = cfg.settings.heartbeatInterval;
        }
      })
      .catch(function () { /* sessiz geç */ });

    track('page_view', {
      url: location.href,
      title: document.title,
      referrer: document.referrer
    });

    startHeartbeat();

    // visibility & unload
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        track('page_hide', { url: location.href });
      } else {
        track('page_show', { url: location.href });
      }
    });

    window.addEventListener('beforeunload', function () {
      sendBeacon('page_unload', {
        url: location.href,
        duration_ms: Date.now() - startTs
      });
    });

    console.log('HRL Tracking initialized', {
      visitorId: HRL.visitorId,
      sessionId: HRL.sessionId,
      endpoints: HRL.config.endpoints
    });
  }

  function payload(type, extra) {
    return Object.assign({
      type: type,
      shop: HRL.config.shop,
      timestamp: Date.now(),
      visitor_id: HRL.visitorId,
      session_id: HRL.sessionId,
      page: { url: location.href, title: document.title, referrer: document.referrer },
      ua: navigator.userAgent,
      lang: navigator.language
    }, extra || {});
  }

  function send(data) {
    console.log('HRL Tracking: Sending data', data);
    fetch(HRL.config.endpoints.collect, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // App Proxy HMAC doğrulaması Shopify tarafından eklenir; ek header gerektirme.
      body: JSON.stringify(data),
      credentials: 'omit'
    }).then(function(response) {
      console.log('HRL Tracking: Response received', response.status, response.statusText);
      return response.json();
    }).then(function(data) {
      console.log('HRL Tracking: Response data', data);
    }).catch(function (e) {
      console.warn('HRL Tracking send error', e);
    });
  }

  function sendBeacon(type, extra) {
    var d = payload(type, extra);
    if (navigator.sendBeacon) {
      try {
        var blob = new Blob([JSON.stringify(d)], { type: 'application/json' });
        navigator.sendBeacon(HRL.config.endpoints.collect, blob);
        return;
      } catch (_) { /* fallback fetch */ }
    }
    send(d);
  }

  function track(type, extra) {
    send(payload(type, extra));
  }

  var hbTimer = null;
  var startTs = Date.now();
  function startHeartbeat() {
    // ilk nabız
    track('heartbeat', { since_ms: 0 });
    // periyodik
    hbTimer = setInterval(function () {
      track('heartbeat', { since_ms: Date.now() - startTs });
    }, HRL.config.heartbeatMs);
  }

  // ---- kick off ------------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
