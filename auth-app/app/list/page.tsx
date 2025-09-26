import { Suspense } from "react";
import MonthlySummary from "./MonthlySummary";

export default function ListPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="card-title">一覧</h1>
      </div>
      <Suspense fallback={<p>読み込み中...</p>}>
        <MonthlySummary />
      </Suspense>
    </div>
  );
}