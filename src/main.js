import { Capacitor, registerPlugin } from '@capacitor/core';
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

import { metaFor, faviconFor, hostOf } from './catalog.js';
import { getProfile, setProfile, newGroupCode, dayStr, saveScore, loadScores, loadTop, loadDayTop, loadForm, loadGroupGames, addGroupGame, removeGroupGame, parseScore, detectGame, isDemo } from './scores.js';

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
const dlg = $('dlg'), form = $('form'), fname = $('fname'), furl = $('furl'), fmax = $('fmax'), err = $('err');

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
    + `<div class="art" style="--pbg:${bg}">${img}</div>`
    + `<div class="info"><span class="name">${esc(g.name)}</span>${cardStats(g)}</div>`
    + `<span class="grip" data-grip aria-label="Versleep ${esc(g.name)}">${GRIP}</span></div>`;
};

// Max score van een spel: uit de catalogus, of zelf opgegeven bij toevoegen.
const maxFor = (g) => { const m = metaFor(g); return (m && m.max) || Number(g.max) || 0; };

// ---- Scores van vandaag op de Spellen-tab ----
let home = { day: null, rows: [], records: [] };
try { const c = JSON.parse(localStorage.getItem('quickplay-home')); if (c && c.rows) home = c; } catch (e) {}
const nf = (n) => Number(n).toLocaleString('nl-NL');
const todayRows = () => (home.day === dayStr() ? home.rows : []);

const cardStats = (g) => {
  const p = getProfile();
  if (!p) return '';
  const k = gameKey(g);
  const top = todayRows().filter((r) => r.game === k && r.score !== null && r.score !== undefined)
    .sort((a, b) => Number(b.score) - Number(a.score)).slice(0, 2);
  const best = top.length > 1 ? Number(top[0].score) : null;
  if (!top.length) return '';
  return '<span class="stats">' + top.map((r) => `<span class="ts${Number(r.score) === best ? ' win' : ''}"><b>${esc(r.player)}</b><i>${nf(r.score)}</i></span>`).join('') + '</span>';
};

// Dagscore: per spel score / max × 100 (max 100 per spel), opgeteld over alle spellen met een max.
const TROPHY = '<svg class="cup" viewBox="0 0 24 24" aria-label="winnaar"><path d="M7 3h10v2h3v3a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 14.9V17h3v3H8v-3h3v-2.1A5 5 0 0 1 8.3 12H8a4 4 0 0 1-4-4V5h3V3zm0 4H6v1a2 2 0 0 0 1 1.7V7zm10 0v2.7A2 2 0 0 0 18 8V7h-1z"/></svg>';

// Dagscore: per spel score / max × 100 (max 100 per spel), opgeteld over alle spellen met een max.
// Klaar = iedereen die vandaag meedoet heeft alle spellen met een max gespeeld.
const dayScores = () => {
  const p = getProfile();
  const scored = games.filter((g) => maxFor(g));
  const per = {}, played = {};
  todayRows().forEach((r) => {
    const g = scored.find((x) => gameKey(x) === r.game);
    if (!g || r.score === null || r.score === undefined) return;
    per[r.player] = (per[r.player] || 0) + Math.min(Number(r.score) / maxFor(g), 1) * 100;
    (played[r.player] = played[r.player] || new Set()).add(r.game);
  });
  if (p && Object.keys(per).length && !(p.name in per)) per[p.name] = 0;
  const list = Object.entries(per).map(([name, v]) => ({ name, score: Math.round(v) })).sort((a, b) => b.score - a.score);
  const done = list.length > 1 && scored.length > 0 && list.every((x) => (played[x.name] || new Set()).size >= scored.length);
  return { list, done };
};
const renderDayBar = () => {
  const bar = $('daybar');
  const p = getProfile();
  if (!p || editing || !board.hidden) { bar.hidden = true; return; }
  const { list, done } = dayScores();
  const top = list.length > 1 ? list[0].score : null;
  const tie = list.length > 1 && list[0].score === list[1].score;
  bar.hidden = false;
  bar.classList.toggle('final', done);
  bar.innerHTML = (list.length
    ? '<div class="dp">' + list.map((x) => {
        const lead = x.score === top;
        return `<div class="dpl${lead ? ' win' : ''}"><b>${esc(x.name)}${lead && done && !tie ? ' ' + TROPHY : ''}${lead && !done ? ' <span class="st">★</span>' : ''}</b><i>${x.score}</i></div>`;
      }).join('') + '</div>'
    : '<span class="dn">Nog niemand gespeeld vandaag</span>');
};

// ---- Spellen delen met de groep ----
// Toevoegen en verwijderen gelden voor de hele groep (tabel group_games, met removed_at bij verwijderen).
const isDefault = (g) => DEFAULT.some((d) => gameKey(d) === gameKey(g));
const shareGame = (g, force) => {
  const p = getProfile();
  if (!p || (isDefault(g) && !force)) return;
  addGroupGame({ group: p.group, key: gameKey(g), name: g.name, url: g.url, max: g.max, by: p.name }).catch(() => {});
};
const unshareGame = (g) => {
  const p = getProfile();
  if (!p) return;
  removeGroupGame({ group: p.group, key: gameKey(g), name: g.name, url: g.url, by: p.name }).catch(() => {});
};
let syncing = false;
const syncGroupGames = async () => {
  const p = getProfile();
  if (!p || syncing) return;
  syncing = true;
  try {
    const remote = await loadGroupGames(p.group);
    const byKey = new Map(remote.map((r) => [r.game_key, r]));
    let changed = false;
    // door iemand in de groep verwijderd: ook hier weg
    const before = games.length;
    games = games.filter((g) => { const r = byKey.get(gameKey(g)); return !(r && r.removed_at); });
    if (games.length !== before) changed = true;
    // eigen spellen die de groep nog niet kent: delen
    games.filter((g) => !isDefault(g) && !byKey.has(gameKey(g))).forEach((g) => shareGame(g));
    // spellen van de groep die ik nog niet heb: toevoegen (onderaan)
    remote.forEach((r) => {
      if (r.removed_at) return;
      const mine = games.find((g) => gameKey(g) === r.game_key);
      if (!mine) {
        const g = { name: r.name, url: r.url };
        if (r.max_score) g.max = Number(r.max_score);
        games.push(g); changed = true;
      } else if (!mine.max && r.max_score && !metaFor(mine)) { mine.max = Number(r.max_score); changed = true; }
    });
    if (changed) { save(); if (!drag) render(); }
  } catch (e) { /* offline: volgende keer */ }
  finally { syncing = false; }
};

const refreshHome = async () => {
  const p = getProfile();
  if (!p) return;
  syncGroupGames();
  try {
    const day = dayStr();
    const rows = await loadScores(p.group, day);
    home = { day, rows, records: [] };
    try { localStorage.setItem('quickplay-home', JSON.stringify(home)); } catch (e) {}
    if (!drag) render();
  } catch (e) { /* offline: laat de laatst bekende scores staan */ }
};

const render = () => {
  app.classList.toggle('manual', editing);
  grid.classList.toggle('editing', editing);
  grid.innerHTML = games.map(card).join('')
    + '<button class="add" type="button" id="addBtn"><span>+</span>Spel toevoegen</button>';
  renderDayBar();
};

// Icoon van een eigen spel laadt niet: toon de eerste letter.
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img.tagName === 'IMG' && img.closest('.gboard')) { img.remove(); return; }
  if (img.tagName === 'IMG' && img.dataset.ini) {
    const s = document.createElement('span');
    s.className = 'ini'; s.textContent = img.dataset.ini;
    img.replaceWith(s);
  }
}, true);

let lastGame = null;
const open = (i) => {
  const g = games[i];
  if (!g || editing) return;
  if (isDemo) { lastGame = { g, t: Date.now() - 5000 }; offerScore(); return; }
  lastGame = { g, t: Date.now() };
  hideToast();
  play(g.url);
};

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
  if (!handle || !editing) return;
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
  if (!e.target.closest('[data-del]')) grid.querySelectorAll('.del.sure').forEach((x) => { x.classList.remove('sure'); x.textContent = '×'; });
  const d = e.target.closest('[data-del]');
  if (d) {
    e.stopPropagation();
    // eerste tik: bevestigen; tweede tik: weg voor de hele groep
    if (!d.classList.contains('sure')) {
      grid.querySelectorAll('.del.sure').forEach((x) => { x.classList.remove('sure'); x.textContent = '×'; });
      d.classList.add('sure'); d.textContent = getProfile() ? 'Verwijderen voor iedereen' : 'Verwijderen';
      return;
    }
    const [gone] = games.splice(+d.dataset.del, 1);
    if (gone) unshareGame(gone);
    save(); render(); return;
  }
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
  const maxRaw = (fmax.value || '').trim();
  const max = maxRaw === '' ? null : Number(maxRaw.replace(/\./g, '').replace(',', '.'));
  if (maxRaw !== '' && !(max > 0)) { err.textContent = 'De max score moet een getal groter dan 0 zijn.'; return; }
  const g = { name, url };
  if (max) g.max = max;
  games.push(g);
  shareGame(g, true);
  save(); render(); dlg.close();
});

// ---------------- Scores ----------------
// Sleutel per spel, gelijk voor iedereen met dezelfde link: host, plus eerste pad-deel als dat er is.
const gameKey = (g) => {
  let path = '';
  try { path = new URL(g.url).pathname.split('/')[1] || ''; } catch (e) {}
  return path ? hostOf(g.url) + '/' + path : hostOf(g.url);
};

const board = $('board'), boardList = $('boardList');
const setupDlg = $('setup'), setupForm = $('setupForm'), pname = $('pname'), pgroup = $('pgroup'), setupErr = $('setupErr');
const scoreDlg = $('scoreDlg'), scoreForm = $('scoreForm'), sgame = $('sgame'), stext = $('stext'), sval = $('sval'), scoreErr = $('scoreErr');
const toast = $('toast');
let viewDay = dayStr();
let afterSetup = null;

const fmt = (n) => (n === null || n === undefined || n === '') ? '–' : Number(n).toLocaleString('nl-NL');

const openSetup = (then) => {
  const p = getProfile();
  pname.value = p ? p.name : '';
  pgroup.value = p ? p.group : '';
  setupErr.textContent = '';
  afterSetup = then || null;
  setupDlg.showModal();
};
$('newCode').addEventListener('click', () => { pgroup.value = newGroupCode(); });
$('setupCancel').addEventListener('click', () => setupDlg.close());
setupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = pname.value.trim(), group = pgroup.value.trim().toUpperCase();
  if (!name) { setupErr.textContent = 'Vul je naam in.'; return; }
  if (group.length < 4) { setupErr.textContent = 'Kies een groepscode van minstens 4 tekens, of tik op Nieuwe code.'; return; }
  setProfile({ name, group });
  setupDlg.close();
  home = { day: null, rows: [], records: [] };
  refreshHome();
  const f = afterSetup; afterSetup = null;
  if (f) f(); else if (!board.hidden) showBoard();
});

const setTab = (tab) => {
  document.querySelectorAll('[data-tab]').forEach((b) => {
    if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  const scores = tab === 'scores';
  if (!scores) refreshHome();
  grid.hidden = scores; board.hidden = !scores;
  renderDayBar();
  editBtn.hidden = scores; $('who').hidden = !scores;
  if (scores && editing) { editing = false; editBtn.textContent = 'Bewerken'; editBtn.setAttribute('aria-pressed', false); render(); }
  window.scrollTo(0, 0);
};

// Leaderboards: Records (top 5) of Onderling (duels over een periode). Keuze wordt onthouden.
let lbView = 'records', lbDays = 30;
try { const v = JSON.parse(localStorage.getItem('quickplay-lb') || '{}'); if (v.view) lbView = v.view; if (v.days !== undefined) lbDays = v.days; } catch (e) {}
const saveLb = () => { try { localStorage.setItem('quickplay-lb', JSON.stringify({ view: lbView, days: lbDays })); } catch (e) {} };
const syncLbControls = () => {
  document.querySelectorAll('.seg [data-view]').forEach((b) => b.setAttribute('aria-selected', b.dataset.view === lbView));
  $('periods').hidden = lbView !== 'form';
  document.querySelectorAll('#periods [data-days]').forEach((b) => b.setAttribute('aria-pressed', Number(b.dataset.days) === lbDays));
};
document.querySelector('.seg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-view]'); if (!b) return;
  lbView = b.dataset.view; saveLb(); boardList.innerHTML = ''; showBoard();
});
$('periods').addEventListener('click', (e) => {
  const b = e.target.closest('[data-days]'); if (!b) return;
  lbDays = Number(b.dataset.days); saveLb(); showBoard();
});

const formTile = (title, rows, me, isDay, wide) => {
  const list = rows.slice().sort((a, b) => b.wins - a.wins || b.avg_score - a.avg_score);
  const duels = Math.max(0, ...list.map((r) => r.duels));
  const lead = list.length > 1 && list[0].wins > list[1].wins ? list[0].player : null;
  const head = `<h3><span>${esc(title)}</span>${lead ? `<span class="lead">♛ ${esc(lead)}</span>` : ''}</h3>`;
  const cls = `fm${wide ? ' wide' : ''}`;
  if (!list.length) return `<div class="${cls}">${head}<p class="none">Nog niet gespeeld in deze periode</p></div>`;
  const avg = (r) => (isDay ? 'gem. ' : 'gem. ') + nf(r.avg_score);
  if (list.length === 2) {
    // ik links, de ander rechts
    const a = list.find((r) => r.player === me) || list[0], b = list.find((r) => r !== a);
    const ties = Math.min(a.ties, b.ties), total = a.wins + b.wins + ties;
    const pct = (n) => (total ? (n / total) * 100 : 0);
    return `<div class="${cls}">${head}`
      + `<div class="duel"><div class="who${lead === a.player ? ' lead' : ''}"><b>${esc(a.player)}</b><i>${a.wins}</i></div>`
      + `<div class="bar" role="img" aria-label="${esc(a.player)} ${a.wins}, gelijk ${ties}, ${esc(b.player)} ${b.wins}">${total ? `<span class="a" style="width:${pct(a.wins)}%"></span><span class="t" style="width:${pct(ties)}%"></span><span class="b" style="width:${pct(b.wins)}%"></span>` : ''}</div>`
      + `<div class="who r${lead === b.player ? ' lead' : ''}"><b>${esc(b.player)}</b><i>${b.wins}</i></div></div>`
      + `<div class="avg"><span>${avg(a)}</span><span>${duels} ${duels === 1 ? 'duel' : 'duels'}${ties ? ` · ${ties} gelijk` : ''}</span><span>${avg(b)}</span></div></div>`;
  }
  // één speler of meer dan twee: lijstje
  return `<div class="${cls}">${head}<ul class="multi">` + list.map((r) => `<li><b>${esc(r.player)}</b><span>${r.wins} gewonnen</span><span>${avg(r)}</span></li>`).join('') + '</ul></div>';
};

const fmtDay = (d) => new Date(d + 'T12:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
const showBoard = async () => {
  setTab('scores');
  const p = getProfile();
  $('who').textContent = p ? `${p.name} · ${p.group}` : 'Instellen';
  if (!p) { boardList.innerHTML = '<p class="msg" style="grid-column:1/-1">Stel eerst je naam en groepscode in om scores met je vriend te delen.</p>'; openSetup(showBoard); return; }
  syncLbControls();
  if (!boardList.children.length) boardList.innerHTML = '<p class="msg" style="grid-column:1/-1">Leaderboards ophalen…</p>';
  if (lbView === 'form') {
    const since = lbDays ? dayStr(new Date(Date.now() - (lbDays - 1) * 86400000)) : null;
    let form;
    try { form = await loadForm(p.group, since); }
    catch (x) { boardList.innerHTML = '<p class="msg" style="grid-column:1/-1">Kon de onderlinge stand niet ophalen. Controleer je internetverbinding.</p>'; return; }
    if (lbView !== 'form') return;
    boardList.innerHTML = formTile('Dagscore', form.filter((r) => r.game === '_dagscore'), p.name, true, true)
      + games.map((g) => formTile(g.name, form.filter((r) => r.game === gameKey(g)), p.name, false, false)).join('');
    return;
  }
  let rows, dayTop;
  try { [rows, dayTop] = await Promise.all([loadTop(p.group), loadDayTop(p.group)]); }
  catch (x) { boardList.innerHTML = `<p class="msg" style="grid-column:1/-1">Kon de leaderboards niet ophalen. Controleer je internetverbinding.</p>`; return; }
  if (lbView !== 'records') return;
  const row = (r, i, val) => `<li class="${r.player === p.name ? 'me' : ''}" data-day="${esc(fmtDay(r.day))}"><span class="rk">${i + 1}</span><span class="pn">${esc(r.player)}</span><span class="sc">${val}</span></li>`;
  // brede tegel bovenaan: hoogste dagscores ooit
  const dayTile = `<div class="lb wide"><h3><span class="gt">Dagscore</span><span class="gd"></span></h3>` + (dayTop.length
    ? '<ol>' + dayTop.map((r, i) => row(r, i, nf(r.day_score))).join('') + '</ol>'
    : '<p class="none">Nog geen dagscores</p>') + '</div>';
  // zelfde volgorde als de Spellen-tab
  boardList.innerHTML = dayTile + games.map((g) => {
    const k = gameKey(g);
    const list = rows.filter((r) => r.game === k).sort((a, b) => a.rank - b.rank).slice(0, 5);
    return `<div class="lb"><h3><span class="gt">${esc(g.name)}</span><span class="gd"></span></h3>` + (list.length
      ? '<ol>' + list.map((r, i) => row(r, i, nf(r.score))).join('') + '</ol>'
      : '<p class="none">Nog geen scores</p>') + '</div>';
  }).join('');
};

// Tik op een score: die regel licht op en de datum staat bovenin de tegel (boven je duim).
let peekTimer = null;
const clearPeek = () => {
  clearTimeout(peekTimer);
  boardList.querySelectorAll('.lb.peeking').forEach((t) => t.classList.remove('peeking'));
  boardList.querySelectorAll('.lb li.peek').forEach((l) => l.classList.remove('peek'));
};
boardList.addEventListener('click', (e) => {
  const li = e.target.closest('.lb li');
  const was = li && li.classList.contains('peek');
  clearPeek();
  if (!li || was) return;
  const tile = li.closest('.lb');
  li.classList.add('peek');
  tile.querySelector('.gd').textContent = li.dataset.day;
  tile.classList.add('peeking');
  peekTimer = setTimeout(clearPeek, 4000);
});

const showGames = () => setTab('games');

document.querySelector('.tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  if (b.dataset.tab === 'scores') { viewDay = dayStr(); showBoard(); } else showGames();
});
$('who').addEventListener('click', () => openSetup());

const openScore = (g, shared) => {
  const go = () => {
    sgame.innerHTML = games.map((x, i) => `<option value="${i}">${esc(x.name)}</option>`).join('');
    if (g) sgame.value = String(games.indexOf(g));
    stext.value = ''; sval.value = ''; scoreErr.textContent = '';
    if (!scoreDlg.open) scoreDlg.showModal();
    if (shared) { stext.value = shared.trim(); fillFromText(); } else tryPaste(true);
  };
  if (!getProfile()) openSetup(go); else go();
};
const fillFromText = () => {
  const k = detectGame(stext.value);
  if (k) { const i = games.findIndex((g) => gameKey(g) === k); if (i >= 0) sgame.value = String(i); }
  const n = parseScore(stext.value);
  if (n !== null && n !== undefined) sval.value = String(n);
};
const tryPaste = async (quiet) => {
  try {
    const t = await navigator.clipboard.readText();
    if (t && t.trim()) { stext.value = t.trim(); fillFromText(); }
    else if (!quiet) scoreErr.textContent = 'Het klembord is leeg. Tik eerst in het spel op Delen.';
  } catch (x) {
    if (!quiet) scoreErr.textContent = 'Plakken lukt hier niet automatisch. Houd het tekstvak ingedrukt en kies Plakken.';
  }
};
$('paste').addEventListener('click', () => tryPaste(false));
stext.addEventListener('input', fillFromText);
$('scoreCancel').addEventListener('click', () => scoreDlg.close());
scoreForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const p = getProfile(), g = games[+sgame.value];
  if (!p || !g) return;
  const raw = sval.value.trim();
  const score = raw === '' ? null : Number(raw.replace(/\./g, '').replace(',', '.'));
  if (raw !== '' && !Number.isFinite(score)) { scoreErr.textContent = 'De score moet een getal zijn.'; return; }
  if (score === null && !stext.value.trim()) { scoreErr.textContent = 'Plak je uitslag of vul een score in.'; return; }
  const btn = $('scoreSave'); btn.disabled = true; btn.textContent = 'Opslaan…';
  try {
    await saveScore({ group: p.group, player: p.name, game: gameKey(g), day: dayStr(), score, result: stext.value.trim().slice(0, 2000) || null });
    scoreDlg.close();
    viewDay = dayStr();
    refreshHome();
    showBoard();
  } catch (x) {
    scoreErr.textContent = 'Opslaan lukte niet. ' + x.message;
  } finally { btn.disabled = false; btn.textContent = 'Opslaan'; }
});

// Na een spel: vraag of je je score wilt toevoegen.
let toastTimer = null;
function hideToast() { toast.hidden = true; clearTimeout(toastTimer); }
const offerScore = () => {
  if (!lastGame || Date.now() - lastGame.t < 4000) return;
  const g = lastGame.g; lastGame = null;
  $('toastText').textContent = `${g.name} gespeeld?`;
  toast.hidden = false;
  $('toastGo').onclick = () => { hideToast(); openScore(g); };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 15000);
};
$('toastX').addEventListener('click', hideToast);

// Gedeeld via het Android-deelmenu (Delen → Quickplay): meteen het venster Score toevoegen openen.
if (Capacitor.isNativePlatform()) {
  const ShareReceiver = registerPlugin('ShareReceiver');
  let lastShared = '', lastAt = 0;
  const onShared = (text) => {
    if (!text || !text.trim()) return;
    if (text === lastShared && Date.now() - lastAt < 5000) return; // niet dubbel
    lastShared = text; lastAt = Date.now();
    hideToast(); lastGame = null;
    if (setupDlg.open) setupDlg.close();
    openScore(null, text);
  };
  try {
    ShareReceiver.addListener('shared', (d) => onShared(d && d.text));
    ShareReceiver.getShared().then((r) => onShared(r && r.text)).catch(() => {});
  } catch (e) {}
}
try { InAppBrowser.addListener('browserClosed', () => setTimeout(offerScore, 300)); } catch (e) {}
document.addEventListener('visibilitychange', () => { if (!document.hidden) { setTimeout(offerScore, 300); refreshHome(); } });
window.addEventListener('focus', () => setTimeout(offerScore, 300));

render();
refreshHome();
