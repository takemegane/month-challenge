import { CalendarView } from "../../components/CalendarView";
import { cookies } from "next/headers";

type Props = {
  searchParams: Promise<{ month?: string }>;
};

export default async function CalendarPage({ searchParams }: Props) {
  // Ensure logged-in; if not, redirect
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token');
  if (!token) {
    return (
      <div>
        <p>未ログインです。<a className="underline text-orange-700" href="/auth/sign-in">ログイン</a>してください。</p>
      </div>
    );
  }

  const params = await searchParams;
  const initialMonth = params.month ? `${params.month}-01` : undefined;

  // Generate unique key to force component remount when month changes
  const resetKey = params.month ? `calendar-${params.month}` : 'calendar-current';

  return (
    <div className="space-y-4">
      <h1 className="card-title">カレンダー</h1>
      <CalendarView key={resetKey} initialMonth={initialMonth} />
    </div>
  );
}
