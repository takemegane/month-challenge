"use client";
import { useEffect, useState } from "react";

type User = { id: string; name: string; email: string; is_admin?: boolean };

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminUser, setAdminUser] = useState<string>("");
  const [adminMsg, setAdminMsg] = useState<string | null>(null);
  const [userListError, setUserListError] = useState<string | null>(null);
  const [profileEditId, setProfileEditId] = useState<string>("");
  const [profileName, setProfileName] = useState<string>("");
  const [profileEmail, setProfileEmail] = useState<string>("");
  const [profilePassword, setProfilePassword] = useState<string>("");
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileOriginal, setProfileOriginal] = useState<User | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (!profileEditId) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelProfileEdit();
      }
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [profileEditId]);

  async function checkAdminAccess() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.user && data.user.is_admin) {
          setIsAuthorized(true);
          loadUsers();
        } else {
          setIsAuthorized(false);
        }
      } else {
        setIsAuthorized(false);
      }
    } catch (error) {
      setIsAuthorized(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadUsers() {
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store", credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setUsers(json.users || []);
        setUserListError(null);
        if (profileEditId) {
          const updated = json.users?.find((u: User) => u.id === profileEditId);
          if (updated) {
            setProfileName(updated.name);
            setProfileEmail(updated.email);
            setProfileOriginal(updated);
          }
        }
      } else {
        if (res.status === 401 || res.status === 403) {
          setUserListError("ユーザー一覧を取得できませんでした。管理者権限が付与された直後の場合は、一度サインインし直してください。");
        } else {
          setUserListError("ユーザー一覧の取得に失敗しました。時間をおいて再度お試しください。");
        }
        setUsers([]);
      }
    } catch (error) {
      setUserListError("ユーザー一覧の取得中にエラーが発生しました");
    }
  }

  function beginProfileEdit(user: User) {
    setProfileEditId(user.id);
    setProfileName(user.name);
    setProfileEmail(user.email);
    setProfilePassword("");
    setProfileMsg(null);
    setProfileError(null);
    setProfileOriginal(user);
  }

  function cancelProfileEdit() {
    setProfileEditId("");
    setProfileName("");
    setProfileEmail("");
    setProfilePassword("");
    setProfileMsg(null);
    setProfileError(null);
    setProfileOriginal(null);
  }

  async function submitProfileEdit() {
    if (!profileEditId || !profileOriginal) {
      setProfileError("編集対象が選択されていません");
      return;
    }
    setProfileError(null);
    setProfileMsg(null);
    const payload: Record<string, string> = {};
    const nextName = profileName.trim();
    const nextEmail = profileEmail.trim().toLowerCase();
    if (nextName && nextName !== profileOriginal.name) payload.name = nextName;
    if (nextEmail && nextEmail !== profileOriginal.email.toLowerCase()) payload.email = nextEmail;
    if (profilePassword) payload.password = profilePassword;
    if (Object.keys(payload).length === 0) {
      setProfileError("変更内容がありません");
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${profileEditId}/profile`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setProfileMsg('プロフィールを更新しました');
        setProfilePassword('');
        loadUsers();
      } else {
        const code = data?.error || 'update_failed';
        if (code === 'email_taken') {
          setProfileError('このメールアドレスは既に使用されています');
        } else if (code === 'nothing_to_update') {
          setProfileError('変更内容がありません');
        } else {
          setProfileError('更新に失敗しました');
        }
      }
    } catch (err) {
      setProfileError('更新に失敗しました');
    }
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setMsg("すべての項目を入力してください");
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
        credentials: 'include'
      });
      const j = await res.json();

      if (res.ok) {
        setName("");
        setEmail("");
        setPassword("");
        setMsg("ユーザーを作成しました");
        loadUsers();
      } else {
        setMsg(j.error || "作成に失敗しました");
      }
    } catch (error) {
      setMsg("ネットワークエラーが発生しました");
    }
  }

  async function deleteUser(userId: string, userName: string) {
    if (!confirm(`${userName} を削除しますか？この操作は取り消せません。`)) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const j = await res.json();

      if (res.ok) {
        setMsg('ユーザーを削除しました');
        loadUsers();
      } else {
        setMsg(j.error || '削除に失敗しました');
      }
    } catch (error) {
      setMsg('ネットワークエラーが発生しました');
    }
  }

  async function toggleAdminPrivilege(userId: string, currentIsAdmin: boolean) {
    setAdminMsg(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}/privilege`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ is_admin: !currentIsAdmin }),
        credentials: 'include'
      });
      const j = await res.json();

      if (res.ok) {
        setAdminMsg(currentIsAdmin ? '管理者権限を剥奪しました' : '管理者権限を付与しました');
        loadUsers(); // Reload user list
      } else {
        setAdminMsg(j.error || '権限変更に失敗しました');
      }
    } catch (error) {
      setAdminMsg('ネットワークエラーが発生しました');
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-lg text-gray-600">読み込み中...</div>
      </div>
    );
  }

  // Show access denied for non-admin users
  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
        <div className="text-6xl">🚫</div>
        <h1 className="text-2xl font-bold text-red-600">アクセス拒否</h1>
        <p className="text-gray-600 text-center">
          この画面は管理者のみアクセス可能です。<br/>
          管理者権限がない場合はアクセスできません。
        </p>
        <a
          href="/calendar"
          className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 font-medium"
        >
          カレンダーに戻る
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="card-title">管理者画面</h1>
      <div className="flex flex-wrap justify-end gap-2 text-sm">
        <a
          href="/admin/overview"
          className="rounded-md border border-purple-200 bg-purple-50 px-3 py-1 text-purple-800 hover:bg-purple-100"
        >
          チェック管理へ
        </a>
      </div>

      {userListError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {userListError}
        </div>
      )}

      {profileEditId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) cancelProfileEdit();
          }}
        >
          <div className="relative w-full max-w-2xl rounded-2xl border border-purple-200 bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={cancelProfileEdit}
              className="absolute right-4 top-4 rounded-full border border-gray-200 bg-white px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
              aria-label="閉じる"
            >
              ×
            </button>
            <h2 className="mb-4 text-lg font-semibold text-purple-900">ユーザープロフィール編集</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-orange-900/80">
                <span>名前</span>
                <input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full rounded-md border border-orange-200 px-3 py-2"
                />
              </label>
              <label className="space-y-2 text-sm text-orange-900/80">
                <span>メールアドレス</span>
                <input
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full rounded-md border border-orange-200 px-3 py-2"
                  type="email"
                />
              </label>
            </div>
            <label className="mt-4 block space-y-2 text-sm text-orange-900/80">
              <span>新しいパスワード（必要な場合のみ）</span>
              <input
                value={profilePassword}
                onChange={(e) => setProfilePassword(e.target.value)}
                className="w-full rounded-md border border-orange-200 px-3 py-2"
                type="password"
                placeholder="変更しない場合は空のまま"
              />
            </label>
            {profileError && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {profileError}
              </div>
            )}
            {profileMsg && (
              <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {profileMsg}
              </div>
            )}
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={submitProfileEdit} className="btn-primary rounded px-4 py-2">
                保存する
              </button>
              <button
                type="button"
                onClick={cancelProfileEdit}
                className="rounded px-4 py-2 border border-orange-300 bg-white text-orange-700 hover:bg-orange-50"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ユーザー登録 */}
      <div className="rounded-lg border border-orange-200/70 bg-white p-4 max-w-2xl space-y-4">
        <h2 className="font-medium">新規ユーザー登録</h2>
        <form onSubmit={addUser} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">名前</label>
            <input
              value={name}
              onChange={(e)=>setName(e.target.value)}
              placeholder="ユーザー名"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              placeholder="user@example.com"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              placeholder="パスワード"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              required
              minLength={8}
            />
          </div>
          <button className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 font-medium">
            ユーザー登録
          </button>
        </form>
        {msg && <div className="text-sm text-orange-900/80 p-2 bg-orange-50 rounded">{msg}</div>}
      </div>

      {/* 管理者権限管理 */}
      <div className="rounded-lg border border-orange-200/70 bg-white p-4 max-w-lg space-y-3">
        <h2 className="font-medium">管理者権限管理</h2>
        <p className="text-sm text-gray-600">
          ユーザーに管理者権限を付与または剥奪できます。管理者は全ての機能にアクセス可能になります。
        </p>
        {adminMsg && <div className="text-sm text-orange-900/80 p-2 bg-orange-50 rounded">{adminMsg}</div>}
      </div>

      {/* ユーザー一覧 */}
      <div className="rounded-lg border border-orange-200/70 bg-white p-4">
        <h2 className="font-medium mb-4">ユーザー一覧</h2>
        <div className="space-y-2">
          {users.length === 0 ? (
            <p className="text-gray-500">ユーザーが登録されていません</p>
          ) : (
            users.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 border-b border-orange-200/60 py-2">
                <div className="flex items-center gap-2">
                  <div>
                    <span className="font-medium">{u.name}</span>
                    {u.is_admin && (
                      <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full font-medium">
                        管理者
                      </span>
                    )}
                    <div className="text-sm text-gray-600">
                      {u.email}
                      <span className="ml-2 text-xs text-gray-400">ID: {u.id}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => beginProfileEdit(u)}
                    className="text-sm px-3 py-1 rounded font-medium bg-white border border-orange-200 text-orange-700 hover:bg-orange-50"
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAdminPrivilege(u.id, u.is_admin || false)}
                    className={`text-xs px-2 py-1 rounded font-medium ${
                      u.is_admin
                        ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                        : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                    }`}
                    title={u.is_admin ? "管理者権限を剥奪" : "管理者権限を付与"}
                  >
                    {u.is_admin ? "権限剥奪" : "管理者化"}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteUser(u.id, u.name)}
                    className={`text-sm px-3 py-1 rounded font-medium ${
                      u.is_admin
                        ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                        : "bg-red-100 text-red-700 hover:bg-red-200"
                    }`}
                    aria-label={`${u.name} を削除`}
                    disabled={u.is_admin}
                    title={u.is_admin ? "管理者は削除できません" : ""}
                  >
                    {u.is_admin ? "保護中" : "削除"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
