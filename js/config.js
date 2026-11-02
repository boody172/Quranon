// Deployment settings. Set apiBase to the Laravel backend URL once it is hosted,
// e.g. 'https://api.quranon.app'. Leave empty to run fully offline-first without accounts sync.
// Once the backend is hosted, "monetization" and "ads" below can be changed from the admin dashboard.
export const CONFIG = {
  apiBase: '',

  // 'ads'  → free for everyone, one short ad when the app opens (store apps only), no Plus subscription
  // 'plus' → no ads, optional Quranon Plus subscription
  // 'none' → no ads, no subscription
  monetization: 'ads',

  ads: {
    // AdMob → Apps → (your app) → Ad units → "App open". These are Google's TEST units: they always fill and
    // never pay. Replace them with your own before publishing (and the app IDs in Info.plist / build.gradle).
    appOpen: {
      android: 'ca-app-pub-3940256099942544/9257395921',
      ios: 'ca-app-pub-3940256099942544/5575463023',
    },
    everyHours: 4, // at most one ad per this many hours
    skipFirstLaunches: 1, // never on the first open: first impressions matter
  },
};
