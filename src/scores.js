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

export async function saveScore({ group, player, game, day, score, result }) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/scores?on_conflict=group_code,player,game,day`, {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify({ group_code: group, player, game, day, score, result })
  });
  if (!res.ok) throw new Error(`Opslaan mislukt (${res.status}): ${(await res.text()).slice(0, 200)}`);
}

export async function loadScores(group, day) {
  const q = `group_code=eq.${encodeURIComponent(group)}&day=eq.${day}&select=player,game,score,result,created_at&order=score.desc.nullslast`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/scores?${q}`, { headers: headers() });
  if (!res.ok) throw new Error(`Ophalen mislukt (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

// Score uit een gedeelde uitslag halen. Voorlopig algemeen; per spel te verfijnen met echte voorbeelden.
const num = (s) => {
  const clean = s.replace(/\s/g, '');
  // 4.200 / 4,200 als duizendtal; 4.5 / 4,5 als decimaal
  if (/^\d{1,3}([.,]\d{3})+$/.test(clean)) return Number(clean.replace(/[.,]/g, ''));
  return Number(clean.replace(',', '.'));
};
export function parseScore(text) {
  if (!text) return null;
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
