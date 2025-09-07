"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { toast } from "sonner";
import Img from "./Img";


interface AIImageGenerateModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  category: string;
  addNewImage: (url: string) => void;
}

const AIImageGenerateModal: React.FC<AIImageGenerateModalProps> = ({
  isOpen,
  onOpenChange,
  itemName,
  addNewImage,
}) => {
  const [prompt, setPrompt] = useState(itemName);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateImage = async () => {
    setLoading(true);
    try {
      if (!prompt) {
        toast.error("Please enter a prompt!");
        setLoading(false);
        return;
      }

      const encodedPrompt = encodeURIComponent(prompt);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&width=512&height=512`;

      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setImageUrl(objectUrl);

      setGeneratedImage(imageUrl);
      toast.success("Image generated successfully!");
    } catch (error) {
      toast.error("Failed to generate image!");
      console.error("Error generating image:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveImage = async () => {
    if (!imageUrl) {
      toast.error("No image to save!");
      return;
    }
    addNewImage(imageUrl);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate AI Image</DialogTitle>
        </DialogHeader>
        {imageUrl && (
          <div className="mb-4 flex justify-center">
            <Img
              src={imageUrl}
              alt="Generated AI"
              width={300}
              height={300}
              className="object-cover rounded-md"
            />
          </div>
        )}
        <input
          type="text"
          placeholder="Enter your prompt..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="border rounded p-2 w-full mb-4 bg-white"
        />
        <Button onClick={handleGenerateImage} disabled={loading}>
          {loading ? "Generating..." : "Generate Image"}
        </Button>
        {generatedImage && (
          <Button disabled={loading} onClick={handleSaveImage}>
            Save Image
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AIImageGenerateModal;
