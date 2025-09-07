import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeliveryRules, DeliveryRange } from "@/store/orderStore";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

interface DeliveryAndGeoLocationSettingsProps {
  // GeoLocation props
  geoLocation: {
    latitude: number;
    longitude: number;
  };
  setGeoLocation: (location: { latitude: number; longitude: number }) => void;
  geoLoading: boolean;
  geoSaving: boolean;
  geoError: string | null;
  handleGetCurrentLocation: () => Promise<
    { latitude: number; longitude: number } | null | undefined
  >;
  handleSaveGeoLocation: (location?: {
    latitude: number;
    longitude: number;
  }) => void;

  // Delivery Settings props
  currency: {
    value: string;
  };
  deliveryRate: number;
  setDeliveryRate: (value: number) => void;
  deliveryRules: DeliveryRules;
  setDeliveryRules: (rules: DeliveryRules) => void;
  isEditingDelivery: boolean;
  setIsEditingDelivery: (value: boolean) => void;
  deliverySaving: boolean;
  handleSaveDeliverySettings: () => void;
  location: string;
  setLocation: (value: string) => void;
  locationSaving: boolean;
  locationEditing: boolean;
  setIsEditingLocation: (value: boolean) => void;
  handleSaveLocation: () => void;
}

export function DeliveryAndGeoLocationSettings({
  geoLocation,
  setGeoLocation,
  geoSaving,
  geoError,
  handleSaveGeoLocation,
  currency,
  deliveryRate,
  setDeliveryRate,
  deliveryRules,
  setDeliveryRules,
  isEditingDelivery,
  setIsEditingDelivery,
  deliverySaving,
  handleSaveDeliverySettings,
  location,
  setLocation,
  locationSaving,
  locationEditing,
  setIsEditingLocation,
  handleSaveLocation,
}: DeliveryAndGeoLocationSettingsProps) {
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [marker, setMarker] = useState<mapboxgl.Marker | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    if (mapDialogOpen && mapContainer.current && !map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [
          geoLocation.longitude || 77.5946,
          geoLocation.latitude || 12.9716,
        ],
        zoom: 14,
      });

      if (geoLocation.latitude && geoLocation.longitude) {
        const newMarker = new mapboxgl.Marker()
          .setLngLat([geoLocation.longitude, geoLocation.latitude])
          .addTo(map.current);
        setMarker(newMarker);
      }

      map.current.on("click", (e) => {
        if (marker) {
          marker.remove();
        }
        const newMarker = new mapboxgl.Marker()
          .setLngLat(e.lngLat)
          .addTo(map.current!);
        setMarker(newMarker);
        setSelectedLocation({
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
        });
      });

      return () => {
        if (map.current) {
          map.current.remove();
          map.current = null;
        }
      };
    }
  }, [mapDialogOpen, geoLocation, marker]);

  const handleSaveMapLocation = () => {
    if (selectedLocation) {
      setGeoLocation({
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
      });
      handleSaveGeoLocation({
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
      });
      setMapDialogOpen(false);
    }
  };

  return (
    <div className="space-y-8 pt-2">
      <div className="space-y-4 w-full">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Location</h3>
          {locationEditing ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditingLocation(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveLocation} disabled={locationSaving}>
                {locationSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setIsEditingLocation(true)}
              variant="ghost"
              className="gap-2"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </Button>
          )}
        </div>

        {locationEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Location Link</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter your location link"
              />
              <div className="h-px"></div>
              <a
                className="text-orange-600 underline"
                href="https://www.google.com/maps"
                target="_blank"
                rel="noopener noreferrer"
              >
                Get Link {"-->"}
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-48 w-full rounded-md overflow-hidden relative border">
              {geoLocation.latitude && geoLocation.longitude ? (
                <div className="h-full w-full bg-gray-100 relative">
                  <img
                    src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+ff0000(${geoLocation.longitude},${geoLocation.latitude})/${geoLocation.longitude},${geoLocation.latitude},16/600x300?access_token=${mapboxgl.accessToken}`}
                    alt="Map preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                  <p className="text-muted-foreground">No location set</p>
                </div>
              )}
            </div>
          </div>
        )}

        {geoError && <p className="text-sm text-red-500">{geoError}</p>}
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Delivery Settings</h3>
          {isEditingDelivery ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditingDelivery(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveDeliverySettings}
                disabled={deliverySaving}
              >
                {deliverySaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setIsEditingDelivery(true)}
              variant="ghost"
              className="gap-2"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <Label>Need Delivery Location</Label>
          {isEditingDelivery ? (
            <Select
              value={deliveryRules.needDeliveryLocation ? "yes" : "no"}
              onValueChange={(value) => {
                const needsLocation = value === "yes";
                setDeliveryRules({
                  ...deliveryRules,
                  needDeliveryLocation: needsLocation,
                  is_fixed_rate: needsLocation
                    ? deliveryRules.is_fixed_rate
                    : true,
                });
                if (!needsLocation) {
                  setDeliveryRate(0);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="p-3 rounded-md border bg-muted/50">
              {deliveryRules.needDeliveryLocation ? "Yes" : "No"}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>
            Delivery Rate {deliveryRules.is_fixed_rate ? "" : "(Per Km)"} (
            {currency?.value})
          </Label>
          {isEditingDelivery ? (
            <Input
              type="number"
              min="0"
              step="0.01"
              value={deliveryRate}
              onChange={(e) => setDeliveryRate(Number(e.target.value))}
            />
          ) : (
            <div className="p-3 rounded-md border bg-muted/50">
              {deliveryRate === 0
                ? "Free"
                : deliveryRate
                ? deliveryRate.toFixed(2)
                : "Not set"}
            </div>
          )}
        </div>

        {deliveryRules.needDeliveryLocation && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Delivery Radius (km)</Label>
                {isEditingDelivery ? (
                  <Input
                    type="number"
                    min="1"
                    value={deliveryRules.delivery_radius}
                    onChange={(e) =>
                      setDeliveryRules({
                        ...deliveryRules,
                        delivery_radius: Number(e.target.value),
                      })
                    }
                  />
                ) : (
                  <div className="p-3 rounded-md border bg-muted/50">
                    {deliveryRules.delivery_radius} km
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Rate Type</Label>
                {isEditingDelivery ? (
                  <Select
                    value={deliveryRules.is_fixed_rate ? "fixed" : "variable"}
                    onValueChange={(value) =>
                      setDeliveryRules({
                        ...deliveryRules,
                        is_fixed_rate: value === "fixed",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select rate type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Rate</SelectItem>
                      <SelectItem value="variable">
                        Variable (per km)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-3 rounded-md border bg-muted/50">
                    {deliveryRules.is_fixed_rate
                      ? "Fixed Rate"
                      : "Variable (per km)"}
                  </div>
                )}
              </div>

              {!deliveryRules.is_fixed_rate && (
                <div className="space-y-4 w-full md:col-span-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-semibold">
                      Delivery Pricing Mode
                    </Label>
                    {isEditingDelivery && (
                      <Select
                        value={deliveryRules.delivery_mode || "basic"}
                        onValueChange={(value: "basic" | "advanced") => {
                          setDeliveryRules({
                            ...deliveryRules,
                            delivery_mode: value,
                            // Initialize appropriate defaults based on mode
                            delivery_ranges: value === "advanced" ? 
                              (deliveryRules.delivery_ranges?.length ? deliveryRules.delivery_ranges : []) : 
                              undefined,
                            first_km_range: value === "basic" ? 
                              (deliveryRules.first_km_range || { km: 1, rate: 0 }) : 
                              undefined,
                          });
                        }}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Basic (First KM + Per KM)</SelectItem>
                          <SelectItem value="advanced">Advanced (Range-based)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Basic Mode - Legacy Format */}
                  {deliveryRules.delivery_mode === "basic" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>First KM Range</Label>
                        {isEditingDelivery ? (
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            value={deliveryRules.first_km_range?.km || 0}
                            onChange={(e) =>
                              setDeliveryRules({
                                ...deliveryRules,
                                first_km_range: {
                                  ...deliveryRules.first_km_range,
                                  km: Number(e.target.value),
                                  rate: deliveryRules.first_km_range?.rate || 0,
                                },
                              })
                            }
                            placeholder="Enter KM range"
                          />
                        ) : (
                          <div className="p-3 rounded-md border bg-muted/50">
                            {deliveryRules.first_km_range?.km || 0} km
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Amount ({currency?.value})</Label>
                        {isEditingDelivery ? (
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={deliveryRules.first_km_range?.rate || 0}
                            onChange={(e) =>
                              setDeliveryRules({
                                ...deliveryRules,
                                first_km_range: {
                                  ...deliveryRules.first_km_range,
                                  km: deliveryRules.first_km_range?.km || 0,
                                  rate: Number(e.target.value),
                                },
                              })
                            }
                            placeholder="Enter amount"
                          />
                        ) : (
                          <div className="p-3 rounded-md border bg-muted/50">
                            {deliveryRules.first_km_range?.rate?.toFixed(2) || "0.00"}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Advanced Mode - New Range Format */}
                  {deliveryRules.delivery_mode === "advanced" && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-base font-semibold">Delivery Ranges</Label>
                        {isEditingDelivery && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newRange: DeliveryRange = {
                                from_km: 0,
                                to_km: 1,
                                rate: 0,
                              };
                              setDeliveryRules({
                                ...deliveryRules,
                                delivery_ranges: [...(deliveryRules.delivery_ranges || []), newRange],
                              });
                            }}
                          >
                            + Add Range
                          </Button>
                        )}
                      </div>
                      
                      {isEditingDelivery ? (
                        <div className="space-y-3">
                          {(deliveryRules.delivery_ranges || []).map((range, index) => (
                            <div key={index} className="grid grid-cols-4 gap-2 items-end">
                              <div>
                                <Label className="text-xs">From (km)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={range.from_km}
                                  onChange={(e) => {
                                    const updatedRanges = [...(deliveryRules.delivery_ranges || [])];
                                    updatedRanges[index].from_km = Number(e.target.value);
                                    setDeliveryRules({
                                      ...deliveryRules,
                                      delivery_ranges: updatedRanges,
                                    });
                                  }}
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">To (km)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={range.to_km}
                                  onChange={(e) => {
                                    const updatedRanges = [...(deliveryRules.delivery_ranges || [])];
                                    updatedRanges[index].to_km = Number(e.target.value);
                                    setDeliveryRules({
                                      ...deliveryRules,
                                      delivery_ranges: updatedRanges,
                                    });
                                  }}
                                  placeholder="1"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Rate ({currency?.value})</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={range.rate}
                                  onChange={(e) => {
                                    const updatedRanges = [...(deliveryRules.delivery_ranges || [])];
                                    updatedRanges[index].rate = Number(e.target.value);
                                    setDeliveryRules({
                                      ...deliveryRules,
                                      delivery_ranges: updatedRanges,
                                    });
                                  }}
                                  placeholder="0"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  const updatedRanges = (deliveryRules.delivery_ranges || []).filter(
                                    (_, i) => i !== index
                                  );
                                  setDeliveryRules({
                                    ...deliveryRules,
                                    delivery_ranges: updatedRanges,
                                  });
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                          {(!deliveryRules.delivery_ranges || deliveryRules.delivery_ranges.length === 0) && (
                            <div className="text-center py-4 text-muted-foreground">
                              No delivery ranges set. Click &quot;Add Range&quot; to add pricing tiers.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {deliveryRules.delivery_ranges && deliveryRules.delivery_ranges.length > 0 ? (
                            deliveryRules.delivery_ranges.map((range, index) => (
                              <div key={index} className="p-3 rounded-md border bg-muted/50">
                                {range.from_km} km - {range.to_km} km: {currency?.value}{range.rate.toFixed(2)}
                                {range.rate === 0 && " (Free)"}
                              </div>
                            ))
                          ) : (
                            <div className="p-3 rounded-md border bg-muted/50 text-muted-foreground">
                              No delivery ranges configured
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mode not selected or display only */}
                  {!isEditingDelivery && !deliveryRules.delivery_mode && (
                    <div className="p-3 rounded-md border bg-muted/50 text-muted-foreground">
                      Delivery pricing mode: {deliveryRules.delivery_mode || "basic"}
                    </div>
                  )}
                </div>
              )}
            </div>

            {!isEditingDelivery && (
              <p className="text-sm text-muted-foreground">
                {deliveryRules.is_fixed_rate
                  ? `Flat rate of ${currency?.value}${deliveryRate.toFixed(
                      2
                    )} will be applied for deliveries within ${
                      deliveryRules.delivery_radius
                    } km`
                  : deliveryRules.delivery_mode === "advanced" && deliveryRules.delivery_ranges && deliveryRules.delivery_ranges.length > 0
                  ? `Advanced range-based pricing configured with ${deliveryRules.delivery_ranges.length} tier(s) for deliveries within ${deliveryRules.delivery_radius} km`
                  : deliveryRules.delivery_mode === "basic" && deliveryRules.first_km_range
                  ? `Basic pricing: First ${deliveryRules.first_km_range.km} km at ${currency?.value}${deliveryRules.first_km_range.rate.toFixed(2)}, then ${currency?.value}${deliveryRate.toFixed(2)} per km for deliveries within ${deliveryRules.delivery_radius} km`
                  : `No delivery pricing configured yet`}
              </p>
            )}
          </>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Delivery Time Range</Label>
            {isEditingDelivery ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-sm">From</Label>
                  <Input
                    type="time"
                    value={deliveryRules.delivery_time_allowed?.from}
                    onChange={(e) =>
                      setDeliveryRules({
                        ...deliveryRules,
                        delivery_time_allowed: {
                          from: e.target.value,
                          to:
                            deliveryRules.delivery_time_allowed?.to || "23:59",
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-sm">To</Label>
                  <Input
                    type="time"
                    value={deliveryRules.delivery_time_allowed?.to}
                    onChange={(e) =>
                      setDeliveryRules({
                        ...deliveryRules,
                        delivery_time_allowed: {
                          from:
                            deliveryRules.delivery_time_allowed?.from ||
                            "00:00",
                          to: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-md border bg-muted/50">
                {deliveryRules.delivery_time_allowed?.from} -{" "}
                {deliveryRules.delivery_time_allowed?.to}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Delivery Status</Label>
            {isEditingDelivery ? (
              <Select
                value={deliveryRules.isDeliveryActive ? "active" : "inactive"}
                onValueChange={(value) =>
                  setDeliveryRules({
                    ...deliveryRules,
                    isDeliveryActive: value === "active",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue
                    className={
                      deliveryRules.isDeliveryActive ? "" : "text-red-500"
                    }
                    placeholder="Select status"
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive" className="text-red-500">
                    Inactive
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="p-3 rounded-md border bg-muted/50">
                <span
                  className={
                    deliveryRules.isDeliveryActive ? "" : "text-red-500"
                  }
                >
                  {deliveryRules.isDeliveryActive ? "Active" : "Inactive"}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Minimum Order Amount ({currency?.value})</Label>
            {isEditingDelivery ? (
              <Input
                type="number"
                min="0"
                step="0.01"
                value={deliveryRules.minimum_order_amount}
                onChange={(e) =>
                  setDeliveryRules({
                    ...deliveryRules,
                    minimum_order_amount: Number(e.target.value),
                  })
                }
                placeholder="Enter amount"
              />
            ) : (
              <div className="p-3 rounded-md border bg-muted/50">
                {deliveryRules.minimum_order_amount.toFixed(2)}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select Your Location</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col h-[calc(80vh-100px)]">
            <div
              ref={mapContainer}
              className="flex-1 rounded-md overflow-hidden"
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setMapDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveMapLocation}
                disabled={!selectedLocation}
              >
                Save Location
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
