"use client";

import FullScreenLoader from "@/components/ui/FullScreenLoader";
import React from "react";
import { useDomain } from "@/providers/DomainProvider";

const Loading = () => {
  const { name: appName } = useDomain();
  return <FullScreenLoader isLoading={true} loadingTexts={[`Loading ${appName}...`, "Preparing deliciousness...", "Almost there..."]} />;
};

export default Loading;

