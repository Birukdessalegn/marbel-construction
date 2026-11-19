import { PageHeader } from "@/components/page-header";

export default function StockValuationPage() {
  return <><PageHeader title="Stock Valuation" description="Valuation reporting requires an approved cost and valuation rule" /><div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">The backend currently exposes quantity and area but no cost or valuation endpoint. This report is intentionally unavailable until valuation rules are implemented.</div></>;
}
