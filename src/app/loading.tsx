"use client";

import FullScreenLoader from "@/components/ui/FullScreenLoader";
import React from "react";
import { useDomain } from "@/providers/DomainProvider";

const Loading = () => {
  const appName = "MenuThere";
  return <FullScreenLoader isLoading={true} loadingTexts={[`Loading $MenuThere...`, "Preparing deliciousness...", "Almost there..."]} />;
};

export default Loading;

