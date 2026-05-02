"use client";

import { useEffect, useState } from "react";

interface Props {
  playstoreUrl: string;
  appstoreUrl: string;
  buttonColor: string;
}

function detectIsIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // iPad on iPadOS reports as MacIntel + touch — covers that case too
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  if (
    navigator.platform === "MacIntel" &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1
  )
    return true;
  return false;
}

export default function DownloadAppButton({
  playstoreUrl,
  appstoreUrl,
  buttonColor,
}: Props) {
  // Default to Play Store on the server; correct to App Store on iOS after mount.
  const initialHref = playstoreUrl || appstoreUrl || "#";
  const [href, setHref] = useState(initialHref);

  useEffect(() => {
    const isIOS = detectIsIOS();
    if (isIOS && appstoreUrl) {
      setHref(appstoreUrl);
    } else if (!isIOS && playstoreUrl) {
      setHref(playstoreUrl);
    } else {
      setHref(playstoreUrl || appstoreUrl || "#");
    }
  }, [playstoreUrl, appstoreUrl]);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="info-btn-press flex items-center justify-center text-white"
      style={{
        height: 56,
        borderRadius: 16,
        background: buttonColor,
        fontSize: 16,
        fontWeight: 700,
        letterSpacing: 0.1,
        gap: 10,
        boxShadow: `0 8px 24px ${buttonColor}55, 0 1px 0 rgba(255,255,255,0.2) inset`,
        textDecoration: "none",
      }}
    >
      <svg
        width={20}
        height={20}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
      </svg>
      Download App
    </a>
  );
}
