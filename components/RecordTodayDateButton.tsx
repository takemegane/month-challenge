"use client";
import { useEffect, useState } from "react";

export function RecordTodayDateButton({ label }: { label: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "created" | "exists">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // On mount, check if today already exists
    fetch("/api/entries?range=1m&user_id=me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const jst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
        const iso = jst.toISOString().slice(0, 10);
        if (data.entries?.some((e: any) => (e.entry_date as string).slice(0, 10) === iso)) setStatus("exists");
      })
      .catch(() => {});
  }, []);

  async function onClick() {
    if (status === "created" || status === "exists" || status === "loading") return;
    try {
      setError(null);
      setStatus("loading");
      const csrf = document.cookie.split("; ").find((v) => v.startsWith("csrf-token="))?.split("=")[1];
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
    <button
      className={`inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] leading-none bg-orange-500 text-white hover:bg-green-500 transition disabled:opacity-70`}
      onClick={onClick}
      disabled={status === "loading" || status === "created" || status === "exists"}
      aria-disabled={status === "loading" || status === "created" || status === "exists"}
      title={status === "exists" || status === "created" ? "本日投稿済み" : "今日の記録"}
    >
      {label}
    </button>
  );
}

