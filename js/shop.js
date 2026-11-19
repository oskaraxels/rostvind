/* Rostvind – demo-butik: katalog, varukorg (localStorage) och e-handelsevents (GA4-schema). Inga betalningar. */
(function () {
  var CATALOG = {
    'soder-blend':    { item_id: 'RV-SODER-250', slug: 'soder-blend', item_name: 'Söder Blend 250 g', item_category: 'Kaffebönor', item_category2: 'Mellanrost', price: 139, img: 'assets/img/soder-blend.jpg' },
    'etiopien-guji':  { item_id: 'RV-GUJI-250', slug: 'etiopien-guji', item_name: 'Etiopien Guji 250 g', item_category: 'Kaffebönor', item_category2: 'Ljusrost', price: 169, img: 'assets/img/etiopien-guji.jpg' },
    'colombia-huila': { item_id: 'RV-HUILA-250', slug: 'colombia-huila', item_name: 'Colombia Huila 250 g', item_category: 'Kaffebönor', item_category2: 'Mellanrost', price: 149, img: 'assets/img/colombia-huila.jpg' },
    'hemma-manad':    { item_id: 'RV-SUB-M', slug: 'hemma-manad', item_name: 'Rostvind Hemma – 2 × 250 g/månad', item_category: 'Prenumeration', item_category2: 'Månad', price: 279, img: 'assets/img/prenumeration.jpg', subscription: true },
    'hemma-2v':       { item_id: 'RV-SUB-2W', slug: 'hemma-2v', item_name: 'Rostvind Hemma – 2 × 250 g varannan vecka', item_category: 'Prenumeration', item_category2: 'Varannan vecka', price: 529, img: 'assets/img/prenumeration.jpg', subscription: true }
  };
  var KEY = 'rv_cart', FREE = 399, SHIP = 49;
  var BRAND = { item_brand: 'Rostvind', affiliation: 'Rostvind webbshop (demo)' };
  function get() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function save(c) { localStorage.setItem(KEY, JSON.stringify(c)); badge(); }
  function item(slug, qty, variant, idx, list) {
    var p = CATALOG[slug]; return { item_id: p.item_id, item_name: p.item_name, item_brand: BRAND.item_brand, item_category: p.item_category,
      item_category2: p.item_category2, item_variant: variant || 'Hela bönor', price: p.price, quantity: qty || 1, index: idx || 0, item_list_name: list || undefined };
  }
  function totals(c) { var sub = c.reduce(function (a, l) { return a + CATALOG[l.slug].price * l.qty; }, 0);
    var ship = sub === 0 || sub >= FREE || c.some(function (l) { return CATALOG[l.slug].subscription; }) ? 0 : SHIP; return { sub: sub, ship: ship, total: sub + ship }; }
  function itemsOf(c) { return c.map(function (l, i) { return item(l.slug, l.qty, l.variant, i); }); }
  function badge() { var n = get().reduce(function (a, l) { return a + l.qty; }, 0); document.querySelectorAll('[data-cart-count]').forEach(function (e) { e.textContent = n; }); }
  function kr(n) { return n.toLocaleString('sv-SE') + ' kr'; }
  function add(slug, qty, variant, list) {
    var c = get(), f = c.filter(function (l) { return l.slug === slug && l.variant === variant; })[0];
    if (CATALOG[slug].subscription) { c = c.filter(function (l) { return !CATALOG[l.slug].subscription; }); f = null; }
    if (f) f.qty += qty; else c.push({ slug: slug, qty: qty, variant: variant });
    save(c);
    rvTrack('add_to_cart', { currency: 'SEK', value: CATALOG[slug].price * qty, items: [item(slug, qty, variant, 0, list)] });
    toast(CATALOG[slug].item_name + ' ligger i varukorgen');
  }
  function toast(t) { var d = document.createElement('div'); d.className = 'toast'; d.innerHTML = t + ' · <a href="varukorg.html">Visa varukorg</a>'; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 3500); }
  window.RV = { CATALOG: CATALOG, get: get, save: save, add: add, totals: totals, itemsOf: itemsOf, item: item, kr: kr, FREE: FREE };

  document.addEventListener('rv:ready', function () {
    badge();
    // Produktlistor
    document.querySelectorAll('[data-item-list]').forEach(function (list) {
      var name = list.getAttribute('data-item-list'), cards = list.querySelectorAll('[data-slug]');
      rvTrack('view_item_list', { item_list_id: name, item_list_name: name, items: [].map.call(cards, function (c, i) { return item(c.getAttribute('data-slug'), 1, null, i, name); }) });
      cards.forEach(function (c, i) { c.addEventListener('click', function () { rvTrack('select_item', { item_list_id: name, item_list_name: name, items: [item(c.getAttribute('data-slug'), 1, null, i, name)] }); }); });
    });
    // Produktsida
    var pd = document.querySelector('[data-product]');
    if (pd) {
      var slug = pd.getAttribute('data-product');
      rvTrack('view_item', { currency: 'SEK', value: CATALOG[slug].price, items: [item(slug)] });
      pd.querySelector('form').addEventListener('submit', function (e) { e.preventDefault();
        add(slug, parseInt(pd.querySelector('[name=qty]').value, 10) || 1, pd.querySelector('[name=grind]').value, 'product_page'); });
    }
    // Prenumeration
    var sub = document.getElementById('sub-form');
    if (sub) {
      rvTrack('view_item', { currency: 'SEK', value: 279, items: [item('hemma-manad'), item('hemma-2v')] });
      sub.addEventListener('submit', function (e) { e.preventDefault();
        var plan = sub.querySelector('[name=plan]:checked').value, coffee = sub.querySelector('[name=coffee]').value;
        add(plan, 1, coffee + ' · ' + sub.querySelector('[name=grind]').value, 'subscription_page'); location.href = 'varukorg.html'; });
    }
    // Varukorg
    var cart = document.getElementById('cart');
    if (cart) {
      function render() {
        var c = get(), t = totals(c);
        if (!c.length) { cart.innerHTML = '<p class="lead">Varukorgen är tom. <a href="butik.html">Till butiken →</a></p>'; return; }
        cart.innerHTML = '<div class="cart-lines">' + c.map(function (l, i) { var p = CATALOG[l.slug];
          return '<div class="line"><img src="' + p.img + '" alt=""><div><b>' + p.item_name + '</b><span class="note">' + l.variant + '</span></div>' +
            '<div class="qty"><button data-dec="' + i + '" aria-label="Minska">−</button><span>' + l.qty + '</span><button data-inc="' + i + '" aria-label="Öka">+</button></div><b>' + kr(p.price * l.qty) + '</b>' +
            '<button class="rm" data-rm="' + i + '">Ta bort</button></div>'; }).join('') + '</div>' +
          '<div class="sum"><div><span>Delsumma</span><b>' + kr(t.sub) + '</b></div><div><span>Frakt</span><b>' + (t.ship ? kr(t.ship) : 'Fri') + '</b></div>' +
          (t.sub < FREE && t.ship ? '<p class="note">Handla för ' + kr(FREE - t.sub) + ' till för fri frakt.</p>' : '') +
          '<div class="tot"><span>Totalt</span><b>' + kr(t.total) + '</b></div><a class="btn" href="kassa.html" id="to-checkout">Till kassan →</a></div>';
        cart.querySelectorAll('[data-inc]').forEach(function (b) { b.onclick = function () { var c = get(), l = c[b.dataset.inc]; l.qty++; save(c);
          rvTrack('add_to_cart', { currency: 'SEK', value: CATALOG[l.slug].price, items: [item(l.slug, 1, l.variant)] }); render(); }; });
        cart.querySelectorAll('[data-dec],[data-rm]').forEach(function (b) { b.onclick = function () { var c = get(), i = b.dataset.dec || b.dataset.rm, l = c[i], q = b.dataset.rm ? l.qty : 1;
          l.qty -= q; if (l.qty <= 0) c.splice(i, 1); save(c); rvTrack('remove_from_cart', { currency: 'SEK', value: CATALOG[l.slug].price * q, items: [item(l.slug, q, l.variant)] }); render(); }; });
        document.getElementById('to-checkout').onclick = function () { var c = get(); rvTrack('begin_checkout', { currency: 'SEK', value: totals(c).sub, items: itemsOf(c) }); };
      }
      var c0 = get(); if (c0.length) rvTrack('view_cart', { currency: 'SEK', value: totals(c0).sub, items: itemsOf(c0) });
      render();
    }
  });
})();
