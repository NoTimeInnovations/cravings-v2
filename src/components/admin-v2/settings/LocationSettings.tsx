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
import { Loader2, MapPin } from "lucide-react";
import { GoogleMap, useLoadScript, Marker, Autocomplete } from "@react-google-maps/api";
import { useLocationStore } from "@/store/geolocationStore";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";

// Google Maps libraries
const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"];

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
    // Google Maps References
    const mapRef = useRef<google.maps.Map | null>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

    // Load Google Maps Script
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });

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

    const handleMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
    }, []);

    const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            setSelectedLocation({ lat, lng });
        }
    }, []);

    const onPlaceChanged = useCallback(() => {
        if (autocompleteRef.current) {
            const place = autocompleteRef.current.getPlace();
            if (place.geometry && place.geometry.location) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                
                setSelectedLocation({ lat, lng });
                
                // Update address/place_id/location from google results if needed
                if(place.place_id) setPlaceId(place.place_id);
                if(place.formatted_address) setLocation(place.formatted_address);

                // Pan map to new location
                if (mapRef.current) {
                    mapRef.current.panTo({ lat, lng });
                    mapRef.current.setZoom(15);
                }
            }
        }
    }, []);

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
                if (mapRef.current) {
                    mapRef.current.panTo({ lat: coords.lat, lng: coords.lng });
                    mapRef.current.setZoom(15);
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
            
            // If placeId and location were updated during search, this commits them to the local state
            // that will be saved when "Save Changes" is clicked.
        }
    };

    if (loadError) return <div>Error loading maps</div>;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Address & Coordinates</CardTitle>
                    <CardDescription>Manage your store's physical location.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Location Details</Label>
                        <Textarea
                            value={locationDetails}
                            onChange={(e) => setLocationDetails(e.target.value)}
                            placeholder="Landmarks, floor number, etc."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Map Location</Label>
                        <div className="h-48 w-full rounded-md overflow-hidden relative border bg-muted">
                            {geoLocation.latitude && geoLocation.longitude ? (
                                <img
                                    src={`https://maps.googleapis.com/maps/api/staticmap?center=${geoLocation.latitude},${geoLocation.longitude}&zoom=16&size=600x300&markers=color:red%7C${geoLocation.latitude},${geoLocation.longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
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

            {/* Custom Modal using CSS display */}
            <div className={`fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 transition-all duration-200 ${mapDialogOpen ? "flex" : "hidden"}`}>
                <div className="bg-background w-full max-w-4xl h-[80vh] flex flex-col rounded-lg border shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-6 pb-4 border-b flex justify-between items-center bg-white z-10">
                        <h2 className="text-lg font-semibold leading-none tracking-tight">Select Location</h2>
                        {/* Search Box inside Modal */}
                        {isLoaded && (
                            <div className="w-full max-w-sm">
                                <Autocomplete
                                    onLoad={(autocomplete) => { autocompleteRef.current = autocomplete; }}
                                    onPlaceChanged={onPlaceChanged}
                                >
                                    <Input 
                                        type="text"
                                        placeholder="Search for a location"
                                        className="w-full"
                                    />
                                </Autocomplete>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-h-0 relative bg-muted/20">
                        {/* Map Container */}
                        {isLoaded && mapDialogOpen ? (
                            <GoogleMap
                                mapContainerStyle={{ width: '100%', height: '100%' }}
                                center={{
                                    lat: selectedLocation?.lat || geoLocation.latitude || 12.9716,
                                    lng: selectedLocation?.lng || geoLocation.longitude || 77.5946
                                }}
                                zoom={14}
                                onLoad={handleMapLoad}
                                onClick={handleMapClick}
                                options={{
                                    streetViewControl: false,
                                    mapTypeControl: false,
                                }}
                            >
                                {(selectedLocation || (geoLocation.latitude && geoLocation.longitude)) && (
                                    <Marker 
                                        position={{
                                            lat: selectedLocation?.lat || geoLocation.latitude,
                                            lng: selectedLocation?.lng || geoLocation.longitude
                                        }}
                                    />
                                )}
                            </GoogleMap>
                        ) : (
                            <div className="flex h-full items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        )}
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
