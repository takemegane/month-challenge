"use client";
import { useEffect, useState } from "react";

export function RecordTodayButton({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<"idle" | "loading" | "created" | "exists">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if already recorded today
    fetch("/api/entries?range=1m&user_id=me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const today = new Date();
        const jst = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
        const iso = jst.toISOString().slice(0, 10);
        if (data.entries?.some((e: any) => e.entry_date.slice(0, 10) === iso)) {
          setStatus("exists");
        }
      })
      .catch(() => {});
  }, []);

  async function record() {
    try {
      setError(null);
      setStatus("loading");
      const csrf = document.cookie
        .split("; ")
        .find((v) => v.startsWith("csrf-token="))?.split("=")[1];
      const res = await fetch("/api/entries/today", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrf || "",
        },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "failed");
      setStatus(json.status);
    } catch (e: any) {
      setError(e.message);
      setStatus("idle");
    }
  }

  return (
    <div className="space-y-2 w-full">
      <button
        className={`tap-target btn-primary rounded-xl relative overflow-hidden ${
          compact
            ? "px-1.5 py-0.5 text-[10px] max-w-full w-auto"
            : "px-4 py-4 text-base sm:text-lg w-full"
        } hover:bg-green-500`}
        onClick={record}
        disabled={status === "loading" || status === "created" || status === "exists"}
        aria-disabled={status === "loading" || status === "created" || status === "exists"}
      >
        <svg aria-hidden className="mr-2 h-4 w-4 sm:h-5 sm:w-5 opacity-90" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
        {status === "loading" ? "送信中..." : "投稿済み"}
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
