import { DeliveryRules } from "@/store/orderStore";
import { readableTextColor } from "@/lib/brandColor";
import React from "react";

const formatTo12Hour = (timeStr: string | undefined): string => {
  if (!timeStr) {
    return "";
  }
  if (timeStr === "24:00") {
    return "12:00 AM";
  }
  const [hoursStr, minutes] = timeStr.split(":");
  const hours24 = parseInt(hoursStr, 10);
  if (isNaN(hours24)) {
    return "";
  }
  const ampm = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  hours12 = hours12 ? hours12 : 12;
  return `${hours12}:${minutes} ${ampm}`;
};

const DeliveryTimeCampain = ({
  deliveryRules,
  accent,
}: {
  deliveryRules: DeliveryRules;
  /** Brand color for the banner background. Falls back to indigo when absent.
      Text/icon color is auto-chosen for contrast. */
  accent?: string | null;
}) => {
  const isDeliveryActive = deliveryRules?.isDeliveryActive ?? true;
  const brandStyle = accent
    ? { backgroundColor: accent, color: readableTextColor(accent) }
    : undefined;

  if (!isDeliveryActive) {
    return (
      <div className="w-full flex items-center justify-center gap-x-3 p-2 bg-slate-500 text-white font-bold text-sm">
        <span>😥</span>
        <p>Delivery is currently unavailable. Please check back later.</p>
      </div>
    );
  }

  const fromStr = deliveryRules?.delivery_time_allowed?.from;
  const toStr = deliveryRules?.delivery_time_allowed?.to;

  const fromTime = formatTo12Hour(fromStr);
  const toTime = formatTo12Hour(toStr);

  if (!fromStr || !toStr || !fromTime || !toTime) {
    return null;
  }

  const now = new Date();
  
  const startTime = new Date();
  const [fromHours, fromMinutes] = fromStr.split(":").map(Number);
  startTime.setHours(fromHours, fromMinutes, 0, 0);

  const endTime = new Date();
  const [toHours, toMinutes] = toStr.split(":").map(Number);
  endTime.setHours(toHours, toMinutes, 0, 0);

  let isWithinDeliveryTime = false;
  if (startTime > endTime) {
    if (now >= startTime || now <= endTime) {
      isWithinDeliveryTime = true;
    }
  } else {
    if (now >= startTime && now <= endTime) {
      isWithinDeliveryTime = true;
    }
  }

  if (isWithinDeliveryTime) {
    return null;
  }

  return (
    <div
      className={`w-full flex items-center justify-center gap-x-3 p-2 font-bold text-sm shadow-lg${
        accent ? "" : " bg-indigo-500 text-white"
      }`}
      style={brandStyle}
    >
      <span>🗓️</span>
      <p>
        Delivery Time{" "}
        <span className="px-2 py-1 rounded">
          {fromTime} - {toTime}
        </span>
      </p>
    </div>
  );
};

export default DeliveryTimeCampain;