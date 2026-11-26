// Eigen illustratie per bekend spel (origineel getekend, passend bij het spel). Sleutel = hostnaam.
// Zelf toegevoegde spellen tonen het icoon van hun eigen site.

const O = '#0f1226'; // contourkleur, voor alle illustraties gelijk

const ART = {
  // Farflung: kaartquiz — wereldbol met een kaartspeld
  farflung: `
    <defs><clipPath id="ff-c"><circle cx="29" cy="37" r="19"/></clipPath></defs>
    <circle cx="29" cy="37" r="19" fill="#4cc2ff"/>
    <g clip-path="url(#ff-c)" fill="#7ee08a">
      <path d="M12 30c3-8 13-9 17-5s0 9-5 10-14 3-12-5z"/>
      <path d="M33 39c5-3 13-1 14 4s-5 10-11 9-8-10-3-13z"/>
      <path d="M17 47c3-1 7 1 7 4s-4 4-7 3-3-6 0-7z"/>
      <path d="M10 37h38v20H10z" fill="#000" opacity=".12"/>
    </g>
    <circle cx="29" cy="37" r="19" fill="none" stroke="${O}" stroke-width="2.5"/>
    <path d="M18 27a14 14 0 0 1 8-6" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>
    <path d="M47 6a9 9 0 0 1 9 9c0 7-9 16-9 16s-9-9-9-16a9 9 0 0 1 9-9z" fill="#ff4d5e" stroke="${O}" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="47" cy="15" r="3.2" fill="#fff"/>`,

  // Krillion: de diepe duik — een vrolijk garnaaltje met luchtbellen
  krillion: `
    <g fill="none" stroke="#e2585a" stroke-width="2" stroke-linecap="round">
      <path d="M15 25C10 18 7 13 4 8"/><path d="M18 22C16 15 15 11 14 5"/>
    </g>
    <g stroke="${O}" stroke-width="2" stroke-linecap="round">
      <path d="M26 35l-2 6M33 36l-1 6M40 38l0 6"/>
    </g>
    <path d="M50 42l9 4-6 6-6-5z" fill="#ff9e8f" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>
    <g fill="#ff8a7a" stroke="${O}" stroke-width="2">
      <ellipse cx="48" cy="39" rx="5.5" ry="5"/>
      <ellipse cx="42" cy="34" rx="6.5" ry="6"/>
      <ellipse cx="35" cy="30" rx="7.5" ry="7"/>
      <ellipse cx="27" cy="28" rx="8" ry="7.5"/>
      <ellipse cx="19" cy="28" rx="9" ry="8.5"/>
    </g>
    <path d="M13 32c3 2 7 2 10 0" fill="none" stroke="#e2585a" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="17" cy="25" r="3.6" fill="#fff" stroke="${O}" stroke-width="1.6"/>
    <circle cx="16.2" cy="25.4" r="1.8" fill="${O}"/>
    <g fill="none" stroke="#9fd8ff" stroke-width="1.8">
      <circle cx="49" cy="13" r="3.4"/><circle cx="56" cy="22" r="2.2"/><circle cx="42" cy="7" r="1.6"/>
    </g>`,

  // Crowdict: wat zegt de massa? — een groepje met een vraag-ballon
  crowdict: `
    <path d="M30 4h22a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6H42l-5 5v-5h-7a6 6 0 0 1-6-6V10a6 6 0 0 1 6-6z" fill="#fff6e8" stroke="${O}" stroke-width="2.2" stroke-linejoin="round"/>
    <text x="41" y="21.5" text-anchor="middle" font-family="Rubik,sans-serif" font-weight="700" font-size="15" fill="${O}">?</text>
    <g stroke="${O}" stroke-width="2.2" stroke-linejoin="round">
      <path d="M3 60c0-9 5-14 11-14s11 5 11 14z" fill="#ffd23d"/>
      <circle cx="14" cy="39" r="6.5" fill="#ffd23d"/>
      <path d="M39 60c0-9 5-14 11-14s11 5 11 14z" fill="#2ee8d8"/>
      <circle cx="50" cy="39" r="6.5" fill="#2ee8d8"/>
      <path d="M19 61c0-11 6-17 13-17s13 6 13 17z" fill="#8a63ff"/>
      <circle cx="32" cy="35" r="8" fill="#8a63ff"/>
    </g>
    <g fill="${O}"><circle cx="29.5" cy="35" r="1.3"/><circle cx="34.5" cy="35" r="1.3"/></g>`,

  // Chainle: de woordketting — twee in elkaar gehaakte schakels
  chainle: `
    <defs>
      <linearGradient id="ch-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1f5f9"/><stop offset="1" stop-color="#a9b8c8"/></linearGradient>
      <clipPath id="ch-k"><rect x="25" y="17" width="16" height="13"/></clipPath>
    </defs>
    <g transform="rotate(-30 32 32)">
      <rect x="6" y="24" width="30" height="16" rx="8" fill="none" stroke="${O}" stroke-width="9"/>
      <rect x="6" y="24" width="30" height="16" rx="8" fill="none" stroke="url(#ch-g)" stroke-width="5"/>
      <rect x="28" y="24" width="30" height="16" rx="8" fill="none" stroke="${O}" stroke-width="9"/>
      <rect x="28" y="24" width="30" height="16" rx="8" fill="none" stroke="url(#ch-g)" stroke-width="5"/>
      <g clip-path="url(#ch-k)">
        <rect x="6" y="24" width="30" height="16" rx="8" fill="none" stroke="${O}" stroke-width="9"/>
        <rect x="6" y="24" width="30" height="16" rx="8" fill="none" stroke="url(#ch-g)" stroke-width="5"/>
      </g>
    </g>`
};

export const CATALOG = {
  'farflung.game': { art: 'farflung', tint: '#4cc2ff' },
  'krillion.io': { art: 'krillion', tint: '#ff8a7a' },
  'crowdict.com': { art: 'crowdict', tint: '#8a63ff' },
  'chainle.io': { art: 'chainle', tint: '#c9d6e3' }
};

export const hostOf = (u) => {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return String(u); }
};

export const metaFor = (game) => CATALOG[hostOf(game.url)] || null;

export const artSvg = (key) => `<svg viewBox="0 0 64 64" aria-hidden="true">${ART[key] || ''}</svg>`;

// Voor zelf toegevoegde spellen: het eigen icoon van de site (via de favicon-dienst van Google).
export const faviconFor = (game) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostOf(game.url))}&sz=128`;
