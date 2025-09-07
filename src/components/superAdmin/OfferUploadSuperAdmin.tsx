// app/dashboard/items/new/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { uploadFileToS3 } from "@/app/actions/aws-s3";
import { processImage } from "@/lib/processImage";
import { toast } from "sonner";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { uploadCommonOffer } from "@/api/common_offers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { revalidateTag } from "@/app/actions/revalidate";
import { sendCommonOfferWhatsAppMsg } from "@/app/actions/sendWhatsappMsgs";
import convertLocToCoord from "@/app/actions/convertLocToCoord";
import { Partner } from "@/store/authStore";

export interface CommonOffer {
  partner_name: string;
  item_name: string;
  price: number;
  location: string | null;
  description: string | null;
  insta_link: string | null;
  likes: number; //this is not using now
  no_of_likes?: number;
  no_of_views?: number;
  image_url: string;
  image_urls?: string[];
  id: string;
  view_count?: number;
  distance_meters?: number;
  district: string;
  coordinates?: {
    type: string;
    coordinates: number[];
  };
  created_at?: string;
  common_offers_liked_bies?: {
    user_id: string;
  }[];
  common_offers_viewed_bies?: {
    user_id: string;
  }[];
  geoData? : any;
  partner_id?: string | null;
  partner?: Partner | null;
}

export const KERALA_DISTRICTS = [
  "Thiruvananthapuram",
  "Kollam",
  "Pathanamthitta",
  "Alappuzha",
  "Kottayam",
  "Idukki",
  "Ernakulam",
  "Thrissur",
  "Palakkad",
  "Malappuram",
  "Kozhikode",
  "Wayanad",
  "Kannur",
  "Kasaragod",
];

const initialFormData = {
  partner_name: "",
  item_name: "",
  price: 0,
  location: "",
  description: "",
  insta_link: "",
  likes: 0,
  image_url: "",
  id: "",
  district: "",
};

const isValidInstagramLink = (url: string | null) => {
  return url === "" || url === null || /instagram\.com\/(p|reel)\//.test(url);
};

const extractInstagramReelId = (url: string) => {
  const regex = /instagram\.com\/(reel|p)\/([^\/?]+)/;
  const match = url.match(regex);
  return match ? match[2] : null;
};

const getInstagramThumbnailUrl = (reelId: string) => {
  return `https://www.instagram.com/p/${reelId}/media/?size=l`;
};

export default function OfferUploadSuperAdmin() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState<CommonOffer>(initialFormData);
  const [errors, setErrors] = useState({
    insta_link: "",
    location: ""
  });
  const [isFetchingThumbnail, setIsFetchingThumbnail] = useState(false);
  const [instagramLinkChanged, setInstagramLinkChanged] = useState(false);

  useEffect(() => {
    const fetchThumbnail = async () => {
      if (!formData.insta_link || !isValidInstagramLink(formData.insta_link)) {
        setImagePreview(null);
        return;
      }

      const reelId = extractInstagramReelId(formData.insta_link);
      console.log("Extracted Reel ID:", reelId);
      
      if (!reelId) {
        setImagePreview(null);
        return;
      }

      setIsFetchingThumbnail(true);
      try {
        const thumbnailUrl = getInstagramThumbnailUrl(reelId);
        
        // Create a proxy request to avoid CORS issues
        const proxyUrl = `${process.env.NEXT_PUBLIC_SERVER_URL}/api/insta-proxy?url=${encodeURIComponent(thumbnailUrl)}`;
        const response = await fetch(proxyUrl);
        
        if (response.ok) {
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          setImagePreview(objectUrl);
          setFormData(prev => ({
            ...prev,
            image_url: objectUrl
          }));
        } else {
          throw new Error("Thumbnail not found");
        }
      } catch (error) {
        console.error("Failed to fetch Instagram thumbnail:", error);
        toast.warning("Couldn't fetch Instagram thumbnail automatically. Please upload an image manually.");
        setImagePreview(null);
      } finally {
        setIsFetchingThumbnail(false);
        setInstagramLinkChanged(false);
      }
    };

    // Only fetch if the Instagram link has changed and is valid
    if (instagramLinkChanged && isValidInstagramLink(formData.insta_link)) {
      const debounceTimer = setTimeout(fetchThumbnail, 1000);
      return () => clearTimeout(debounceTimer);
    }
  }, [formData.insta_link, instagramLinkChanged]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "price" ? Number(value) : value,
    }));

    // Clear error when user types
    if (name === "insta_link" || name === "location") {
      setErrors(prev => ({...prev, [name]: ""}));
    }

    // Track Instagram link changes
    if (name === "insta_link") {
      setInstagramLinkChanged(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const blobUrl = URL.createObjectURL(file);
      setImagePreview(blobUrl);
      setFormData((prev) => ({
        ...prev,
        image_url: blobUrl,
      }));
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setImagePreview(null);
    setErrors({ insta_link: "", location: "" });
    setInstagramLinkChanged(false);
    // Clear file input
    const fileInput = document.getElementById("image-upload") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const validateForm = () => {
    let valid = true;
    const newErrors = { insta_link: "", location: "" };

    if (formData.insta_link && !isValidInstagramLink(formData.insta_link)) {
      newErrors.insta_link = "Please enter a valid Instagram Reel link";
      valid = false;
    }

    if (!formData.location) {
      newErrors.location = "Location link is required";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      let s3Url = null;

      // Upload image to S3 if exists
      if (formData.image_url) {
        // If the image is from Instagram, we need to fetch it first
        let imageToUpload = formData.image_url;
        
        if (formData.image_url.includes('instagram.com')) {
          const response = await fetch(formData.image_url);
          const blob = await response.blob();
          imageToUpload = URL.createObjectURL(blob);
        }

        const processedImage = await processImage(
          imageToUpload,
          `local`
        );

        const formattedName = formData.item_name.replace(/[^a-zA-Z0-9]/g, "_").replace(/\s+/g, "_").replace(/_+/g, "_"); 

        s3Url = await uploadFileToS3(
          processedImage,
          `common_offers/${formattedName}_${Date.now()}.webp`
        );
      }

      const coordinates = await convertLocToCoord(formData.location as string);

      // Prepare item data for API
      const itemData = {
        ...formData,
        district: formData.district.toLowerCase(),
        image_url: s3Url,
        location: formData.location || null,
        description: formData.description || null,
        insta_link: formData.insta_link || null,
        coordinates
      };

      const { id, ...payload } = itemData;

      const { insert_common_offers_one } = await fetchFromHasura(
        uploadCommonOffer,
        {
          ...payload,
        }
      );

      toast.success("Item created successfully!");
      revalidateTag("all-common-offers");
      await sendCommonOfferWhatsAppMsg(insert_common_offers_one.id);
      
      // Reset form after successful submission
      resetForm();
    } catch (error) {
      console.error("Error creating item:", error);
      toast.error("Failed to create item. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Partner Name */}
          <div>
            <Label
              htmlFor="partner_name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Partner Name *
            </Label>
            <Input
              type="text"
              id="partner_name"
              name="partner_name"
              value={formData.partner_name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white focus-visible:ring-orange-500"
            />
          </div>

          {/* Item Name */}
          <div>
            <Label
              htmlFor="item_name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Item Name *
            </Label>
            <Input
              type="text"
              id="item_name"
              name="item_name"
              value={formData.item_name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white focus-visible:ring-orange-500"
            />
          </div>

          {/* Price */}
          <div>
            <Label
              htmlFor="price"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Price *
            </Label>
            <Input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleChange}
              required
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white focus-visible:ring-orange-500"
            />
          </div>

          {/* District */}
          <div>
            <Label
              htmlFor="district"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              District *
            </Label>
            <Select
              value={formData.district}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, district: value }))
              }
              required
            >
              <SelectTrigger className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white focus-visible:ring-orange-500">
                <SelectValue placeholder="Select district" />
              </SelectTrigger>
              <SelectContent>
                {KERALA_DISTRICTS.map((district) => (
                  <SelectItem key={district} value={district}>
                    {district}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div>
            <Label
              htmlFor="location"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Google Maps Location Link *
            </Label>
            <Input
              type="url"
              id="location"
              name="location"
              value={formData.location || ""}
              onChange={handleChange}
              placeholder="https://maps.google.com/..."
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white focus-visible:ring-orange-500"
            />
            {errors.location && (
              <p className="mt-1 text-sm text-red-600">{errors.location}</p>
            )}
          </div>

          {/* Instagram Link */}
          <div>
            <Label
              htmlFor="insta_link"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Instagram Reel Link (optional)
            </Label>
            <Input
              type="url"
              id="insta_link"
              name="insta_link"
              value={formData.insta_link || ""}
              onChange={handleChange}
              placeholder="https://www.instagram.com/reel/..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white focus-visible:ring-orange-500"
            />
            {errors.insta_link && (
              <p className="mt-1 text-sm text-red-600">{errors.insta_link}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <Label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description (optional)
          </Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description || ""}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white focus-visible:ring-orange-500"
          />
        </div>

        {/* Image Upload */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            {formData.insta_link && isValidInstagramLink(formData.insta_link)
              ? "Instagram Reel Thumbnail"
              : "Item Image (optional - upload manually or provide Instagram Reel link)"}
          </Label>
          
          <div className="mt-4">
            {isFetchingThumbnail ? (
              <div className="w-64 h-64 border border-gray-200 rounded-md flex items-center justify-center bg-gray-100">
                <p>Loading Instagram thumbnail...</p>
              </div>
            ) : imagePreview ? (
              <div className="space-y-2">
                <div className="w-64 h-64 border border-gray-200 rounded-md overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                {formData.insta_link && isValidInstagramLink(formData.insta_link) && (
                  <p className="text-sm text-gray-500">
                    Using Instagram thumbnail. You can still upload a different image below.
                  </p>
                )}
              </div>
            ) : (
              <div className="w-64 h-64 border border-gray-200 rounded-md flex items-center justify-center bg-gray-100">
                {formData.insta_link && !isValidInstagramLink(formData.insta_link) ? (
                  <p className="text-red-500">Invalid Instagram Reel link</p>
                ) : (
                  <p>No image selected</p>
                )}
              </div>
            )}
          </div>

          <div className="mt-4">
            <Label className="block text-sm font-medium text-gray-700 mb-1">
              Upload Custom Image (optional)
            </Label>
            <Input
              id="image-upload"
              name="image-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="bg-white focus-visible:ring-orange-500"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6">
          <Button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || isFetchingThumbnail}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating..." : "Create Item"}
          </Button>
        </div>
      </form>
    </div>
  );
}