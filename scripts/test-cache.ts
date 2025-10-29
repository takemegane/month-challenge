import { rebuildMonthlyCache, applyDiffJobs } from "../auth-app/lib/daily-stats-cache.ts";
import { enqueueDailyStatsDiff, claimDiffJobs, countDiffJobsByStatus } from "../auth-app/lib/cache-jobs.ts";

async function run() {
  console.log("Rebuilding cache for 2025-09");
  const rebuildResult = await rebuildMonthlyCache("2025-09");
  console.log("rebuild result", rebuildResult);

  console.log("Queueing diff job");
  await enqueueDailyStatsDiff({
    userId: "8751dd64-ee9c-42ba-b72f-ed15a56ccb1c", // テストユーザー
    entryDate: "2025-09-23",
    action: "add",
    source: "script/test"
  });

  const jobs = await claimDiffJobs(10);
  console.log("claimed jobs", jobs.length);
  const diffResult = await applyDiffJobs(jobs, Date.now() + 10_000);
  console.log("diff result", diffResult);

  const pending = await countDiffJobsByStatus("pending");
  const failed = await countDiffJobsByStatus("failed");
  console.log({ pending, failed });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
