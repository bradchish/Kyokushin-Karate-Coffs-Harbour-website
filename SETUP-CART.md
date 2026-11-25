# Cart setup (Netlify + Stripe)

Files added: `netlify.toml`, `netlify/functions/checkout.js`, `cart.js`. Changed: `pay.html`, `index.html`, `style.css`.

## One-time setup
1. In Stripe (Test mode on): Developers > API keys > Create restricted key. Give it ONE permission: Checkout Sessions = Write. Copy the key (starts `rk_test_`).
2. In Netlify: Site configuration > Environment variables > add `STRIPE_SECRET_KEY` = that key.
3. Upload this whole folder to the site (the `netlify` folder and `netlify.toml` must be included, so deploy from your repo/Git, not by dragging only the HTML files).
4. Trigger a new deploy, open pay.html, add items, check out, and pay with test card 4242 4242 4242 4242 (any future expiry, any CVC).
5. Go live: create a live-mode restricted key (same permission), replace the Netlify variable, redeploy.

## Changing prices or adding items
Edit the CATALOG list at the top of `netlify/functions/checkout.js` (this is what customers are charged), then copy a `shop-item` block in `pay.html` with the same `data-id`.

## Custom domain
`sitemap.xml`, `robots.txt`, the share image tags (`og:image`) and the structured data in index.html use https://coffskyokushin.netlify.app. If you add your own domain later, replace that address in those files.
