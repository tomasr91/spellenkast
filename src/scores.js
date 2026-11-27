// Scores delen met vrienden via Supabase (REST, zonder extra bibliotheek).
// De publishable key is bedoeld om in een app te staan; Row Level Security in de database bepaalt wat mag.

const SUPABASE_URL = 'https://kzioyxkstqxspjuugwdc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1iqQx5Aopd4v2GY_Aes_5A_fAPwmy-3';
const PROFILE_KEY = 'quickplay-profile';

const headers = (extra = {}) => ({ apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...extra });

export const getProfile = () => {
  try { const p = JSON.parse(localStorage.getItem(PROFILE_KEY)); if (p && p.name && p.group) return p; } catch (e) {}
  return null;
};
export const setProfile = (p) => { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch (e) {} };

export const newGroupCode = () => {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  const r = new Uint32Array(6);
  crypto.getRandomValues(r);
  r.forEach((n) => { s += abc[n % abc.length]; });
  return s;
};

// Datum als JJJJ-MM-DD in de tijdzone van het toestel.
export const dayStr = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};

// ---- Voorbeeldversie (artifact): nepdata in plaats van Supabase ----
// DEMO wordt bij het bouwen ingevuld (esbuild --define); in de app is het false.
const IS_DEMO = typeof DEMO !== 'undefined' && DEMO;
const demoRows = [];
if (IS_DEMO) {
  const d = (n) => dayStr(new Date(Date.now() - n * 86400000));
  const add = (n, player, game, score, result) => demoRows.push({ group_code: 'DEMO01', player, game, day: d(n), score, result: result || null, created_at: new Date(Date.now() - n * 86400000).toISOString() });
  add(0, 'Tomas', 'chainle.io', 4200, 'Chainle #100 · 4,200 🔗');
  add(0, 'Sanne', 'chainle.io', 3850, 'Chainle #100 · 3,850 🔗');
  add(0, 'Tomas', 'farflung.game', 240, 'Farflung #54 · 240/500 km');
  add(0, 'Sanne', 'farflung.game', 310, 'Farflung #54 · 310/500 km');
  add(0, 'Sanne', 'krillion.io', 412, 'Krillion #134 🦐\n412');
  add(1, 'Tomas', 'chainle.io', 2335); add(1, 'Sanne', 'chainle.io', 4850);
  add(1, 'Tomas', 'krillion.io', 560); add(1, 'Sanne', 'krillion.io', 355);
  add(1, 'Tomas', 'guessdash.com/extraplot', 3120); add(1, 'Sanne', 'guessdash.com/extraplot', 2636);
  add(2, 'Tomas', 'farflung.game', 380); add(2, 'Sanne', 'farflung.game', 410);
  // nog een paar weken geschiedenis, zodat de leaderboards gevuld zijn
  const maxes = { 'farflung.game': 500, 'krillion.io': 700, 'chainle.io': 5000, 'guessdash.com/extraplot': 5000 };
  let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let n = 3; n < 24; n++) {
    for (const [game, max] of Object.entries(maxes)) {
      for (const who of ['Tomas', 'Sanne']) {
        if (rnd() < 0.25) continue;
        add(n, who, game, Math.round(max * (0.25 + rnd() * 0.65)));
      }
    }
  }
  try { if (!localStorage.getItem(PROFILE_KEY)) localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: 'Tomas', group: 'DEMO01' })); } catch (e) {}
}
export const isDemo = IS_DEMO;
const demoForm = (group, since) => {
  const rows = demoRows.filter((r) => r.group_code === group && r.score !== null && (!since || r.day >= since));
  const tot = {};
  rows.filter((r) => DEMO_MAX[r.game]).forEach((r) => {
    const k = r.player + '|' + r.day;
    tot[k] = (tot[k] || 0) + Math.min(r.score / DEMO_MAX[r.game], 1) * 100;
  });
  const all = rows.map((r) => ({ game: r.game, player: r.player, day: r.day, score: r.score }))
    .concat(Object.entries(tot).map(([k, v]) => { const [player, day] = k.split('|'); return { game: '_dagscore', player, day, score: Math.round(v) }; }));
  const days = {};
  all.forEach((r) => { (days[r.game + '|' + r.day] = days[r.game + '|' + r.day] || []).push(r); });
  const out = {};
  all.forEach((r) => {
    const d = days[r.game + '|' + r.day], best = Math.max(...d.map((x) => x.score)), nTop = d.filter((x) => x.score === best).length;
    const o = out[r.game + '|' + r.player] = out[r.game + '|' + r.player] || { game: r.game, player: r.player, played: 0, sum: 0, duels: 0, wins: 0, ties: 0 };
    o.played++; o.sum += r.score;
    if (d.length >= 2) { o.duels++; if (r.score === best) { if (nTop === 1) o.wins++; else o.ties++; } }
  });
  return Object.values(out).map(({ sum, ...o }) => ({ ...o, avg_score: Math.round(sum / o.played) }));
};
// In de voorbeeldversie heeft Sanne alvast een spel aan de groep toegevoegd.
const demoGroupGames = IS_DEMO ? [{ group_code: 'DEMO01', game_key: 'wafflegame.net', name: 'Waffle', url: 'https://wafflegame.net', max_score: 15, added_by: 'Sanne' }] : [];
const DEMO_MAX = { 'farflung.game': 500, 'krillion.io': 700, 'chainle.io': 5000, 'guessdash.com/extraplot': 5000 };
const demoDayTop = (group) => {
  const tot = {};
  demoRows.filter((r) => r.group_code === group && r.score !== null && DEMO_MAX[r.game]).forEach((r) => {
    const k = r.player + '|' + r.day;
    tot[k] = (tot[k] || 0) + Math.min(r.score / DEMO_MAX[r.game], 1) * 100;
  });
  return Object.entries(tot).map(([k, v]) => { const [player, day] = k.split('|'); return { player, day, day_score: Math.round(v) }; })
    .sort((a, b) => b.day_score - a.day_score || a.day.localeCompare(b.day)).slice(0, 5).map((r, i) => ({ ...r, rank: i + 1 }));
};
const demoTop = (group) => {
  const by = {};
  demoRows.filter((r) => r.group_code === group && r.score !== null)
    .sort((a, b) => b.score - a.score || a.created_at.localeCompare(b.created_at))
    .forEach((r) => { (by[r.game] = by[r.game] || []).push(r); });
  return Object.values(by).flatMap((list) => list.slice(0, 5).map(({ game, player, score, day }, i) => ({ game, player, score, day, rank: i + 1 })));
};

export async function saveScore({ group, player, game, day, score, result }) {
  if (IS_DEMO) {
    const i = demoRows.findIndex((r) => r.group_code === group && r.player === player && r.game === game && r.day === day);
    const row = { group_code: group, player, game, day, score, result, created_at: new Date().toISOString() };
    if (i >= 0) demoRows[i] = row; else demoRows.push(row);
    return;
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/scores?on_conflict=group_code,player,game,day`, {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify({ group_code: group, player, game, day, score, result })
  });
  if (!res.ok) throw new Error(`Opslaan mislukt (${res.status}): ${(await res.text()).slice(0, 200)}`);
}

export async function loadScores(group, day) {
  if (IS_DEMO) return demoRows.filter((r) => r.group_code === group && r.day === day).map((r) => ({ ...r }));
  const q = `group_code=eq.${encodeURIComponent(group)}&day=eq.${day}&select=player,game,score,result,created_at&order=score.desc.nullslast`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/scores?${q}`, { headers: headers() });
  if (!res.ok) throw new Error(`Ophalen mislukt (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

// Top 5 aller tijden per spel in de groep (view game_top5 in Supabase), met datum.
export async function loadTop(group) {
  if (IS_DEMO) return demoTop(group);
  const q = `group_code=eq.${encodeURIComponent(group)}&select=game,player,score,day,rank&order=game.asc,rank.asc`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/game_top5?${q}`, { headers: headers() });
  if (!res.ok) throw new Error(`Leaderboard ophalen mislukt (${res.status})`);
  return res.json();
}

// Top 5 hoogste dagscores aller tijden (view day_score_top5; max per spel staat in tabel game_max).
export async function loadDayTop(group) {
  if (IS_DEMO) return demoDayTop(group);
  const q = `group_code=eq.${encodeURIComponent(group)}&select=player,day,day_score,rank&order=rank.asc`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/day_score_top5?${q}`, { headers: headers() });
  if (!res.ok) throw new Error(`Dagscores ophalen mislukt (${res.status})`);
  return res.json();
}

// Onderlinge vorm vanaf een datum (functie player_form in Supabase). game '_dagscore' = dagscore-duels.
export async function loadForm(group, since) {
  if (IS_DEMO) return demoForm(group, since);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/player_form`, {
    method: 'POST', headers: headers(), body: JSON.stringify({ p_group: group, p_since: since || null })
  });
  if (!res.ok) throw new Error(`Onderlinge stand ophalen mislukt (${res.status})`);
  return res.json();
}

// Spellen van de groep (tabel group_games): wat iemand toevoegt, krijgen de anderen automatisch.
export async function loadGroupGames(group) {
  if (IS_DEMO) return demoGroupGames.filter((g) => g.group_code === group);
  const q = `group_code=eq.${encodeURIComponent(group)}&select=game_key,name,url,max_score,added_by,removed_at,created_at&order=created_at.asc`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/group_games?${q}`, { headers: headers() });
  if (!res.ok) throw new Error(`Groepsspellen ophalen mislukt (${res.status})`);
  return res.json();
}
// Toevoegen (of na verwijderen opnieuw toevoegen) en verwijderen voor de hele groep.
const upsertGroupGame = async (row) => {
  if (IS_DEMO) {
    const i = demoGroupGames.findIndex((g) => g.group_code === row.group_code && g.game_key === row.game_key);
    if (i >= 0) demoGroupGames[i] = { ...demoGroupGames[i], ...row }; else demoGroupGames.push(row);
    return;
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/group_games?on_conflict=group_code,game_key`, {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify(row)
  });
  if (!res.ok) throw new Error(`Spel bijwerken in groep mislukt (${res.status})`);
};
export const addGroupGame = ({ group, key, name, url, max, by }) =>
  upsertGroupGame({ group_code: group, game_key: key, name, url, max_score: max || null, added_by: by || null, removed_at: null, removed_by: null });
export const removeGroupGame = ({ group, key, name, url, by }) =>
  upsertGroupGame({ group_code: group, game_key: key, name, url, removed_at: new Date().toISOString(), removed_by: by || null });

// Score uit een gedeelde uitslag halen. Voorlopig algemeen; per spel te verfijnen met echte voorbeelden.
const num = (s) => {
  const clean = s.replace(/\s/g, '');
  // 4.200 / 4,200 als duizendtal; 4.5 / 4,5 als decimaal
  if (/^\d{1,3}([.,]\d{3})+$/.test(clean)) return Number(clean.replace(/[.,]/g, ''));
  return Number(clean.replace(',', '.'));
};
// Per spel: hoe de gedeelde uitslag eruitziet (op basis van echte voorbeelden).
const GAMES = [
  // "Chainle #99 · 2,335 🔗"
  { key: 'chainle.io', name: /chainle/i, score: /chainle\s*#\d+\s*·\s*([\d.,]+)/i },
  // "Farflung #53 · 240/500 km"
  { key: 'farflung.game', name: /farflung/i, score: /farflung\s*#\d+\s*·\s*([\d.,]+)\s*\/\s*[\d.,]+\s*km/i },
  // "Krillion #133 🦐" en op een volgende regel "355"
  { key: 'krillion.io', name: /krillion/i, score: /krillion\s*#\d+[^\n]*\n\s*(?:\n\s*)*([\d.,]+)\s*(?:\n|$)/i },
  // "⬜🟨🟩🟨🟩 2,636 / 5,000"
  { key: 'guessdash.com/extraplot', name: /extraplot/i, score: /([\d.,]+)\s*\/\s*5[.,]?000/ }
];

// Welk spel hoort bij deze uitslag? Geeft de sleutel terug, of null.
export const detectGame = (text) => {
  const g = GAMES.find((x) => x.name.test(String(text || '')));
  return g ? g.key : null;
};

export function parseScore(text) {
  if (!text) return null;
  const known = GAMES.find((x) => x.name.test(text));
  if (known) {
    const m = String(text).match(known.score);
    if (m) return num(m[1]);
  }
  // datums en tijden eruit, zodat die niet als score worden gezien
  const t = String(text).replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ').replace(/\b\d{1,2}:\d{2}\b/g, ' ');
  // "score: 77" of "punten 77"
  let m = t.match(/(?:score|punten|points|pts)\s*[:=]?\s*(\d[\d.,]*)/i);
  if (m) return num(m[1]);
  // "1234 / 5000" of "3/5"
  m = t.match(/(\d[\d.,]*)\s*\/\s*(\d[\d.,]*)/);
  if (m) return num(m[1]);
  // getal gevolgd door een eenheid: 87 points, 1,234 km, 412m, 85%
  m = t.match(/(\d[\d.,]*)\s*(?:pts|points|punten|km|m\b|%)/i);
  if (m) return num(m[1]);
  // anders: het grootste getal in de tekst (jaartallen en datums overslaan)
  const all = [...t.matchAll(/\d[\d.,]*/g)].map((x) => num(x[0])).filter((n) => Number.isFinite(n) && !(n >= 1900 && n <= 2100));
  return all.length ? Math.max(...all) : null;
}
