// frontend/src/app/location/LocationContext.tsx
//
// Shares the user's position with the whole app, so the browser asks for
// permission once instead of separately on every page.
//
// Usage in any component:
//   const { coords, status, requestLocation } = useLocation();

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Coords } from "../../utils/distance";

/**
 * idle        – not asked yet
 * loading     – waiting for the browser
 * granted     – we have coords
 * denied      – user said no (or blocked it in browser settings)
 * unavailable – browser has no geolocation, or position couldn't be found
 */
export type LocationStatus = "idle" | "loading" | "granted" | "denied" | "unavailable";

interface LocationContextValue {
  coords: Coords | null;
  status: LocationStatus;
  /** Ask the browser for the user's position. Call this from a button click. */
  requestLocation: () => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");

  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("granted");
      },
      (err) => {
        // code 1 = PERMISSION_DENIED; 2 and 3 = position unavailable / timeout
        setStatus(err.code === 1 ? "denied" : "unavailable");
      },
      {
        enableHighAccuracy: false, // city-level accuracy is enough for "km away"
        timeout: 10000,
        maximumAge: 10 * 60 * 1000, // reuse a position up to 10 minutes old
      },
    );
  };

  // If the user already allowed location on an earlier visit, fetch it quietly.
  // We don't pop up the permission prompt on page load — browsers treat that
  // as bad practice; the prompt only appears after the user clicks a button.
  useEffect(() => {
    navigator.permissions
      ?.query({ name: "geolocation" as PermissionName })
      .then((result) => {
        if (result.state === "granted") requestLocation();
        if (result.state === "denied") setStatus("denied");
      })
      .catch(() => {
        /* Permissions API not supported — wait for a button click */
      });
  }, []);

  return (
    <LocationContext.Provider value={{ coords, status, requestLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used inside <LocationProvider>");
  return ctx;
}
