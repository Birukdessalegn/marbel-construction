"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchItems, fetchTraceability } from "@/features/inventory/api";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { getApiError } from "@/lib/api";

export default function TraceabilityReportPage() {
  const [itemId, setItemId] = useState("");
  const items = useQuery({ queryKey: ["traceability-items"], queryFn: () => fetchItems({ limit: 100 }) });
  const trace = useQuery({ queryKey: ["traceability-report", itemId], queryFn: () => fetchTraceability(itemId), enabled: !!itemId });

  return <>
    <PageHeader title="Traceability Report" description="Trace a finished piece back to its block or slab" />
    <div className="rounded-xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <label className="block max-w-lg text-sm"><span className="mb-1.5 block font-medium">Select item</span><select className="form-input" value={itemId} onChange={e => setItemId(e.target.value)}><option value="">Choose an inventory item</option>{items.data?.data.map(item => <option value={item.id} key={item.id}>{item.sku} — {item.name}</option>)}</select></label>
      {itemId && <div className="mt-6">{trace.isLoading ? <LoadingState /> : trace.isError ? <ErrorState message={getApiError(trace.error).message} /> : <div className="rounded-lg border p-5 dark:border-slate-800"><div className="text-sm"><span className="text-slate-500">Finished piece</span><p className="mt-1 font-semibold">{trace.data?.name}</p></div>{trace.data?.parent && <div className="ml-6 mt-4 border-l pl-5 text-sm"><span className="text-slate-500">Parent slab / block</span><p className="mt-1 font-semibold">{trace.data.parent.name}</p><p className="text-xs text-slate-500">{trace.data.parent.uniqueBlockId || trace.data.parent.uniqueSlabId || trace.data.parent.sku}</p></div>}</div>}</div>}
    </div>
  </>;
}
