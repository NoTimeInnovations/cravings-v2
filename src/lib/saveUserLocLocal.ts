import { getLocationCookie, setLocationCookie } from "@/app/auth/actions";

export const saveUserLocation = async(shouldReload = true) => {
  const sessionKey = "location_session";
  const currentSession = sessionStorage.getItem(sessionKey);
  const location = await getLocationCookie();
  const hasUserLocation = !!location;

  if (navigator.geolocation && (!currentSession || !hasUserLocation)) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          if (latitude && longitude) {
            await setLocationCookie(latitude, longitude);
            sessionStorage.setItem(sessionKey, "active");
            if (!hasUserLocation && shouldReload) {
              window.location.reload();
            }
          }
        } catch (error) {
          console.error("Error setting location:", error);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
      }
    );
  }
};
