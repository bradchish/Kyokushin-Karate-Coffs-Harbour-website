// Netlify Function: creates a Stripe Checkout Session for the cart on pay.html.
// Prices here are the ones customers are actually charged (pay.html prices are display only).
// Needs the STRIPE_SECRET_KEY environment variable set in Netlify.
// To add or change an item: edit CATALOG below, then add a matching block in pay.html with the same data-id.

const CATALOG = {
  'adult-2x':    { name: 'Adult term fees, 2 classes a week', price: 240 },
  'adult-1x':    { name: 'Adult term fees, 1 class a week',   price: 180 },
  'kid-2x':      { name: 'Kids term fees, 2 classes a week',  price: 200 },
  'kid-1x':      { name: 'Kids term fees, 1 class a week',    price: 150 },
  'grading':     { name: 'Grading fee',                       price: 35 },
  'gi':          { name: 'Gi (uniform)',                      price: 50 },
  'gloves':      { name: 'Gloves',                            price: 20 },
  'shin-pads':   { name: 'Shin pads',                         price: 20 },
  'mouth-guard': { name: 'Mouth guard',                       price: 10 }
};

const MAX_QTY = 20;
const CURRENCY = 'aud';

function reply(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
  };
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return reply(405, { error: 'Method not allowed.' });
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error('STRIPE_SECRET_KEY is not set in Netlify environment variables.');
    return reply(500, { error: 'Checkout is not available right now.' });
  }

  let items;
  try {
    items = JSON.parse(event.body || '{}').items;
  } catch (e) {
    return reply(400, { error: 'Invalid request.' });
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > 20) {
    return reply(400, { error: 'Your cart is empty.' });
  }

  // Merge duplicates and validate against the catalog (never trust prices from the browser).
  const wanted = {};
  for (const it of items) {
    const id = it && String(it.id);
    const qty = it && Number(it.qty);
    if (!CATALOG[id] || !Number.isInteger(qty) || qty < 1) {
      return reply(400, { error: 'One of the items in your cart is no longer available.' });
    }
    wanted[id] = Math.min(MAX_QTY, (wanted[id] || 0) + qty);
  }

  const site = (process.env.URL || event.headers.origin || '').replace(/\/$/, '');
  if (!site) {
    console.error('Could not work out the site URL for the Stripe return links.');
    return reply(500, { error: 'Checkout is not available right now.' });
  }

  const p = new URLSearchParams();
  p.append('mode', 'payment');
  p.append('success_url', site + '/pay.html?status=success');
  p.append('cancel_url', site + '/pay.html?status=cancelled');
  p.append('submit_type', 'pay');
  p.append('billing_address_collection', 'auto');

  // Ask for the student's name on the Stripe page (email is collected by Stripe automatically).
  p.append('custom_fields[0][key]', 'student_name');
  p.append('custom_fields[0][label][type]', 'custom');
  p.append('custom_fields[0][label][custom]', "Student's name");
  p.append('custom_fields[0][type]', 'text');

  Object.keys(wanted).forEach(function (id, i) {
    const item = CATALOG[id];
    p.append('line_items[' + i + '][quantity]', String(wanted[id]));
    p.append('line_items[' + i + '][price_data][currency]', CURRENCY);
    p.append('line_items[' + i + '][price_data][unit_amount]', String(item.price * 100));
    p.append('line_items[' + i + '][price_data][product_data][name]', item.name);
  });

  try {
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: p.toString()
    });
    const data = await res.json();
    if (!res.ok || !data.url) {
      console.error('Stripe error:', res.status, JSON.stringify(data && data.error));
      return reply(502, { error: 'Checkout is not available right now.' });
    }
    return reply(200, { url: data.url });
  } catch (e) {
    console.error('Checkout function failed:', e);
    return reply(502, { error: 'Checkout is not available right now.' });
  }
};
