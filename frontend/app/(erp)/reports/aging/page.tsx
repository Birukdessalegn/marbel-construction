import { PageHeader } from "@/components/page-header";

export default function AgingReportPage() {
  return <><PageHeader title="Aging Report" description="Stock aging requires receipt dates and cost-period metrics" /><div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">The backend currently has transaction history but no aging summary metric. This report is intentionally unavailable until receipt aging rules are implemented.</div></>;
}
