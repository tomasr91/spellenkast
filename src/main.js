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

import { metaFor, faviconFor, hostOf } from './catalog.js';
import { getProfile, setProfile, newGroupCode, dayStr, saveScore, loadScores, parseScore, detectGame } from './scores.js';

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

// ---------------- Scores ----------------
// Sleutel per spel, gelijk voor iedereen met dezelfde link: host, plus eerste pad-deel als dat er is.
const gameKey = (g) => {
  let path = '';
  try { path = new URL(g.url).pathname.split('/')[1] || ''; } catch (e) {}
  return path ? hostOf(g.url) + '/' + path : hostOf(g.url);
};

const board = $('board'), boardList = $('boardList'), dayLabel = $('dayLabel'), nextDay = $('nextDay');
const setupDlg = $('setup'), setupForm = $('setupForm'), pname = $('pname'), pgroup = $('pgroup'), setupErr = $('setupErr');
const scoreDlg = $('scoreDlg'), scoreForm = $('scoreForm'), sgame = $('sgame'), stext = $('stext'), sval = $('sval'), scoreErr = $('scoreErr');
const toast = $('toast');
let viewDay = dayStr();
let afterSetup = null;

const fmt = (n) => (n === null || n === undefined || n === '') ? '–' : Number(n).toLocaleString('nl-NL');
const dayName = (d) => {
  const today = dayStr(), y = dayStr(new Date(Date.now() - 86400000));
  if (d === today) return 'Vandaag';
  if (d === y) return 'Gisteren';
  return new Date(d + 'T12:00:00').toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
};
const shiftDay = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return dayStr(x); };

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
  const f = afterSetup; afterSetup = null;
  if (f) f(); else if (!board.hidden) showBoard();
});

const showBoard = async () => {
  const p = getProfile();
  if (!p) { openSetup(showBoard); return; }
  grid.hidden = true; board.hidden = false;
  $('who').textContent = `${p.name} · ${p.group}`;
  dayLabel.textContent = dayName(viewDay);
  nextDay.disabled = viewDay >= dayStr();
  boardList.innerHTML = '<p class="msg">Scores ophalen…</p>';
  let rows;
  try { rows = await loadScores(p.group, viewDay); }
  catch (x) { boardList.innerHTML = `<p class="msg">Kon de scores niet ophalen. Controleer je internetverbinding.<br><small>${esc(x.message)}</small></p>`; return; }
  const byGame = {};
  rows.forEach((r) => { (byGame[r.game] = byGame[r.game] || []).push(r); });
  const players = [...new Set(rows.map((r) => r.player))];
  if (!players.includes(p.name)) players.push(p.name);
  boardList.innerHTML = games.map((g) => {
    const k = gameKey(g), list = (byGame[k] || []).slice().sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));
    const top = list.length > 1 && list[0].score !== null ? list[0].score : null;
    const m = metaFor(g);
    const missing = players.filter((n) => !list.some((r) => r.player === n));
    return `<div class="gboard"><h3>${m ? `<img src="${esc(m.image)}" alt="">` : ''}${esc(g.name)}</h3>`
      + (list.length ? list.map((r) => `<div class="prow${r.score === top ? ' win' : ''}${r.player === p.name ? ' me' : ''}"><span class="pn">${esc(r.player)}</span><span class="ps">${fmt(r.score)}</span>`
        + (r.result ? `<details><summary>uitslag tonen</summary><div class="raw">${esc(r.result)}</div></details>` : '') + '</div>').join('') : '')
      + (missing.length ? `<p class="wait">Nog niet gespeeld: ${missing.map(esc).join(', ')}</p>` : '')
      + '</div>';
  }).join('');
};
const showGames = () => { board.hidden = true; grid.hidden = false; };

$('scoresBtn').addEventListener('click', () => { viewDay = dayStr(); showBoard(); });
$('back').addEventListener('click', showGames);
$('who').addEventListener('click', () => openSetup());
$('prevDay').addEventListener('click', () => { viewDay = shiftDay(viewDay, -1); showBoard(); });
nextDay.addEventListener('click', () => { if (viewDay < dayStr()) { viewDay = shiftDay(viewDay, 1); showBoard(); } });

const openScore = (g) => {
  const go = () => {
    sgame.innerHTML = games.map((x, i) => `<option value="${i}">${esc(x.name)}</option>`).join('');
    if (g) sgame.value = String(games.indexOf(g));
    stext.value = ''; sval.value = ''; scoreErr.textContent = '';
    scoreDlg.showModal();
    tryPaste(true);
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
$('addScore').addEventListener('click', () => openScore(null));
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
try { InAppBrowser.addListener('browserClosed', () => setTimeout(offerScore, 300)); } catch (e) {}
document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(offerScore, 300); });
window.addEventListener('focus', () => setTimeout(offerScore, 300));

render();
