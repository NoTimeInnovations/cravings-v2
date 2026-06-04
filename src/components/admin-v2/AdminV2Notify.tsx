"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Megaphone, Send, Users, X } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { ImageUpload } from "@/components/storefront/ImageUpload";
import { toast } from "sonner";
import TEST_PARTNERS from "@/utils/testPartnerAccounts";

const NOTIFICATION_SERVER_URL = "https://notification-server-khaki.vercel.app";

const TITLE_MAX = 65;
const BODY_MAX = 240;

const followersWithTokensQuery = `
  query GetPartnerFollowerTokens($partnerId: uuid!) {
    followers(where: { partner_id: { _eq: $partnerId } }) {
      user_id
    }
  }
`;

const deviceTokensQuery = `
  query GetUserDeviceTokens($userIds: [String!]!, $partnerId: uuid!) {
    device_tokens(
      where: {
        user_id: { _in: $userIds }
        partner_id: { _eq: $partnerId }
      }
    ) {
      device_token
    }
  }
`;

// All installs of this partner's app — including users who never logged in or
// followed. Scoped by partner_id (correct for the shared-Android / per-iOS
// OneSignal setup, since each token is stored with its partner).
const appInstallTokensQuery = `
  query GetPartnerAppInstalls($partnerId: uuid!) {
    app_installs(where: { partner_id: { _eq: $partnerId } }) {
      device_token
    }
  }
`;

type NotifyAudience = "app" | "followers";

// Resolve the recipient device tokens for the chosen audience.
async function resolveTokens(
  audience: NotifyAudience,
  partnerId: string,
): Promise<string[]> {
  if (audience === "app") {
    const { app_installs } = await fetchFromHasura(appInstallTokensQuery, { partnerId });
    return Array.from(
      new Set((app_installs || []).map((a: any) => a.device_token).filter(Boolean)),
    );
  }
  const { followers } = await fetchFromHasura(followersWithTokensQuery, { partnerId });
  const userIds: string[] = (followers || []).map((f: any) => f.user_id);
  if (userIds.length === 0) return [];
  const { device_tokens } = await fetchFromHasura(deviceTokensQuery, { userIds, partnerId });
  return Array.from(
    new Set((device_tokens || []).map((d: any) => d.device_token).filter(Boolean)),
  );
}

export function AdminV2Notify() {
  const { userData } = useAuthStore();
  const partnerId = (userData as any)?.id;
  const partnerUsername = (userData as any)?.username;
  const storeName = (userData as any)?.store_name;

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [audience, setAudience] = useState<NotifyAudience>("app");
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [sending, setSending] = useState(false);

  const refreshRecipients = useCallback(async () => {
    if (!partnerId) return;
    setLoadingRecipients(true);
    try {
      const tokens = await resolveTokens(audience, partnerId);
      setRecipientCount(tokens.length);
    } catch (err) {
      console.error("Failed to load recipients:", err);
      setRecipientCount(null);
    } finally {
      setLoadingRecipients(false);
    }
  }, [partnerId, audience]);

  useEffect(() => {
    refreshRecipients();
  }, [refreshRecipients]);

  const titleTrimmed = title.trim();
  const bodyTrimmed = body.trim();
  const canSend = useMemo(
    () =>
      !!partnerId &&
      titleTrimmed.length > 0 &&
      bodyTrimmed.length > 0 &&
      !sending,
    [partnerId, titleTrimmed, bodyTrimmed, sending],
  );

  const handleSend = async () => {
    if (!canSend || !partnerId) return;

    if (TEST_PARTNERS.includes(partnerId)) {
      toast.message("Skipped — this is a test partner account.");
      return;
    }

    setSending(true);
    try {
      const tokens = await resolveTokens(audience, partnerId);

      if (tokens.length === 0) {
        toast.error(
          audience === "app"
            ? "No app installs yet. Notifications reach people who installed your app."
            : "None of your followers have notifications enabled yet.",
        );
        return;
      }

      const targetUrl = partnerUsername
        ? `https://menuthere.com/${partnerUsername}`
        : "https://menuthere.com";

      const message = {
        tokens,
        notification: {
          title: titleTrimmed,
          body: bodyTrimmed,
          ...(imageUrl ? { imageUrl } : {}),
        },
        android: {
          priority: "high" as const,
          notification: {
            icon: "ic_stat_logo",
            channelId: "cravings_channel_2",
            sound: "default_sound",
            ...(imageUrl ? { imageUrl } : {}),
          },
        },
        apns: {
          headers: { "apns-priority": "10" },
          payload: { aps: { sound: "default_sound", contentAvailable: true } },
          ...(imageUrl ? { fcm_options: { image: imageUrl } } : {}),
        },
        data: {
          url: targetUrl,
          channel_id: "cravings_channel_2",
          sound: "default_sound",
          type: "broadcast",
          partner_id: partnerId,
          ...(imageUrl ? { image: imageUrl } : {}),
        },
      };

      const res = await fetch(`${NOTIFICATION_SERVER_URL}/api/notifications/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, partner_id: partnerId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to send notification");
      }

      toast.success(
        `Sent to ${tokens.length} device${tokens.length === 1 ? "" : "s"}.`,
      );
      setTitle("");
      setBody("");
      setImageUrl("");
      refreshRecipients();
    } catch (err: any) {
      console.error("Send notify error:", err);
      toast.error(err?.message || "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 w-full lg:max-w-[80%] mx-auto px-2 sm:px-4 lg:px-0">
      <div className="flex items-center justify-between gap-5 flex-wrap">
        <div className="flex items-center gap-3">
          <Megaphone className="h-7 w-7 text-orange-600" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Notify</h1>
            <p className="text-muted-foreground">
              Push a message to {storeName || "your store"}&apos;s app users.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          {loadingRecipients ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> counting…
            </span>
          ) : recipientCount === null ? (
            <span>—</span>
          ) : (
            <span>
              {recipientCount} device{recipientCount === 1 ? "" : "s"} reachable
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Compose notification</CardTitle>
            <CardDescription>
              Title and body are required. Add an image to make it stand out — Android
              and iOS will render it inline.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="mb-1.5 block">Send to</Label>
              <div className="inline-flex rounded-lg border p-0.5 bg-muted/40">
                <button
                  type="button"
                  onClick={() => setAudience("app")}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    audience === "app"
                      ? "bg-white shadow-sm font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  All app users
                </button>
                <button
                  type="button"
                  onClick={() => setAudience("followers")}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    audience === "followers"
                      ? "bg-white shadow-sm font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  Followers only
                </button>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {audience === "app"
                  ? "Everyone who installed your app — including users who never logged in or followed."
                  : "Only people who tapped Follow on your storefront and have notifications on."}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="notify-title">Title</Label>
                <span className="text-xs text-muted-foreground">
                  {title.length}/{TITLE_MAX}
                </span>
              </div>
              <Input
                id="notify-title"
                value={title}
                maxLength={TITLE_MAX}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Fresh batch of biryani at 1 PM"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="notify-body">Message</Label>
                <span className="text-xs text-muted-foreground">
                  {body.length}/{BODY_MAX}
                </span>
              </div>
              <Textarea
                id="notify-body"
                value={body}
                maxLength={BODY_MAX}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="Drop in this afternoon — limited plates."
              />
            </div>

            <div>
              <Label className="mb-1.5 block">Image (optional)</Label>
              {imageUrl ? (
                <div className="relative inline-block">
                  <img
                    src={imageUrl}
                    alt="notification preview"
                    className="h-40 w-auto rounded-md border object-cover"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute top-1 right-1 h-7 w-7"
                    onClick={() => setImageUrl("")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <ImageUpload
                  value={imageUrl}
                  onChange={setImageUrl}
                  folder="notify-broadcasts"
                />
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSend}
                disabled={!canSend}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {sending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {sending ? "Sending…" : "Send notification"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>Roughly how it appears on a device.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border bg-neutral-50 dark:bg-neutral-900 p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-md bg-orange-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {(storeName || "M").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground truncate">
                      {storeName || "Menuthere"}
                    </p>
                    <span className="text-[10px] text-muted-foreground">now</span>
                  </div>
                  <p className="font-semibold text-sm mt-0.5 break-words">
                    {titleTrimmed || "Notification title"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-line break-words">
                    {bodyTrimmed || "Your message text shows here."}
                  </p>
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt=""
                      className="mt-2 rounded-md max-h-40 w-full object-cover"
                    />
                  )}
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
              {audience === "app"
                ? "Sends to every device that installed your app — no login or follow required."
                : "Sends to followers who have notifications enabled on at least one device."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
