"use client";

import { submitBrowserGeoAction } from "@/lib/actions";
import { useEffect, useRef } from "react";

const STORAGE_CAPTURED = "portal_browser_geo_captured";
const STORAGE_DENIED = "portal_browser_geo_denied";

/** Prompts for browser geolocation once per session (after login). */
export function BrowserGeoCapture() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (typeof window === "undefined" || !("geolocation" in navigator)) return;
    if (sessionStorage.getItem(STORAGE_CAPTURED) === "1") return;
    if (sessionStorage.getItem(STORAGE_DENIED) === "1") return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void submitBrowserGeoAction({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }).then((result) => {
          if (result.ok) {
            sessionStorage.setItem(STORAGE_CAPTURED, "1");
          }
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          sessionStorage.setItem(STORAGE_DENIED, "1");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20_000,
        maximumAge: 60_000,
      }
    );
  }, []);

  return null;
}