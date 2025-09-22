import { CalendarView } from "../../../components/CalendarView";

export default async function CalendarPage({ searchParams }: any) {
  const month = searchParams?.month;
  const valid = month && /^\d{4}-\d{2}$/.test(month) ? month : undefined;
  return (
    <div className="space-y-6">
      <h1 className="card-title">カレンダー</h1>
      <CalendarView initialMonth={valid} />
    </div>
  );
}
