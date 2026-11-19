"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchItem, fetchStockBalances, fetchTraceability, fetchTransactions } from "@/features/inventory/api";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { RoleGate } from "@/components/role-gate";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { getApiError } from "@/lib/api";

export default function ItemDetailPage() {
  const params = useParams<{ itemId: string }>();
  const id = params.itemId;
  const item = useQuery({ queryKey: ["item", id], queryFn: () => fetchItem(id) });
  const balances = useQuery({ queryKey: ["stock-balances", id], queryFn: () => fetchStockBalances(id) });
  const trace = useQuery({ queryKey: ["item-traceability", id], queryFn: () => fetchTraceability(id) });
  const transactions = useQuery({ queryKey: ["item-transactions", id], queryFn: () => fetchTransactions({ itemId: id, limit: 20 }) });

  if (item.isLoading) return <LoadingState />;
  if (item.isError) return <ErrorState message={getApiError(item.error).message} onRetry={() => item.refetch()} />;
  if (!item.data) return null;
  const data = item.data;

  return (
    <>
      <PageHeader title={data.name} description={`${data.sku} · ${data.uniqueBlockId || data.uniqueSlabId || "No unique identifier"}`} actions={<><RoleGate roles={["ADMIN","WAREHOUSE_MANAGER"]}><Link href={`/inventory/items/${id}/edit`}><Button variant="outline">Edit</Button></Link></RoleGate><Link href={`/stock/transfer?itemId=${id}`}><Button>Transfer</Button></Link><Button variant="outline" onClick={() => window.print()}>Print label</Button></>} />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="overflow-hidden rounded-xl border bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="grid h-72 place-items-center bg-slate-100 dark:bg-slate-800">{data.photos?.[0] ? <img src={data.photos[0].url.startsWith("/") ? `http://localhost:4000${data.photos[0].url}` : data.photos[0].url} alt={data.name} className="h-full w-full object-cover" /> : <span className="text-sm text-slate-500">No photo uploaded</span>}</div>
          {data.photos && data.photos.length > 1 && <div className="grid grid-cols-5 gap-2 p-3">{data.photos.map(photo => <img key={photo.id} src={photo.url.startsWith("/") ? `http://localhost:4000${photo.url}` : photo.url} alt="" className="h-16 w-full rounded-md object-cover" />)}</div>}
        </section>
        <section className="rounded-xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Item attributes</h2><StatusBadge status={data.qualityStatus} /></div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">{[
            ["Type", data.type], ["Block ID", data.uniqueBlockId], ["Slab ID", data.uniqueSlabId], ["Quarry", data.quarryOrigin], ["Color", data.color], ["Vein", data.veinPattern], ["Grade", data.qualityGrade], ["Finish", data.finish], ["Thickness", data.thicknessMm ? `${data.thicknessMm} mm` : undefined], ["Dimensions", data.lengthMm || data.widthMm ? `${data.lengthMm || "-"} × ${data.widthMm || "-"}` : undefined], ["Weight", data.weightKg ? `${data.weightKg} kg` : undefined], ["Area", data.areaSqm ? `${data.areaSqm} sqm` : undefined], ["Recovery", data.recoveryPercent ? `${data.recoveryPercent}%` : undefined]
          ].map(([key, value]) => <div key={key}><dt className="text-xs text-slate-500">{key}</dt><dd className="mt-1 font-medium">{value || "-"}</dd></div>)}</dl>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 font-semibold">Stock balance</h2>
          {balances.isLoading ? <LoadingState /> : balances.isError ? <ErrorState message={getApiError(balances.error).message} /> : !balances.data?.length ? <p className="text-sm text-slate-500">No stock balance recorded.</p> : <div className="space-y-2">{balances.data.map(balance => <div key={balance.id} className="flex items-center justify-between rounded-md border p-3 text-sm dark:border-slate-800"><div><p className="font-medium">{balance.location?.warehouse?.name} · {balance.location?.code}</p><p className="text-xs text-slate-500">{balance.qualityStatus}</p></div><div className="text-right"><p className="font-bold">{balance.quantity} units</p><p className="text-xs text-slate-500">{balance.areaSqm} sqm</p></div></div>)}</div>}
        </section>
        <section className="rounded-xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 font-semibold">Traceability</h2>
          {trace.isLoading ? <LoadingState /> : trace.isError ? <ErrorState message={getApiError(trace.error).message} /> : <div className="space-y-2"><div className="rounded-md border p-3 text-sm"><strong>Current:</strong> {trace.data?.name}</div>{trace.data?.parent && <div className="ml-5 rounded-md border p-3 text-sm"><strong>Parent:</strong> {trace.data.parent.name}</div>}{trace.data?.children?.map(child => <div key={child.id} className="ml-5 rounded-md border p-3 text-sm"><strong>Child:</strong> {child.name}</div>)}</div>}
        </section>
      </div>

      <section className="mt-6 rounded-xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 font-semibold">Transaction history</h2>
        {transactions.isLoading ? <LoadingState /> : transactions.isError ? <ErrorState message={getApiError(transactions.error).message} /> : !transactions.data?.data.length ? <p className="text-sm text-slate-500">No transactions for this item.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-slate-500"><tr><th className="py-2">Number</th><th>Type</th><th>Quantity</th><th>Status</th><th>Date</th></tr></thead><tbody>{transactions.data.data.map(tx => <tr key={tx.id} className="border-t dark:border-slate-800"><td className="py-3">{tx.transactionNo}</td><td>{tx.type}</td><td>{tx.quantity}</td><td>{tx.qualityStatus}</td><td>{new Date(tx.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div>}
      </section>
    </>
  );
}
