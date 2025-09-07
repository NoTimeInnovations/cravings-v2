import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Img from '../Img';

export interface UnsplashImage {
    id: string;
    urls: {
      regular: string;
      small: string;
    };
  }

interface ImageSearchModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  imageSearchQuery: string;
  setImageSearchQuery: (query: string) => void;
  searchedImages: UnsplashImage[];
  currentPage: number;
  totalPages: number;
  onSearch: (query: string) => void;
  onSelectImage: (imageUrl: string) => void;
  onPageChange: (page: number) => void;
}

export const ImageSearchModal = ({
  isOpen,
  onOpenChange,
  imageSearchQuery,
  setImageSearchQuery,
  searchedImages,
  currentPage,
  totalPages,
  onSearch,
  onSelectImage,
  onPageChange
}: ImageSearchModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90%] sm:max-w-4xl rounded-xl">
        <DialogHeader>
          <DialogTitle>Select Image</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={imageSearchQuery}
              onChange={(e) => setImageSearchQuery(e.target.value)}
              placeholder="Search for images..."
            />
            <Button onClick={() => onSearch(imageSearchQuery)}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {searchedImages.map((image) => (
              <div
                key={image.id}
                className="relative h-28 sm:h-40 cursor-pointer"
                onClick={() => onSelectImage(image.urls.regular)}
              >
                <Img
                  src={image.urls.small}
                  alt="Search result"
                  className="object-cover rounded-md hover:opacity-80 transition-opacity"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center mt-4">
            <Button
              variant="outline"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <span className="text-sm text-gray-500 mt-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};