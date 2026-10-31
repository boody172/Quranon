// Qibla engine: location → bearing, compass smoothing, lock-on with hysteresis, haptics.
import { KAABA } from './data.js';
import { t } from './i18n.js';
import { store } from './util.js';

export const Qibla = (() => {
  const LOCK_IN = 4, LOCK_OUT = 10; // degrees — lock under 4°, release over 10° so it never flickers
  const rad = Math.PI / 180;
  const bearingTo = (lat, lng) => {
    const φ1 = lat * rad, φ2 = KAABA.lat * rad, Δλ = (KAABA.lng - lng) * rad;
    return (Math.atan2(Math.sin(Δλ), Math.cos(φ1) * Math.tan(φ2) - Math.sin(φ1) * Math.cos(Δλ)) / rad + 360) % 360;
  };
  const distanceKm = (lat, lng) => {
    const dφ = (KAABA.lat - lat) * rad, dλ = (KAABA.lng - lng) * rad;
    const a = Math.sin(dφ / 2) ** 2 + Math.cos(lat * rad) * Math.cos(KAABA.lat * rad) * Math.sin(dλ / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };
  // Only iOS Safari gates the compass behind a gesture (some desktop browsers expose the API without needing it).
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const needsIOSPermission = () => isIOS && typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function';
  const haptic = p => { try { navigator.vibrate && navigator.vibrate(p); } catch { } };

  async function locate() {
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 15000, maximumAge: 6e5 }));
      const loc = { la: pos.coords.latitude, lo: pos.coords.longitude }; store.set('loc', loc); return loc;
    } catch { return store.get('loc'); }
  }

  // Starts the compass; calls cb({ state, heading, bearing, diff, locked, dist }). Returns a stop function.
  // ---- motion permission (iOS) ----
  // Safari only exposes the compass after a user gesture. Instead of a dedicated button,
  // the first touch anywhere in the app grants it; other platforms need nothing.
  let motionReady = !needsIOSPermission();
  const waiting = new Set();
  function unlockMotion() {
    if (motionReady) return;
    DeviceOrientationEvent.requestPermission()
      .then((result) => { motionReady = result === 'granted'; if (motionReady) waiting.forEach((fn) => fn()); })
      .catch(() => {});
  }
  if (!motionReady) {
    const once = () => { unlockMotion(); ['touchend', 'click'].forEach((t) => removeEventListener(t, once, true)); };
    ['touchend', 'click'].forEach((t) => addEventListener(t, once, true));
  }

  async function start(cb) {
    let stopped = false, onOri, raf, got = false, sensorTimer;
    cb({ state: 'locating' });
    const loc = await locate();
    if (stopped) return () => { };
    if (!loc) { cb({ state: 'no-location' }); return () => { }; }
    const bearing = bearingTo(loc.la, loc.lo), dist = distanceKm(loc.la, loc.lo);
    let s = null, c = null, locked = false, shown = null;
    // Show the direction straight away (north-up) while the live compass spins up.
    cb({ state: motionReady ? 'static' : 'needs-touch', heading: 0, bearing, diff: bearing, locked: false, dist });
    onOri = e => {
      let h = null;
      if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading;
      else if ((e.absolute || e.type === 'deviceorientationabsolute') && e.alpha != null) h = 360 - e.alpha;
      if (h == null) return;
      h = (h + (screen.orientation?.angle || 0) + 360) % 360; got = true;
      // circular low-pass filter (handles the 359° → 0° wrap)
      const ns = Math.sin(h * rad), nc = Math.cos(h * rad);
      s = s == null ? ns : s + (ns - s) * .18; c = c == null ? nc : c + (nc - c) * .18;
    };
    addEventListener('deviceorientationabsolute', onOri); addEventListener('deviceorientation', onOri);
    const tick = () => {
      if (stopped) return;
      if (s != null) {
        const heading = (Math.atan2(s, c) / rad + 360) % 360;
        const diff = ((bearing - heading + 540) % 360) - 180; // positive = turn right
        if (!locked && Math.abs(diff) < LOCK_IN) { locked = true; haptic([18, 60, 18]); }
        else if (locked && Math.abs(diff) > LOCK_OUT) { locked = false; haptic(8); }
        // once locked, pin the dial exactly on the Kaaba
        const target = locked ? bearing : heading;
        shown = shown == null ? target : shown + ((((target - shown) + 540) % 360) - 180) * .35;
        cb({ state: 'live', heading: (shown + 360) % 360, bearing, diff, locked, dist });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const armSensorCheck = () => {
      sensorTimer = setTimeout(() => { if (!got && !stopped) cb({ state: 'no-sensor', heading: 0, bearing, diff: bearing, locked: false, dist }); }, 2500);
    };
    if (motionReady) armSensorCheck(); else waiting.add(armSensorCheck);
    return () => { stopped = true; clearTimeout(sensorTimer); waiting.delete(armSensorCheck); cancelAnimationFrame(raf); removeEventListener('deviceorientationabsolute', onOri); removeEventListener('deviceorientation', onOri); };
  }

  // Live compass drawing (home card and qibla page).
  function svg() {
    const ticks = Array.from({ length: 72 }, (_, i) => { const a = i * 5, long = a % 30 === 0; return `<line x1="100" y1="${long ? 14 : 17}" x2="100" y2="22" transform="rotate(${a} 100 72)" opacity="${long ? .9 : .35}"/>`; }).join('');
    const labels = [['n', 0], ['e', 90], ['s', 180], ['w', 270]].map(([d, a]) => [t('compass.' + d), a]).map(([l, a]) => `<text x="100" y="34" transform="rotate(${a} 100 72)" class="${a ? '' : 'n'}">${l}</text>`).join('');
    return `<svg viewBox="0 0 200 140" class="qsvg">
      <circle cx="100" cy="72" r="66" class="halo"/>
      <g class="qdial">${ticks}${labels}
        <g class="qkaaba"><line x1="100" y1="72" x2="100" y2="40" class="qbeam"/><g transform="translate(100 30)"><path d="M-9 -4l9-4 9 4v10l-9 4-9-4z" class="cube"/><path d="M-9 -4l9 4 9-4M0 0v10" /><path d="M-9 1l9 4 9-4" class="belt"/></g></g>
      </g>
      <path d="M93 0h14l-7 9z" class="qmark"/><circle cx="100" cy="72" r="4" class="qdot"/>
    </svg>`;
  }
  function render(root, st) {
    const dial = root.querySelector('.qdial'), k = root.querySelector('.qkaaba');
    if (st.heading != null) dial.setAttribute('transform', `rotate(${-st.heading} 100 72)`);
    if (st.bearing != null) k.setAttribute('transform', `rotate(${st.bearing} 100 72)`);
    root.classList.toggle('locked', !!st.locked);
  }
  const hint = (st) => {
    if (st.state === 'locating') return t('qibla.locating');
    if (st.state === 'no-location') return t('qibla.noLocation');
    if (st.state === 'needs-touch') return t('qibla.touchToStart');
    if (st.state === 'static') return t('qibla.waiting');
    if (st.state === 'no-sensor') return t('qibla.noSensor', { deg: Math.round(st.bearing || 0) });
    if (st.locked) return t('qibla.aligned');
    return t(st.diff > 0 ? 'qibla.turnRight' : 'qibla.turnLeft', { deg: Math.round(Math.abs(st.diff)) });
  };
  return { start, svg, render, hint, unlockMotion };
})();
