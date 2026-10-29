import sharp from 'sharp';
import { DomainError } from './domain';

export async function sanitiseImage(input: Buffer): Promise<Buffer> {
  if (input.byteLength > 5 * 1024 * 1024) throw new DomainError('Image must be under 5 MB.', 413);
  try {
    const processor = sharp(input, { limitInputPixels: 25000000 });
    const metadata = await processor.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format || ''))
      throw new Error('Unsupported format');
    // Sharp drops EXIF, GPS, XMP and other metadata unless preservation is requested.
    return await processor
      .rotate()
      .resize(1400, 1400, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new DomainError('Choose a valid JPG, PNG, or WebP image under 25 megapixels.', 400);
  }
}
