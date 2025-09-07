import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { UploadCloud, X, Loader2, Clipboard, AlertTriangle } from 'lucide-react';
import { uploadFileToS3, deleteFileFromS3 } from '@/app/actions/aws-s3'; // Assuming deleteFileFromS3 exists
import { useAuthStore } from '@/store/authStore';

// --- STATE AND TYPE DEFINITIONS ---
type UploadStatus = 'pending' | 'uploading' | 'completed' | 'error';

interface ImageUploadState {
  id: string; // Unique identifier for each upload item
  file: File;
  previewUrl: string;
  status: UploadStatus;
  dbUrl?: string; // The final S3 URL
  errorMessage?: string;
}

// --- PROPS INTERFACE ---
interface MultipleImageUploaderProps {
  setImageUrls: (urls: string[]) => void;
  maxImages?: number;
}

export const MultipleImageUploader: React.FC<MultipleImageUploaderProps> = ({
  setImageUrls,
  maxImages = 6,
}) => {
  const [imageUploads, setImageUploads] = useState<ImageUploadState[]>([]);
  const { userData } = useAuthStore();

  // --- EFFECT TO SYNC PARENT COMPONENT ---
  // This effect watches for changes in the upload states and updates the parent
  // with the list of successfully uploaded URLs.
  useEffect(() => {
    const successfulUrls = imageUploads
      .filter(img => img.status === 'completed' && img.dbUrl)
      .map(img => img.dbUrl!);
    setImageUrls(successfulUrls);

    // Cleanup object URLs on unmount
    return () => {
        imageUploads.forEach(img => URL.revokeObjectURL(img.previewUrl));
    };
  }, [imageUploads, setImageUrls]);


  // --- UPLOAD AND DELETE LOGIC ---
  const startUpload = async (uploadId: string , images: ImageUploadState[]) => {
    const imageToUpload = images.find(img => img.id === uploadId);
    if (!imageToUpload || !userData?.id) {
        toast.error("User data not found, cannot upload.");
        return;
    }

    // 1. Set status to 'uploading'
    setImageUploads(prev => prev.map(img => img.id === uploadId ? { ...img, status: 'uploading' } : img));

    try {
        // 2. Perform the upload
        const fileName = `${userData.id}/offers/${Date.now()}-${imageToUpload.file.name}`;
        const url = await uploadFileToS3(imageToUpload.file, fileName);

        // 3. Update status to 'completed' on success
        toast.success(`Uploaded ${imageToUpload.file.name}`);
        setImageUploads(prev => prev.map(img => img.id === uploadId ? { ...img, status: 'completed', dbUrl: url } : img));

    } catch (error) {
        // 4. Update status to 'error' on failure
        const errorMessage = error instanceof Error ? error.message : 'Upload failed.';
        toast.error(`Failed to upload ${imageToUpload.file.name}`);
        setImageUploads(prev => prev.map(img => img.id === uploadId ? { ...img, status: 'error', errorMessage } : img));
    }
  };

  const handleRemoveImage = async (uploadId: string) => {
    const imageToRemove = imageUploads.find(img => img.id === uploadId);
    if (!imageToRemove) return;

    // If the image was successfully uploaded, delete it from S3
    if (imageToRemove.status === 'completed' && imageToRemove.dbUrl) {
        try {
            toast.info(`Deleting ${imageToRemove.file.name}...`);
            await deleteFileFromS3(imageToRemove.dbUrl);
            toast.success(`Deleted ${imageToRemove.file.name}`);
        } catch (error) {
            toast.error(`Could not delete ${imageToRemove.file.name} from storage.`);
            // You might want to stop here if deletion fails
        }
    }

    // Revoke the local preview URL to free memory
    URL.revokeObjectURL(imageToRemove.previewUrl);
    // Remove the image from the state
    setImageUploads(prev => prev.filter(img => img.id !== uploadId));
  };


  // --- FILE HANDLERS (INPUT, PASTE, DROP) ---
  const handleNewFiles = (newFiles: File[]) => {
    if (imageUploads.length + newFiles.length > maxImages) {
      toast.error(`You can only upload a maximum of ${maxImages} images.`);
      return;
    }

    const validImageFiles = newFiles.filter(file => file.type.startsWith('image/'));
    
    const newUploadStates: ImageUploadState[] = validImageFiles.map(file => ({
        id: `${file.name}-${file.size}-${Date.now()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'pending',
    }));

    const images = [...imageUploads, ...newUploadStates];

    // Add new files to state and immediately trigger their upload
    setImageUploads(images);
    newUploadStates.forEach(upload => startUpload(upload.id,images));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleNewFiles(Array.from(event.target.files || []));
    event.target.value = ''; // Reset input
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    const pastedFiles = Array.from(event.clipboardData?.items || [])
      .filter(item => item.type.startsWith('image/'))
      .map(item => item.getAsFile() as File)
      .filter(Boolean); // Filter out any null results

    if (pastedFiles.length > 0) {
      handleNewFiles(pastedFiles);
      toast.info(`Pasted ${pastedFiles.length} image(s).`);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    handleNewFiles(Array.from(event.dataTransfer.files));
  };


  // --- RENDER LOGIC ---
  return (
    <div
      className="w-full max-w-2xl mx-auto p-4 space-y-6"
      onPaste={handlePaste}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* --- UPLOAD AREA --- */}
      {imageUploads.length < maxImages && (
        <div className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 relative">
          <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
            <UploadCloud className="w-10 h-10 mb-4 text-gray-500" />
            <p className="mb-2 text-sm text-center text-gray-500 dark:text-gray-400">
              <span className="font-semibold">Click to upload</span>, drag & drop, or paste
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              PNG, JPG, GIF (MAX. {maxImages} images)
            </p>
            <div className="absolute top-2 right-2">
              <Clipboard className="w-5 h-5 text-gray-400" name="Paste Image (Ctrl+V or Cmd+V)" />
            </div>
          </label>
          <Input
            id="file-upload"
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={imageUploads.length >= maxImages}
          />
        </div>
      )}

      {/* --- IMAGE PREVIEW GRID --- */}
      {imageUploads.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-center">Image Previews ({imageUploads.length}/{maxImages})</h3>
          <div className="grid grid-cols-2 gap-4">
            {imageUploads.map((upload) => (
              <Card key={upload.id} className="relative group aspect-square">
                <CardContent className="p-0 h-full">
                  <img
                    src={upload.previewUrl}
                    alt={`Preview of ${upload.file.name}`}
                    className="object-cover w-full h-full rounded-lg"
                  />
                  {/* --- OVERLAYS FOR STATUS --- */}
                  {upload.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                  {upload.status === 'error' && (
                    <div className="absolute inset-0 bg-red-900/70 flex flex-col items-center justify-center rounded-lg text-white p-2">
                      <AlertTriangle className="w-8 h-8 mb-1" />
                      <p className="text-xs text-center">{upload.errorMessage}</p>
                    </div>
                  )}
                  {/* --- REMOVE BUTTON --- */}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveImage(upload.id)}
                    disabled={upload.status === 'uploading'}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
