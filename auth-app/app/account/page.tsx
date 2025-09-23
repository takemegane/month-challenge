"use client";

import { useEffect, useState } from "react";

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.user) {
          setName(data.user.name || "");
          setEmail(data.user.email || "");
        }
      })
      .catch(() => {
        if (!cancelled) setError("現在のユーザー情報を取得できませんでした");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!name.trim() && !email.trim()) {
      setError("名前かメールアドレスを入力してください");
      return;
    }

    if (newPassword) {
      if (newPassword.length < 8) {
        setError("新しいパスワードは8文字以上にしてください");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("新しいパスワードが一致しません");
        return;
      }
    }

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          current_password: currentPassword || undefined,
          new_password: newPassword || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const code = data?.error || "update_failed";
        if (code === "current_password_required") {
          setError("メールやパスワードを変更する場合は現在のパスワードが必要です");
        } else if (code === "invalid_current_password") {
          setError("現在のパスワードが正しくありません");
        } else if (code === "email_taken") {
          setError("このメールアドレスは既に使用されています");
        } else if (code === "nothing_to_update") {
          setError("変更内容がありません");
        } else {
          setError("更新に失敗しました");
        }
        return;
      }
      setMessage("プロフィールを更新しました");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError("更新に失敗しました");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="card-title">アカウント設定</h1>
        <p className="text-sm text-orange-900/70">名前やメールアドレス、パスワードを変更できます。</p>
      </div>

      {loading ? (
        <div className="rounded-md border border-orange-200 bg-white/80 p-6 text-center text-orange-900/80">
          読み込み中です...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-orange-900/80">名前</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-orange-200 px-3 py-2"
              placeholder="表示名"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-orange-900/80">メールアドレス</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-orange-200 px-3 py-2"
              type="email"
              placeholder="name@example.com"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-orange-900/80">現在のパスワード</label>
            <input
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-md border border-orange-200 px-3 py-2"
              type="password"
              placeholder="メールやパスワードを変更する場合は必須"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-orange-900/80">新しいパスワード</label>
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-md border border-orange-200 px-3 py-2"
                type="password"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-orange-900/80">新しいパスワード（確認）</label>
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-orange-200 px-3 py-2"
                type="password"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          <div className="flex gap-3">
            <button type="submit" className="btn-primary rounded px-4 py-2">
              更新する
            </button>
          </div>
          <p className="text-xs text-orange-900/60">
            ※ メールアドレスやパスワードを変更する場合は現在のパスワードが必要です。
          </p>
        </form>
      )}
    </div>
  );
}
