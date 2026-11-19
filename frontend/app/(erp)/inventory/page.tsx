"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api, getApiError } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { Boxes, Layers3, Package, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InventoryDashboard() {
  const summary = useQuery({
    queryKey: ["stock-summary"],
    queryFn: async () => (await api.get("/stock/summary")).data
  });
  const warehouses = useQuery({
    queryKey: ["warehouse-options"],
    queryFn: async () => (await api.get("/warehouses", { params: { limit: 100 } })).data.data
  });

  return (
    <>
      <PageHeader title="Stock Overview" description="Live inventory and warehouse activity" actions={<><Link href="/inventory/items/new"><Button>Create item</Button></Link><Link href="/stock"><Button variant="outline">Movement</Button></Link></>} />
      {summary.isLoading ? <LoadingState /> : summary.isError ? <ErrorState message={getApiError(summary.error).message} onRetry={() => summary.refetch()} /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Balance rows", value: summary.data?.balanceRows ?? 0, icon: Boxes, tone: "text-slate-700" },
            { label: "Units", value: summary.data?.quantity ?? 0, icon: Package, tone: "text-green-700" },
            { label: "Area (sqm)", value: summary.data?.areaSqm ?? 0, icon: Layers3, tone: "text-blue-700" },
            { label: "Warehouses", value: warehouses.data?.length ?? 0, icon: Warehouse, tone: "text-amber-700" }
          ].map((card) => (
            <div key={card.label} className="rounded-xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-500">{card.label}</span><card.icon className={`h-5 w-5 ${card.tone}`} /></div>
              <p className="mt-3 text-3xl font-bold">{String(card.value)}</p>
            </div>
          ))}
        </div>
      )}
      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-semibold">Warehouse activity</h2>
          {warehouses.isLoading ? <div className="mt-4"><LoadingState /></div> : warehouses.isError ? <div className="mt-4"><ErrorState message={getApiError(warehouses.error).message} /></div> : (
            <div className="mt-4 space-y-2">{warehouses.data?.map((warehouse: { id: string; code: string; name: string }) => <Link href={`/warehouses/${warehouse.id}`} key={warehouse.id} className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"><span><strong>{warehouse.code}</strong> — {warehouse.name}</span><span className="text-slate-400">View</span></Link>)}</div>
          )}
        </div>
        <div className="rounded-xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-semibold">Operations</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {["receive", "issue", "transfer", "count"].map((type) => <Link key={type} href={`/stock/${type}`} className="rounded-md border p-3 text-sm capitalize hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800">{type}</Link>)}
          </div>
        </div>
      </div>
    </>
  );
}
