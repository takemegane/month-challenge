"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminEnterPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [remember, setRemember] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("admin_token");
    if (saved) setToken(saved);
  }, []);

  async function enter(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await fetch("/admin/access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, remember }),
      });
      if (!res.ok) {
        await res.json().catch(() => ({}));
        setMsg("パスワードが違います");
        return;
      }
      if (remember) localStorage.setItem("admin_token", token);
      else localStorage.removeItem("admin_token");
      router.push("/admin");
    } catch (e: any) {
      setMsg(e?.message || "エラー");
    }
  }

  return (
    <div className="space-y-6 max-w-md">
      <h1 className="card-title">管理画面に入る</h1>
      <form onSubmit={enter} className="space-y-3">
        <label className="block text-sm">パスワード</label>
        <input
          type="password"
          value={token}
          onChange={(e)=>setToken(e.target.value)}
          placeholder="パスワード"
          className="w-full border rounded px-3 py-2"
        />
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={remember} onChange={(e)=>setRemember(e.target.checked)} />
          この端末に記憶する（30日）
        </label>
        <div className="flex gap-2">
          <button className="btn-primary rounded px-4 py-2">入室</button>
          <a href="/admin/logout" className="rounded px-4 py-2 border border-orange-300 hover:bg-orange-50">ログアウト</a>
        </div>
        {msg && <div className="text-sm text-red-600">{msg}</div>}
      </form>
    </div>
  );
}
