import { CheckCircle2 } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ code?: string }>;
}

export const dynamic = "force-dynamic";

export default async function DataDeletionStatusPage({ searchParams }: PageProps) {
  const { code } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="max-w-lg w-full rounded-xl border bg-card p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-7 w-7 text-green-600" />
          <h1 className="text-xl font-semibold">Data deletion confirmed</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Your request to delete the data we hold for the connected WhatsApp Business Account
          has been received and processed. We have removed your WhatsApp integration record,
          your message templates, and your message logs from our systems.
        </p>
        {code && (
          <div className="rounded-md bg-muted/60 p-3 text-sm">
            <div className="text-muted-foreground">Confirmation code</div>
            <div className="font-mono text-foreground break-all">{code}</div>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          If you have questions about the deletion, contact{" "}
          <a className="underline" href="mailto:support@menuthere.com">
            support@menuthere.com
          </a>{" "}
          with this confirmation code.
        </p>
      </div>
    </main>
  );
}
