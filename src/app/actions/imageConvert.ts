"use server";

import sharp from "sharp";

interface ImageConvertOptions {
  targetSize?: number;
  quality?: number;
  format?: 'webp' | 'png';
  shouldCrop?: boolean;
}

/**
 * Convert image data (base64 or buffer) to optimized base64 format
 * @param imageData - Base64 string (with or without data URI prefix) or Buffer
 * @param options - Conversion options
 */
export async function convertImageToBase64(
  imageData: string | Buffer,
  options: ImageConvertOptions = {}
): Promise<string> {

    console.log('Starting image conversion with options:', options);

  const {
    targetSize = 500,
    quality = 80,
    format = 'webp',
    shouldCrop = true,
  } = options;

  try {
    let buffer: Buffer;

    // Convert input to Buffer
    if (typeof imageData === 'string') {
      // Remove data URI prefix if present (data:image/...;base64,)
      const base64Data = imageData.includes('base64,')
        ? imageData.split('base64,')[1]
        : imageData;
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      buffer = imageData;
    }

    // Load image with sharp
    let image = sharp(buffer);
    const metadata = await image.metadata();

    const originalWidth = metadata.width || 0;
    const originalHeight = metadata.height || 0;

    // Process image based on size
    if (shouldCrop && (originalWidth > targetSize || originalHeight > targetSize)) {
      // Center crop to targetSize x targetSize
      const sourceX = Math.max(0, Math.floor((originalWidth - targetSize) / 2));
      const sourceY = Math.max(0, Math.floor((originalHeight - targetSize) / 2));

      image = image.extract({
        left: sourceX,
        top: sourceY,
        width: Math.min(targetSize, originalWidth),
        height: Math.min(targetSize, originalHeight),
      });
    } else if (!shouldCrop) {
      // Just resize maintaining aspect ratio
      image = image.resize(targetSize, targetSize, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert to specified format
    let processedBuffer: Buffer;
    if (format === 'png') {
      processedBuffer = await image
        .png({ quality: Math.round(quality) })
        .toBuffer();
    } else {
      processedBuffer = await image
        .webp({ quality: Math.round(quality) })
        .toBuffer();
    }

    // Convert to base64
    const base64 = processedBuffer.toString('base64');
    const mimeType = format === 'png' ? 'image/png' : 'image/webp';
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Error converting image:', error);
    throw new Error(`Image conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert image without cropping, just format conversion
 * @param imageData - Base64 string (with or without data URI prefix) or Buffer
 * @param format - Output format (webp or png)
 * @param quality - Output quality (1-100)
 */
export async function convertImageNoEdit(
  imageData: string | Buffer,
  format: 'webp' | 'png' = 'webp',
  quality: number = 80
): Promise<string> {    

  return convertImageToBase64(imageData, {
    shouldCrop: false,
    format,
    quality,
  });
}