"use client";
import { useEffect, useState } from "react";

export default function CalendarPage() {
  const [me, setMe] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' }).then(r=>r.json()).then(j=>{
      if (j?.user) setMe(j.user); else location.href = '/auth/sign-in';
    }).catch(()=>{});
  }, []);
  async function recordToday() {
    setMsg(null);
    const res = await fetch('/api/entries/today', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) });
    const j = await res.json().catch(()=>({}));
    if (res.ok) setMsg(j.status === 'created' ? '記録しました' : '既に記録済み');
    else setMsg(j.error || '失敗しました');
  }
  return (
    <div className="card"><div className="card-body">
      <h1 style={{ fontWeight: 600, fontSize: 20 }}>カレンダー</h1>
      <div className="mt-2">{me ? <>こんにちは、{me.name} さん</> : '...'}</div>
      <button className="btn btn-primary mt-3" onClick={recordToday}>今日の記録</button>
      {msg && <div className="mt-2" style={{ color: '#b45309' }}>{msg}</div>}
    </div></div>
  );
}

