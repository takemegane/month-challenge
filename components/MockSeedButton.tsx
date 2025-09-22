"use client";
import { useState } from "react";

export function MockSeedButton() {
  const [status, setStatus] = useState<"idle"|"loading"|"done"|"error">("idle");
  const [msg, setMsg] = useState<string>("");
  async function run() {
    try {
      setStatus("loading");
      setMsg("");
      const res = await fetch("/api/mock/seed", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "failed");
      setStatus("done");
      setMsg(`追加: ${json.created} 件`);
      setTimeout(() => location.reload(), 400);
    } catch (e: any) {
      setStatus("error");
      setMsg(e.message || "error");
    }
  }
  return (
    <div className="flex items-center gap-3">
      <button onClick={run} className="btn-ghost px-3 py-2 rounded-md border border-orange-300 text-orange-900 hover:bg-orange-100">
        モックデータ投入（一覧を更新）
      </button>
      {status !== "idle" && <span className="text-sm text-orange-900/80">{status === "loading" ? "実行中…" : msg}</span>}
    </div>
  );
}

