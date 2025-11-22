import React from "react";
import { X } from "lucide-react";

interface AllergenInfoModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  allergenInfo: string;
}

const AllergenInfoModal: React.FC<AllergenInfoModalProps> = ({
  isOpen,
  onOpenChange,
  allergenInfo,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      // Overlay
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
      onClick={() => onOpenChange(false)}
    >
      <div
        // Modal content
        className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Allergen Information</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-500 hover:text-gray-800"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div>
          <p>{allergenInfo}</p>
        </div>
      </div>
    </div>
  );
};

export default AllergenInfoModal;
