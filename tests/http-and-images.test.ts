import { afterEach, describe, it, expect, vi } from 'vitest';
import sharp from 'sharp';
import { localDemo, sameOrigin, readBody, demoMode } from '../src/lib/server';
import { sanitiseImage } from '../src/lib/images';
afterEach(() => vi.unstubAllEnvs());
describe('HTTP boundaries', () => {
  it('accepts loopback Next proxy headers in explicit local demo mode', () => {
    vi.stubEnv('GAMAZON_DEMO', 'true');
    const r = new Request('http://localhost:3000/api/v1/command', {
      headers: { origin: 'http://127.0.0.1:3000', 'x-forwarded-for': '127.0.0.1' },
    });
    expect(() => sameOrigin(r)).not.toThrow();
  });
  it('rejects external origins and remote access to the demo', () => {
    vi.stubEnv('GAMAZON_DEMO', 'true');
    expect(() =>
      sameOrigin(
        new Request('http://localhost:3000/api', {
          headers: { origin: 'https://attacker.example' },
        }),
      ),
    ).toThrow('origin');
    expect(() =>
      localDemo(
        new Request('http://localhost:3000/api', { headers: { 'x-forwarded-for': '192.0.2.1' } }),
      ),
    ).toThrow('local only');
  });
  it('uses the configured live origin and rejects missing origin headers', () => {
    vi.stubEnv('GAMAZON_DEMO', 'false');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://community.example');
    expect(() =>
      sameOrigin(
        new Request('http://internal/api', { headers: { origin: 'https://community.example' } }),
      ),
    ).not.toThrow();
    expect(() => sameOrigin(new Request('http://internal/api'))).toThrow('origin');
  });
  it('does not auto-enable demo outside development', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('GAMAZON_DEMO', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    expect(demoMode()).toBe(false);
  });
  it('bounds streaming bodies even without a Content-Length header', async () => {
    const r = new Request('http://localhost/', { method: 'POST', body: 'x'.repeat(100) });
    await expect(readBody(r, 50)).rejects.toThrow('too large');
    const bytes = await readBody(
      new Request('http://localhost/', { method: 'POST', body: 'hello' }),
      50,
    );
    expect(new TextDecoder().decode(bytes)).toBe('hello');
  });
});
describe('private photo sanitisation', () => {
  it('strips metadata and bounds output dimensions', async () => {
    const input = await sharp({
      create: { width: 1800, height: 1000, channels: 3, background: '#447755' },
    })
      .withMetadata({
        exif: { IFD0: { Artist: 'Private identity', ImageDescription: 'Sensitive location' } },
      })
      .jpeg()
      .toBuffer();
    expect((await sharp(input).metadata()).exif).toBeDefined();
    const output = await sanitiseImage(input);
    const metadata = await sharp(output).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBe(1400);
    expect(metadata.exif).toBeUndefined();
    expect(metadata.xmp).toBeUndefined();
  });
  it('rejects corrupt input and SVGs disguised as accepted MIME types', async () => {
    await expect(sanitiseImage(Buffer.from('not an image'))).rejects.toThrow('valid');
    await expect(
      sanitiseImage(
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>'),
      ),
    ).rejects.toThrow('valid');
  });
  it('rejects oversized inputs before decoding', async () => {
    await expect(sanitiseImage(Buffer.alloc(5 * 1024 * 1024 + 1))).rejects.toThrow('under 5 MB');
  });
});
