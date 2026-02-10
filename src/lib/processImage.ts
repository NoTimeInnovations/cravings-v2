// Helper function to detect Safari browser
const isSafari = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const isSafariBrowser = /^((?!chrome|android).)*safari/i.test(ua);
  return isSafariBrowser;
};

export const processImage = async (localBlobUrl: string, imageSource: string): Promise<string> => {
  const usePNG = isSafari();
  const imageFormat = usePNG ? 'png' : 'webp';
  const imageQuality = usePNG ? 92 : 80;

  /* Check if the URL should be skipped (already S3) */
  const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET || 'cravingsbucket';
  if (
    imageSource === bucketName ||
    localBlobUrl.includes(bucketName) ||
    localBlobUrl.includes('amazonaws.com') ||
    localBlobUrl.includes('r2.dev')
  ) {
    return localBlobUrl;
  }

  try {
    return await processImageClientSide(localBlobUrl, imageSource, imageFormat, imageQuality);
  } catch (error) {
    console.error('Client-side processing failed:', error);
    throw error;
  }
};

// Client-side processing function
async function processImageClientSide(
  localBlobUrl: string,
  imageSource: string,
  imageFormat: 'png' | 'webp',
  imageQuality: number
): Promise<string> {
  const mimeType = imageFormat === 'png' ? 'image/png' : 'image/webp';
  const quality = imageQuality / 100; // Convert to 0-1 range for canvas
  const TARGET_SIZE = 800; // Increased from 500 for better quality on modern screens

  // Create an image element to load the image
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = localBlobUrl;

  // Wait for the image to load
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = (err) => {
      console.error('Failed to load image from URL:', localBlobUrl, err);
      reject(new Error('Failed to load image'));
    };
  });

  // Create a canvas for image processing
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  const originalWidth = img.width;
  const originalHeight = img.height;

  if (imageSource === "no-edit") {
    // Resize maintaining aspect ratio (fit inside TARGET_SIZE)
    let width = originalWidth;
    let height = originalHeight;

    if (width > TARGET_SIZE || height > TARGET_SIZE) {
      const ratio = Math.min(TARGET_SIZE / width, TARGET_SIZE / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);

  } else {
    // Default: Center Crop to Square (TARGET_SIZE x TARGET_SIZE)
    // If the image is larger than TARGET_SIZE in either dimension, perform a center crop
    // If smaller, we essentially upscale or keep it? Original logic was:
    // if (originalWidth > targetSize || originalHeight > targetSize) crop...
    // else draw original.

    // Let's stick to the crop logic but use TARGET_SIZE
    let drawWidth = originalWidth;
    let drawHeight = originalHeight;
    let startX = 0;
    let startY = 0;

    // We want a square result? 
    // The original code tried to output 500x500 square if cropping.
    const isLandscape = originalWidth > originalHeight;
    const minDim = Math.min(originalWidth, originalHeight);

    // We want to crop a square from the center
    // And then resize that square to TARGET_SIZE? 
    // Or just crop the square?
    // Original code:
    // if (originalWidth > targetSize || originalHeight > targetSize) {
    //   canvas.width = targetSize; canvas.height = targetSize;
    //   // ... calculate sourceX ...
    //   ctx.drawImage(img, sourceX, sourceY, targetSize, targetSize, 0, 0, targetSize, targetSize);
    // }
    // This logic actually crops a 500x500 chunk from the center. It DOES NOT resize the whole image to 500x500.
    // That means if I have a 4000x3000 image, I get a tiny 500x500 pixel center cutout. 
    // That seems wrong for a "menu item" if the subject isn't perfectly centered and small.
    // usually "crop" implies "resize to cover 500x500".

    // Let's improve the crop logic: "Cover" crop.

    canvas.width = TARGET_SIZE;
    canvas.height = TARGET_SIZE;

    // Calculate scaling to cover the target size
    // We want the smallest dimension to fit the target size
    const scale = Math.max(TARGET_SIZE / originalWidth, TARGET_SIZE / originalHeight);

    // If image is smaller than target, we might upscale (scale > 1)
    // If image is larger, we downscale (scale < 1)

    const scaledWidth = originalWidth * scale;
    const scaledHeight = originalHeight * scale;

    const offsetX = (TARGET_SIZE - scaledWidth) / 2;
    const offsetY = (TARGET_SIZE - scaledHeight) / 2;

    ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
  }

  // Convert the canvas content to PNG (for Safari) or WebP (for other browsers)
  const base64Image = canvas.toDataURL(mimeType, quality);

  return base64Image;
}