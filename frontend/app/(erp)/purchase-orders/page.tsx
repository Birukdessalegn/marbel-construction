"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/role-gate";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { PurchaseOrderStatusBadge } from "@/components/procurement/status-badges";
import { fetchPurchaseOrders, fetchSuppliers } from "@/features/procurement/api";
import { formatAmount, formatDate } from "@/features/procurement/format";
import { getApiError } from "@/lib/api";
import type { PurchaseOrderStatus } from "@/types/api";

const statuses: PurchaseOrderStatus[] = ["DRAFT", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED", "CLOSED", "CANCELLED"];

export default function PurchaseOrdersPage() {
  const [status, setStatus] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const suppliers = useQuery({ queryKey: ["suppliers", { page: 1 }], queryFn: () => fetchSuppliers({ page: 1, limit: 100 }) });
  const orders = useQuery({
    queryKey: ["purchase-orders", { status, supplierId, dateFrom, dateTo, page }],
    queryFn: () => fetchPurchaseOrders({
      status: status || undefined,
      supplierId: supplierId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      limit: 20
    })
  });
  const reset = () => { setStatus(""); setSupplierId(""); setDateFrom(""); setDateTo(""); setPage(1); };

  return (
    <>
      <PageHeader title="Purchase Orders" description="Create, track, and receive supplier orders" actions={
        <RoleGate roles={["ADMIN", "PURCHASE_MANAGER"]}><Link href="/purchase-orders/new"><Button>New purchase order</Button></Link></RoleGate>
      } />
      <div className="mb-4 grid gap-2 rounded-xl border bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-5">
        <select className="form-input" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option>{statuses.map((value) => <option value={value} key={value}>{value.replaceAll("_", " ")}</option>)}</select>
        <select className="form-input" value={supplierId} onChange={(event) => { setSupplierId(event.target.value); setPage(1); }}><option value="">All suppliers</option>{suppliers.data?.data.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select>
        <input aria-label="Order date from" type="date" className="form-input" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} />
        <input aria-label="Order date to" type="date" className="form-input" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} />
        <Button variant="outline" onClick={reset}>Clear filters</Button>
      </div>
      {orders.isLoading ? <LoadingState /> : orders.isError ? <ErrorState message={getApiError(orders.error).message} onRetry={() => orders.refetch()} /> : (
        <div className="overflow-hidden rounded-xl border bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60"><tr>{["PO number", "Supplier", "Order date", "Expected date", "Items", "Total", "Status", ""].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead>
              <tbody>
                {orders.data?.data.map((order) => <tr key={order.id} className="border-t dark:border-slate-800">
                  <td className="px-4 py-3"><Link className="font-semibold underline" href={`/purchase-orders/${order.id}`}>{order.poNumber}</Link></td>
                  <td className="px-4 py-3">{order.supplier?.name || "—"}</td><td className="px-4 py-3">{formatDate(order.orderDate)}</td><td className="px-4 py-3">{formatDate(order.expectedDate)}</td>
                  <td className="px-4 py-3">{order.items.length}</td><td className="px-4 py-3 font-medium">{formatAmount(order.totalAmount, order.currency)}</td>
                  <td className="px-4 py-3"><PurchaseOrderStatusBadge status={order.status} /></td><td className="px-4 py-3"><Link className="underline" href={`/purchase-orders/${order.id}`}>View</Link></td>
                </tr>)}
                {!orders.data?.data.length && <tr><td colSpan={8} className="p-10 text-center text-sm text-slate-500">No purchase orders match these filters.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm dark:border-slate-800">
            <span>{orders.data?.pagination.total ?? 0} purchase orders</span><div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
              <span>{page} / {orders.data?.pagination.totalPages || 1}</span>
              <Button size="sm" variant="outline" disabled={page >= (orders.data?.pagination.totalPages || 1)} onClick={() => setPage((value) => value + 1)}>Next</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
