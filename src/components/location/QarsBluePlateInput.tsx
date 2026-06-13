"use client";

import { useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import convertQarsToCoord from "@/app/actions/convertQarsToCoord";

/**
 * Compact Qatar "blue plate" (QARS) address input.
 *
 * Lets a user enter the Zone / Street / Building numbers printed on Qatar's
 * blue building plates and resolves them to exact WGS84 coordinates via the
 * official Qatar GIS service. Used to refine a rough Google Maps pin to the
 * precise building — shown only for Qatar partners.
 */
export default function QarsBluePlateInput({
  accent = "#EA580C",
  className = "",
  onResolved,
}: {
  accent?: string;
  className?: string;
  onResolved: (coords: { lat: number; lng: number }, qars: string | null) => void;
}) {
  const [zone, setZone] = useState("");
  const [street, setStreet] = useState("");
  const [building, setBuilding] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLookup = async () => {
    const z = Number(zone);
    const s = Number(street);
    const b = Number(building);
    if (!z || !s || !b) {
      toast.error("Enter Zone, Street and Building numbers");
      return;
    }
    setLoading(true);
    try {
      const result = await convertQarsToCoord(z, s, b);
      if (!result) {
        toast.error("No building found for that Zone / Street / Building");
        return;
      }
      const [lng, lat] = result.coordinates;
      onResolved({ lat, lng }, result.qars);
      toast.success("Exact location found");
    } catch (error) {
      console.error("QARS lookup failed:", error);
      toast.error("Couldn't look up that address");
    } finally {
      setLoading(false);
    }
  };

  const numField = (
    value: string,
    set: (v: string) => void,
    placeholder: string,
    width: string,
  ) => (
    <input
      inputMode="numeric"
      value={value}
      onChange={(e) => set(e.target.value.replace(/\D/g, ""))}
      placeholder={placeholder}
      className={`${width} h-10 px-2 rounded-lg border border-gray-200 bg-white text-sm text-center placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200`}
    />
  );

  return (
    <div className={`rounded-xl border border-gray-200 bg-gray-50 p-3 ${className}`}>
      <div className="flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5" style={{ color: accent }} />
        <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-gray-500">
          Qatar blue plate
        </p>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Enter the Zone / Street / Building numbers for the exact location.
      </p>
      <div className="mt-2 flex items-center gap-2">
        {numField(zone, setZone, "Zone", "w-16")}
        {numField(street, setStreet, "Street", "w-20")}
        {numField(building, setBuilding, "Bldg", "w-16")}
        <button
          type="button"
          onClick={handleLookup}
          disabled={loading}
          className="flex-1 h-10 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-[0.98] transition-transform"
          style={{ backgroundColor: accent }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pin exact"}
        </button>
      </div>
    </div>
  );
}
