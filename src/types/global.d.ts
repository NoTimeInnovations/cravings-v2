interface FlutterGeolocation {
  getCurrentPosition: () => Promise<GeolocationPosition>;
}

interface Window {
  flutterGeolocation?: FlutterGeolocation;
}