"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocationStore } from "@/store/geolocationStore";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';

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
    // Use ref for marker to avoid stale closures in event listeners
    const markerRef = useRef<mapboxgl.Marker | null>(null);
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

    // Initialize Map - use ResizeObserver to wait for container to have dimensions
    useEffect(() => {
        // If not open, just return (but don't destroy map if it exists)
        if (!mapDialogOpen) return;

        // If map already exists, just resize it to be safe
        if (map.current) {
            map.current.resize();
            return;
        }

        let resizeObserver: ResizeObserver | null = null;
        let initialized = false;

        const initMap = () => {
            if (initialized || !mapContainer.current) return;

            const rect = mapContainer.current.getBoundingClientRect();
            // If hidden or 0 size, we can't init yet
            if (rect.width === 0 || rect.height === 0) return;

            initialized = true;

            // Double check existing map
            if (map.current) return;

            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: "mapbox://styles/mapbox/streets-v12",
                center: [
                    geoLocation.longitude || 77.5946,
                    geoLocation.latitude || 12.9716,
                ],
                zoom: 14,
            });

            // Add Geocoder
            const geocoder = new MapboxGeocoder({
                accessToken: mapboxgl.accessToken,
                mapboxgl: mapboxgl,
                marker: false, // We handle the marker ourselves
                collapsed: false,
                types: 'country,region,postcode,district,place,locality,neighborhood,address,poi',
                limit: 10,
            });
            map.current.addControl(geocoder);

            geocoder.on('result', (e: any) => {
                const coords = e.result.geometry.coordinates;
                const lng = coords[0];
                const lat = coords[1];

                if (markerRef.current) markerRef.current.remove();

                const newMarker = new mapboxgl.Marker()
                    .setLngLat([lng, lat])
                    .addTo(map.current!);
                markerRef.current = newMarker;

                setSelectedLocation({ lat, lng });
            });


            if (geoLocation.latitude && geoLocation.longitude) {
                const newMarker = new mapboxgl.Marker()
                    .setLngLat([geoLocation.longitude, geoLocation.latitude])
                    .addTo(map.current);
                markerRef.current = newMarker;
            }

            map.current.on("click", (e) => {
                if (markerRef.current) markerRef.current.remove();
                const newMarker = new mapboxgl.Marker()
                    .setLngLat(e.lngLat)
                    .addTo(map.current!);
                markerRef.current = newMarker;
                setSelectedLocation({ lat: e.lngLat.lat, lng: e.lngLat.lng });
            });

            // Once initialized, we can trigger a resize just in case
            map.current.resize();

            // Stop observing once initialized
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
        };

        if (mapContainer.current) {
            // Try to init immediately
            initMap();

            // If not initialized, observe for size changes
            if (!initialized) {
                resizeObserver = new ResizeObserver(() => {
                    initMap();
                });
                resizeObserver.observe(mapContainer.current);
            }
        }

        return () => {
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
            // We do NOT destroy the map on unmount of the effect here, 
            // because we want to keep it alive while the component is mounted.
            // Only destroy if the component really unmounts (handled by a separate cleanup effect if needed, 
            // or we just let it be GC'd with the ref)
        };
    }, [mapDialogOpen, geoLocation.latitude, geoLocation.longitude]); // Re-run when dialog opens to trigger resize loop check
    // Added geoLocation deps so initial center is correct if opened after loc fetch

    const handleSaveLocation = useCallback(async () => {
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
    }, [userData, location, locationDetails, placeId, selectedLocation, setState]);
    const { setSaveAction, setIsSaving: setGlobalIsSaving, setHasChanges } = useAdminSettingsStore();

    useEffect(() => {
        setSaveAction(handleSaveLocation);
        return () => {
            setSaveAction(null);
            setHasChanges(false);
        };
    }, [handleSaveLocation, setSaveAction, setHasChanges]);

    useEffect(() => {
        setGlobalIsSaving(isSaving);
    }, [isSaving, setGlobalIsSaving]);

    // Check for changes
    useEffect(() => {
        if (!userData) return;
        const data = userData as any;

        const initialLocation = data.location || "";
        const initialDetails = data.location_details || "";
        const initialPlaceId = data.place_id || "";

        const hasChanges =
            location !== initialLocation ||
            locationDetails !== initialDetails ||
            placeId !== initialPlaceId ||
            selectedLocation !== null;

        setHasChanges(hasChanges);
    }, [
        location,
        locationDetails,
        placeId,
        selectedLocation,
        userData,
        setHasChanges
    ]);

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
                    if (markerRef.current) markerRef.current.remove();
                    const newMarker = new mapboxgl.Marker()
                        .setLngLat([coords.lng, coords.lat])
                        .addTo(map.current);
                    markerRef.current = newMarker;
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



            {/* <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Select Location</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 min-h-0 relative rounded-md overflow-hidden border" style={{ minHeight: '400px' }}>
                        <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setMapDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleMapSave} disabled={!selectedLocation}>Set Location</Button>
                    </div>
                </DialogContent>
            </Dialog> */}

            {/* Custom Modal using CSS display */}
            <div className={`fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 transition-all duration-200 ${mapDialogOpen ? "flex" : "hidden"}`}>
                <div className="bg-background w-full max-w-4xl h-[80vh] flex flex-col rounded-lg border shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-6 pb-4 border-b">
                        <h2 className="text-lg font-semibold leading-none tracking-tight">Select Location</h2>
                    </div>

                    <div className="flex-1 min-h-0 relative bg-muted/20">
                        {/* Map Container */}
                        <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
                    </div>

                    <div className="p-4 border-t flex justify-end gap-2 bg-background">
                        <Button variant="outline" onClick={() => setMapDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleMapSave} disabled={!selectedLocation}>Set Location</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

