"use client";

import { useMemo, useState, useEffect } from "react";
import { useUser, useOverview, useCheckOperation, prefetchOverviewRange } from "../../../hooks/use-api";

function formatMonthLabel(month: string) {
  const [year, m] = month.split("-");
  return `${Number(year)}年${Number(m)}月`;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function addMonths(month: string, diff: number): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, (m ?? 1) - 1 + diff, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const SKELETON_USERS = Array.from({ length: 5 }, (_, idx) => idx);
const SKELETON_DAYS = Array.from({ length: 10 }, (_, idx) => idx + 1);

type OverviewUser = {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  total: number;
  dates: string[];
};

type OverviewResponse = {
  month: string;
  range: { start: string; end: string };
  users: OverviewUser[];
  daily: Array<{ date: string; count: number }>;
};

export default function AdminOverviewPage() {
  const { user: currentUser, isLoading: userLoading } = useUser();
  const [month, setMonth] = useState<string>(getCurrentMonth());
  const { overview, isLoading: overviewLoading, isValidating, isError: overviewError } = useOverview(month);
  const { performCheck, isUpdating, error: checkError } = useCheckOperation();
  const [editUser, setEditUser] = useState<string>("");
  const [editDate, setEditDate] = useState<string>("");
  const [editMsg, setEditMsg] = useState<string | null>(null);

  // Check admin authorization based on current user
  const isAuthorized = currentUser?.is_admin || false;
  const authLoading = userLoading;
  const showSkeleton = overviewLoading && !overview;
  const isRefreshing = isValidating && !!overview;
  const error = overviewError ? "データの取得に失敗しました" : null;
  const data = overview as OverviewResponse | undefined;

  const days = useMemo(() => data?.daily.map((d: { date: string; count: number }) => d.date) ?? [], [data]);

  const sortedUsers = useMemo(() => {
    return [...(data?.users || [])].sort((a, b) => a.name.localeCompare(b.name));
  }, [data?.users]);

  // Reset selection if the chosen user no longer exists
  useEffect(() => {
    if (!editUser) return;
    if (data?.users?.some((u: OverviewUser) => u.id === editUser)) return;
    setEditUser("");
  }, [data?.users, editUser]);

  // Advanced prefetch strategy: preload adjacent and nearby months for admin overview
  useEffect(() => {
    prefetchOverviewRange(month);
  }, [month]);

  const handleDownloadCsv = async () => {
    try {
      const res = await fetch(`/api/admin/overview?month=${month}&format=csv`, { credentials: "include" });
      if (!res.ok) throw new Error("CSVの取得に失敗しました");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `overview-${month}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err?.message || "CSVのダウンロードに失敗しました");
    }
  };

  async function handleCheck(update: "add" | "remove") {
    if (!editUser || !editDate) {
      setEditMsg("ユーザーと日付を選択してください");
      return;
    }
    setEditMsg(null);

    try {
      const result = await performCheck({
        action: update,
        user_id: editUser,
        entry_date: editDate,
        month
      });

      setEditMsg(update === 'add'
        ? (result.status === 'created' ? 'チェックを付与しました' : '既に存在します')
        : (result.status === 'deleted' ? 'チェックを外しました' : '対象が見つかりません'));
    } catch (err: any) {
      const errorInfo = err?.info || {};
      setEditMsg(errorInfo.error || '更新に失敗しました');
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-orange-900/70">
        読み込み中です...
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 rounded-xl border border-orange-200 bg-white/80 p-8 text-center text-orange-900/80">
        <div className="text-6xl">🚫</div>
        <h1 className="text-2xl font-bold text-red-600">アクセス拒否</h1>
        <p className="text-sm text-orange-900/70">
          この画面は管理者のみアクセス可能です。
          <br />
          管理者権限がない場合はアクセスできません。
        </p>
        <a
          href="/calendar"
          className="rounded-md bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700"
        >
          カレンダーに戻る
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-orange-900/90">チェック管理</h1>
          <p className="text-sm text-orange-900/70">チェック状況と日別の進捗を管理できます</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border border-orange-200 bg-white px-3 py-2 text-sm font-medium text-orange-800 hover:bg-orange-50"
            onClick={() => setMonth((m) => addMonths(m, -1))}
            aria-label="前の月"
          >
            ← 前の月
          </button>
          <div className="min-w-[9rem] text-center text-base font-semibold text-orange-900/90">
            {formatMonthLabel(month)}
          </div>
          <button
            className="rounded-md border border-orange-200 bg-white px-3 py-2 text-sm font-medium text-orange-800 hover:bg-orange-50"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            aria-label="次の月"
          >
            次の月 →
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setMonth(getCurrentMonth())}
          className="rounded-md border border-orange-300 px-3 py-1 text-sm text-orange-800 hover:bg-orange-50"
        >
          今月へ戻る
        </button>
        <button
          onClick={handleDownloadCsv}
          className="rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white shadow hover:bg-orange-600"
        >
          CSVダウンロード
        </button>
      </div>


      {showSkeleton && (
        <>
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-orange-900/90">ユーザー別件数</h2>
              <div className="text-sm text-orange-900/70">上位20名を表示</div>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-orange-200 bg-white/80 shadow-sm">
              {isRefreshing && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm animate-pulse pointer-events-none" aria-hidden="true" />
              )}
              <table className="min-w-full divide-y divide-orange-200 text-sm">
                <tbody className="divide-y divide-orange-100">
                  {SKELETON_USERS.map((key) => (
                    <tr key={`skeleton-user-${key}`} className="animate-pulse text-orange-900/60">
                      <td className="px-4 py-3">
                        <div className="h-4 w-32 rounded bg-orange-100" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-48 rounded bg-orange-100" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="ml-auto h-4 w-10 rounded bg-orange-100" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-2 rounded bg-orange-100" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="rounded-lg border border-orange-200/70 bg-white p-4 max-w-2xl space-y-3">
            <div className="h-4 w-32 rounded bg-orange-100 animate-pulse" />
            <div className="space-y-3">
              <div className="h-4 w-24 rounded bg-orange-100 animate-pulse" />
              <div className="h-10 rounded bg-orange-100 animate-pulse" />
              <div className="h-4 w-24 rounded bg-orange-100 animate-pulse" />
              <div className="h-10 rounded bg-orange-100 animate-pulse" />
              <div className="flex gap-2">
                <div className="h-10 flex-1 rounded bg-green-100 animate-pulse" />
                <div className="h-10 flex-1 rounded bg-red-100 animate-pulse" />
              </div>
            </div>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-orange-900/90">日別チェック状況</h2>
              <div className="text-sm text-orange-900/70">6行表示・縦スクロール対応</div>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-orange-200 bg-white/80 shadow-sm">
              {isRefreshing && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm animate-pulse pointer-events-none" aria-hidden="true" />
              )}
              <div className="max-h-[12rem] overflow-y-auto overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 text-xs">
                  <tbody>
                    {SKELETON_USERS.map((key) => (
                      <tr key={`skeleton-daily-${key}`} className="animate-pulse text-orange-900/60">
                        <td className="px-3 py-2 min-w-[120px]">
                          <div className="h-4 w-32 rounded bg-orange-100" />
                        </td>
                        <td className="px-3 py-2 min-w-[60px]">
                          <div className="h-4 w-10 rounded bg-orange-100" />
                        </td>
                        {SKELETON_DAYS.map((day) => (
                          <td key={`skeleton-daily-${key}-${day}`} className="px-2 py-1 min-w-[40px]">
                            <div className="h-5 w-5 rounded-full bg-orange-100" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}

      {!showSkeleton && error && !data && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
          データを取得できませんでした: {error}
        </div>
      )}

      {data && !showSkeleton && (
        <>
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              最新データの取得に失敗しました。表示中の情報はキャッシュです。
            </div>
          )}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-orange-900/90">ユーザー別件数</h2>
              <div className="text-sm text-orange-900/70">上位20名を表示</div>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-orange-200 bg-white/80 shadow-sm">
              {isRefreshing && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm animate-pulse pointer-events-none" aria-hidden="true" />
              )}
              <table className="min-w-full divide-y divide-orange-200 text-sm">
                <thead className="bg-orange-50 text-orange-900/80">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">ユーザー</th>
                    <th className="px-4 py-2 text-left font-medium">メール</th>
                    <th className="px-4 py-2 text-right font-medium">チェック数</th>
                    <th className="px-4 py-2 text-left font-medium">進捗</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-orange-100">
                  {data.users.slice(0, 20).map((user: OverviewUser) => {
                    const totalDays = days.length || 1;
                    const rate = Math.round((user.total / totalDays) * 100);
                    return (
                      <tr key={user.id} className="text-orange-900/90">
                        <td className="px-4 py-2 font-medium">{user.name}</td>
                        <td className="px-4 py-2 text-orange-900/70">{user.email}</td>
                        <td className="px-4 py-2 text-right">{user.total}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 rounded-full bg-orange-100">
                              <div
                                className="h-2 rounded-full bg-orange-500"
                                style={{ width: `${Math.min(rate, 100)}%` }}
                              />
                            </div>
                            <span className="min-w-[3.5rem] text-sm text-orange-900/70">{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {data.users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-orange-900/60">
                        この月のチェックはまだありません。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="rounded-lg border border-orange-200/70 bg-white p-4 max-w-2xl space-y-3">
            <h2 className="font-medium">チェック操作</h2>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">ユーザー</label>
              <select
                value={editUser}
                onChange={(e) => setEditUser(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
              >
                <option value="">選択してください</option>
                {sortedUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
              <label className="block text-sm font-medium text-gray-700">日付</label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCheck('add')}
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                >
                  チェックを付ける
                </button>
                <button
                  type="button"
                  onClick={() => handleCheck('remove')}
                  className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
                >
                  チェックを外す
                </button>
              </div>
              {editMsg && <div className="text-sm text-orange-900/80 p-2 bg-orange-50 rounded">{editMsg}</div>}
            </div>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-orange-900/90">日別チェック状況</h2>
              <div className="text-sm text-orange-900/70">6行表示・縦スクロール対応</div>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-orange-200 bg-white/80 shadow-sm">
              {isRefreshing && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm animate-pulse pointer-events-none" aria-hidden="true" />
              )}
              <div className="max-h-[12rem] overflow-y-auto overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 text-xs">
                  <thead className="sticky top-0 bg-orange-50 z-10">
                    <tr>
                      <th className="sticky left-0 z-20 bg-orange-50 px-3 py-2 text-left font-medium text-orange-900/80 border-r border-orange-200 min-w-[120px]">ユーザー</th>
                      <th className="px-3 py-2 text-right font-medium text-orange-900/80 border-r border-orange-200 min-w-[60px]">件数</th>
                      {days.map((day: string) => (
                        <th key={day} className="px-2 py-2 font-medium text-orange-900/70 min-w-[40px]">
                          {Number(day.slice(-2))}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.map((user: OverviewUser) => {
                      const marked = new Set(user.dates);
                      return (
                        <tr key={`detail-${user.id}`} className="hover:bg-orange-50/50">
                          <td className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-medium text-orange-900/90 border-r border-orange-200 min-w-[120px]">
                            {user.name}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-orange-900/80 border-r border-orange-200 min-w-[60px]">
                            {user.total}
                          </td>
                          {days.map((day: string) => (
                            <td key={`${user.id}-${day}`} className="px-2 py-1 min-w-[40px]">
                              <div
                                className={`h-5 w-5 rounded-full border ${marked.has(day) ? "border-orange-400 bg-orange-400" : "border-orange-200 bg-white"}`}
                                aria-label={marked.has(day) ? "チェック済" : "未チェック"}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
