"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, X, Tag, FileText } from "lucide-react";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  getNoticesQuery,
  createNoticeMutation,
  updateNoticeMutation,
  deleteNoticeMutation,
} from "@/api/notices";
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

function parseNoticeData(notice: Notice): { title: string; description: string; tag: string } {
  if (notice.image_url?.startsWith("json:")) {
    try {
      return JSON.parse(notice.image_url.slice(5));
    } catch {}
  }
  return { title: notice.button_text || "Untitled", description: notice.button_link || "", tag: "" };
}

export function AdminV2Notices() {
  const { userData } = useAuthStore();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tag, setTag] = useState("");

  const fetchNotices = useCallback(async () => {
    if (!userData?.id) return;
    try {
      const res = await fetchFromHasura(getNoticesQuery, { partner_id: userData.id });
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

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTag("");
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!title.trim() || !userData?.id) {
      toast.error("Please enter a title");
      return;
    }
    setSaving(true);
    try {
      const noticeData = JSON.stringify({ title: title.trim(), description: description.trim(), tag: tag.trim() });

      const object: Record<string, any> = {
        partner_id: userData.id,
        image_url: `json:${noticeData}`,
        type: "fixed",
        is_active: true,
        show_always: true,
        priority: notices.length,
      };

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
        prev.map((n) => (n.id === notice.id ? { ...n, is_active: !n.is_active } : n)),
      );
      if (userData?.id) revalidateTag(userData.id);
    } catch {
      toast.error("Failed to update notice");
    }
  };

  const handleDelete = async (notice: Notice) => {
    setDeletingId(notice.id);
    try {
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
            Create notices that customers see on your storefront
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
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Weekend Brunch is back"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Sat & Sun · 10am to 2pm"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Tag</Label>
              <Input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder='e.g. NEW, 20% OFF, LIMITED'
              />
              <p className="text-xs text-muted-foreground mt-1">Short label shown on the notice card</p>
            </div>

            {/* Preview */}
            {title && (
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Preview</Label>
                <div className="rounded-[18px] p-[18px] bg-gray-900 text-white flex flex-col gap-2.5 max-w-[280px]">
                  {tag && (
                    <span className="self-start text-[10px] font-bold tracking-[0.08em] uppercase px-2 py-1 rounded-md bg-white/20">
                      {tag}
                    </span>
                  )}
                  <div className="text-[17px] font-semibold tracking-tight leading-[1.25]">{title}</div>
                  {description && (
                    <div className="text-[13px] opacity-80 leading-relaxed">{description}</div>
                  )}
                </div>
              </div>
            )}

            <Button
              onClick={handleCreate}
              disabled={saving || !title.trim()}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {saving ? "Creating..." : "Create Notice"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Notices List */}
      {notices.length === 0 && !showForm ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No notices yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Create your first notice to engage customers
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notices.map((notice) => {
            const data = parseNoticeData(notice);
            return (
              <div
                key={notice.id}
                className={`rounded-xl border p-4 flex items-center gap-4 transition-opacity ${
                  notice.is_active ? "border-gray-200 bg-white dark:bg-gray-900" : "border-gray-200 opacity-50"
                }`}
              >
                {/* Notice preview */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {data.tag && (
                      <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-900 text-white dark:bg-white dark:text-gray-900">
                        {data.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{data.title}</p>
                  {data.description && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{data.description}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={notice.is_active}
                    onCheckedChange={() => handleToggle(notice)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(notice)}
                    disabled={deletingId === notice.id}
                    className="text-gray-400 hover:text-red-500 p-1 h-auto"
                  >
                    {deletingId === notice.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
