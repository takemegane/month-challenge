import { CalendarView } from "../../components/CalendarView";

type Props = {
  searchParams: Promise<{ month?: string }>;
};

// 未ログイン・セッション切れは middleware が /auth/sign-in へ振り分ける。
// ここに Cookie の存在チェックを置いていたが、存在するだけで通してしまい
// 期限切れでも「未ログインです」の文章を出す中途半端な状態になっていた。
export default async function CalendarPage({ searchParams }: Props) {
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
