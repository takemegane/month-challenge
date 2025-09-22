"use client";
import { useEffect, useState } from "react";

type User = { id: string; name: string };

export function UserSelector() {
  const [users, setUsers] = useState<User[]>([]);
  const [current, setCurrent] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetch("/api/users", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setUsers(Array.isArray(d.users) ? d.users : []))
      .catch(() => setUsers([]));
    const m = document.cookie.split("; ").find((v) => v.startsWith("user_id="))?.split("=")[1];
    if (m) setCurrent(decodeURIComponent(m));
  }, []);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value || "";
    setCurrent(id);
    const maxAge = 60 * 60 * 24 * 90;
    document.cookie = `user_id=${encodeURIComponent(id)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
    // Reload to ensure all client components refetch with new user
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-base sm:text-lg text-orange-900/80">ユーザー</label>
      <select
        value={current || ""}
        onChange={onChange}
        className="border rounded px-3 py-1.5 bg-white text-base sm:text-lg"
      >
        <option value="">選択してください</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
    </div>
  );
}
