"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

export interface Place {
  lat: number;
  lng: number;
  label: string;
  source: "device" | "city";
}

const KEY = "vitalyn.place";

/** Cities we can fall back to when the browser won't share location. */
export const CITIES: Place[] = [
  { label: "Ahmedabad", lat: 23.0225, lng: 72.5714, source: "city" },
  { label: "Mumbai", lat: 19.076, lng: 72.8777, source: "city" },
  { label: "Pune", lat: 18.5204, lng: 73.8567, source: "city" },
  { label: "Bengaluru", lat: 12.9716, lng: 77.5946, source: "city" },
  { label: "New Delhi", lat: 28.6139, lng: 77.209, source: "city" },
  { label: "Hyderabad", lat: 17.385, lng: 78.4867, source: "city" },
];

// A tiny store over localStorage so every component on the page shares one place.
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/**
 * The user's place for distance sorting. Starts from the last saved choice (or Ahmedabad),
 * and only asks the browser for GPS when the user presses "Use my location".
 */
export function usePlace() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  // In private mode localStorage can throw; keep the choice in memory then.
  const [memory, setMemory] = useState<Place | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const place = useMemo<Place>(() => {
    if (raw) {
      try {
        return JSON.parse(raw) as Place;
      } catch {
        /* fall through */
      }
    }
    return memory ?? CITIES[0];
  }, [raw, memory]);

  const setPlace = useCallback((p: Place) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      /* private mode */
    }
    setMemory(p);
    setError(null);
    listeners.forEach((l) => l());
  }, []);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("Your browser can't share location. Pick your city instead");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPlace({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "Your location", source: "device" });
        setLocating(false);
      },
      () => {
        setError("Location is turned off. Pick your city instead");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }, [setPlace]);

  return { place, setPlace, locate, locating, error };
}
