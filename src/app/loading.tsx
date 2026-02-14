"use client";

import FullScreenLoader from "@/components/ui/FullScreenLoader";
import React from "react";
import { useDomain } from "@/providers/DomainProvider";

const Loading = () => {
  const appName = "Menuthere";
  return (
    <FullScreenLoader
      isLoading={true}
      loadingTexts={[
        `Loading $Menuthere...`,
        "Preparing deliciousness...",
        "Almost there...",
      ]}
    />
  );
};

export default Loading;
