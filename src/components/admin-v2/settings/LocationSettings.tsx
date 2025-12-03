"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuthStore, GeoLocation } from "@/store/authStore";
import { toast } from "sonner";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { updatePartnerMutation } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { Loader2, MapPin, Save } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocationStore } from "@/store/geolocationStore";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export function LocationSettings() {
    const { userData, setState } = useAuthStore();
    const { getLocation } = useLocationStore();
    const [isSaving, setIsSaving] = useState(false);

    const [location, setLocation] = useState("");
    const [locationDetails, setLocationDetails] = useState("");
    const [placeId, setPlaceId] = useState("");
    const [geoLocation, setGeoLocation] = useState<{ latitude: number; longitude: number }>({ latitude: 0, longitude: 0 });

    // Map State
    const [mapDialogOpen, setMapDialogOpen] = useState(false);
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [marker, setMarker] = useState<mapboxgl.Marker | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

    useEffect(() => {
        if (userData?.role === "partner") {
            setLocation(userData.location || "");
            setLocationDetails(userData.location_details || "");
            setPlaceId(userData.place_id || "");
            setGeoLocation({
                latitude: userData.geo_location?.coordinates?.[1] || 0,
                longitude: userData.geo_location?.coordinates?.[0] || 0,
            });
        }
    }, [userData]);

    // Initialize Map
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
                if (marker) marker.remove();
                const newMarker = new mapboxgl.Marker()
                    .setLngLat(e.lngLat)
                    .addTo(map.current!);
                setMarker(newMarker);
                setSelectedLocation({ lat: e.lngLat.lat, lng: e.lngLat.lng });
            });
        }

        return () => {
            if (!mapDialogOpen && map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, [mapDialogOpen, geoLocation]); // Removed marker from dependency to avoid loop

    const handleSaveLocation = async () => {
        if (!userData) return;
        setIsSaving(true);
        try {
            const updates: any = {
                location,
                location_details: locationDetails,
                place_id: placeId,
            };

            // Only update geo_location if it changed via map
            if (selectedLocation) {
                const geographyFormat = {
                    type: "Point",
                    coordinates: [selectedLocation.lng, selectedLocation.lat],
                } as GeoLocation;
                updates.geo_location = geographyFormat;
            }

            await fetchFromHasura(updatePartnerMutation, {
                id: userData.id,
                updates
            });

            revalidateTag(userData.id);
            setState(updates);

            if (selectedLocation) {
                setGeoLocation({ latitude: selectedLocation.lat, longitude: selectedLocation.lng });
                setSelectedLocation(null);
            }

            toast.success("Location settings updated successfully");
        } catch (error) {
            console.error("Error updating location:", error);
            toast.error("Failed to update location settings");
        } finally {
            setIsSaving(false);
        }
    };

    const handleGetCurrentLocation = async () => {
        try {
            toast.loading("Fetching current location...");
            const coords = await getLocation();
            toast.dismiss();

            if (coords) {
                setGeoLocation({ latitude: coords.lat, longitude: coords.lng });
                setSelectedLocation({ lat: coords.lat, lng: coords.lng });

                // Update map if open
                if (map.current) {
                    map.current.flyTo({ center: [coords.lng, coords.lat], zoom: 14 });
                    if (marker) marker.remove();
                    const newMarker = new mapboxgl.Marker()
                        .setLngLat([coords.lng, coords.lat])
                        .addTo(map.current);
                    setMarker(newMarker);
                }
                toast.success("Location fetched");
            }
        } catch (error) {
            toast.dismiss();
            toast.error("Failed to fetch location");
        }
    };

    const handleMapSave = () => {
        if (selectedLocation) {
            setGeoLocation({ latitude: selectedLocation.lat, longitude: selectedLocation.lng });
            setMapDialogOpen(false);
            // We don't save to DB yet, user must click "Save Changes"
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Address & Coordinates</CardTitle>
                    <CardDescription>Manage your store's physical location.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Google Maps Link / Address</Label>
                        <div className="flex gap-2">
                            <Input
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="https://maps.google.com/..."
                            />
                            <Button variant="outline" onClick={() => window.open("https://www.google.com/maps", "_blank")}>
                                Get Link
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Location Details</Label>
                        <Textarea
                            value={locationDetails}
                            onChange={(e) => setLocationDetails(e.target.value)}
                            placeholder="Landmarks, floor number, etc."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Place ID</Label>
                        <Input
                            value={placeId}
                            onChange={(e) => setPlaceId(e.target.value)}
                            placeholder="Google Place ID"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Map Location</Label>
                        <div className="h-48 w-full rounded-md overflow-hidden relative border bg-muted">
                            {geoLocation.latitude && geoLocation.longitude ? (
                                <img
                                    src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+ff0000(${geoLocation.longitude},${geoLocation.latitude})/${geoLocation.longitude},${geoLocation.latitude},16/600x300?access_token=${mapboxgl.accessToken}`}
                                    alt="Map preview"
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                    No location set
                                </div>
                            )}
                            <div className="absolute bottom-2 right-2 flex gap-2">
                                <Button size="sm" variant="secondary" onClick={handleGetCurrentLocation}>
                                    <MapPin className="mr-2 h-3 w-3" />
                                    Current Location
                                </Button>
                                <Button size="sm" onClick={() => setMapDialogOpen(true)}>
                                    Open Map
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSaveLocation} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                </Button>
            </div>

            <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Select Location</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 relative rounded-md overflow-hidden border">
                        <div ref={mapContainer} className="absolute inset-0" />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setMapDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleMapSave} disabled={!selectedLocation}>Set Location</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
