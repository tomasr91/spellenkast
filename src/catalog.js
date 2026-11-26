// De preview-afbeelding die elke site zelf publiceert (og:image), op de eigen themakleur van de site.
// Sleutel = hostnaam. fit: 'cover' voor brede preview-banners, 'contain' voor een vierkant app-icoon.

export const CATALOG = {
  'farflung.game': { image: 'https://farflung.game/share.png', fit: 'cover', bg: '#f4e9cd' },
  'krillion.io': { image: 'https://krillion.io/og.png', fit: 'cover', bg: '#050a14' },
  'crowdict.com': { image: 'https://crowdict.com/images/edition/og-home.png', fit: 'cover', bg: '#0e1330' },
  'chainle.io': { image: 'https://chainle.io/icon-512.png', fit: 'contain', bg: '#f7f8f6' }
};

export const hostOf = (u) => {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return String(u); }
};

export const metaFor = (game) => CATALOG[hostOf(game.url)] || null;

// Voor zelf toegevoegde spellen: het eigen icoon van de site (via de favicon-dienst van Google).
export const faviconFor = (game) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostOf(game.url))}&sz=128`;
