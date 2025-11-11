// import { getImageSource } from "./getImageSource";
import { convertImageToBase64, convertImageNoEdit } from "@/app/actions/imageConvert";

// Helper function to detect Safari browser
const isSafari = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const isSafariBrowser = /^((?!chrome|android).)*safari/i.test(ua);
  return isSafariBrowser;
};

// Helper function to convert blob URL or remote URL to base64 on client side
async function urlToBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      
      // Convert to PNG to preserve quality for server processing
      const base64 = canvas.toDataURL('image/png');
      resolve(base64);
    };
    
    img.onerror = (err) => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

export const processImage = async (localBlobUrl: string, imageSource: string): Promise<string> => {
  const usePNG = isSafari();
  const imageFormat = usePNG ? 'png' : 'webp';
  const imageQuality = usePNG ? 92 : 80;
  
  // Check if the URL should be skipped
  if (imageSource === 'cravingsbucket' || localBlobUrl.includes('cravingsbucket')) {
    return localBlobUrl;
  }

  try {
    // Convert blob URL or remote URL to base64 first (client-side)
    const base64Image = await urlToBase64(localBlobUrl);
    
    // Use server-side conversion for better performance and quality
    if (imageSource === "no-edit" && !localBlobUrl.includes('cravingsbucket')) {
      // No cropping, just format conversion
      return await convertImageNoEdit(base64Image, imageFormat, imageQuality);
    }
    
    // With cropping and processing
    return await convertImageToBase64(base64Image, {
      targetSize: 500,
      quality: imageQuality,
      format: imageFormat,
      shouldCrop: true,
    });
  } catch (error) {
    console.error('Server-side conversion failed, falling back to client-side:', error);
    
    // Fallback to client-side processing if server-side fails
    return await processImageClientSide(localBlobUrl, imageSource, imageFormat, imageQuality);
  }
};

// Fallback client-side processing function
async function processImageClientSide(
  localBlobUrl: string,
  imageSource: string,
  imageFormat: 'png' | 'webp',
  imageQuality: number
): Promise<string> {
  const mimeType = imageFormat === 'png' ? 'image/png' : 'image/webp';
  const quality = imageQuality / 100; // Convert to 0-1 range for canvas
  
  if(imageSource === "no-edit" && !localBlobUrl.includes('cravingsbucket')) {
    // return base64 version of the image without any processing
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = localBlobUrl;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = (err) => {
        console.error('Failed to load image from URL:', localBlobUrl, err);
        reject(new Error('Failed to load image'));
      };
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0, img.width, img.height);

    const base64Image = canvas.toDataURL(mimeType, quality);
    return base64Image;
  }

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
  const targetSize = 500;

  // If the image is larger than 500x500 in either dimension, perform a center crop
  if (originalWidth > targetSize || originalHeight > targetSize) {
    canvas.width = targetSize;
    canvas.height = targetSize;

    // Calculate the top-left corner for a center crop
    const sourceX = (originalWidth - targetSize) / 2;
    const sourceY = (originalHeight - targetSize) / 2;

    // Draw the cropped section of the image onto the canvas
    ctx.drawImage(
      img,
      sourceX, sourceY,
      targetSize, targetSize,
      0, 0,
      targetSize, targetSize
    );
  } else {
    // If the image is already 500x500 or smaller, just draw it as-is
    canvas.width = originalWidth;
    canvas.height = originalHeight;
    ctx.drawImage(img, 0, 0, originalWidth, originalHeight);
  }

  // Convert the canvas content to PNG (for Safari) or WebP (for other browsers)
  const base64Image = canvas.toDataURL(mimeType, quality);

  return base64Image;
}