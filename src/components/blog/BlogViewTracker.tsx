"use client";

import { useEffect } from "react";

export function BlogViewTracker({ postId }: { postId: string }) {
  useEffect(() => {
    if (!postId) return;

    fetch("/api/blog-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    }).catch(() => {});
  }, [postId]);

  return null;
}
