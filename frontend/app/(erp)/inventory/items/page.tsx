"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchItems } from "@/features/inventory/api";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { RoleGate } from "@/components/role-gate";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { getApiError } from "@/lib/api";

export default function ItemsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [grade, setGrade] = useState("");
  const [status, setStatus] = useState("");

  const query = useQuery({
    queryKey: ["items", { search, page, type, grade, status }],
    queryFn: () => fetchItems({ search: search || undefined, page, limit: 20, type: type || undefined, qualityGrade: grade || undefined, qualityStatus: status || undefined })
  });

  return (
    <>
      <PageHeader title="Inventory Items" description="Search blocks, slabs, tiles, cut pieces, residuals and consumables" actions={<RoleGate roles={["ADMIN", "WAREHOUSE_MANAGER", "STORE_KEEPER"]}><Link href="/inventory/items/new"><Button>New item</Button></Link></RoleGate>} />
      <div className="mb-4 grid gap-2 rounded-xl border bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-5">
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="h-10 rounded-md border bg-transparent px-3 outline-none" placeholder="Search SKU or ID" />
        <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="h-10 rounded-md border bg-white px-3 dark:bg-slate-900"><option value="">All types</option>{["BLOCK","SLAB","TILE","CUT_TO_SIZE","RESIDUAL","CONSUMABLE"].map(v => <option key={v}>{v}</option>)}</select>
        <select value={grade} onChange={(e) => { setGrade(e.target.value); setPage(1); }} className="h-10 rounded-md border bg-white px-3 dark:bg-slate-900"><option value="">All grades</option>{["A","B","C","Commercial"].map(v => <option key={v}>{v}</option>)}</select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-10 rounded-md border bg-white px-3 dark:bg-slate-900"><option value="">All statuses</option>{["AVAILABLE","QUARANTINE","RESERVED","SOLD"].map(v => <option key={v}>{v}</option>)}</select>
        <Button variant="outline" onClick={() => { setSearch(""); setType(""); setGrade(""); setStatus(""); setPage(1); }}>Clear</Button>
      </div>
      {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message={getApiError(query.error).message} onRetry={() => query.refetch()} /> : (
        <div className="overflow-hidden rounded-xl border bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60"><tr><th className="px-4 py-3">Item</th><th className="px-4 py-3">Unique ID</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Grade</th><th className="px-4 py-3">Finish</th><th className="px-4 py-3">Dimensions</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr></thead>
              <tbody>
                {query.data?.data.map((item) => (
                  <tr key={item.id} className="border-b last:border-0 dark:border-slate-800">
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="h-10 w-10 overflow-hidden rounded-md bg-slate-100">{item.photos?.[0] && <img src={item.photos[0].url.startsWith("/") ? `http://localhost:4000${item.photos[0].url}` : item.photos[0].url} alt="" className="h-full w-full object-cover" />}</div><div><p className="font-semibold">{item.name}</p><p className="text-xs text-slate-500">{item.sku}</p></div></div></td>
                    <td className="px-4 py-3">{item.uniqueBlockId || item.uniqueSlabId || "-"}</td><td className="px-4 py-3">{item.type.replaceAll("_", " ")}</td><td className="px-4 py-3">{item.qualityGrade || "-"}</td><td className="px-4 py-3">{item.finish || "-"}</td><td className="px-4 py-3">{[item.lengthMm, item.widthMm, item.thicknessMm].filter(Boolean).join(" × ") || "-"}</td><td className="px-4 py-3"><StatusBadge status={item.qualityStatus} /></td>
                    <td className="px-4 py-3"><Link className="font-medium text-slate-700 underline dark:text-slate-200" href={`/inventory/items/${item.id}`}>View</Link></td>
                  </tr>
                ))}
                {!query.data?.data.length && <tr><td colSpan={8} className="p-10 text-center text-sm text-slate-500">No items match this view.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm dark:border-slate-800"><span>{query.data?.pagination.total ?? 0} items</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button><span className="grid h-8 place-items-center px-2">{page} / {query.data?.pagination.totalPages || 1}</span><Button variant="outline" size="sm" disabled={page >= (query.data?.pagination.totalPages || 1)} onClick={() => setPage(p => p + 1)}>Next</Button></div></div>
        </div>
      )}
    </>
  );
}
