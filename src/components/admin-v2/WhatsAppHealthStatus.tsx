"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";

type Issue = {
  entity: string;
  canSend?: string;
  code: number;
  description: string;
  solution?: string;
};

type Health = {
  connected: boolean;
  name?: string | null;
  accountReviewStatus?: string | null;
  businessVerified?: boolean;
  businessVerificationStatus?: string | null;
  canSendMessage?: string;
  issues?: Issue[];
  paymentIssue?: boolean;
  verificationIssue?: boolean;
  canCreateAuthTemplates?: boolean;
  error?: string;
};

function Row({
  state,
  label,
  detail,
}: {
  state: "ok" | "warn" | "bad";
  label: string;
  detail?: string;
}) {
  const Icon =
    state === "ok" ? CheckCircle2 : state === "warn" ? AlertTriangle : XCircle;
  const color =
    state === "ok"
      ? "text-green-600"
      : state === "warn"
      ? "text-amber-600"
      : "text-red-600";
  return (
    <div className="flex items-start gap-2">
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${color}`} />
      <div className="min-w-0">
        <p className="text-sm leading-tight">{label}</p>
        {detail && (
          <p className="text-xs text-muted-foreground leading-tight">{detail}</p>
        )}
      </div>
    </div>
  );
}

// Shows the partner WABA's Meta account state — business verification and
// messaging/payment health — so partners understand why OTP/authentication
// templates or proactive sends are blocked. Renders nothing until a connected
// WABA with a known status is found.
export function WhatsAppHealthStatus({
  partnerId,
  className,
}: {
  partnerId?: string;
  className?: string;
}) {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/whatsapp/meta/health?partnerId=${partnerId}`);
      setHealth(await res.json());
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div
        className={`flex items-center gap-2 text-sm text-muted-foreground ${className || ""}`}
      >
        <Loader2 className="h-4 w-4 animate-spin" /> Checking WhatsApp account
        status…
      </div>
    );
  }
  if (!health || !health.connected) return null;
  if (health.error) {
    return (
      <div className={`text-xs text-muted-foreground ${className || ""}`}>
        Couldn&apos;t load WhatsApp account status: {health.error}
      </div>
    );
  }

  const canSend = health.canSendMessage || "UNKNOWN";

  return (
    <div className={`rounded-lg border bg-muted/30 p-3 space-y-2 ${className || ""}`}>
      <p className="text-xs font-medium text-muted-foreground">
        WhatsApp account status
      </p>

      <Row
        state={health.businessVerified ? "ok" : "warn"}
        label={
          health.businessVerified
            ? "Business verified"
            : "Business not verified"
        }
        detail={
          health.businessVerified
            ? undefined
            : "Required to create OTP / authentication templates."
        }
      />

      {canSend !== "UNKNOWN" && (
        <Row
          state={
            canSend === "AVAILABLE"
              ? "ok"
              : canSend === "LIMITED"
              ? "warn"
              : "bad"
          }
          label={
            canSend === "AVAILABLE"
              ? "Messaging active"
              : canSend === "LIMITED"
              ? "Messaging limited"
              : "Messaging blocked"
          }
          detail={
            canSend === "AVAILABLE"
              ? undefined
              : "Business-initiated messages (OTP, order updates) may not send."
          }
        />
      )}

      {(health.issues?.length ?? 0) > 0 && (
        <ul className="space-y-1 pt-1 border-t mt-1">
          {health.issues!.map((i, idx) => (
            <li key={idx} className="text-xs text-muted-foreground pt-1">
              <span className="font-medium text-foreground">{i.description}</span>
              {i.solution ? ` — ${i.solution}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
