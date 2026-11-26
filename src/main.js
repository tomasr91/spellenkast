import { Capacitor } from '@capacitor/core';
import { InAppBrowser, DefaultWebViewOptions, DefaultAndroidWebViewOptions } from '@capacitor/inappbrowser';

const play = async (url) => {
  if (!Capacitor.isNativePlatform()) { window.open(url, '_blank', 'noopener'); return; }
  try {
    await InAppBrowser.openInWebView({
      url,
      options: {
        ...DefaultWebViewOptions,
        showURL: false,
        showNavigationButtons: false,
        closeButtonText: 'Terug',
        // Logins en voortgang bewaren tussen sessies (standaard wist de plugin cookies en cache bij elke start).
        clearCache: false,
        clearSessionCache: false,
        // In het app-proces draaien, zodat cookies netjes worden weggeschreven als je het spel sluit.
        android: { ...DefaultAndroidWebViewOptions, hardwareBack: true, pauseMedia: true, isIsolated: false }
      }
    });
  } catch (err) {
    window.open(url, '_blank');
  }
};

import { metaFor, faviconFor } from './catalog.js';

const KEY = 'spellenkast-v1';
const DEFAULT = [
  { name: 'Farflung', url: 'https://farflung.game' },
  { name: 'Krillion', url: 'https://krillion.io' },
  { name: 'Chainle', url: 'https://chainle.io' },
  { name: 'Extraplot', url: 'https://guessdash.com/extraplot?c=6pcx7c' }
];

const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(v)) return v; } catch (e) {} return DEFAULT.slice(); };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(games)); } catch (e) {} };
let games = load();
// Nieuwe standaardspellen ook toevoegen aan een bestaande lijst, maar nooit een spel terugzetten dat je zelf hebt verwijderd.
{
  const SEEN='spellenkast-seen-defaults';
  let seen;
  try{seen=JSON.parse(localStorage.getItem(SEEN))}catch(e){}
  if(!Array.isArray(seen))seen=localStorage.getItem(KEY)?['https://farflung.game','https://krillion.io']:[];
  for(const d of DEFAULT){
    if(!seen.includes(d.url)){if(!games.some(g=>g.url===d.url))games.push({...d});seen.push(d.url)}
  }
  try{localStorage.setItem(SEEN,JSON.stringify(seen))}catch(e){}
  // Spellen die uit de standaardlijst zijn gehaald, één keer verwijderen (daarna zelf weer toe te voegen).
  const GONE='spellenkast-removed-defaults', REMOVE=['https://crowdict.com'];
  let gone; try{gone=JSON.parse(localStorage.getItem(GONE))}catch(e){}
  if(!Array.isArray(gone))gone=[];
  for(const u of REMOVE){ if(!gone.includes(u)){ games=games.filter(g=>g.url.replace(/\/$/,'')!==u); gone.push(u); } }
  try{localStorage.setItem(GONE,JSON.stringify(gone))}catch(e){}
  save();
}

const TINTS = ['#f3e2b8', '#d5efe4', '#e6dcef', '#f6dcc4', '#dbe7d2', '#efe3d0'];
const $ = (id) => document.getElementById(id);
const app = $('app'), grid = $('grid'), editBtn = $('edit');
const dlg = $('dlg'), form = $('form'), fname = $('fname'), furl = $('furl'), err = $('err');

let editing = false;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hash = (s) => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
const GRIP = '<svg viewBox="0 0 18 18" fill="currentColor" aria-hidden="true"><circle cx="6" cy="4" r="1.6"/><circle cx="12" cy="4" r="1.6"/><circle cx="6" cy="9" r="1.6"/><circle cx="12" cy="9" r="1.6"/><circle cx="6" cy="14" r="1.6"/><circle cx="12" cy="14" r="1.6"/></svg>';

const card = (g, i) => {
  const m = metaFor(g);
  const bg = m ? m.bg : TINTS[hash(g.name + g.url) % TINTS.length];
  const ini = esc((g.name.trim()[0] || '?').toUpperCase());
  const img = m
    ? `<img class="${m.fit}" src="${esc(m.image)}" alt="" loading="lazy" decoding="async" data-ini="${ini}">`
    : `<img class="icon" src="${esc(faviconFor(g))}" alt="" loading="lazy" data-ini="${ini}">`;
  return `<div class="card" role="button" tabindex="0" data-idx="${i}" aria-label="Speel ${esc(g.name)}">`
    + `<button class="del" type="button" data-del="${i}" aria-label="Verwijder ${esc(g.name)}">×</button>`
    + `<div class="art" style="--pbg:${bg}">${img}</div><span class="name">${esc(g.name)}</span>`
    + `<span class="grip" data-grip aria-label="Versleep ${esc(g.name)}">${GRIP}</span></div>`;
};

const render = () => {
  app.classList.toggle('manual', !editing);
  grid.classList.toggle('editing', editing);
  grid.innerHTML = games.map(card).join('')
    + '<button class="add" type="button" id="addBtn"><span>+</span>Spel toevoegen</button>';
};

// Icoon van een eigen spel laadt niet: toon de eerste letter.
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img.tagName === 'IMG' && img.dataset.ini) {
    const s = document.createElement('span');
    s.className = 'ini'; s.textContent = img.dataset.ini;
    img.replaceWith(s);
  }
}, true);

const open = (i) => { const g = games[i]; if (g && !editing) play(g.url); };

// ---- Slepen (eigen volgorde) — werkt met vinger en muis via pointer events ----
let drag = null;
const place = () => {
  const el = drag.el;
  el.style.transform = 'none';
  const r = el.getBoundingClientRect();
  el.style.transform = `translate(${drag.x - drag.gx - r.left}px, ${drag.y - drag.gy - r.top}px) scale(1.02)`;
};
grid.addEventListener('pointerdown', (e) => {
  const handle = e.target.closest('[data-grip]');
  if (!handle || editing) return;
  e.preventDefault();
  const el = handle.closest('.card');
  const r = el.getBoundingClientRect();
  drag = { el, id: e.pointerId, x: e.clientX, y: e.clientY, gx: e.clientX - r.left, gy: e.clientY - r.top };
  el.classList.add('dragging');
  handle.setPointerCapture(e.pointerId);
  place();
});
grid.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  drag.x = e.clientX; drag.y = e.clientY;
  const el = drag.el;
  el.style.visibility = 'hidden';
  const under = document.elementFromPoint(e.clientX, e.clientY);
  el.style.visibility = '';
  const target = under && under.closest('.card');
  if (target && target !== el && target.parentElement === grid) {
    const cards = [...grid.querySelectorAll('.card')];
    if (cards.indexOf(target) > cards.indexOf(el)) target.after(el); else target.before(el);
  }
  if (e.clientY < 70) window.scrollBy(0, -10);
  else if (e.clientY > window.innerHeight - 70) window.scrollBy(0, 10);
  place();
});
const endDrag = (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const order = [...grid.querySelectorAll('.card')].map((c) => games[+c.dataset.idx]);
  drag.el.classList.remove('dragging');
  drag.el.style.transform = '';
  drag = null;
  games = order;
  save();
  render();
};
grid.addEventListener('pointerup', endDrag);
grid.addEventListener('pointercancel', endDrag);

grid.addEventListener('click', (e) => {
  if (e.target.closest('[data-grip]')) return;
  const d = e.target.closest('[data-del]');
  if (d) { e.stopPropagation(); games.splice(+d.dataset.del, 1); save(); render(); return; }
  if (e.target.closest('#addBtn')) { err.textContent = ''; form.reset(); dlg.showModal(); fname.focus(); return; }
  const c = e.target.closest('.card');
  if (c) open(+c.dataset.idx);
});
grid.addEventListener('keydown', (e) => {
  const c = e.target.closest('.card');
  if (c && e.target === c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(+c.dataset.idx); }
});

editBtn.addEventListener('click', () => {
  editing = !editing;
  editBtn.textContent = editing ? 'Klaar' : 'Bewerken';
  editBtn.setAttribute('aria-pressed', editing);
  render();
});
$('cancel').addEventListener('click', () => dlg.close());
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = fname.value.trim();
  let url = furl.value.trim();
  if (!name) { err.textContent = 'Geef het spel een naam.'; return; }
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  try { const u = new URL(url); if (!u.hostname.includes('.')) throw 0; } catch (x) { err.textContent = 'Dat lijkt geen geldig webadres.'; return; }
  if (games.some((g) => g.url.replace(/\/$/, '') === url.replace(/\/$/, ''))) { err.textContent = 'Dit spel staat al in je lijst.'; return; }
  games.push({ name, url });
  save(); render(); dlg.close();
});

render();
