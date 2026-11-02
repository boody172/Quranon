// User session + saved items. Saved items always live locally (instant, offline)
// and are mirrored to the backend when the user is signed in.
import { appRequest } from './api.js';
import { store } from './util.js';

const session = { user: store.get('user', null), token: store.get('token', null) };
let items = store.get('saved', null) ?? migrateLegacyFavourites();

function migrateLegacyFavourites() {
  const legacy = store.get('favs', []);
  store.remove('favs');
  return legacy.map((id) => ({ type: 'reciter', ref: String(id), title: '', subtitle: null }));
}

const persist = () => store.set('saved', items);
const sameItem = (a, b) => a.type === b.type && String(a.ref) === String(b.ref);

export const account = {
  get user() { return session.user; },
  get signedIn() { return Boolean(session.token); },
  get token() { return session.token; },
  firstName() { return session.user?.name?.trim().split(/\s+/)[0] || ''; },

  async register(name, email, password) {
    return start(await appRequest('register', { method: 'POST', body: { name, email, password } }));
  },
  async login(email, password) {
    return start(await appRequest('login', { method: 'POST', body: { email, password } }));
  },
  /** Re-reads the profile (e.g. after a payment activates Plus). */
  async refresh() {
    if (!session.token) return null;
    const { user } = await appRequest('me', { token: session.token });
    session.user = user;
    store.set('user', user);
    return user;
  },
  /** Permanently deletes the account on the server, then signs out locally. */
  async deleteAccount(password) {
    await appRequest('me', { method: 'DELETE', body: { password }, token: session.token });
    session.user = session.token = null;
    store.remove('user');
    store.remove('token');
  },
  async logout() {
    appRequest('logout', { method: 'POST', token: session.token }).catch(() => {});
    session.user = session.token = null;
    store.remove('user');
    store.remove('token');
  },
};

async function start({ token, user }) {
  session.token = token;
  session.user = user;
  store.set('token', token);
  store.set('user', user);
  await syncSaved();
  return user;
}

/** Push local-only items, then adopt the server list as the source of truth. */
async function syncSaved() {
  const token = session.token;
  await Promise.allSettled(items.filter((i) => i.title).map((body) => appRequest('saved', { method: 'POST', body, token })));
  const { data } = await appRequest('saved', { token });
  items = data.map(({ type, ref, title, subtitle }) => ({ type, ref, title, subtitle }));
  persist();
}

export const saved = {
  all: () => items,
  ofType: (type) => items.filter((i) => i.type === type),
  has: (type, ref) => items.some((i) => sameItem(i, { type, ref })),

  /** Adds or removes. Returns true when the item is now saved. */
  toggle(item) {
    item = { ...item, ref: String(item.ref) };
    const exists = items.some((i) => sameItem(i, item));
    items = exists ? items.filter((i) => !sameItem(i, item)) : [item, ...items];
    persist();

    if (session.token) {
      const request = exists
        ? appRequest(`saved/${item.type}/${encodeURIComponent(item.ref)}`, { method: 'DELETE', token: session.token })
        : appRequest('saved', { method: 'POST', body: item, token: session.token });
      request.catch(() => {}); // local copy is already updated; next sign-in reconciles
    }
    return !exists;
  },
};
