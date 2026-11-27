// Dagelijkse herinneringen op vaste tijden (lokale meldingen, geen server nodig).
// We plannen steeds de komende 14 dagen vooruit en plannen opnieuw bij elke keer openen.
// Heb je vandaag alles gespeeld, dan vallen de herinneringen van vandaag weg.
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const KEY = 'quickplay-reminders';
const DAYS_AHEAD = 14;
const ID_BASE = 7000; // eigen id-reeks: 7000 + dag * 20 + tijd-index

export const getReminders = () => {
  try {
    const r = JSON.parse(localStorage.getItem(KEY));
    if (r && Array.isArray(r.times)) return { on: !!r.on, times: r.times };
  } catch (e) {}
  return { on: false, times: ['19:30'] };
};
export const setReminders = (r) => {
  const times = [...new Set(r.times.filter((t) => /^\d{2}:\d{2}$/.test(t)))].sort();
  try { localStorage.setItem(KEY, JSON.stringify({ on: !!r.on, times })); } catch (e) {}
  return { on: !!r.on, times };
};

const native = () => Capacitor.isNativePlatform();

// Vraagt toestemming als dat nog niet gegeven is. Geeft true terug als meldingen mogen.
export async function ensurePermission() {
  if (!native()) return true;
  let p = await LocalNotifications.checkPermissions();
  if (p.display !== 'granted') p = await LocalNotifications.requestPermissions();
  return p.display === 'granted';
}

// Plant alles opnieuw. remainingToday: aantal spellen dat je vandaag nog niet speelde.
// totalGames: aantal spellen in je lijst (voor de tekst van komende dagen).
export async function reschedule({ remainingToday, totalGames }) {
  const r = getReminders();
  const plan = [];
  if (r.on && r.times.length) {
    const now = new Date();
    for (let d = 0; d < DAYS_AHEAD; d++) {
      if (d === 0 && remainingToday === 0) continue; // vandaag alles gespeeld: overslaan
      r.times.forEach((t, i) => {
        const [h, m] = t.split(':').map(Number);
        const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, h, m, 0, 0);
        if (at <= now) return;
        const left = d === 0 ? remainingToday : totalGames;
        plan.push({
          id: ID_BASE + d * 20 + i,
          title: 'Tijd voor je spelletjes',
          body: left === 1 ? 'Je hebt er vandaag nog 1 te gaan.' : `Je hebt er vandaag nog ${left} te gaan.`,
          schedule: { at, allowWhileIdle: true },
          smallIcon: 'ic_stat_quickplay',
          iconColor: '#3B1760'
        });
      });
    }
  }
  if (!native()) return plan; // voorbeeldversie: alleen tonen wat er gepland zou worden
  try {
    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications.filter((n) => n.id >= ID_BASE && n.id < ID_BASE + DAYS_AHEAD * 20);
    if (ours.length) await LocalNotifications.cancel({ notifications: ours.map((n) => ({ id: n.id })) });
    if (plan.length) {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display === 'granted') await LocalNotifications.schedule({ notifications: plan });
    }
  } catch (e) { /* meldingen niet beschikbaar */ }
  return plan;
}
