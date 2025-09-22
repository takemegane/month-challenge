import { CalendarView } from "../../components/CalendarView";
import { cookies } from "next/headers";

export default async function CalendarPage() {
  // Ensure logged-in; if not, redirect
  const token = cookies().get('auth-token');
  if (!token) {
    return (
      <div>
        <p>未ログインです。<a className="underline text-orange-700" href="/auth/sign-in">ログイン</a>してください。</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <h1 className="card-title">カレンダー</h1>
      <CalendarView />
    </div>
  );
}
