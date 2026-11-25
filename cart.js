// Shopping cart for pay.html. The cart lives in the visitor's browser (localStorage).
// Prices shown here are for display only; the real prices are in netlify/functions/checkout.js.
(function () {
  'use strict';
  var KEY = 'kkch-cart-v1';
  var $ = function (id) { return document.getElementById(id); };
  var cart = []; // [{id, name, price, qty}]

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (Array.isArray(raw)) cart = raw.filter(function (l) { return l && l.id && l.qty > 0; });
    } catch (e) { cart = []; }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {} }
  function money(n) { return '$' + n.toLocaleString('en-AU'); }
  function count() { return cart.reduce(function (n, l) { return n + l.qty; }, 0); }
  function total() { return cart.reduce(function (n, l) { return n + l.qty * l.price; }, 0); }

  function render() {
    var list = $('cartList');
    list.innerHTML = '';
    cart.forEach(function (l) {
      var li = document.createElement('li');
      li.innerHTML =
        '<div class="ci-name"></div>' +
        '<div class="ci-qty"><button type="button" data-act="dec" aria-label="Fewer"></button>' +
        '<span aria-live="polite"></span><button type="button" data-act="inc" aria-label="More"></button></div>' +
        '<div class="ci-price"></div>' +
        '<button type="button" class="ci-remove" data-act="rm" aria-label="Remove"></button>';
      li.querySelector('.ci-name').textContent = l.name;
      var btns = li.querySelectorAll('.ci-qty button');
      btns[0].textContent = '−'; btns[1].textContent = '+';
      btns[0].setAttribute('aria-label', 'Fewer ' + l.name);
      btns[1].setAttribute('aria-label', 'More ' + l.name);
      li.querySelector('.ci-qty span').textContent = l.qty;
      li.querySelector('.ci-price').textContent = money(l.qty * l.price);
      var rm = li.querySelector('.ci-remove');
      rm.textContent = 'Remove'; rm.setAttribute('aria-label', 'Remove ' + l.name);
      li.setAttribute('data-id', l.id);
      list.appendChild(li);
    });
    $('cartEmpty').hidden = cart.length > 0;
    $('cartTotal').textContent = money(total());
    $('checkoutBtn').disabled = cart.length === 0;
    var n = count();
    $('cartCount').textContent = n;
    $('cartCount').hidden = n === 0;
  }

  function change(id, delta) {
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === id) {
        cart[i].qty = Math.min(20, cart[i].qty + delta);
        if (cart[i].qty <= 0) cart.splice(i, 1);
        break;
      }
    }
    save(); render();
  }

  function openCart() {
    $('cart').hidden = false; $('cartScrim').hidden = false;
    $('cartOpen').setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('cart-open');
    $('cartClose').focus();
  }
  function closeCart() {
    $('cart').hidden = true; $('cartScrim').hidden = true;
    $('cartOpen').setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('cart-open');
  }

  function showError(msg) { var e = $('cartError'); e.textContent = msg; e.hidden = !msg; }

  function checkout() {
    if (!cart.length) return;
    var btn = $('checkoutBtn');
    btn.disabled = true; btn.textContent = 'Taking you to Stripe…'; showError('');
    fetch('/.netlify/functions/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart.map(function (l) { return { id: l.id, qty: l.qty }; }) })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; });
    }).then(function (res) {
      if (res.ok && res.d.url) { window.location.href = res.d.url; return; }
      throw new Error(res.d.error || 'Checkout is not available right now.');
    }).catch(function (e) {
      showError((e && e.message ? e.message : 'Checkout is not available right now.') +
        ' You can still use "Pay for this item only" on each item, or pay at the dojo.');
      btn.disabled = false; btn.textContent = 'Checkout with Stripe';
    });
  }

  function banner() {
    var m = /[?&]status=(success|cancelled)/.exec(location.search);
    if (!m) return;
    var b = $('payBanner');
    if (m[1] === 'success') {
      cart = []; save();
      b.textContent = 'Thank you. Your payment went through and Stripe will email you a receipt. Osu!';
      b.className = 'pay-banner ok';
    } else {
      b.textContent = 'Payment cancelled. Nothing was charged and your cart has been kept.';
      b.className = 'pay-banner';
    }
    b.hidden = false;
    if (window.history && history.replaceState) history.replaceState(null, '', location.pathname);
  }

  function init() {
    load(); banner();
    document.addEventListener('click', function (ev) {
      var add = ev.target.closest && ev.target.closest('.add-to-cart');
      if (add) {
        var a = add.closest('[data-id]');
        var id = a.getAttribute('data-id'), found = false;
        cart.forEach(function (l) { if (l.id === id) { l.qty = Math.min(20, l.qty + 1); found = true; } });
        if (!found) cart.push({ id: id, name: a.getAttribute('data-name'), price: Number(a.getAttribute('data-price')), qty: 1 });
        save(); render();
        var old = add.textContent; add.textContent = 'Added ✓';
        setTimeout(function () { add.textContent = old; }, 1200);
        return;
      }
      var act = ev.target.getAttribute && ev.target.getAttribute('data-act');
      if (act) {
        var li = ev.target.closest('li'), id2 = li && li.getAttribute('data-id');
        if (act === 'inc') change(id2, 1);
        if (act === 'dec') change(id2, -1);
        if (act === 'rm') { cart = cart.filter(function (l) { return l.id !== id2; }); save(); render(); }
      }
    });
    $('cartOpen').addEventListener('click', openCart);
    $('cartClose').addEventListener('click', function () { closeCart(); $('cartOpen').focus(); });
    $('cartScrim').addEventListener('click', closeCart);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('cart').hidden) { closeCart(); $('cartOpen').focus(); } });
    $('checkoutBtn').addEventListener('click', checkout);
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
