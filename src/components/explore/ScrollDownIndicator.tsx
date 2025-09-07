// components/ScrollDownIndicator.tsx

"use client";

import { ChevronDown } from "lucide-react";
import React, { useState, useEffect } from "react";

const ScrollDownIndicator = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      // Hide the indicator if user has scrolled more than 50px
      if (window.scrollY > 50) {
        setIsVisible(false);
      }
    };

    // Add the event listener when the component mounts
    window.addEventListener("scroll", handleScroll);

    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []); // The empty dependency array ensures this effect runs only once

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center pointer-events-none">
      <div className="bg-white bg-opacity-20 backdrop-blur-sm p-2 rounded-full animate-bounce">
        <ChevronDown className="w-8 h-8 text-white" />
      </div>
    </div>
  );
};

export default ScrollDownIndicator;