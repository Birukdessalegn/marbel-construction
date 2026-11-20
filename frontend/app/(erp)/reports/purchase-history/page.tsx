"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { PurchaseOrderStatusBadge } from "@/components/procurement/status-badges";
import { fetchPurchaseHistory, fetchSuppliers } from "@/features/procurement/api";
import { fetchItems } from "@/features/inventory/api";
import { formatAmount, formatDate } from "@/features/procurement/format";
import { getApiError } from "@/lib/api";
import type { PurchaseOrderStatus } from "@/types/api";

const statuses: PurchaseOrderStatus[] = ["DRAFT", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED", "CLOSED", "CANCELLED"];

export default function PurchaseHistoryPage() {
  const [supplierId, setSupplierId] = useState("");
  const [itemId, setItemId] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const suppliers = useQuery({ queryKey: ["suppliers", { page: 1 }], queryFn: () => fetchSuppliers({ page: 1, limit: 100 }) });
  const items = useQuery({ queryKey: ["items", { page: 1 }], queryFn: () => fetchItems({ page: 1, limit: 100 }) });
  const history = useQuery({
    queryKey: ["purchase-history", { supplierId, itemId, status, dateFrom, dateTo, page }],
    queryFn: () => fetchPurchaseHistory({
      supplierId: supplierId || undefined,
      itemId: itemId || undefined,
      status: status || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      limit: 20
    })
  });
  const clear = () => { setSupplierId(""); setItemId(""); setStatus(""); setDateFrom(""); setDateTo(""); setPage(1); };

  return (
    <>
      <PageHeader title="Purchase History" description="Review purchases by supplier, inventory item, status, and order date" />
      <div className="mb-4 grid gap-2 rounded-xl border bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-3">
        <select className="form-input" value={supplierId} onChange={(event) => { setSupplierId(event.target.value); setPage(1); }}><option value="">All suppliers</option>{suppliers.data?.data.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select>
        <select className="form-input" value={itemId} onChange={(event) => { setItemId(event.target.value); setPage(1); }}><option value="">All inventory items</option>{items.data?.data.map((item) => <option key={item.id} value={item.id}>{item.sku} — {item.name}</option>)}</select>
        <select className="form-input" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option>{statuses.map((value) => <option value={value} key={value}>{value.replaceAll("_", " ")}</option>)}</select>
        <label className="text-sm"><span className="mb-1 block font-medium">From</span><input type="date" className="form-input" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} /></label>
        <label className="text-sm"><span className="mb-1 block font-medium">To</span><input type="date" className="form-input" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} /></label>
        <Button variant="outline" className="self-end" onClick={clear}>Clear filters</Button>
      </div>
      {history.isLoading ? <LoadingState /> : history.isError ? <ErrorState message={getApiError(history.error).message} onRetry={() => history.refetch()} /> : (
        <div className="overflow-hidden rounded-xl border bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60"><tr>{["Purchase order", "Supplier", "Order date", "Items", "GRNs", "Total", "Status"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead>
            <tbody>{history.data?.data.map((order) => {
              return <tr key={order.id} className="border-t dark:border-slate-800">
                <td className="px-4 py-3"><Link className="font-semibold underline" href={`/purchase-orders/${order.id}`}>{order.poNumber}</Link></td>
                <td className="px-4 py-3">{order.supplier?.name ?? "—"}</td><td className="px-4 py-3">{formatDate(order.orderDate)}</td>
                <td className="px-4 py-3">{order.items.length}</td><td className="px-4 py-3">{order.goodsReceipts?.length ?? 0}</td>
                <td className="px-4 py-3">{formatAmount(order.totalAmount, order.currency)}</td><td className="px-4 py-3"><PurchaseOrderStatusBadge status={order.status} /></td>
              </tr>;
            })}
            {!history.data?.data.length && <tr><td colSpan={7} className="p-10 text-center text-slate-500">No purchase history matches these filters.</td></tr>}
            </tbody>
          </table></div>
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm dark:border-slate-800">
            <span>{history.data?.pagination.total ?? 0} orders</span><div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
              <span>{page} / {history.data?.pagination.totalPages || 1}</span>
              <Button size="sm" variant="outline" disabled={page >= (history.data?.pagination.totalPages || 1)} onClick={() => setPage((value) => value + 1)}>Next</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
