// shortcut: Artwork covers these known titles; expand the catalogue when community inventory grows.
const artwork: [string, string[]][] = [
  [
    '/images/catalog/zelda.webp',
    [
      'The Legend of Zelda: Tears of the Kingdom',
      'Zelda: Tears of the Kingdom',
      'Tears of the Kingdom',
    ],
  ],
  ['/images/catalog/god-of-war.webp', ['God of War Ragnarok']],
  ['/images/catalog/forza.webp', ['Forza Horizon 5']],
  ['/images/catalog/elden-ring.webp', ['Elden Ring']],
  ['/images/catalog/animal-crossing.webp', ['Animal Crossing: New Horizons']],
  ['/images/catalog/spider-man.webp', ['Marvel’s Spider-Man 2', 'Spider-Man 2']],
  ['/images/games/witcher-thumb.webp', ['The Witcher 3', 'The Witcher 3: Wild Hunt', 'Witcher 3']],
  ['/images/games/rdr2-thumb.webp', ['Red Dead Redemption 2', 'Red Dead Redemption II', 'RDR2']],
  ['/images/games/last-of-us-thumb.webp', ['The Last of Us Part I', 'The Last of Us Part 1']],
  ['/images/games/gta5-thumb.webp', ['Grand Theft Auto V', 'Grand Theft Auto 5', 'GTA 5', 'GTA V']],
  [
    '/images/games/gta6-thumb.webp',
    ['Grand Theft Auto VI', 'Grand Theft Auto 6', 'GTA 6', 'GTA VI'],
  ],
  ['/images/games/days-gone-thumb.webp', ['Days Gone']],
];
function normalise(title: string) {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
export function gameArtwork(title: string, description = ''): string | null {
  const key = normalise(title);
  if (key === 'thelegendofzelda' && normalise(description).startsWith('tearsofthekingdom'))
    return '/images/catalog/zelda.webp';
  return artwork.find(([, titles]) => titles.some((name) => normalise(name) === key))?.[0] ?? null;
}
export const platformBanners: Record<string, string> = {
  PlayStation: '/images/catalog/god-of-war-banner.webp',
  Xbox: '/images/catalog/forza-banner.webp',
  Nintendo: '/images/catalog/zelda-banner.webp',
};
