// src/components/ImageCarousel.tsx

import React, { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

// Shadcn/ui components - adjust paths if necessary
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Autoplay from 'embla-carousel-autoplay';
// Icons
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

type ImageCarouselProps = {
  imageUrls: string[];
  altText: string; // For accessibility
};

export const ImageCarousel = ({ imageUrls, altText }: ImageCarouselProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStartIndex, setModalStartIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true },
    [
      Autoplay({
        delay: 5000, 
        stopOnInteraction: true, 
        stopOnFocusIn: true, 
      })
    ]
  );
  // Hooks for the full-screen modal carousel
  const [emblaModalRef, emblaModalApi] = useEmblaCarousel({ loop: true });

  const openModal = (index: number) => {
    setModalStartIndex(index);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Sync the modal carousel to the selected image when it opens
  useEffect(() => {
    if (isModalOpen && emblaModalApi) {
      emblaModalApi.scrollTo(modalStartIndex, true); // true for instant scroll
    }
  }, [isModalOpen, modalStartIndex, emblaModalApi]);

  // Navigation handlers
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const modalScrollPrev = useCallback(() => emblaModalApi?.scrollPrev(), [emblaModalApi]);
  const modalScrollNext = useCallback(() => emblaModalApi?.scrollNext(), [emblaModalApi]);

  // Fallback for when no images are provided
  if (!imageUrls || imageUrls.length === 0) {
    return (
      <img
        src="/image_placeholder.png"
        alt="Placeholder"
        className="w-full h-64 object-cover rounded-lg"
      />
    );
  }

  return (
    <>
      {/* --- Main Thumbnail Carousel --- */}
      <div className="overflow-hidden relative group rounded-lg">
        <div className="embla" ref={emblaRef}>
          <div className="embla__container">
            {imageUrls.map((url, index) => (
              <div
                className="embla__slide cursor-pointer"
                key={`${altText}-thumb-${index}`}
                onClick={() => openModal(index)}
              >
                <img
                  src={url}
                  alt={`${altText} - thumbnail ${index + 1}`}
                  className="w-full h-64 object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {imageUrls.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/75 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
              onClick={scrollPrev}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/75 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
              onClick={scrollNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}
      </div>

      {/* --- Full-Screen Modal --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-black/95 p-0 border-0 max-w-none w-screen h-screen flex items-center justify-center z-[5000] top-0 rounded-none" >
          
          <div className="embla h-full w-full" ref={emblaModalRef}>
            <div className="embla__container h-full">
              {imageUrls.map((url, index) => (
                <div
                  className="embla__slide flex items-center justify-center"
                  key={`${altText}-fullscreen-${index}`}
                >
                  <TransformWrapper minScale={1} maxScale={8} initialScale={1}>
                    <TransformComponent
                      wrapperStyle={{ width: '100%', height: '100%' }}
                      contentStyle={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
                    >
                      <img
                        src={url}
                        alt={`${altText} - fullscreen ${index + 1}`}
                        className="max-w-full max-h-full object-contain"
                      />
                    </TransformComponent>
                  </TransformWrapper>
                </div>
              ))}
            </div>
          </div>

          {/* Modal: Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 rounded-full bg-black/50 text-white hover:bg-black/75 hover:text-white"
            onClick={closeModal}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Modal: Navigation Buttons */}
          {imageUrls.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-50 rounded-full bg-black/50 text-white hover:bg-black/75 hover:text-white"
                onClick={modalScrollPrev}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-50 rounded-full bg-black/50 text-white hover:bg-black/75 hover:text-white"
                onClick={modalScrollNext}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </>
          )}

        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImageCarousel;