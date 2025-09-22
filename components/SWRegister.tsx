"use client";
import { useEffect } from "react";

export function SWRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/service-worker.js")
        .catch((e) => console.error("SW register failed", e));
    }
  }, []);
  return null;
}

