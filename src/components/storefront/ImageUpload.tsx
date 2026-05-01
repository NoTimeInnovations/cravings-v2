"use client";

import { useState, useRef } from "react";
import { uploadFileToS3 } from "@/app/actions/aws-s3";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  folder?: string;
}

export function ImageUpload({ value, onChange, label, folder = "storefront" }: Props) {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const filename = `${folder}/${Date.now()}-${file.name}`;
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const url = await uploadFileToS3(dataUrl, filename);
      onChange(url);
      toast.success("Image uploaded");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      {value ? (
        <div className="relative rounded-lg overflow-hidden border">
          <img src={value} alt="Preview" className="w-full max-h-40 object-cover" />
          <Button
            size="sm"
            variant="destructive"
            className="absolute top-2 right-2"
            onClick={() => onChange("")}
            type="button"
          >
            <X className="h-3 w-3 mr-1" /> Remove
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="upload">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="url">URL</TabsTrigger>
          </TabsList>
          <TabsContent value="upload">
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-accent/30 transition-colors"
            >
              {uploading ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="h-6 w-6" />
                  <span className="text-sm">Click to upload image</span>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>
          </TabsContent>
          <TabsContent value="url">
            <div className="flex gap-2">
              <Input
                placeholder="https://..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
              <Button
                disabled={!urlInput}
                onClick={() => {
                  onChange(urlInput);
                  setUrlInput("");
                }}
                type="button"
              >
                Use
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
