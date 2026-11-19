/* Rostvind – samtyckesstyrd mätning (GA4 + Meta Pixel) via dataLayer.
   Principen: ingenting från Google eller Meta laddas förrän besökaren
   aktivt har godkänt respektive kategori (GDPR + LEK 9 kap. 28 §). */
(function () {
  var C = window.RV_CONFIG || {};
  var KEY = 'rv_consent';
  var isPlaceholder = function (id) { return !id || /X{4,}|^0+$/.test(id); };
  var DEMO = isPlaceholder(C.GA4_MEASUREMENT_ID) || isPlaceholder(C.META_PIXEL_ID);
  var debug = /[?&]debug=1/.test(location.search) || sessionStorage.getItem('rv_debug') === '1';
  if (/[?&]debug=1/.test(location.search)) sessionStorage.setItem('rv_debug', '1');

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  // Google Consent Mode v2 – allt nekat som standard
  gtag('consent', 'default', {
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
    analytics_storage: 'denied', functionality_storage: 'granted', security_storage: 'granted',
    wait_for_update: 500
  });

  /* ---------- UTM-hantering: spara första källan i sessionen ---------- */
  var params = new URLSearchParams(location.search);
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) {
    if (params.get(k)) sessionStorage.setItem(k, params.get(k));
  });
  function utm() {
    var o = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) {
      var v = sessionStorage.getItem(k); if (v) o[k] = v;
    });
    return o;
  }

  /* ---------- Samtycke ---------- */
  function getConsent() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function setConsent(c) {
    c.version = C.CONSENT_VERSION; c.ts = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(c));
    applyConsent(c);
    log('consent_update', { analytics: c.analytics, marketing: c.marketing });
  }
  var loaded = { ga: false, meta: false };
  function applyConsent(c) {
    gtag('consent', 'update', {
      analytics_storage: c.analytics ? 'granted' : 'denied',
      ad_storage: c.marketing ? 'granted' : 'denied',
      ad_user_data: c.marketing ? 'granted' : 'denied',
      ad_personalization: c.marketing ? 'granted' : 'denied'
    });
    if (c.analytics && !loaded.ga) loadGA();
    if (c.marketing && !loaded.meta) loadMeta();
  }
  function loadGA() {
    loaded.ga = true;
    if (DEMO) { log('demo', { note: 'GA4 skulle laddas här (platshållar-ID)' }); return; }
    var s = document.createElement('script'); s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + C.GA4_MEASUREMENT_ID;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', C.GA4_MEASUREMENT_ID, { send_page_view: false, debug_mode: debug });
  }
  function loadMeta() {
    loaded.meta = true;
    if (DEMO) { log('demo', { note: 'Meta Pixel skulle laddas här (platshållar-ID)' }); return; }
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s) }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', C.META_PIXEL_ID);
  }

  /* ---------- Eventmappning GA4 ↔ Meta ---------- */
  var META_MAP = { page_view: 'PageView', view_item: 'ViewContent', add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout',
    add_payment_info: 'AddPaymentInfo', purchase: 'Purchase', generate_lead: 'Lead', subscribe: 'Subscribe', search: 'Search' };
  // Meta vill ha content_ids/value/currency – mappa från GA4:s items[]
  function metaParams(d) {
    var o = { currency: d.currency, value: d.value };
    if (d.items) { o.content_ids = d.items.map(function (i) { return i.item_id; }); o.content_type = 'product';
      o.contents = d.items.map(function (i) { return { id: i.item_id, quantity: i.quantity || 1 }; }); o.num_items = d.items.reduce(function (a, i) { return a + (i.quantity || 1); }, 0); }
    if (d.predicted_ltv) o.predicted_ltv = d.predicted_ltv;
    return o;
  }
  function track(name, data) {
    data = Object.assign({}, data || {}, utm());
    var eventId = name + '.' + Date.now() + '.' + Math.random().toString(36).slice(2, 7);
    if (data.items) { dataLayer.push({ ecommerce: null });
      dataLayer.push({ event: name, event_id: eventId, ecommerce: data }); }
    else dataLayer.push(Object.assign({ event: name, event_id: eventId }, data));
    var c = getConsent() || {};
    if (c.analytics && !DEMO) gtag('event', name, data);
    if (c.marketing && !DEMO && window.fbq) {
      if (META_MAP[name]) fbq('track', META_MAP[name], metaParams(data), { eventID: eventId });
      else fbq('trackCustom', name, data, { eventID: eventId });
    }
    log(name, data, c);
  }
  window.rvTrack = track;

  /* ---------- Debug-panel (?debug=1) ---------- */
  var panel;
  function log(name, data, c) {
    if (!debug) return;
    if (!panel) {
      panel = document.createElement('div'); panel.id = 'rv-debug';
      panel.innerHTML = '<div class="h">dataLayer · ' + (DEMO ? 'DEMO-läge (platshållar-ID)' : 'LIVE') + '</div><ol></ol>';
      document.body.appendChild(panel);
    }
    c = c || getConsent() || {};
    var li = document.createElement('li');
    var dest = name === 'consent_update' || name === 'demo' ? '' :
      ' <span>GA4 ' + (c.analytics ? '✓' : '✕') + ' · Meta ' + (c.marketing ? (META_MAP[name] || 'custom') + ' ✓' : '✕') + '</span>';
    li.innerHTML = '<b>' + name + '</b>' + dest + '<code>' + JSON.stringify(data || {}) + '</code>';
    panel.querySelector('ol').prepend(li);
  }

  /* ---------- Banner ---------- */
  function banner() {
    var b = document.createElement('div'); b.id = 'rv-consent'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Cookieinställningar');
    b.innerHTML =
      '<p><strong>Cookies hos Rostvind.</strong> Nödvändig lagring används för varukorgen och ditt val. Med ditt samtycke mäter vi även besök (Google Analytics) och annonsresultat (Meta Pixel). <a href="integritet.html">Läs mer om cookies</a></p>' +
      '<div class="opts"><label><input type="checkbox" checked disabled> Nödvändiga</label>' +
      '<label><input type="checkbox" id="c-an"> Statistik</label>' +
      '<label><input type="checkbox" id="c-mk"> Marknadsföring</label></div>' +
      '<div class="btns"><button class="ghost" id="c-no">Endast nödvändiga</button><button class="ghost" id="c-save">Spara val</button><button id="c-yes">Godkänn alla</button></div>';
    document.body.appendChild(b);
    function close(c) { setConsent(c); b.remove(); afterConsent(); }
    b.querySelector('#c-yes').onclick = function () { close({ analytics: true, marketing: true }); };
    b.querySelector('#c-no').onclick = function () { close({ analytics: false, marketing: false }); };
    b.querySelector('#c-save').onclick = function () { close({ analytics: b.querySelector('#c-an').checked, marketing: b.querySelector('#c-mk').checked }); };
  }
  window.rvOpenConsent = function () { localStorage.removeItem(KEY); location.reload(); };

  var pvSent = false;
  function afterConsent() { if (!pvSent) { pvSent = true; track('page_view', { page_title: document.title, page_location: location.href.split('?')[0] }); } }

  document.addEventListener('DOMContentLoaded', function () {
    var c = getConsent();
    if (c && c.version === C.CONSENT_VERSION) { applyConsent(c); afterConsent(); } else banner();
    // Klick-events på alla CTA:er: data-track="cta_click" data-label="..."
    document.querySelectorAll('[data-track]').forEach(function (el) {
      el.addEventListener('click', function () {
        track(el.getAttribute('data-track'), { cta_label: el.getAttribute('data-label') || el.textContent.trim(), cta_location: el.getAttribute('data-location') || '' });
      });
    });
    document.dispatchEvent(new Event('rv:ready'));
  });
})();
