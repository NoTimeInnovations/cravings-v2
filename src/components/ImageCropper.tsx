"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Assuming these are custom components you have defined elsewhere
// import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
// import { Label } from "@/components/ui/label";

interface ImageCropperProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onCropComplete: (croppedImageUrl: string, cropType: string) => void;
}

/**
 * Creates a default centered crop area.
 * @param mediaWidth - The width of the image element on the screen.
 * @param mediaHeight - The height of the image element on the screen.
 * @returns A Crop object for a default rectangular crop.
 */
function centerFreeCrop(
  mediaWidth: number,
  mediaHeight: number,
): Crop {
  return {
    unit: '%',
    x: 5,
    y: 10,
    width: 90,
    height: 50,
  };
}

export default function ImageCropper({ isOpen, onClose, imageUrl, onCropComplete }: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cropMode, setCropMode] = useState<'free' | 'circle'>('free');
  const imgRef = useRef<HTMLImageElement>(null);

  /**
   * This function is called when the image is loaded into the cropper.
   * It sets an initial crop area based on the selected crop mode.
   */
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    if (cropMode === 'circle') {
      const size = Math.max(width, height);
      setCrop({
        unit: 'px',
        x: (width - size) / 2,
        y: (height - size) / 2,
        width: size,
        height: size,
      });
    } else {
      setCrop(centerFreeCrop(width, height));
    }
  }, [cropMode]);

  /**
   * This is the core function that performs the cropping.
   * It creates a new canvas with dimensions scaled to the original image's resolution
   * to ensure no quality is lost.
   * @param image - The source HTMLImageElement.
   * @param crop - The PixelCrop object from react-image-crop.
   * @param mode - The current crop mode ('free' or 'circle').
   * @returns A promise that resolves to a base64 data URL of the cropped image.
   */
  const getCroppedImg = useCallback(async (
    image: HTMLImageElement,
    crop: PixelCrop,
    mode: 'free' | 'circle',
  ): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2d context');
    }

    // These scaling factors are the key to preserving quality. They translate the
    // crop coordinates from the scaled-down preview image to the full-resolution original.
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Set the canvas size to the actual cropped area size on the original image.
    // This prevents downscaling and preserves the high resolution.
    canvas.width = Math.floor(crop.width * scaleX);
    canvas.height = Math.floor(crop.height * scaleY);

    ctx.imageSmoothingQuality = 'high';

    // Define the source rectangle (from the original image)
    const sourceX = crop.x * scaleX;
    const sourceY = crop.y * scaleY;
    const sourceWidth = crop.width * scaleX;
    const sourceHeight = crop.height * scaleY;

    // Define the destination rectangle (on the new canvas)
    const destX = 0;
    const destY = 0;
    const destWidth = canvas.width;
    const destHeight = canvas.height;

    // Draw the cropped section of the original image onto the canvas
    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      destX,
      destY,
      destWidth,
      destHeight
    );

    // If the mode is 'circle', apply a circular mask.
    if (mode === 'circle') {
      const circleCanvas = document.createElement('canvas');
      const circleCtx = circleCanvas.getContext('2d');
      if (!circleCtx) {
        throw new Error('Failed to get 2d context for circle mask');
      }

      circleCanvas.width = canvas.width;
      circleCanvas.height = canvas.height;
      
      // Draw the rectangular cropped image first
      circleCtx.drawImage(canvas, 0, 0);
      
      // Use 'destination-in' to apply the circular shape as a mask,
      // keeping only the parts of the image that are inside the circle.
      circleCtx.globalCompositeOperation = 'destination-in';
      circleCtx.beginPath();
      circleCtx.arc(
        canvas.width / 2, 
        canvas.height / 2, 
        Math.min(canvas.width, canvas.height) / 2, // Use the smaller dimension for the radius
        0, 
        2 * Math.PI
      );
      circleCtx.fill();

      return circleCanvas.toDataURL('image/png');
    }

    // For high-res photos, 'image/jpeg' can offer better compression.
    // return canvas.toDataURL('image/jpeg', 0.95); // 0.95 is 95% quality
    return canvas.toDataURL('image/png');
  }, []);


  /**
   * Handles the final crop action when the user clicks the "Crop & Upload" button.
   */
  const handleCropComplete = async () => {
    if (!completedCrop || !imgRef.current) {
      console.warn("Crop or image reference not available.");
      return;
    }

    setIsProcessing(true);
    try {
      const croppedImageUrl = await getCroppedImg(imgRef.current, completedCrop, cropMode);
      onCropComplete(croppedImageUrl, cropMode);
      onClose();
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Resets the crop selection whenever the crop mode changes or the dialog opens.
   */
  useEffect(() => {
    if (isOpen && imgRef.current) {
      const { width, height } = imgRef.current;
      if (cropMode === 'circle') {
        const size = Math.min(width, height) * 0.8;
        setCrop({
          unit: 'px',
          x: (width - size) / 2,
          y: (height - size) / 2,
          width: size,
          height: size,
        });
      } else {
        setCrop(centerFreeCrop(width, height));
      }
    }
  }, [cropMode, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-[95vw] h-[90vh] max-h-[95vh] md:max-w-3xl md:h-auto md:max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0 pb-4">
          <DialogTitle className="text-lg md:text-xl">Crop Image</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 p-1">
         <div className="flex flex-row gap-2 items-center mb-4">
           <span className="text-sm font-medium text-gray-700">Crop Mode:</span>
           <Button
             variant={cropMode === 'free' ? 'default' : 'outline'}
             onClick={() => setCropMode('free')}
             size="sm"
           >
             Free
           </Button>
           <Button
             variant={cropMode === 'circle' ? 'default' : 'outline'}
             onClick={() => setCropMode('circle')}
             size="sm"
           >
             Circle
           </Button>
         </div>

          <div className="flex justify-center w-full bg-gray-100 rounded-lg p-2">
            <div className="w-full max-w-lg">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={cropMode === 'circle' ? 1 : undefined}
                minWidth={50}
                minHeight={50}
                className="w-full"
                circularCrop={cropMode === 'circle'}
              >
                <img
                  ref={imgRef}
                  alt="Crop preview"
                  src={imageUrl}
                  onLoad={onImageLoad}
                  className="w-full h-auto max-h-[50vh] object-contain"
                  style={{ touchAction: 'none' }}
                />
              </ReactCrop>
            </div>
          </div>
        </div>
        <div className="shrink-0 pt-4 border-t mt-4 bg-background sticky bottom-0 z-10 px-6 pb-4">
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCropComplete}
              disabled={!completedCrop || isProcessing}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              {isProcessing ? "Processing..." : "Crop & Use Image"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
