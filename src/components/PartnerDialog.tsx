"use client";

import { useState } from "react";
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
import { useAuthStore } from "@/store/authStore";
import { useLocationStore } from "@/store/locationStore";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil } from "lucide-react";
import { Loader2 } from "lucide-react";
import { getCoordinatesFromLink } from "@/lib/getCoordinatesFromLink";

interface GeoLocation {
  latitude: number;
  longitude: number;
}

export function PartnerDialog() {
  const router = useRouter();
  const { signUpWithEmailForPartner, loading } = useAuthStore();
  const { locationData, countries } = useLocationStore();
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    hotelName: "",
    area: "",
    phone: "",
    upiId: "",
    isInIndia: true,
    state: "",
    country: "India",
    location: "",
    geoLocation: { latitude: 0, longitude: 0 } as GeoLocation,
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationEditing, setLocationEditing] = useState(true);

  const validateForm = async () => {
    if (
      !formData.hotelName ||
      !formData.phone ||
      !formData.country ||
      (formData.country === "India" && (!formData.state || !formData.area))
    ) {
      setError("Please fill in all required fields");
      setIsSubmitting(false);
      return false;
    }

    if (!formData.email || !formData.password) {
      setError("Email and password are required");
      setIsSubmitting(false);
      return false;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      setIsSubmitting(false);
      return false;
    }

    if (formData.location) {
      const isValid = /^https:\/\/(maps\.app\.goo\.gl\/[a-zA-Z0-9]+|www\.google\.[a-z.]+\/maps\/.+)$/i.test(
        formData.location.trim()
      );
      if (!isValid) {
        setError("Please enter a valid Google Maps URL");
        setIsSubmitting(false);
        return false;
      }
    }
    
    localStorage?.setItem("partnerFormData", JSON.stringify(formData));
    return true;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!(await validateForm())) {
      return;
    }

    try {
      let geoLoc = formData.geoLocation;
      
      // If location is provided but coordinates aren't extracted yet
      if (formData.location && 
          (formData.geoLocation.latitude === 0 || formData.geoLocation.longitude === 0)) {
        const response = await getCoordinatesFromLink(formData.location.trim());
        geoLoc = response.coordinates;
        
        // Update form data with new coordinates
        setFormData(prev => ({
          ...prev,
          geoLocation: geoLoc
        }));
      }

      await signUpWithEmailForPartner(
        formData.hotelName,
        formData.phone,
        formData.upiId,
        formData.area,
        formData.email,
        formData.password,
        formData.country,
        formData.state,
        formData.location,
        geoLoc
      );
      
      toast.success("Account created successfully!");
      localStorage?.removeItem("partnerFormData");
      setTimeout(() => {
        router.push("/admin");
      }, 1000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg h-full flex flex-col">
      <div className="px-6 pt-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Register as Partner
        </h2>
      </div>
      <ScrollArea className="flex-1 px-6 mt-5">
        <form className="space-y-6 pb-10 px-2" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="hotelName" className="text-sm font-medium text-gray-700">
              Business Name *
            </Label>
            <Input
              id="hotelName"
              placeholder="Enter your business name"
              value={formData.hotelName}
              onChange={(e) =>
                setFormData({ ...formData, hotelName: e.target.value })
              }
              className="w-full"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
              Phone Number *
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Enter your phone number"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="w-full"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="upiId" className="text-sm font-medium text-gray-700">
              UPI ID (For payments)
            </Label>
            <Input
              id="upiId"
              placeholder="Enter your UPI ID"
              value={formData.upiId}
              onChange={(e) =>
                setFormData({ ...formData, upiId: e.target.value })
              }
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between space-x-2 mb-4">
              <Label htmlFor="location-type" className="text-sm text-gray-600">
                Is your business located in India?
              </Label>
              <Switch
                id="location-type"
                checked={formData.isInIndia}
                onCheckedChange={(checked) =>
                  setFormData({ 
                    ...formData, 
                    isInIndia: checked, 
                    state: "", 
                    area: "", 
                    country: checked ? "India" : "" 
                  })
                }
                className="data-[state=checked]:bg-orange-600"
              />
            </div>

            {formData.isInIndia ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-sm font-medium text-gray-700">
                    State *
                  </Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) =>
                      setFormData({ ...formData, state: value, area: "" })
                    }
                  >
                    <SelectTrigger id="state" className="w-full">
                      <SelectValue placeholder="Select your state" />
                    </SelectTrigger>
                    <SelectContent>
                      {locationData.map((stateData) => (
                        <SelectItem key={stateData.state} value={stateData.state}>
                          {stateData.state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area" className="text-sm font-medium text-gray-700">
                    District *
                  </Label>
                  <Select
                    value={formData.area}
                    onValueChange={(value) =>
                      setFormData({ ...formData, area: value })
                    }
                    disabled={!formData.state}
                  >
                    <SelectTrigger id="area" className="w-full">
                      <SelectValue placeholder="Select your district" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.state &&
                        locationData
                          .find((state) => state.state === formData.state)
                          ?.districts.map((district) => (
                            <SelectItem key={district} value={district}>
                              {district}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="country" className="text-sm font-medium text-gray-700">
                  Country *
                </Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) =>
                    setFormData({ ...formData, country: value })
                  }
                >
                  <SelectTrigger id="country" className="w-full">
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country: string) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Location Section */}
          <div className="space-y-4 w-full">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium text-gray-700">
                Business Location
              </Label>
              {!locationEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocationEditing(true)}
                  className="gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </Button>
              )}
            </div>

            {locationEditing ? (
              <div className="space-y-3">
                <Input
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="Paste your Google Maps location link here"
                />
                <div className="flex items-center">
                  <a 
                    className="text-orange-600 underline text-sm" 
                    href="https://www.google.com/maps" 
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Get Google Maps Link {"->"}
                  </a>
                </div>
                <p className="text-xs text-gray-500">
                  Share your business location from Google Maps to help customers find you
                </p>
              </div>
            ) : (
              <div className="h-48 w-full rounded-md overflow-hidden relative border">
                {formData.geoLocation.latitude !== 0 && formData.geoLocation.longitude !== 0 ? (
                  <div className="h-full w-full bg-gray-100 relative">
                    <img
                      src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+ff0000(${formData.geoLocation.longitude},${formData.geoLocation.latitude})/${formData.geoLocation.longitude},${formData.geoLocation.latitude},15/600x300?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}`}
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
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password *
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password (min 6 characters)"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white"
            disabled={isSubmitting || loading}
          >
            {isSubmitting || loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Sign up as Partner"
            )}
          </Button>
        </form>
      </ScrollArea>
    </div>
  );
}