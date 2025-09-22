"use client";
import { useEffect, useState } from "react";

type User = { id: string; name: string };

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<string>("");
  const [editDate, setEditDate] = useState<string>("");
  const [editMsg, setEditMsg] = useState<string | null>(null);

  // Import states
  const [csvText, setCsvText] = useState("");
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [parsed, setParsed] = useState<string[]>([]);
  const [dupNames, setDupNames] = useState<string[]>([]);
  const [newNames, setNewNames] = useState<string[]>([]);
  const templateCsv = "name\n山田太郎\n田中花子";

  useEffect(() => { loadUsers(); }, []);
  async function loadUsers() {
    const res = await fetch("/api/users", { cache: "no-store" });
    const json = await res.json();
    setUsers(json.users || []);
  }

  // Parse pasted CSV for preview
  useEffect(() => {
    const text = csvText.replace(/\r\n?/g, "\n");
    const names = text.split("\n").filter(Boolean).map((raw) => {
      const cell = (raw.split(",")[0] || raw).trim().replace(/^\"|\"$/g, "");
      return cell;
    }).filter((s) => s && !/^(name|名前)$/i.test(s));
    const uniq = Array.from(new Set(names));
    setParsed(uniq);
    const existing = new Set(users.map((u) => u.name));
    setDupNames(uniq.filter((n) => existing.has(n)));
    setNewNames(uniq.filter((n) => !existing.has(n)));
  }, [csvText, users]);

  async function addUser(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    const res = await fetch("/api/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
    const j = await res.json().catch(() => ({}));
    if (res.ok) { setName(""); setMsg("作成しました"); loadUsers(); }
    else { setMsg(j.error || "失敗しました"); }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setImportMsg(null);
    const file = e.target.files?.[0];
    if (!file) { setCsvText(""); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      setCsvText(text || "");
    };
    reader.readAsText(file);
  }

  async function registerParsedNames() {
    setImportMsg(null);
    if (newNames.length === 0) { setImportMsg("新規で追加できる名前がありません"); return; }
    const res = await fetch("/api/users/import", { method: "POST", headers: { "content-type": "application/json" }, credentials: 'same-origin', body: JSON.stringify({ names: newNames }) });
    const j = await res.json().catch(()=>({}));
    if (res.ok) { setImportMsg(`${j.created || 0}件追加、${j.skipped || 0}件スキップ`); setCsvText(""); loadUsers(); }
    else { setImportMsg(j.error || "失敗しました"); }
  }

  async function handleCheckAdd() {
    setEditMsg(null);
    if (!editUser || !editDate) { setEditMsg('ユーザーと日付を入力'); return; }
    const res = await fetch('/api/admin/entries', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ user_id: editUser, entry_date: editDate }) });
    const j = await res.json().catch(()=>({}));
    setEditMsg(res.ok ? (j.status === 'created' ? '付与しました' : '既に存在します') : (j.error || '失敗しました'));
  }
  async function handleCheckRemove() {
    setEditMsg(null);
    if (!editUser || !editDate) { setEditMsg('ユーザーと日付を入力'); return; }
    const res = await fetch('/api/admin/entries', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ user_id: editUser, entry_date: editDate }) });
    const j = await res.json().catch(()=>({}));
    setEditMsg(res.ok ? (j.status === 'deleted' ? '削除しました' : '見つかりません') : (j.error || '失敗しました'));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">管理</h1>

      {/* ユーザー登録（単体 + 一括） */}
      <div className="rounded-lg border border-orange-200/70 bg-white p-4 max-w-2xl space-y-4">
        <h2 className="font-medium">ユーザー登録</h2>
        {/* 1名追加 */}
        <form onSubmit={addUser} className="flex flex-col gap-2">
          <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="名前" className="border rounded px-3 py-2 flex-1" />
          <button className="btn-primary rounded px-3 py-2 whitespace-nowrap">ユーザー追加</button>
        </form>
        {msg && <div className="text-sm text-orange-900/80">{msg}</div>}

        {/* 一括登録 */}
        <div className="space-y-3">
          <h3 className="font-medium">一括登録</h3>
          <div className="text-sm text-orange-900/70">手順: ファイル選択 → プレビュー確認 → 登録。1列目が名前。ヘッダー「name/名前」は無視されます。</div>
          <div className="flex gap-3 text-sm items-center">
            <input name="file" type="file" accept=".csv,text/csv,text/plain" className="text-sm" onChange={handleFileSelect} />
            <a href={'data:text/csv;charset=utf-8,' + encodeURIComponent(templateCsv)} download="users_template.csv" className="ml-auto underline text-orange-700">テンプレート</a>
          </div>
          <div className="rounded border border-orange-200 p-3 bg-orange-50/30">
            <div className="text-sm font-medium mb-2">プレビュー</div>
            <div className="text-sm text-orange-900/80">読み込み: {parsed.length}件 / 新規: {newNames.length}件 / 既存: {dupNames.length}件</div>
            {parsed.length > 0 ? (
              <ul className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1 text-sm">
                {parsed.map((n)=> (
                  <li key={n} className={dupNames.includes(n)?'text-orange-500':''}>{n}{dupNames.includes(n)?'（既存）':''}</li>
                ))}
              </ul>
            ) : (
              <div className="mt-2 text-sm text-orange-900/60">ファイルを選択するとプレビューが表示されます。</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={registerParsedNames} className="btn-primary rounded px-3 py-2" disabled={newNames.length===0}>この{newNames.length}名を登録</button>
            {importMsg && <div className="text-sm text-orange-900/80">{importMsg}</div>}
          </div>
        </div>
      </div>

      {/* チェック修正 */}
      <div className="rounded-lg border border-orange-200/70 bg-white p-4 max-w-lg space-y-3">
        <h2 className="font-medium">チェック修正（付与/削除）</h2>
        <div className="flex flex-col gap-2">
          <label className="text-sm">ユーザー</label>
          <select value={editUser} onChange={(e)=>setEditUser(e.target.value)} className="border rounded px-2 py-1 bg-white">
            <option value="">選択してください</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <label className="text-sm">日付</label>
          <input type="date" value={editDate} onChange={(e)=>setEditDate(e.target.value)} className="border rounded px-2 py-1" />
          <div className="flex items-center gap-2">
            <button onClick={handleCheckAdd} className="btn-primary rounded px-3 py-2">チェックを付ける</button>
            <button onClick={handleCheckRemove} className="rounded px-3 py-2 border border-orange-300 hover:bg-orange-50">チェックを外す</button>
          </div>
          {editMsg && <div className="text-sm text-orange-900/80">{editMsg}</div>}
        </div>
      </div>

      {/* 一覧 */}
      <div>
        <h2 className="font-medium mb-2">ユーザー一覧</h2>
        <ul className="space-y-1">
          {users.map((u)=> (
            <li key={u.id} className="flex items-center justify-between gap-3 border-b border-orange-200/60 py-1">
              <span>
                {u.name} <span className="text-xs text-orange-900/60">({u.id})</span>
              </span>
              <button
                onClick={async ()=>{
                  if (!confirm(`${u.name} を削除しますか？この操作は取り消せません。`)) return;
                  const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE', credentials: 'same-origin' });
                  const j = await res.json().catch(()=>({}));
                  if (res.ok) {
                    setMsg('削除しました');
                    loadUsers();
                  } else {
                    setMsg(j.error || '削除に失敗しました');
                  }
                }}
                className="text-sm rounded px-2 py-1 border border-red-300 text-red-700 hover:bg-red-50"
                aria-label={`${u.name} を削除`}
              >削除</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
