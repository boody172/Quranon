'use strict';
// محرك القبلة: موقع + بوصلة + تنعيم الحركة + قفل عند الاتجاه الصحيح + اهتزاز
const Qibla = (() => {
  const LOCK_IN = 4, LOCK_OUT = 10; // درجات: يقفل تحت ٤° ويفك فوق ١٠° حتى لا يرتعش
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
  const needsIOSPermission = () => typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function';
  // iOS وحده يشترط لمسة من المستخدم قبل تشغيل المستشعر
  const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const canAutoStart = () => !isIOS();
  const haptic = p => { try { navigator.vibrate && navigator.vibrate(p); } catch { } };

  async function locate() {
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 15000, maximumAge: 6e5 }));
      const loc = { la: pos.coords.latitude, lo: pos.coords.longitude }; store.set('loc', loc); return loc;
    } catch { return store.get('loc'); }
  }

  // يبدأ البوصلة ويستدعي cb({heading, bearing, diff, locked, dist, state}) — يرجع دالة إيقاف
  async function start(cb) {
    let stopped = false, onOri, raf, got = false;
    if (needsIOSPermission()) { try { await DeviceOrientationEvent.requestPermission(); } catch { } } // لازم قبل أي await آخر على iOS
    cb({ state: 'locating' });
    const loc = await locate();
    if (stopped) return () => { };
    if (!loc) { cb({ state: 'no-location' }); return () => { }; }
    const bearing = bearingTo(loc.la, loc.lo), dist = distanceKm(loc.la, loc.lo);
    let s = null, c = null, locked = false, shown = null;
    onOri = e => {
      let h = null;
      if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading;
      else if ((e.absolute || e.type === 'deviceorientationabsolute') && e.alpha != null) h = 360 - e.alpha;
      if (h == null) return;
      h = (h + (screen.orientation?.angle || 0) + 360) % 360; got = true;
      // تنعيم دائري (يتعامل مع القفز من ٣٥٩ إلى ٠)
      const ns = Math.sin(h * rad), nc = Math.cos(h * rad);
      s = s == null ? ns : s + (ns - s) * .18; c = c == null ? nc : c + (nc - c) * .18;
    };
    addEventListener('deviceorientationabsolute', onOri); addEventListener('deviceorientation', onOri);
    const tick = () => {
      if (stopped) return;
      if (s != null) {
        const heading = (Math.atan2(s, c) / rad + 360) % 360;
        const diff = ((bearing - heading + 540) % 360) - 180; // موجب = لف يمين
        if (!locked && Math.abs(diff) < LOCK_IN) { locked = true; haptic([18, 60, 18]); }
        else if (locked && Math.abs(diff) > LOCK_OUT) { locked = false; haptic(8); }
        // عند القفل نثبّت الإبرة تماماً على الكعبة
        const target = locked ? bearing : heading;
        shown = shown == null ? target : shown + ((((target - shown) + 540) % 360) - 180) * .35;
        cb({ state: 'live', heading: (shown + 360) % 360, bearing, diff, locked, dist });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    setTimeout(() => { if (!got && !stopped) cb({ state: 'no-sensor', heading: 0, bearing, diff: bearing, locked: false, dist }); }, 2500);
    return () => { stopped = true; cancelAnimationFrame(raf); removeEventListener('deviceorientationabsolute', onOri); removeEventListener('deviceorientation', onOri); };
  }

  // رسمة البوصلة الحية (تُستخدم في الكارت وفي صفحة القبلة)
  function svg() {
    const ticks = Array.from({ length: 72 }, (_, i) => { const a = i * 5, long = a % 30 === 0; return `<line x1="100" y1="${long ? 14 : 17}" x2="100" y2="22" transform="rotate(${a} 100 72)" opacity="${long ? .9 : .35}"/>`; }).join('');
    const labels = [['ش', 0], ['شر', 90], ['ج', 180], ['غ', 270]].map(([l, a]) => `<text x="100" y="34" transform="rotate(${a} 100 72)" class="${a ? '' : 'n'}">${l}</text>`).join('');
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
  const hint = st => ({
    locating: 'جارٍ تحديد موقعك…', 'no-location': 'اسمح بالوصول للموقع لتحديد القبلة',
    'no-sensor': `جهازك بدون بوصلة · القبلة ${arNum(Math.round(st.bearing || 0))}° من الشمال`,
  }[st.state] || (st.locked ? 'أنت الآن باتجاه القبلة ✓' : `لفّ ${st.diff > 0 ? 'يميناً' : 'يساراً'} ${arNum(Math.round(Math.abs(st.diff)))}°`));
  return { start, svg, render, hint, canAutoStart };
})();
