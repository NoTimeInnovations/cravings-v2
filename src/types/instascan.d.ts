declare module 'instascan' {
  export class Scanner {
    constructor(opts: {
      video: HTMLVideoElement;
      mirror?: boolean;
      backgroundScan?: boolean;
      scanPeriod?: number;
    });
    addListener(event: 'scan', callback: (content: string) => void): void;
    start(camera: Camera): Promise<void>;
    stop(): Promise<void>;
  }

  export class Camera {
    static getCameras(): Promise<Camera[]>;
    id: string;
    name: string;
  }
} 

declare module '@mapbox/mapbox-gl-geocoder';