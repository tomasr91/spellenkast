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
  { name: 'Crowdict', url: 'https://crowdict.com' },
  { name: 'Chainle', url: 'https://chainle.io' }
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
  save();
}

const COLORS = ['#5a35d0', '#c43d6b', '#1f7a52', '#2a5bd7', '#b8701e', '#0f7c86'];
const $ = (id) => document.getElementById(id);
const grid = $('grid'), editBtn = $('edit'), dlg = $('dlg'), form = $('form'), fname = $('fname'), furl = $('furl'), err = $('err');
let editing = false;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hash = (s) => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };

const tile = (g, i) => {
  const m = metaFor(g);
  const bg = m ? m.bg : COLORS[hash(g.name + g.url) % COLORS.length];
  const fg = m ? m.fg : '#ffffff';
  const fit = m ? m.fit : 'icon';
  const src = m ? m.image : faviconFor(g);
  const initial = esc((g.name.trim()[0] || '?').toUpperCase());
  return `<div class="tile" role="button" tabindex="0" style="--bg:${bg};--fg:${fg}" data-open="${i}" aria-label="Speel ${esc(g.name)}">`
    + `<div class="pic ${fit}" data-initial="${initial}"><img src="${esc(src)}" alt="" loading="lazy" decoding="async"></div>`
    + `<b>${esc(g.name)}</b>`
    + `<button class="del" type="button" data-del="${i}" aria-label="Verwijder ${esc(g.name)}">×</button></div>`;
};

// Afbeelding laadt niet (offline, of site zonder icoon): toon de eerste letter.
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img.tagName === 'IMG' && img.parentElement && img.parentElement.classList.contains('pic')) {
    img.parentElement.classList.add('fallback');
    img.remove();
  }
}, true);

const render = () => {
  grid.classList.toggle('editing', editing);
  grid.innerHTML = games.map(tile).join('')
    + '<button class="add" type="button" id="addBtn"><span>+</span>Spel toevoegen</button>';
};

const open = (i) => { const g = games[i]; if (g && !editing) play(g.url); };

grid.addEventListener('click', (e) => {
  const d = e.target.closest('[data-del]');
  if (d) { e.stopPropagation(); games.splice(+d.dataset.del, 1); save(); render(); return; }
  if (e.target.closest('#addBtn')) { err.textContent = ''; form.reset(); dlg.showModal(); fname.focus(); return; }
  const t = e.target.closest('[data-open]');
  if (t) open(+t.dataset.open);
});
grid.addEventListener('keydown', (e) => {
  const t = e.target.closest('[data-open]');
  if (t && e.target === t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(+t.dataset.open); }
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
