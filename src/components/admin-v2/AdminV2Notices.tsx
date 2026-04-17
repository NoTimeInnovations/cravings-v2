"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Loader2,
  ImageIcon,
  X,
  Link as LinkIcon,
  Calendar,
  Clock,
  Eye,
} from "lucide-react";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  getNoticesQuery,
  createNoticeMutation,
  updateNoticeMutation,
  deleteNoticeMutation,
} from "@/api/notices";
import { uploadFileToS3, deleteFileFromS3 } from "@/app/actions/aws-s3";
import { revalidateTag } from "@/app/actions/revalidate";

interface Notice {
  id: string;
  partner_id: string;
  image_url: string;
  type: "fixed" | "scheduled";
  is_active: boolean;
  show_always: boolean;
  button_text?: string;
  button_link?: string;
  starts_at?: string;
  expires_at?: string;
  priority?: number;
  created_at: string;
}

export function AdminV2Notices() {
  const { userData } = useAuthStore();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [noticeType, setNoticeType] = useState<"fixed" | "scheduled">("fixed");
  const [showAlways, setShowAlways] = useState(true);
  const [hasButton, setHasButton] = useState(false);
  const [buttonText, setButtonText] = useState("");
  const [buttonLink, setButtonLink] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchNotices = useCallback(async () => {
    if (!userData?.id) return;
    try {
      const res = await fetchFromHasura(getNoticesQuery, {
        partner_id: userData.id,
      });
      setNotices(res?.notices || []);
    } catch {
      toast.error("Failed to load notices");
    } finally {
      setLoading(false);
    }
  }, [userData?.id]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const convertToWebp = (dataUrl: string, quality = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext("2d")!.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/webp", quality));
      };
      img.src = dataUrl;
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      const webp = await convertToWebp(dataUrl);
      setImageFile(webp);
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setImagePreview(null);
    setImageFile(null);
    setNoticeType("fixed");
    setShowAlways(true);
    setHasButton(false);
    setButtonText("");
    setButtonLink("");
    setStartsAt("");
    setExpiresAt("");
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!imageFile || !userData?.id) {
      toast.error("Please select an image");
      return;
    }
    setSaving(true);
    try {
      const imageUrl = await uploadFileToS3(
        imageFile,
        `notices/${userData.id}/notice_${Date.now()}.webp`,
      );

      const object: Record<string, any> = {
        partner_id: userData.id,
        image_url: imageUrl,
        type: noticeType,
        is_active: true,
        show_always: showAlways,
        priority: notices.length,
      };

      if (hasButton && buttonText.trim() && buttonLink.trim()) {
        object.button_text = buttonText.trim();
        object.button_link = buttonLink.trim();
      }

      if (noticeType === "scheduled") {
        if (startsAt) object.starts_at = new Date(startsAt).toISOString();
        if (expiresAt) object.expires_at = new Date(expiresAt).toISOString();
      }

      const res = await fetchFromHasura(createNoticeMutation, { object });
      if (res?.insert_notices_one) {
        setNotices((prev) => [res.insert_notices_one, ...prev]);
        revalidateTag(userData.id);
        toast.success("Notice created");
        resetForm();
      }
    } catch {
      toast.error("Failed to create notice");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (notice: Notice) => {
    try {
      await fetchFromHasura(updateNoticeMutation, {
        id: notice.id,
        updates: { is_active: !notice.is_active },
      });
      setNotices((prev) =>
        prev.map((n) =>
          n.id === notice.id ? { ...n, is_active: !n.is_active } : n,
        ),
      );
      if (userData?.id) revalidateTag(userData.id);
    } catch {
      toast.error("Failed to update notice");
    }
  };

  const handleDelete = async (notice: Notice) => {
    setDeletingId(notice.id);
    try {
      if (notice.image_url?.includes("cravingsbucket")) {
        await deleteFileFromS3(notice.image_url);
      }
      await fetchFromHasura(deleteNoticeMutation, { id: notice.id });
      setNotices((prev) => prev.filter((n) => n.id !== notice.id));
      if (userData?.id) revalidateTag(userData.id);
      toast.success("Notice deleted");
    } catch {
      toast.error("Failed to delete notice");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notices</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create poster notices that customers see when they visit your store
          </p>
        </div>
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Notice
          </Button>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>New Notice</span>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
            <CardDescription>
              Upload a 9:16 poster image for your notice
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Image Upload */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Poster Image (9:16 ratio)
              </Label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              {imagePreview ? (
                <div className="relative w-48 rounded-xl overflow-hidden border border-gray-200">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full aspect-[9/16] object-cover"
                  />
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setImageFile(null);
                    }}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-48 aspect-[9/16] border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-orange-400 transition-colors"
                >
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                  <span className="text-sm text-gray-500">Upload Image</span>
                </button>
              )}
            </div>

            {/* Notice Type */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Type</Label>
              <div className="flex gap-2">
                {(["fixed", "scheduled"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setNoticeType(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      noticeType === type
                        ? "bg-orange-600 text-white border-orange-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700"
                    }`}
                  >
                    {type === "fixed" ? (
                      <span className="flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5" />
                        Fixed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Scheduled
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Show Always */}
            <div className="flex items-center gap-3">
              <Switch checked={showAlways} onCheckedChange={setShowAlways} />
              <div>
                <Label className="text-sm">Show every visit</Label>
                <p className="text-xs text-muted-foreground">
                  {showAlways
                    ? "Notice shows every time a customer visits"
                    : "Notice shows only once per session"}
                </p>
              </div>
            </div>

            {/* Scheduled dates */}
            {noticeType === "scheduled" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-1 block">
                    Start Date
                  </Label>
                  <Input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1 block">
                    End Date
                  </Label>
                  <Input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Button toggle */}
            <div className="flex items-center gap-3">
              <Switch checked={hasButton} onCheckedChange={setHasButton} />
              <Label className="text-sm">Add a button</Label>
            </div>

            {hasButton && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-1 block">
                    Button Text
                  </Label>
                  <Input
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    placeholder="e.g. Order Now"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1 block">
                    Button Link
                  </Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      value={buttonLink}
                      onChange={(e) => setButtonLink(e.target.value)}
                      placeholder="https://..."
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={handleCreate}
              disabled={saving || !imageFile}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {saving ? "Creating..." : "Create Notice"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Notices List */}
      {notices.length === 0 && !showForm ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ImageIcon className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No notices yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Create your first notice to engage customers
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className={`relative rounded-xl overflow-hidden border transition-opacity ${
                notice.is_active
                  ? "border-gray-200"
                  : "border-gray-200 opacity-50"
              }`}
            >
              <img
                src={notice.image_url}
                alt="Notice"
                className="w-full aspect-[9/16] object-cover"
              />

              {/* Overlay badges */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${
                    notice.type === "scheduled"
                      ? "bg-blue-500"
                      : "bg-green-600"
                  }`}
                >
                  {notice.type === "scheduled" ? (
                    <span className="flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      Scheduled
                    </span>
                  ) : (
                    "Fixed"
                  )}
                </span>
                {notice.show_always && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-500 text-white">
                    Always
                  </span>
                )}
                {notice.button_text && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/60 text-white">
                    Has Button
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 flex items-end justify-between">
                <Switch
                  checked={notice.is_active}
                  onCheckedChange={() => handleToggle(notice)}
                  className="scale-75"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(notice)}
                  disabled={deletingId === notice.id}
                  className="text-white hover:text-red-300 hover:bg-transparent p-1 h-auto"
                >
                  {deletingId === notice.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
