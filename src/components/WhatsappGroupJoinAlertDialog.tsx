"use client";

import React, { useState, useEffect } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useLocationStore } from "@/store/geolocationStore";

const whatsappGroups = [
  {
    location: "alappuzha",
    link: "https://chat.whatsapp.com/HXwsVkPIOypGE0zYGQiSIL?mode=r_t",
  },
  {
    location: "ernakulam",
    link: "https://chat.whatsapp.com/BDP726oooKACS0Y93Al7kR?mode=r_t",
  },
  {
    location: "idukki",
    link: "https://chat.whatsapp.com/Bi4GYPKKpNF7OhiDXZDEHW?mode=r_t",
  },
  {
    location: "kannur",
    link: "https://chat.whatsapp.com/Fd899HvRtCY3wQWPZxI6CF?mode=r_t",
  },
  {
    location: "kasaragod",
    link: "https://chat.whatsapp.com/FQilQdjD74M77TOJJkuCzG?mode=r_t",
  },
  {
    location: "kollam",
    link: "https://chat.whatsapp.com/IbNSIQp4DovHTIYsfbyleU?mode=r_t",
  },
  {
    location: "kottayam",
    link: "https://chat.whatsapp.com/HU6DHMirK6a1I4Sqe2XrYu?mode=r_t",
  },
  {
    location: "kozhikode",
    link: "https://chat.whatsapp.com/CfNocjQpkUZHGDm64smhn5?mode=r_t",
  },
  {
    location: "malappuram",
    link: "https://chat.whatsapp.com/JQxww64JdPg1VAEwyus62s?mode=r_t",
  },
  {
    location: "palakkad",
    link: "https://chat.whatsapp.com/JROy7Wq12jJI7hbm8YdgF7?mode=r_t",
  },
  {
    location: "pathanamthitta",
    link: "https://chat.whatsapp.com/Jyj0l25nlX1BNWcAPzZmWK?mode=r_t",
  },
  {
    location: "thiruvananthapuram",
    link: "https://chat.whatsapp.com/DiP5Wd1Ck8yA8t8Ch0j1iO?mode=r_t",
  },
  {
    location: "thrissur",
    link: "https://chat.whatsapp.com/GbCePgUcEItLcutzCOnvAp?mode=r_t",
  },
  {
    location: "wayanad",
    link: "https://chat.whatsapp.com/BmI3Y8r0gam2rVg7mXLyoQ?mode=r_t",
  },
];

const HIDDEN_PATHS = [
  "/get-started",
  "/admin-v2",
  "/admin",
  "/pricing",
  "/captain",
  "/onboard",
  "/superadmin",
];

const LOCATION_ALLOWED_PATHS = ["/qrScan", "/hotelsNear"];

const WhatsappGroupJoinAlertDialog = () => {
  const pathname = usePathname();
  const { userData } = useAuthStore();
  const cachedCoords = useLocationStore((s) => s.coords);
  // 'hidden', 'modal', or 'floating'
  const [displayState, setDisplayState] = useState<
    "hidden" | "modal" | "floating"
  >("hidden");
  const [groupLink, setGroupLink] = useState("");
  const [district, setDistrict] = useState("");

  // Hide on certain paths or for non-user/non-guest roles
  const isHiddenPath = HIDDEN_PATHS.some((p) => pathname.startsWith(p));
  const isUserOrGuest = !userData?.role || userData.role === "user";
  const shouldHide = isHiddenPath || !isUserOrGuest;

  useEffect(() => {
    if (shouldHide) return;
    // 1. If user has ever clicked "Join Now", never show anything again.
    const hasJoined = localStorage?.getItem("whatsappDialogJoined");
    if (hasJoined === "true") {
      return;
    }

    // 2. If user has previously closed the modal, show the floating icon immediately.
    const closedTimestamp = localStorage?.getItem(
      "whatsappDialogClosedTimestamp"
    );
    if (closedTimestamp) {
      const sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - parseInt(closedTimestamp) < sevenDaysInMillis) {
        fetchUserLocation(false);
        return;
      }
    }

    // 3. For new users, wait 10 seconds and then try to show the modal.
    const timer = setTimeout(() => {
      fetchUserLocation(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, [shouldHide, cachedCoords, pathname]);

  if (shouldHide) {
    return null;
  }

  const fetchUserLocation = (showModalOnSuccess = false) => {
    // Use cached location from store if available (no permission prompt)
    if (cachedCoords) {
      const mockPosition = {
        coords: { latitude: cachedCoords.lat, longitude: cachedCoords.lng },
      } as GeolocationPosition;
      handleSuccess(mockPosition, showModalOnSuccess);
      return;
    }

    // Only request location permission on allowed paths
    const canRequestLocation = LOCATION_ALLOWED_PATHS.some((p) =>
      pathname.startsWith(p)
    );
    if (!canRequestLocation || !navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => handleSuccess(position, showModalOnSuccess),
      handleError
    );
  };

  const handleSuccess = async (
    position: GeolocationPosition,
    showModalOnSuccess: boolean
  ) => {
    const { latitude, longitude } = position.coords;
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    if (!mapboxToken) {
      console.error("Mapbox token is not configured.");
      return;
    }

    const apiUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?types=district,region&access_token=${mapboxToken}`;

    try {
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const features = data.features;
        const region = features.find((c: { id: string; text: string }) =>
          c.id.startsWith("region")
        );
        const districtObj = features.find((c: { id: string; text: string }) =>
          c.id.startsWith("district")
        );

        if (region && region.text.toLowerCase() === "kerala" && districtObj) {
          const userDistrict = districtObj.text
            .toLowerCase()
            .replace(" district", "");
          let foundGroup = null;

          foundGroup = whatsappGroups.find(
            (group) => group.location.toLowerCase() === userDistrict
          );

          if (foundGroup) {
            setGroupLink(foundGroup.link);
            setDistrict(districtObj.text);
            // Decide whether to show the modal or the floating button based on the flag
            setDisplayState(showModalOnSuccess ? "modal" : "floating");
          }
        }
      }
    } catch (error) {
      console.error("Error fetching location data:", error);
    }
  };

  const handleError = (error: GeolocationPositionError) => {
    console.error(`Geolocation error: ${error.message}`);
  };

  const handleJoin = () => {
    localStorage?.setItem("whatsappDialogJoined", "true");
    setDisplayState("hidden"); // Hide component permanently
  };

  const handleClose = () => {
    localStorage?.setItem(
      "whatsappDialogClosedTimestamp",
      Date.now().toString()
    );
    setDisplayState("floating"); // Switch to floating button
  };

  const handleIconClick = () => {
    setDisplayState("modal"); // Show the modal again
  };

  // Render logic based on the displayState
  if (displayState === "hidden") {
    return null;
  }

  if (displayState === "floating") {
    return (
      <button
        onClick={handleIconClick}
        className="fixed bottom-20 right-0 z-[4999] flex h-12 w-12 items-center justify-center rounded-full bg-green-500 shadow-lg transition-transform hover:scale-110"
        aria-label="Open WhatsApp group invitation"
      >
        <FaWhatsapp size={20} className="text-white" />
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
    >
      <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-xl">
        <h2 className="mb-3 text-lg font-semibold">
          Join our WhatsApp Group! 👋
        </h2>
        <p className="mb-6 text-sm text-gray-600">
          {`Join our WhatsApp group for ${district} to get the latest updates and offers!`}
        </p>
        <div className="flex justify-center">
          <button
            onClick={handleClose}
            className="mr-2 rounded bg-gray-200 px-5 py-2 font-semibold text-gray-800 transition-colors hover:bg-gray-300"
          >
            Close
          </button>
          <a
            href={groupLink}
            onClick={handleJoin}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded bg-green-500 px-5 py-2 font-bold text-white transition-colors hover:bg-green-600"
          >
            Join Now
          </a>
        </div>
      </div>
    </div>
  );
};

export default WhatsappGroupJoinAlertDialog;
