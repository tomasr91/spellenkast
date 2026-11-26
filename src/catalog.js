// Eigen identiteit per bekend spel: kleur en pixel-illustratie. Sleutel = hostnaam.
// Spellen die je zelf toevoegt krijgen een joystick in een kleur afgeleid van de naam.

export const CATALOG = {
  'farflung.game': { name: 'Farflung', icon: 'globe', bg: '#0f4f5c', bg2: '#16707f', fg: '#eafcff' },
  'krillion.io': { name: 'Krillion', icon: 'krill', bg: '#18225e', bg2: '#2b3f9e', fg: '#eef1ff' },
  'crowdict.com': { name: 'Crowdict', icon: 'crowd', bg: '#ef7a3c', bg2: '#ff9a5c', fg: '#2a1206' },
  'chainle.io': { name: 'Chainle', icon: 'chain', bg: '#2c6a4c', bg2: '#3f8f66', fg: '#f2fff7' }
};

export const hostOf = (u) => {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return String(u); }
};

export const metaFor = (game) => CATALOG[hostOf(game.url)] || null;

// Pixel-art, 16x16. Elk teken is een kleur uit het palet; '.' is leeg.
export const ICONS = {
  globe: {
    pal: { o: '#4cc2ff', O: '#2f8fd6', g: '#7ee08a', G: '#4fb86a', r: '#ff4d5e', w: '#ffffff', k: '#3a1d2a' },
    rows: [
      '................',
      '..........rrr...',
      '.........rrwrr..',
      '.....ooooorrrr..',
      '...oooggooorr...',
      '..oogggggoook...',
      '..ogggggoooko...',
      '.ooggggooooggoo.',
      '.oooggooooggggO.',
      '.ooooggoooGgggO.',
      '.oooooooooGggOO.',
      '..ooogggoooOOO..',
      '..oooggggooOOO..',
      '...ooogggoOO....',
      '.....OOOOOO.....',
      '................'
    ]
  },
  krill: {
    pal: { p: '#ff8a7a', P: '#e2585a', w: '#ffffff', k: '#1a0f2e', a: '#ffc2b5', b: '#9fd8ff', l: '#ffb09f' },
    rows: [
      '.............b..',
      '...........b....',
      '..............b.',
      '.a..............',
      '..a......b......',
      '...a............',
      '....ppppp.......',
      '...pwkppppppp...',
      '...pppppppppppp.',
      '....pPpPpPppppp.',
      '.....PpPpPpppPpp',
      '......l.l.l..Pp.',
      '......l.l.l...P.',
      '................',
      '..........b.....',
      '.....b..........'
    ]
  },
  crowd: {
    pal: { w: '#fff6e8', k: '#2a1206', A: '#ffd23d', a: '#c98d00', B: '#7b4dff', b: '#4d2bc2', C: '#2ee8d8', c: '#13a397' },
    rows: [
      '....wwwwwwww....',
      '...wwwkkkwwww...',
      '...wwwwwwkwww...',
      '...wwwwwkkwww...',
      '...wwwwwkwwww...',
      '....wwwwwwww....',
      '......ww........',
      '.......BB.......',
      '..AA..BBBB..CC..',
      '.AAAA.BBBB.CCCC.',
      '.AAAA..BB..CCCC.',
      '..AA..bbbb..CC..',
      '.aaaabbbbbbcccc.',
      'aaaaaabbbbcccccc',
      'aaaaaabbbbcccccc',
      'aaaaaabbbbcccccc'
    ]
  },
  chain: {
    pal: { s: '#dfe6ee', w: '#ffffff', S: '#9fb0c2', W: '#c9d6e3' },
    rows: [
      '................',
      '................',
      '.wwwwwwww.......',
      'ssssssssss......',
      'ss......ss......',
      'ss.....WssWWWWW.',
      'ss....SSssSSSSSS',
      'ss....SSss....SS',
      'ssssssSSss....SS',
      '.sssssSSs.....SS',
      '......SS......SS',
      '......SSSSSSSSSS',
      '.......SSSSSSSS.',
      '................',
      '................',
      '................'
    ]
  },
  joystick: {
    pal: { r: '#ff4d5e', w: '#ffffff', s: '#c9c3e0', x: 'var(--acc)', X: 'var(--acc2)', g: '#3dffa0', t: '#2ee8d8' },
    rows: [
      '................',
      '......rrrr......',
      '.....rrwwrr.....',
      '.....rrwrrr.....',
      '.....rrrrrr.....',
      '......rrrr......',
      '.......ss.......',
      '.......ss.......',
      '.......ss.......',
      '.......ss.......',
      '..xxxxxxxxxxxx..',
      '.xxggxxxxxxttxx.',
      '.xxggxxxxxxttxx.',
      '.XXXXXXXXXXXXXX.',
      '..XXXXXXXXXXXX..',
      '................'
    ]
  }
};

export const pixelSvg = (name) => {
  const icon = ICONS[name] || ICONS.joystick;
  let out = '';
  icon.rows.forEach((row, y) => {
    for (let x = 0; x < 16; x++) {
      const c = row[x];
      if (c && c !== '.' && icon.pal[c]) out += `<rect x="${x}" y="${y}" width="1" height="1" style="fill:${icon.pal[c]}"/>`;
    }
  });
  return `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${out}</svg>`;
};
