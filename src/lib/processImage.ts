import { getImageSource } from "./getImageSource";

export const processImage = async (localBlobUrl: string, imageSource: string): Promise<string> => {
  // Check if the URL should be skipped (no changes here)
  if (imageSource === 'cravingsbucket' || localBlobUrl.includes('cravingsbucket')) {
    return localBlobUrl;
  }

  // Create an image element to load the image
  const img = new Image();
  // CORS is needed if the blob URL might point to a resource from another origin
  img.crossOrigin = "Anonymous"; 
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
  const targetSize = 500;

  // --- NEW LOGIC ---
  // If the image is larger than 500x500 in either dimension, perform a center crop.
  if (originalWidth > targetSize || originalHeight > targetSize) {
    canvas.width = targetSize;
    canvas.height = targetSize;

    // Calculate the top-left corner for a center crop
    // This ensures we cut out a 500x500 square from the middle of the source image.
    const sourceX = (originalWidth - targetSize) / 2;
    const sourceY = (originalHeight - targetSize) / 2;

    // Draw the cropped section of the image onto the canvas
    ctx.drawImage(
      img,
      sourceX, sourceY,   // Top-left corner of the source image slice
      targetSize, targetSize, // Dimensions of the slice from the source
      0, 0,               // Top-left corner of the destination on the canvas
      targetSize, targetSize  // Dimensions of the drawn image on the canvas
    );
  }
  // If the image is already 500x500 or smaller, just draw it as-is.
  else {
    canvas.width = originalWidth;
    canvas.height = originalHeight;
    ctx.drawImage(img, 0, 0, originalWidth, originalHeight);
  }

  // Convert the canvas content to a WebP base64 string
  const webpBase64 = canvas.toDataURL('image/webp', 0.8);

  return webpBase64;
};