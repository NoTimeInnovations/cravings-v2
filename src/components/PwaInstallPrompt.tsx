"use client";
import usePWAInstallPrompt from "@/hooks/usePwaInstallPrompt";
import React, { useEffect, useState } from "react";
import { Drawer, DrawerContent } from "./ui/drawer";

import { Carousel, CarouselContent, CarouselItem } from "./ui/carousel";
import Img from "./Img";

import { useDomain } from "@/providers/DomainProvider";

const PwaInstallPrompt = () => {
  const { isInstallable, promptInstall } = usePWAInstallPrompt();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const appName = "Menuthere";
  const scrnShots = [
    "/scrnshots/1.png",
    "/scrnshots/2.png",
    "/scrnshots/3.png",
    "/scrnshots/4.png",
  ];

  const handleOnClose = () => {
    localStorage?.setItem("isInstallable", "0");
    setIsDialogOpen(false);
  };

  useEffect(() => {
    const hasClosed = localStorage?.getItem("isInstallable");
    if (hasClosed === "0") return;

    if (isInstallable) {
      setIsDialogOpen(true);
    }
  }, [isInstallable]);

  return (
    <Drawer dismissible={true} onClose={handleOnClose} open={isDialogOpen}>
      <DrawerContent className="sm:px-[10%]">
        {/* header  */}
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black/10">
          <div className="flex items-center gap-2 ">
            <Img
              src={"/Menuthere-logo.png"}
              alt="Menuthere"
              width={64}
              height={64}
              className="rounded-md w-[50px] aspect-square sm:w-[80px]"
            />

            {/* title and website  */}
            <div className="grid">
              <h1 className="sm:text-xl">Menuthere</h1>
              <p className="text-sm sm:text-lg text-black/60">
                {typeof window !== "undefined"
                  ? window.location.host
                  : "menuthere.com"}
              </p>
            </div>
          </div>

          {/* install button  */}
          <button
            onClick={promptInstall}
            className="text-white bg-orange-500 rounded-full px-4 py-2 sm:text-lg"
          >
            Install
          </button>
        </div>

        {/* contents  */}
        <div className="px-4 py-3 sm:py-5">
          <p className="text-sm text-black/60 sm:text-lg">
            We are excited to introduce Menuthere, your go-to app for finding
            the best food offers from nearby hotels in real-time!
          </p>

          {/* carousal  */}
          <div className="my-2 sm:my-5">
            <Carousel>
              <CarouselContent>
                {scrnShots.map((scrnshot, index) => (
                  <CarouselItem
                    className="basis-auto"
                    key={`screenshot ${index + 1}`}
                  >
                    <div className="relative aspect-[9/21] w-[130px] xl:w-[180px]">
                      <Img
                        src={scrnshot}
                        alt={`Screenshot ${index + 1}`}
                        className="w-auto h-auto object-cover "
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default PwaInstallPrompt;
