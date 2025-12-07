import FullScreenLoader from "@/components/ui/FullScreenLoader";
import React from "react";

const Loading = () => {
  return <FullScreenLoader isLoading={true} loadingTexts={["Loading Cravings...", "Preparing deliciousness...", "Almost there..."]} />;
};

export default Loading;

