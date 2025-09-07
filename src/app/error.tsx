"use client";

import * as Sentry from "@sentry/nextjs";
import { UtensilsCrossed } from "lucide-react";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="grid place-content-center w-full min-h-[90vh] opacity-70">
      <UtensilsCrossed className="text-orange-600 h-40 w-40 justify-self-center" />
      <h1 className="text-center mt-2 font-bold text-xl text-orange-600">
        Something went wrong!
      </h1>
      <p className="text-center mt-2 text-sm text-gray-600">
        {JSON.stringify(error)}
      </p>
    </div>
  );
}
