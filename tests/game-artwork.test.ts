import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gameArtwork, platformBanners } from '../src/lib/game-artwork';

describe('game artwork', () => {
  it('matches punctuation and accents without mixing games or editions', () => {
    expect(gameArtwork('God of War Ragnarök')).toBe('/images/catalog/god-of-war.webp');
    expect(gameArtwork("Marvel's Spider-Man 2")).toBe('/images/catalog/spider-man.webp');
    expect(gameArtwork(' GTA V ')).toBe('/images/games/gta5-thumb.webp');
    expect(gameArtwork('Elden Ring Nightreign')).toBeNull();
    expect(gameArtwork('Returnal pilot test')).toBeNull();
    expect(gameArtwork('The Legend of Zelda')).toBeNull();
    expect(gameArtwork('The Legend of Zelda', 'Tears of the Kingdom. Original copy.')).toBe(
      '/images/catalog/zelda.webp',
    );
    expect(gameArtwork('The Legend of Zelda', 'Breath of the Wild.')).toBeNull();
  });
  it('ships every referenced image locally with source records for scraped assets', () => {
    for (const title of [
      'The Legend of Zelda: Tears of the Kingdom',
      'God of War Ragnarok',
      'Forza Horizon 5',
      'Elden Ring',
      'Animal Crossing: New Horizons',
      'Spider-Man 2',
      'Witcher 3',
      'RDR2',
      'The Last of Us Part I',
      'GTA V',
      'GTA VI',
      'Days Gone',
    ]) {
      const image = gameArtwork(title);
      expect(image).not.toBeNull();
      expect(existsSync(join(process.cwd(), 'public', image!))).toBe(true);
    }
    for (const path of Object.values(platformBanners))
      expect(existsSync(join(process.cwd(), 'public', path))).toBe(true);
    const sources = JSON.parse(readFileSync('public/images/catalog/sources.json', 'utf8'));
    expect(sources).toHaveLength(6);
    for (const source of sources) {
      expect(source.source).toMatch(/^https:\/\//);
      expect(source.page).toMatch(/^https:\/\//);
      expect(existsSync(`public/images/catalog/${source.file}`)).toBe(true);
    }
  });
});
