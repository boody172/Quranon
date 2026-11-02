// Quranon Plus: plans priced in the visitor's currency, with the payment methods people actually use there.
import { account } from '../account.js';
import { appConfig, appRequest } from '../api.js';
import { i18n, pick, t } from '../i18n.js';
import { $, $$, esc, ICON, store, toast } from '../util.js';

const CURRENCIES = ['EGP', 'SAR', 'USD'];

// Used until the dashboard publishes its own plans (see PlanSeeder.php).
const DEFAULT_PLANS = [
  { slug: 'monthly', interval: 'month', prices: { EGP: 49, SAR: 12, USD: 2.99 } },
  { slug: 'yearly', interval: 'year', prices: { EGP: 399, SAR: 99, USD: 19.99 }, highlighted: true },
  { slug: 'lifetime', interval: 'lifetime', prices: { EGP: 999, SAR: 249, USD: 49.99 } },
];
const DEFAULT_PERKS = {
  ar: ['تدعم استمرار التطبيق ومجانيته للجميع', 'وصول مبكر للمزايا الجديدة', 'الاستماع بدون إنترنت (قريباً)', 'وضع الحفظ والتسميع (قريباً)'],
  en: ['Keep Quranon free for everyone', 'Early access to new features', 'Offline listening (coming soon)', 'Memorisation mode (coming soon)'],
};
const DEFAULT_METHODS = [
  { code: 'card', name: { ar: 'بطاقة بنكية', en: 'Card' }, countries: ['*'] },
  { code: 'apple_pay', name: { ar: 'Apple Pay', en: 'Apple Pay' }, countries: ['eg', 'sa'] },
  { code: 'wallet', name: { ar: 'محفظة الموبايل', en: 'Mobile wallet' }, countries: ['eg'] },
  { code: 'instapay', name: { ar: 'إنستاباي', en: 'InstaPay' }, countries: ['eg'] },
  { code: 'fawry', name: { ar: 'فوري', en: 'Fawry' }, countries: ['eg'] },
  { code: 'mada', name: { ar: 'مدى', en: 'mada' }, countries: ['sa'] },
  { code: 'paypal', name: { ar: 'باي بال', en: 'PayPal' }, countries: ['*'] },
];

/** Country from the device time zone: no permission prompt, no external lookup. */
function detectCountry() {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  if (zone === 'Africa/Cairo') return 'eg';
  if (zone === 'Asia/Riyadh') return 'sa';
  return 'intl';
}
const CURRENCY_OF = { eg: 'EGP', sa: 'SAR', intl: 'USD' };

const price = (amount, currency) =>
  new Intl.NumberFormat(i18n.lang === 'ar' ? 'ar-EG' : i18n.lang, { style: 'currency', currency, maximumFractionDigits: amount % 1 ? 2 : 0 }).format(amount);

const intervalLabel = (p) => t({ month: 'plus.month', year: 'plus.year', lifetime: 'plus.lifetime' }[p.interval]);
const intervalSuffix = (p) => t({ month: 'plus.perMonth', year: 'plus.perYear', lifetime: 'plus.once' }[p.interval]);

export async function plus(view, { args: [outcome] }) {
  const config = await appConfig();
  const plans = config?.plans?.length ? config.plans : DEFAULT_PLANS;
  // With a backend, show only methods whose payment keys are configured; the preview shows the full list.
  // Store rules: inside the iOS/Android apps a digital subscription must go through Apple/Google billing,
  // so the web payment methods are only offered on the website.
  const inStoreApp = Boolean(window.Capacitor?.isNativePlatform?.());
  const methods = inStoreApp ? [] : config ? config.payment_methods || [] : DEFAULT_METHODS;
  const perks = config?.plus_perks ? pick(config.plus_perks) : DEFAULT_PERKS[i18n.lang] || DEFAULT_PERKS.en;
  const country = detectCountry();

  const state = {
    currency: store.get('currency') || CURRENCY_OF[country],
    plan: (plans.find((p) => p.highlighted) || plans[0]).slug,
    method: null,
  };
  const available = () => methods.filter((m) => m.countries.includes('*') || m.countries.includes(country));

  if (outcome === 'paid') {
    await account.refresh().catch(() => {});
    view.innerHTML = `<div class="empty-state">${ICON.check}<h2>${t('plus.thanks')}</h2><p>${t('plus.active')}</p><a class="pill primary" href="#/home">${t('plus.home')}</a></div>`;
    return;
  }
  if (outcome === 'failed') toast(t('plus.failed'));

  if (account.user?.plus_until && new Date(account.user.plus_until) > new Date()) {
    view.innerHTML = `<div class="empty-state">${ICON.star}<h2>${t('plus.title')}</h2><p>${t('plus.active')}</p></div>`;
    return;
  }

  const draw = () => {
    const methodList = available();
    if (!methodList.some((m) => m.code === state.method)) state.method = methodList[0]?.code;
    const plan = plans.find((p) => p.slug === state.plan);

    view.innerHTML = `
      <section class="plus-hero">
        <img src="icons/logo.svg" alt="" width="56" height="56">
        <h1>${t('plus.title')}</h1>
        <p>${t('plus.subtitle')}</p>
      </section>
      <ul class="perks">${perks.map((p) => `<li>${ICON.check}<span>${esc(p)}</span></li>`).join('')}</ul>

      <div class="segmented" role="radiogroup" aria-label="${t('plus.currency')}">${CURRENCIES.map((c) =>
        `<button role="radio" aria-checked="${c === state.currency}" data-currency="${c}">${c}</button>`).join('')}</div>

      <div class="plans" role="radiogroup">${plans.map((p) => `
        <button class="plan${p.slug === state.plan ? ' on' : ''}" role="radio" aria-checked="${p.slug === state.plan}" data-plan="${esc(p.slug)}">
          ${p.highlighted ? `<em>${t('plus.best')}</em>` : ''}
          <span>${intervalLabel(p)}</span>
          <b>${price(p.prices[state.currency], state.currency)}</b>
          <small>${intervalSuffix(p)}</small>
        </button>`).join('')}</div>

      <h2 class="section">${t('plus.payWith')}</h2>
      <div class="methods" role="radiogroup">${methodList.map((m) => `
        <button class="method${m.code === state.method ? ' on' : ''}" role="radio" aria-checked="${m.code === state.method}" data-method="${esc(m.code)}">
          <span class="pm pm-${esc(m.code)}" aria-hidden="true"></span>${esc(pick(m.name))}
        </button>`).join('')}</div>

      ${methodList.length ? '' : `<p class="empty">${t(inStoreApp ? 'plus.storeSoon' : 'plus.unavailable')}</p>`}
      <div id="checkoutResult"></div>
      <button class="pill primary wide" id="pay"${methodList.length ? '' : ' disabled'}>${esc(t('plus.pay', { price: price(plan.prices[state.currency], state.currency) }))}</button>`;

    $$('[data-currency]').forEach((b) => { b.onclick = () => { state.currency = b.dataset.currency; store.set('currency', state.currency); draw(); }; });
    $$('[data-plan]').forEach((b) => { b.onclick = () => { state.plan = b.dataset.plan; draw(); }; });
    $$('[data-method]').forEach((b) => { b.onclick = () => { state.method = b.dataset.method; draw(); }; });
    $('#pay').onclick = checkout;
  };

  async function checkout() {
    if (!account.signedIn) {
      toast(t('plus.signInFirst'));
      location.hash = '#/account';
      return;
    }
    const button = $('#pay');
    button.disabled = true;
    try {
      const result = await appRequest('checkout', {
        method: 'POST',
        token: account.token,
        body: { plan: state.plan, currency: state.currency, method: state.method, country },
      });
      if (result.type === 'redirect' && /^https:\/\//.test(result.url)) {
        toast(t('plus.redirecting'));
        location.assign(result.url);
        return;
      }
      $('#checkoutResult').innerHTML = `<div class="notice"><b>${t('plus.manualTitle')}</b>
        <p>${esc(pick(result.instructions))}</p><p>${esc(t('plus.manualRef', { ref: result.reference }))}</p><p class="muted">${t('plus.manualDone')}</p></div>`;
    } catch {
      toast(t('plus.unavailable'));
    } finally {
      button.disabled = false;
    }
  }

  draw();
}
