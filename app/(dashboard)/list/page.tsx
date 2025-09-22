import { Suspense } from "react";
import MonthlySummary from "./MonthlySummary";
import { MockSeedButton } from "../../../components/MockSeedButton";
import { isMockMode } from "../../../lib/runtime";
import CurrentMonthCount from "./current";

export default function ListPage() {
  const showMock = isMockMode();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="card-title">一覧</h1>
        {showMock ? <MockSeedButton /> : null}
      </div>
      {/* Current month summary */}
      <CurrentMonthCount />
      <Suspense fallback={<p>読み込み中...</p>}>
        <MonthlySummary />
      </Suspense>
    </div>
  );
}
