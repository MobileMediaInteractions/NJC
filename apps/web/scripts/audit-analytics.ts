import { runAnalyticsProductionAudit } from "../src/lib/analytics-production-audit";

async function main() {
  console.log(JSON.stringify(await runAnalyticsProductionAudit(), null, 2));
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Analytics audit failed.",
  );
  process.exitCode = 1;
});
