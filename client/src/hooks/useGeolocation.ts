import { useEffect, useRef, useState } from "react";

export type GpsStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable";

export interface GpsPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export function useGeolocation() {
  const [status, setStatus] = useState<GpsStatus>("idle");
  const [position, setPosition] = useState<GpsPosition | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      setMessage("This browser does not provide GPS location.");
      return;
    }

    setStatus("requesting");
    watchId.current = navigator.geolocation.watchPosition(
      (result) => {
        setStatus("granted");
        setMessage(null);
        setPosition({
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
          accuracy:
            typeof result.coords.accuracy === "number"
              ? result.coords.accuracy
              : undefined,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setStatus("denied");
          setMessage("Location permission was denied. The map will not fake GPS.");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setStatus("unavailable");
          setMessage("GPS is currently unavailable.");
        } else {
          setStatus("unavailable");
          setMessage("Location request timed out.");
        }
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 12_000 },
    );

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  return { status, position, message };
}
