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
        android: { ...DefaultAndroidWebViewOptions, hardwareBack: true, pauseMedia: true }
      }
    });
  } catch (err) {
    window.open(url, '_blank');
  }
};

import { CATALOG, hostOf, metaFor } from './catalog.js';

const KEY = 'spellenkast-v1';
const RKEY = 'spellenkast-recent';
const DEFAULT = [
  { name: 'Farflung', url: 'https://farflung.game' },
  { name: 'Krillion', url: 'https://krillion.io' },
  { name: 'Crowdict', url: 'https://crowdict.com' }
];
const ACCENTS = ['#a77bff', '#3dffa0', '#2ee8d8', '#ff8f3d', '#ff6fa8', '#ffd23d'];

const $ = (id) => document.getElementById(id);
const els = { feat: $('feat'), featSec: $('featSec'), featSub: $('featSub'), recent: $('recent'), recSec: $('recSec'), grid: $('grid'), count: $('count'), chips: $('chips'), q: $('q'), edit: $('edit'), main: $('main'), dlg: $('dlg'), form: $('form'), fname: $('fname'), furl: $('furl'), err: $('err') };

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

let recent = [];
try { const r = JSON.parse(localStorage.getItem(RKEY)); if (Array.isArray(r)) recent = r; } catch (e) {}
const saveRecent = () => { try { localStorage.setItem(RKEY, JSON.stringify(recent)); } catch (e) {} };

let editing = false, filter = 'Alle', query = '';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hash = (s) => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };

// Alles wat een kaart nodig heeft, uit de catalogus of afgeleid voor eigen spellen.
const view = (g, i) => {
  const m = metaFor(g);
  const h = hash(g.name + g.url);
  return {
    i, g, h,
    name: g.name,
    host: hostOf(g.url),
    accent: m ? m.accent : ACCENTS[h % ACCENTS.length],
    blurb: m ? m.blurb : 'Een spel dat je zelf aan je kast hebt toegevoegd.',
    short: m ? m.short : 'Zelf toegevoegd.',
    genres: m ? m.genres : ['Eigen spel'],
    facts: m ? m.facts : [],
    image: m ? m.image : null
  };
};

// Pixel-cover voor spellen zonder preview, of als de preview niet laadt.
const cover = (name, accent, h) => {
  let px = '';
  for (let y = 0; y < 10; y++) for (let x = 0; x < 16; x++) {
    const v = (h >>> ((x * 7 + y * 3) % 29)) & 7;
    if (v > 4 || y > 7 - ((x * h) % 3)) px += `<rect x="${x}" y="${y}" width="1" height="1" fill="${accent}" opacity="${v > 5 ? 0.55 : 0.22}"/>`;
  }
  const ch = esc((name.trim()[0] || '?').toUpperCase());
  return `<svg class="cover" viewBox="0 0 16 10" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges" aria-hidden="true"><rect width="16" height="10" fill="#1d1638"/>${px}<text x="8" y="7.2" text-anchor="middle" font-family="Pixelify" font-weight="700" font-size="6" fill="${accent}">${ch}</text></svg>`;
};

const shot = (v, tags = '') => `<div class="shot">${v.image
  ? `<img src="${esc(v.image)}" alt="Preview van ${esc(v.name)}" loading="lazy" decoding="async" data-cover="${v.i}">`
  : cover(v.name, v.accent, v.h)}${tags}</div>`;

const playBtn = (v, label = 'SPEEL') => `<button class="play" type="button" data-play="${v.i}" aria-label="Speel ${esc(v.name)}"><svg viewBox="0 0 7 7" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M1 0h1v7H1zM2 1h1v5H2zM3 2h1v3H3zM4 3h1v1H4z"/></svg>${label}</button>`;

const genres = (v) => `<div class="genres">${v.genres.map((x) => `<b>${esc(x)}</b>`).join('')}</div>`;
const facts = (v) => v.facts.length ? `<ul class="facts">${v.facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : '';

const ago = (t) => {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'zojuist';
  if (s < 3600) return `${Math.floor(s / 60)} min geleden`;
  if (s < 86400) return `${Math.floor(s / 3600)} uur geleden`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'gisteren' : `${d} dagen geleden`;
};
const lastPlayed = (url) => { const r = recent.find((x) => x.url === url); return r ? r.t : 0; };
const isRecent = (url) => Date.now() - lastPlayed(url) < 7 * 86400 * 1000;

const card = (v, wide) => `<article class="card lift${wide ? ' wide' : ''}" style="--a:${v.accent}" data-open="${v.i}">
  <div class="in">${shot(v, isRecent(v.g.url) ? '<span class="tag r">RECENT</span>' : '')}
    <div class="bd">${genres(v)}<h3>${esc(v.name)}</h3><p class="desc">${esc(wide ? v.blurb : v.short)}</p>${wide ? facts(v) : ''}
      <div class="row"><span class="host">${esc(v.host)}</span>${playBtn(v)}</div></div></div>
  <button class="del" type="button" data-del="${v.i}" aria-label="Verwijder ${esc(v.name)}">×</button></article>`;

// Uitgelicht: elke dag een ander spel, bij voorkeur een met echte preview.
const featured = (all) => {
  if (!all.length) return null;
  const pool = all.filter((v) => v.image).length ? all.filter((v) => v.image) : all;
  const day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
  return pool[day % pool.length];
};

const matches = (v) => {
  if (filter !== 'Alle' && !v.genres.includes(filter)) return false;
  if (!query) return true;
  const hay = [v.name, v.host, v.blurb, ...v.genres].join(' ').toLowerCase();
  return query.split(/\s+/).every((w) => hay.includes(w));
};

const renderChips = (all) => {
  const counts = {};
  all.forEach((v) => v.genres.forEach((x) => { counts[x] = (counts[x] || 0) + 1; }));
  // Alleen categorieën die echt iets filteren (niet een label dat elk spel heeft).
  const cats = Object.keys(counts).filter((c) => counts[c] < all.length).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
  if (filter !== 'Alle' && !cats.includes(filter)) filter = 'Alle';
  els.chips.innerHTML = [['Alle', all.length], ...cats.map((c) => [c, counts[c]])]
    .map(([c, n]) => `<button class="chip" type="button" data-cat="${esc(c)}" aria-pressed="${c === filter}">${esc(c)}<span>${n}</span></button>`).join('');
  els.chips.hidden = cats.length === 0;
};

const render = () => {
  const all = games.map(view);
  renderChips(all);
  const browsing = filter !== 'Alle' || query;

  const f = featured(all);
  els.featSec.hidden = browsing || !f || editing;
  if (f && !els.featSec.hidden) {
    els.feat.innerHTML = `<article class="card feat lift" style="--a:${f.accent}" data-open="${f.i}"><div class="in">
      ${shot(f, '<span class="tag" style="--a:' + f.accent + '">★ DAGELIJKSE PICK</span>')}
      <div class="bd">${genres(f)}<h3>${esc(f.name)}</h3><p class="desc">${esc(f.blurb)}</p>${facts(f)}
        <div class="row">${playBtn(f, 'SPEEL NU')}<span class="host">${esc(f.host)}</span></div></div></div></article>`;
  }

  const rec = recent.map((r) => all.find((v) => v.g.url === r.url) && { v: all.find((v) => v.g.url === r.url), t: r.t }).filter(Boolean).slice(0, 6);
  els.recSec.hidden = browsing || editing;
  els.recent.innerHTML = rec.length
    ? `<div class="recent">${rec.map(({ v, t }) => `<div class="mini lift" style="--a:${v.accent}" data-open="${v.i}">${shot(v)}<div><b>${esc(v.name)}</b><small>${ago(t)}</small></div>${playBtn(v, '')}</div>`).join('')}</div>`
    : '<p class="empty">Nog niets gespeeld. Tik op <b>Speel</b> bij een spel en het verschijnt hier, zodat je snel verder kunt.</p>';

  const list = all.filter(matches);
  els.count.textContent = browsing ? `${list.length} van ${all.length}` : `${all.length}`;
  els.grid.classList.toggle('editing', editing);
  els.grid.innerHTML = list.map((v, n) => card(v, !browsing && n % 4 === 0)).join('')
    + (list.length ? '' : '<p class="none">Geen spel gevonden. Probeer een andere zoekterm of categorie.</p>')
    + (browsing ? '' : '<button class="add" type="button" id="addBtn"><span><span class="pix">+</span>Spel toevoegen</span></button>');
};

// Preview laadt niet (offline of verplaatst): toon de pixel-cover.
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img.tagName !== 'IMG' || !img.dataset.cover) return;
  const g = games[+img.dataset.cover];
  if (!g) return;
  const v = view(g, +img.dataset.cover);
  img.insertAdjacentHTML('afterend', cover(v.name, v.accent, v.h));
  img.remove();
}, true);

const coinAt = (x, y) => {
  const c = document.createElement('div');
  c.className = 'coin';
  c.style.left = x + 'px'; c.style.top = y + 'px';
  c.innerHTML = '<svg viewBox="0 0 6 6" width="20" height="20" shape-rendering="crispEdges"><path fill="#ffd23d" d="M2 0h2v1H2zM1 1h4v4H1zM0 2h6v2H0zM2 5h2v1H2z"/><path fill="#b8860b" d="M3 2h1v2H3z"/></svg>';
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 500);
};

const launch = (i, btn) => {
  const g = games[i];
  if (!g) return;
  recent = [{ url: g.url, t: Date.now() }, ...recent.filter((r) => r.url !== g.url)].slice(0, 12);
  saveRecent();
  if (btn) {
    const r = btn.getBoundingClientRect();
    btn.classList.add('go');
    coinAt(r.left + r.width / 2, r.top);
  }
  play(g.url);
  // Lijst bijwerken nadat het spel geopend is (de kaart staat dan in "Verder spelen").
  setTimeout(render, 400);
};

els.main.addEventListener('click', (e) => {
  const d = e.target.closest('[data-del]');
  if (d) { e.stopPropagation(); const g = games[+d.dataset.del]; games.splice(+d.dataset.del, 1); recent = recent.filter((r) => r.url !== g.url); save(); saveRecent(); render(); return; }
  if (e.target.closest('#addBtn')) { els.err.textContent = ''; els.form.reset(); els.dlg.showModal(); els.fname.focus(); return; }
  if (editing) return;
  const p = e.target.closest('[data-play]');
  if (p) { launch(+p.dataset.play, p); return; }
  const o = e.target.closest('[data-open]');
  if (o) launch(+o.dataset.open, o.querySelector('[data-play]'));
});

els.chips.addEventListener('click', (e) => {
  const c = e.target.closest('[data-cat]');
  if (!c) return;
  filter = c.dataset.cat === filter ? 'Alle' : c.dataset.cat;
  render();
});
els.q.addEventListener('input', () => { query = els.q.value.trim().toLowerCase(); render(); });
els.edit.addEventListener('click', () => {
  editing = !editing;
  els.edit.textContent = editing ? 'Klaar' : 'Bewerken';
  els.edit.setAttribute('aria-pressed', editing);
  render();
});
$('cancel').addEventListener('click', () => els.dlg.close());
els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = els.fname.value.trim();
  let url = els.furl.value.trim();
  if (!name) { els.err.textContent = 'Geef het spel een naam.'; return; }
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  try { const u = new URL(url); if (!u.hostname.includes('.')) throw 0; } catch (x) { els.err.textContent = 'Dat lijkt geen geldig webadres.'; return; }
  if (games.some((g) => hostOf(g.url) === hostOf(url) && g.url.replace(/\/$/, '') === url.replace(/\/$/, ''))) { els.err.textContent = 'Dit spel staat al in je kast.'; return; }
  games.push({ name, url });
  save(); render(); els.dlg.close();
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

render();
