// De preview-afbeelding die elke site zelf publiceert (og:image), op de eigen themakleur van de site.
// Sleutel = hostnaam. fit: 'cover' voor brede preview-banners, 'contain' voor een vierkant app-icoon.

export const CATALOG = {
  'farflung.game': { image: 'https://farflung.game/share.png', fit: 'cover', bg: '#f4e9cd', max: 500 },
  'krillion.io': { image: 'https://krillion.io/og.png', fit: 'cover', bg: '#050a14', max: 700 },
  'chainle.io': { image: 'https://chainle.io/icon-512.png', fit: 'contain', bg: '#f7f8f6', max: 5000 },
  'guessdash.com/extraplot': { image: 'https://guessdash.com/social/games/extraplot.png', fit: 'cover', bg: '#fff8e8', max: 5000 }
};

export const hostOf = (u) => {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return String(u); }
};

// Eerst host + eerste pad-deel (voor sites met meerdere spellen, zoals GuessDash), dan alleen de host.
export const metaFor = (game) => {
  let path = '';
  try { path = new URL(game.url).pathname.split('/')[1] || ''; } catch (e) {}
  const host = hostOf(game.url);
  return CATALOG[host + '/' + path] || CATALOG[host] || null;
};

// Voor zelf toegevoegde spellen: het eigen icoon van de site (via de favicon-dienst van Google).
export const faviconFor = (game) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostOf(game.url))}&sz=128`;
