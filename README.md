# Quranon — قرآنون

Quran listening, reading, lessons and qibla — Arabic and English, light and fast.

```
/            the app (static, no build step): index.html, css/, js/, i18n/, fonts/, icons/
/backend     Laravel API + admin dashboard (content, languages, plans, payments)
```

## App (frontend)

Static files served from the repo root (deployed on Vercel; headers in `vercel.json`).

```bash
npx serve .          # or: python3 -m http.server 8080
```

Point it at the backend in `js/config.js` → `apiBase`. Without a backend the app still works
(built-in content, saved items on the device); accounts and payments need the backend.

| Folder | What lives there |
|---|---|
| `js/app.js` | router, top bar, language switch, update banner |
| `js/views/` | one file per screen |
| `js/api.js` | cached network layer + pluggable data sources |
| `js/catalog.js` | reciters, surahs, radio, lessons |
| `js/account.js` | sign-in and saved items (synced when signed in) |
| `js/i18n.js` + `i18n/*.json` | translations (dashboard can override / add languages) |

## Backend

```bash
cd backend
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate --seed
php artisan quranon:admin you@example.com      # the only way to create the dashboard login
php artisan storage:link
php artisan test
```

Dashboard: `https://<backend>/<ADMIN_PATH>` (default `/admin`).

### Free data sources (switchable from Settings → API)
- Audio, reciters, radio, tafsir: `mp3quran.net/api/v3`
- Mushaf text: `api.alquran.cloud/v1` or `api.quran.com/api/v4`

### Payments
| Market | Methods | Gateway |
|---|---|---|
| Egypt | Card / Meeza, Apple Pay, mobile wallets, Fawry, InstaPay | Paymob (+ InstaPay confirmed manually) |
| Saudi Arabia | mada, card, Apple Pay | Paymob KSA |
| Rest of world | PayPal or card | PayPal (charged in USD) |

Save keys in Settings → Payment keys (stored encrypted), set each Paymob method's Integration ID,
and register the webhook URL shown there in the Paymob dashboard.

### Production checklist
- `APP_DEBUG=false`, HTTPS only, `SESSION_SECURE_COOKIE=true`
- `CORS_ALLOWED_ORIGINS` = the app's URL; change `ADMIN_PATH`; optionally `ADMIN_ALLOWED_IPS`
- `TRUSTED_PROXIES` if behind a load balancer / Cloudflare
- Back up the database **and** `APP_KEY` (it decrypts the saved payment keys)
