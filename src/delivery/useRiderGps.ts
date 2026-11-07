import { useCallback, useEffect, useRef, useState } from "react";
import { publishLocation, stopLocation } from "./api";

export function useRiderGps(orderId: string | null, enabled: boolean) {
  const watch = useRef<number | null>(null);
  const generation = useRef(0);
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState(
    "Location is private until you choose to share it.",
  );
  const [error, setError] = useState("");
  const stop = useCallback(() => {
    generation.current++;
    if (watch.current !== null)
      navigator.geolocation?.clearWatch(watch.current);
    watch.current = null;
    setSharing(false);
    if (orderId)
      void stopLocation(orderId).catch(() => {
        setError(
          "GPS stopped on this phone, but the server could not be notified. The last position will be marked stale.",
        );
      });
  }, [orderId]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden || !enabled) {
        stop();
        setMessage(
          "Sharing paused. Keep this page visible and tap Start GPS to resume.",
        );
      }
    };
    const leave = () => stop();
    document.addEventListener("visibilitychange", pause);
    window.addEventListener("pagehide", leave);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", pause);
      window.removeEventListener("pagehide", leave);
    };
  }, [stop, enabled]);
  useEffect(() => {
    if (!enabled && watch.current !== null) stop();
  }, [enabled, stop]);
  const start = useCallback(() => {
    if (!orderId || !enabled || watch.current !== null) return;
    setError("");
    if (!window.isSecureContext) {
      setError(
        "GPS requires HTTPS. Open the secure live preview or deployed site.",
      );
      return;
    }
    if (!navigator.geolocation) {
      setError("This browser does not support GPS location.");
      return;
    }
    const run = ++generation.current;
    let lastSent = 0;
    let sending = false;
    setSharing(true);
    setMessage("Requesting permission and waiting for a GPS fix…");
    watch.current = navigator.geolocation.watchPosition(
      async (fix) => {
        if (
          run !== generation.current ||
          sending ||
          Date.now() - lastSent < 8000
        )
          return;
        if (Date.now() - fix.timestamp > 120000) {
          setError(
            "The phone returned an old position. Waiting for a fresh GPS fix.",
          );
          return;
        }
        sending = true;
        try {
          await publishLocation(orderId, fix);
          if (run !== generation.current) {
            await stopLocation(orderId);
            return;
          }
          lastSent = Date.now();
          setError("");
          setMessage(
            `GPS sent at ${new Date().toLocaleTimeString("en-UG", { timeZone: "Africa/Kampala" })} EAT · accuracy ±${Math.round(fix.coords.accuracy)} m`,
          );
        } catch (e) {
          if (run === generation.current)
            setError(
              `GPS upload failed: ${e instanceof Error ? e.message : "Check your connection."} The last position may be stale.`,
            );
        } finally {
          sending = false;
        }
      },
      (problem) => {
        if (run !== generation.current) return;
        setError(
          problem.code === 1
            ? "Location permission was denied. Enable location for this site in your browser settings, then try again."
            : problem.code === 2
              ? "GPS position is unavailable. Turn on location services and move somewhere with a clear signal."
              : "GPS took too long. Check your signal; your browser will keep trying.",
        );
        if (problem.code === 1) {
          stop();
          setMessage("Location sharing is off.");
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
  }, [orderId, enabled, stop]);
  return { sharing, message, error, start, stop };
}
