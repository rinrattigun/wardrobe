/*
 * music.js — плеер для «Мой шкаф». Работает отдельным файлом.
 *
 * Как подключить:
 *   1. Положи рядом с index.html: music.js, music.json и папку music/ с mp3.
 *   2. В index.html перед </body> добавь одну строку:
 *        <script src="music.js" defer></script>
 *   3. В music.json перечисли треки (см. пример в самом файле).
 *
 * Если music.json пустой или его нет — плеера просто не будет видно,
 * сайт работает как обычно. Чтобы убрать музыку совсем, удали строку из шага 2.
 */
(() => {
  const BASE = document.currentScript ? document.currentScript.src : location.href;
  const LS = 'wdm';
  let tracks = [], cur = 0, dragging = false, unlocked = false;
  let st = { v: 0.7, sh: false, rp: false, i: 0, pl: false, mu: false };
  try { Object.assign(st, JSON.parse(localStorage.getItem(LS) || '{}')); } catch (e) {}
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(st)); } catch (e) {} };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = t => { if (!isFinite(t)) return '0:00'; t = Math.floor(t); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };

  const au = new Audio();
  au.preload = 'metadata';
  au.volume = st.v;
  au.muted = st.mu;
  au.loop = st.rp;

  const IC = {
    note: '<path d="M10 17V5.5l9-2V15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7.5" cy="17" r="3"/><circle cx="16.5" cy="15" r="3"/>',
    play: '<path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z"/>',
    pause: '<rect x="6" y="5" width="4.2" height="14" rx="1.2"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.2"/>',
    prev: '<rect x="5" y="5" width="2.6" height="14" rx="1.2"/><path d="M19 6.2v11.6a1 1 0 0 1-1.5.86L9 13a1 1 0 0 1 0-1.72l8.5-5.04A1 1 0 0 1 19 6.2z"/>',
    next: '<rect x="16.4" y="5" width="2.6" height="14" rx="1.2"/><path d="M5 6.2v11.6a1 1 0 0 0 1.5.86L15 13a1 1 0 0 0 0-1.72L6.5 6.24A1 1 0 0 0 5 6.2z"/>',
    vol: '<path d="M4 9.5v5h3.5L12 19V5L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    mute: '<path d="M4 9.5v5h3.5L12 19V5L7.5 9.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    shuf: '<path d="M3 7h3.5c2.5 0 3.8 1.5 5.5 5s3 5 5.5 5H21M3 17h3.5c1.4 0 2.4-.5 3.3-1.4M14.2 8.4C15 7.5 16 7 17.5 7H21M18 4l3 3-3 3M18 14l3 3-3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    rep: '<path d="M4 11V9a3 3 0 0 1 3-3h12M16 3l3 3-3 3M20 13v2a3 3 0 0 1-3 3H5M8 21l-3-3 3-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    x: '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'
  };
  const ic = n => `<svg class="mi" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${IC[n]}</svg>`;

  const css = document.createElement('style');
  css.textContent = `
#mz{position:fixed;right:12px;bottom:calc(74px + env(safe-area-inset-bottom,0px));z-index:20;font-family:inherit;display:flex;flex-direction:column;align-items:flex-end;gap:10px}
#mz[hidden]{display:none}
#mz button{font:inherit;border:0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent}
#mz .mi{width:1.15em;height:1.15em;flex:none}
#mz .fab{width:48px;height:48px;border-radius:50%;background:var(--ac,#d6578a);color:var(--on,#fff);font-size:19px;box-shadow:0 4px 14px rgba(0,0,0,.35);position:relative}
#mz .eq{display:none;gap:3px;align-items:flex-end;height:16px}
#mz.pl .eq{display:flex}#mz.pl .fab .mi{display:none}
#mz .eq i{width:3.5px;background:currentColor;border-radius:2px;height:100%;animation:mzq .9s ease-in-out infinite;transform-origin:bottom}
#mz .eq i:nth-child(2){animation-delay:-.3s}#mz .eq i:nth-child(3){animation-delay:-.6s}
@keyframes mzq{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}
#mz .pn{width:min(86vw,320px);background:var(--card,#272024);color:var(--tx,#f3e8ed);border:1px solid var(--bd,#3d2d35);border-radius:20px;padding:14px;box-shadow:0 10px 30px rgba(0,0,0,.4)}
#mz .pn[hidden]{display:none}
#mz .tp{display:flex;align-items:center;gap:8px}
#mz .tt{flex:1;min-width:0;font-weight:700;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#mz .cl{background:none;color:var(--mut,#b3a0a8);width:30px;height:30px;border-radius:50%;padding:0}
#mz .pr{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12px;color:var(--mut,#b3a0a8)}
#mz input[type=range]{-webkit-appearance:none;appearance:none;flex:1;min-width:0;height:5px;border-radius:3px;background:var(--ac2,#3a2530);margin:0;padding:0;border:0;outline:0}
#mz input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:15px;height:15px;border-radius:50%;background:var(--ac,#d6578a);border:0}
#mz input[type=range]::-moz-range-thumb{width:15px;height:15px;border-radius:50%;background:var(--ac,#d6578a);border:0}
#mz .ct{display:flex;align-items:center;justify-content:space-between;margin-top:10px}
#mz .ct button{background:none;color:var(--tx,#f3e8ed);width:42px;height:42px;border-radius:50%;font-size:18px;padding:0}
#mz .ct button.on{color:var(--ac,#d6578a)}
#mz .ct .big{background:var(--ac,#d6578a);color:var(--on,#fff);width:50px;height:50px;font-size:20px}
#mz .vl{display:flex;align-items:center;gap:8px;margin-top:6px}
#mz .vl button{background:none;color:var(--mut,#b3a0a8);width:30px;height:30px;padding:0;font-size:17px}
#mz .ls{margin-top:10px;max-height:34vh;overflow-y:auto;border-top:1px solid var(--bd,#3d2d35);padding-top:6px;scrollbar-width:none}
#mz .ls::-webkit-scrollbar{display:none}
#mz .ls button{width:100%;justify-content:flex-start;text-align:left;background:none;color:var(--tx,#f3e8ed);padding:8px 6px;border-radius:10px;font-size:14px;gap:8px}
#mz .ls button span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#mz .ls button.on{background:var(--ac2,#3a2530);color:var(--ac,#d6578a);font-weight:700}
#mz .ls button em{font-style:normal;color:var(--mut,#b3a0a8);font-size:12px;width:18px;flex:none;text-align:right}
#mz .er{font-size:12px;color:var(--ac,#d6578a);margin-top:8px}
`;
  document.head.appendChild(css);

  const root = document.createElement('div');
  root.id = 'mz';
  root.hidden = true;
  root.innerHTML = `
<div class="pn" id="mzP" hidden>
  <div class="tp"><div class="tt" id="mzT"></div><button class="cl" id="mzC" aria-label="Свернуть">${ic('x')}</button></div>
  <div class="pr"><span id="mzA">0:00</span><input type="range" id="mzS" min="0" max="1000" value="0" aria-label="Перемотка"><span id="mzB">0:00</span></div>
  <div class="ct">
    <button id="mzSh" aria-label="Перемешать">${ic('shuf')}</button>
    <button id="mzPv" aria-label="Предыдущий">${ic('prev')}</button>
    <button class="big" id="mzPl" aria-label="Играть">${ic('play')}</button>
    <button id="mzNx" aria-label="Следующий">${ic('next')}</button>
    <button id="mzRp" aria-label="Повторять трек">${ic('rep')}</button>
  </div>
  <div class="vl"><button id="mzMu" aria-label="Звук">${ic('vol')}</button><input type="range" id="mzV" min="0" max="100" aria-label="Громкость"></div>
  <div class="er" id="mzE" hidden></div>
  <div class="ls" id="mzL"></div>
</div>
<button class="fab" id="mzF" aria-label="Музыка">${ic('note')}<span class="eq"><i></i><i></i><i></i></span></button>`;
  document.body.appendChild(root);
  const $ = id => document.getElementById(id);

  function setPlayIcon() {
    const p = !au.paused;
    $('mzPl').innerHTML = ic(p ? 'pause' : 'play');
    $('mzPl').setAttribute('aria-label', p ? 'Пауза' : 'Играть');
    root.classList.toggle('pl', p);
  }
  function paintList() {
    $('mzL').innerHTML = tracks.map((t, i) => `<button data-i="${i}" class="${i === cur ? 'on' : ''}"><em>${i + 1}</em><span>${esc(t.title)}</span></button>`).join('');
  }
  function paintFlags() {
    $('mzSh').classList.toggle('on', st.sh);
    $('mzRp').classList.toggle('on', st.rp);
    $('mzMu').innerHTML = ic(au.muted || au.volume === 0 ? 'mute' : 'vol');
    $('mzV').value = au.muted ? 0 : Math.round(au.volume * 100);
  }
  function load(i, autoplay) {
    if (!tracks.length) return;
    cur = (i + tracks.length) % tracks.length;
    st.i = cur; save();
    au.src = tracks[cur].src;
    $('mzT').textContent = tracks[cur].title;
    $('mzE').hidden = true;
    $('mzS').value = 0; $('mzA').textContent = '0:00'; $('mzB').textContent = '0:00';
    paintList();
    if ('mediaSession' in navigator) {
      try { navigator.mediaSession.metadata = new MediaMetadata({ title: tracks[cur].title, artist: 'Мой шкаф' }); } catch (e) {}
    }
    if (autoplay) play();
    setPlayIcon();
  }
  function play() {
    const r = au.play();
    if (r && r.catch) r.catch(() => { setPlayIcon(); });
    st.pl = true; save();
  }
  function pause() { au.pause(); st.pl = false; save(); }
  function toggle() { au.paused ? play() : pause(); }
  function next(auto) {
    if (!tracks.length) return;
    let n = cur + 1;
    if (st.sh && tracks.length > 1) { do { n = Math.floor(Math.random() * tracks.length); } while (n === cur); }
    load(n, auto !== false || !au.paused);
  }
  function prev() {
    if (au.currentTime > 3) { au.currentTime = 0; return; }
    load(cur - 1, !au.paused);
  }

  au.addEventListener('play', setPlayIcon);
  au.addEventListener('pause', setPlayIcon);
  au.addEventListener('ended', () => next(true));
  au.addEventListener('loadedmetadata', () => { $('mzB').textContent = fmt(au.duration); });
  au.addEventListener('timeupdate', () => {
    if (dragging) return;
    $('mzA').textContent = fmt(au.currentTime);
    $('mzS').value = au.duration ? Math.round(au.currentTime / au.duration * 1000) : 0;
  });
  au.addEventListener('error', () => {
    if (!au.src) return;
    $('mzE').textContent = 'Не получилось загрузить «' + tracks[cur].title + '». Проверь имя файла в music.json.';
    $('mzE').hidden = false;
    setPlayIcon();
  });

  $('mzF').onclick = () => { $('mzP').hidden = !$('mzP').hidden; };
  $('mzC').onclick = () => { $('mzP').hidden = true; };
  $('mzPl').onclick = toggle;
  $('mzNx').onclick = () => next(!au.paused);
  $('mzPv').onclick = prev;
  $('mzSh').onclick = () => { st.sh = !st.sh; save(); paintFlags(); };
  $('mzRp').onclick = () => { st.rp = !st.rp; au.loop = st.rp; save(); paintFlags(); };
  $('mzMu').onclick = () => { au.muted = !au.muted; st.mu = au.muted; save(); paintFlags(); };
  $('mzV').oninput = e => { const v = e.target.value / 100; au.volume = v; au.muted = false; st.v = v || st.v; st.mu = false; save(); paintFlags(); };
  $('mzL').onclick = e => { const b = e.target.closest('button[data-i]'); if (b) load(+b.dataset.i, true); };
  const sk = $('mzS');
  sk.addEventListener('input', () => { dragging = true; $('mzA').textContent = fmt(au.duration * sk.value / 1000); });
  sk.addEventListener('change', () => { if (au.duration) au.currentTime = au.duration * sk.value / 1000; dragging = false; });
  document.addEventListener('pointerdown', e => {
    if (!root.contains(e.target) && !$('mzP').hidden && !document.getElementById('det')?.contains(e.target)) $('mzP').hidden = true;
  });

  // Если музыка играла до обновления страницы, она продолжится при первом касании (браузеры не дают стартовать без касания).
  function unlock() {
    if (unlocked) return; unlocked = true;
    if (st.pl && au.paused && tracks.length) play();
  }
  ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, unlock, { once: true, capture: true }));

  if ('mediaSession' in navigator) {
    const ms = (a, f) => { try { navigator.mediaSession.setActionHandler(a, f); } catch (e) {} };
    ms('play', play); ms('pause', pause);
    ms('previoustrack', prev); ms('nexttrack', () => next(true));
  }

  fetch(new URL('music.json', BASE).href + '?t=' + Date.now())
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(d => {
      const list = Array.isArray(d) ? d : (d.tracks || []);
      tracks = list.map(t => {
        if (typeof t === 'string') t = { file: t };
        if (!t || !t.file) return null;
        const name = decodeURIComponent(t.file.split('/').pop()).replace(/\.[^.]+$/, '');
        return { title: t.title || name, src: new URL(encodeURI(t.file), BASE).href };
      }).filter(Boolean);
      if (!tracks.length) return;
      root.hidden = false;
      paintFlags();
      load(Math.min(st.i || 0, tracks.length - 1), false);
    })
    .catch(() => {});
})();
