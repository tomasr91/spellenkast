// Gegevens over bekende spellen, opgehaald van de sites zelf (titel, uitleg, preview-afbeelding).
// Sleutel = hostnaam. Spellen die je zelf toevoegt zonder vermelding hier krijgen een pixel-cover.

export const CATALOG = {
  'farflung.game': {
    name: 'Farflung',
    blurb: 'Dagelijkse kaartquiz. Prik voor elk van vijf opdrachten een land op de wereldkaart; hoe zeldzamer je keuze, hoe verder je reist.',
    short: 'Prik landen op de kaart. Zeldzaam reist verder.',
    genres: ['Geografie', 'Dagelijks'],
    facts: ['5 opdrachten', 'Elke dag nieuw'],
    image: 'https://farflung.game/share.png',
    accent: '#3dffa0'
  },
  'krillion.io': {
    name: 'Krillion',
    blurb: 'Elke dag zeven opdrachten, voor iedereen gelijk. Bedenk antwoorden waar bijna niemand op komt en duik zo diep mogelijk.',
    short: 'Origineel antwoorden = dieper duiken.',
    genres: ['Woorden', 'Dagelijks', 'Party'],
    facts: ['7 opdrachten', 'Ook Unlimited & Party'],
    image: 'https://krillion.io/og.png',
    accent: '#2ee8d8'
  },
  'crowdict.com': {
    name: 'Crowdict',
    blurb: 'Tien vragen, 30 seconden per antwoord. Raad wat de massa zegt, of kies Rare en zoek het antwoord dat bijna niemand geeft.',
    short: 'Raad wat de massa zegt — of juist niet.',
    genres: ['Trivia', 'Dagelijks', 'Party'],
    facts: ['10 vragen', '30 sec per antwoord'],
    image: 'https://crowdict.com/images/edition/og-home.png',
    accent: '#ff8f3d'
  }
};

export const hostOf = (u) => {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return String(u); }
};

export const metaFor = (game) => CATALOG[hostOf(game.url)] || null;
