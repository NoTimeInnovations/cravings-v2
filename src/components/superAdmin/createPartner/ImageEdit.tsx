import { ImageGridModal } from "@/components/bulkMenuUpload/ImageGridModal";
import React, { useState } from "react";

interface MenuItem {
  image?: string;
  category?: string;
  description?: string;
  name: string;
  price: number;
  variants?: { name: string; price: number }[];
}

const ImageEdit = ({
  item,
  editedItem,
  generatedImages,
  onChange,
}: {
  item: Partial<MenuItem>;
  generatedImages: Record<string, string>;
  editedItem: Partial<MenuItem>;
  onChange: (image: string) => void;
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const currentImage = item.name ? (editedItem.image || generatedImages[item.name]) : editedItem.image;
  const itemName = item.name || '';

  return (
    <div className="relative group">
      <div className="cursor-pointer" onClick={() => setIsModalOpen(true)}>
        <img
          src={currentImage}
          alt={itemName}
          className="w-32 h- object-cover rounded-md"
        />
      
      </div>

      <ImageGridModal 
        isOpen={isModalOpen}
        category={item.category || ''}
        currentImage={currentImage || ''}
        itemName={itemName}
        onOpenChange={setIsModalOpen}
        onSelectImage={(image) => {
          onChange(image);
          setIsModalOpen(false);
        }}
      />
    </div>
  );
};

export default ImageEdit;