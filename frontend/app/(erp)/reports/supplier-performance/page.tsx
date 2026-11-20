"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { fetchSupplierPerformance } from "@/features/procurement/api";
import { formatPercent, formatQuantity } from "@/features/procurement/format";
import { getApiError } from "@/lib/api";

export default function SupplierPerformancePage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const performance = useQuery({
    queryKey: ["supplier-performance", { dateFrom, dateTo }],
    queryFn: () => fetchSupplierPerformance({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })
  });

  return (
    <>
      <PageHeader title="Supplier Performance" description="Compare completed-order delivery and received-material quality" />
      <div className="mb-4 grid gap-2 rounded-xl border bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[1fr_1fr_auto]">
        <label className="text-sm"><span className="mb-1 block font-medium">Order date from</span><input type="date" className="form-input" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label>
        <label className="text-sm"><span className="mb-1 block font-medium">Order date to</span><input type="date" className="form-input" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
        <button className="self-end rounded-md border px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear dates</button>
      </div>
      {performance.isLoading ? <LoadingState /> : performance.isError ? <ErrorState message={getApiError(performance.error).message} onRetry={() => performance.refetch()} /> : (
        <div className="overflow-hidden rounded-xl border bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60"><tr>{["Supplier", "Completed orders", "On-time delivery", "Received qty", "Quarantined qty", "Quality acceptance", "Rating"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead>
            <tbody>{performance.data?.map((supplier) => <tr key={supplier.id} className="border-t dark:border-slate-800">
              <td className="px-4 py-3 font-medium">{supplier.name}</td><td className="px-4 py-3">{supplier.completedOrders}</td>
              <td className="px-4 py-3">{formatPercent(supplier.onTimeDeliveryRate)}</td><td className="px-4 py-3">{formatQuantity(supplier.receivedQuantity)}</td>
              <td className="px-4 py-3">{formatQuantity(supplier.quarantinedQuantity)}</td><td className="px-4 py-3">{formatPercent(supplier.qualityAcceptanceRate)}</td>
              <td className="px-4 py-3">{supplier.rating == null ? "—" : `${Number(supplier.rating).toFixed(1)} / 5`}</td>
            </tr>)}
            {!performance.data?.length && <tr><td colSpan={7} className="p-10 text-center text-slate-500">No supplier performance data for this period.</td></tr>}
            </tbody>
          </table></div>
          <p className="border-t px-4 py-3 text-xs text-slate-500 dark:border-slate-800">Delivery rate uses completed orders with an expected date. Quality acceptance excludes quarantined receipt quantities.</p>
        </div>
      )}
    </>
  );
}
