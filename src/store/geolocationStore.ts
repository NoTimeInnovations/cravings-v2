import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import useOrderStore from "./orderStore";

type Coords = {
  lat: number;
  lng: number;
};

type LocationStore = {
  coords: Coords | null;
  error: string | null;
  geoString: string | null;
  isLoading: boolean;
  lastUpdated: number | null;
  getLocation: () => Promise<Coords | null>;
  refreshLocation: () => Promise<Coords | null>;
  clearLocation: () => void;
  reverseGeocode: (lng: number, lat: number) => Promise<string | null>;
  setCoords: (coords: Coords) => void;
};

export const useLocationStore = create<LocationStore>()(
  persist(
    (set, get) => ({
      coords: null,
      error: null,
      geoString: null,
      isLoading: false,
      lastUpdated: null,

      setCoords: (coords: Coords) => {
        const lat = coords.lat;
        const lng = coords.lng;
        const newGeoString = `SRID=4326;POINT(${lng} ${lat})`;

        set({
          coords,
          geoString: newGeoString,
          error: null,
          isLoading: false,
          lastUpdated: Date.now(),
        });
      },

      getLocation: async () => {
        
        

        return get().refreshLocation();
      },

      refreshLocation: async () => {
        return new Promise<Coords | null>((resolve) => {
          set({ isLoading: true, error: null });

          if (!navigator.geolocation) {
            set({
              error: "Geolocation is not supported by your browser.",
              isLoading: false,
            });
            resolve(null);
            return;
          }

          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const lat = position.coords.latitude;
              const lng = position.coords.longitude;
              const newCoords = { lat, lng };
              const newGeoString = `SRID=4326;POINT(${lng} ${lat})`;

              const address = await get().reverseGeocode(lng, lat);

              const setUserAddress = useOrderStore.getState().setUserAddress;
              const setUserCoordinates = useOrderStore.getState().setUserCoordinates;

              setUserAddress(address || "");
              setUserCoordinates(newCoords);

              set({
                coords: newCoords,
                geoString: newGeoString,
                error: null,
                isLoading: false,
                lastUpdated: Date.now(),
              });

              resolve(newCoords);
            },
            (err) => {
              let errorMessage: string;

              switch (err.code) {
                case 1:
                  errorMessage =
                    "Permission denied. Please allow location access.";
                  break;
                case 2:
                  errorMessage = "Unable to determine your location.";
                  break;
                case 3:
                  errorMessage = "Location request timed out.";
                  break;
                default:
                  errorMessage = `Geolocation error: ${
                    err.message || "Unknown error"
                  }`;
              }

              set({
                error: errorMessage,
                isLoading: false,
              });

              resolve(null);
            },
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 60000,
            }
          );
        });
      },

      clearLocation: () => {
        set({
          coords: null,
          geoString: null,
          error: null,
          isLoading: false,
          lastUpdated: null,
        });
      },

      reverseGeocode: async (lng: number, lat: number) => {
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
          );
          const data = await response.json();

          if (data.features && data.features.length > 0) {
            return data.features[0].place_name;
          }
          return null;
        } catch (error) {
          console.error("Reverse geocoding error:", error);
          return null;
        }
      },
    }),
    {
      name: "user-location-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        coords: state.coords,
        geoString: state.geoString,
        lastUpdated: state.lastUpdated,
      }),
    }
  )
);
