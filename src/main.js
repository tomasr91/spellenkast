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

import { metaFor, pixelSvg } from './catalog.js';

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

const ACCENTS = [['#5a35d0', '#7b4dff', '#3a2290'], ['#b8325a', '#e2507a', '#7d1d3c'], ['#1f7a52', '#2fa56f', '#12543a'], ['#2a5bd7', '#4a7dff', '#1a3c96'], ['#a8661a', '#d68a2a', '#6e3f0c']];
const $ = (id) => document.getElementById(id);
const grid = $('grid'), editBtn = $('edit'), dlg = $('dlg'), form = $('form'), fname = $('fname'), furl = $('furl'), err = $('err');
let editing = false;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hash = (s) => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };

const tile = (g, i) => {
  const m = metaFor(g);
  let style, icon;
  if (m) {
    style = `--bg1:${m.bg};--bg2:${m.bg2};--fg:${m.fg}`;
    icon = pixelSvg(m.icon);
  } else {
    const [a, b, c] = ACCENTS[hash(g.name + g.url) % ACCENTS.length];
    style = `--bg1:${c};--bg2:${a};--fg:#ffffff;--acc:${b};--acc2:${c}`;
    icon = pixelSvg('joystick');
  }
  return `<div class="tile" role="button" tabindex="0" style="${style}" data-open="${i}" aria-label="Speel ${esc(g.name)}">${icon}<b>${esc(g.name)}</b>`
    + `<button class="del" type="button" data-del="${i}" aria-label="Verwijder ${esc(g.name)}">×</button></div>`;
};

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
  if (games.some((g) => g.url.replace(/\/$/, '') === url.replace(/\/$/, ''))) { err.textContent = 'Dit spel staat al in je kast.'; return; }
  games.push({ name, url });
  save(); render(); dlg.close();
});

render();
