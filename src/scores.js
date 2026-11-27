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
  try { if (!localStorage.getItem(PROFILE_KEY)) localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: 'Tomas', group: 'DEMO01' })); } catch (e) {}
}
export const isDemo = IS_DEMO;
const demoRecords = (group) => {
  const best = {};
  demoRows.filter((r) => r.group_code === group && r.score !== null).forEach((r) => {
    const b = best[r.game];
    if (!b || r.score > b.score) best[r.game] = r;
  });
  return Object.values(best).map(({ game, player, score, day }) => ({ game, player, score, day }));
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

// Hoogste score ooit per spel in de groep (view game_records in Supabase).
export async function loadRecords(group) {
  if (IS_DEMO) return demoRecords(group);
  const q = `group_code=eq.${encodeURIComponent(group)}&select=game,player,score,day`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/game_records?${q}`, { headers: headers() });
  if (!res.ok) throw new Error(`Records ophalen mislukt (${res.status})`);
  return res.json();
}

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
