"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/role-gate";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { SupplierStatusBadge } from "@/components/procurement/status-badges";
import { fetchPurchaseHistory, fetchSupplier, fetchSupplierPerformance } from "@/features/procurement/api";
import { formatAmount, formatDate, formatPercent, formatQuantity } from "@/features/procurement/format";
import { getApiError } from "@/lib/api";

export default function SupplierDetailPage() {
  const { supplierId } = useParams<{ supplierId: string }>();
  const supplier = useQuery({ queryKey: ["supplier", supplierId], queryFn: () => fetchSupplier(supplierId) });
  const purchases = useQuery({
    queryKey: ["purchase-history", { supplierId, page: 1 }],
    queryFn: () => fetchPurchaseHistory({ supplierId, page: 1, limit: 10 })
  });
  const performance = useQuery({ queryKey: ["supplier-performance"], queryFn: () => fetchSupplierPerformance() });
  const metrics = performance.data?.find((entry) => entry.id === supplierId);

  if (supplier.isLoading) return <LoadingState label="Loading supplier..." />;
  if (supplier.isError || !supplier.data) return <ErrorState message={getApiError(supplier.error).message} onRetry={() => supplier.refetch()} />;

  return (
    <>
      <PageHeader title={supplier.data.name} description="Supplier profile, purchasing history, and delivery quality" actions={
        <RoleGate roles={["ADMIN", "PURCHASE_MANAGER"]}><Link href={`/suppliers/${supplierId}/edit`}><Button variant="outline">Edit supplier</Button></Link></RoleGate>
      } />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Status"><SupplierStatusBadge status={supplier.data.status} /></Metric>
        <Metric label="Internal rating">{supplier.data.rating == null ? "Not rated" : `${Number(supplier.data.rating).toFixed(1)} / 5`}</Metric>
        <Metric label="On-time delivery">{performance.isError ? "Unavailable" : formatPercent(metrics?.onTimeDeliveryRate)}</Metric>
        <Metric label="Quality acceptance">{performance.isError ? "Unavailable" : formatPercent(metrics?.qualityAcceptanceRate)}</Metric>
      </div>
      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 font-semibold">Contact & terms</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Detail label="Contact" value={supplier.data.contactName} />
            <Detail label="Email" value={supplier.data.email} />
            <Detail label="Phone" value={supplier.data.phone} />
            <Detail label="Payment terms" value={supplier.data.paymentTerms} />
            <Detail label="Address" value={supplier.data.address} />
          </dl>
        </section>
        <section className="rounded-xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 font-semibold">Performance summary</h2>
          {performance.isLoading ? <p className="text-sm text-slate-500">Loading performance…</p> : performance.isError ? <p className="text-sm text-red-600">{getApiError(performance.error).message}</p> : (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Detail label="Completed orders" value={String(metrics?.completedOrders ?? 0)} />
              <Detail label="Received quantity" value={formatQuantity(metrics?.receivedQuantity)} />
              <Detail label="Accepted quantity" value={formatQuantity(metrics?.acceptedQuantity)} />
              <Detail label="Quarantined quantity" value={formatQuantity(metrics?.quarantinedQuantity)} />
            </dl>
          )}
        </section>
      </div>
      <section className="overflow-hidden rounded-xl border bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b p-5 dark:border-slate-800">
          <div><h2 className="font-semibold">Purchase history</h2><p className="text-sm text-slate-500">Recent purchase orders for this supplier</p></div>
          <Link className="text-sm underline" href="/reports/purchase-history">View report</Link>
        </div>
        {purchases.isLoading ? <div className="p-5"><LoadingState /></div> : purchases.isError ? <div className="p-5"><ErrorState message={getApiError(purchases.error).message} onRetry={() => purchases.refetch()} /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60"><tr>{["PO number", "Order date", "Expected", "Lines", "Total", "Status"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead>
              <tbody>
                {purchases.data?.data.map((order) => <tr key={order.id} className="border-t dark:border-slate-800">
                  <td className="px-4 py-3"><Link className="font-medium underline" href={`/purchase-orders/${order.id}`}>{order.poNumber}</Link></td>
                  <td className="px-4 py-3">{formatDate(order.orderDate)}</td><td className="px-4 py-3">{formatDate(order.expectedDate)}</td>
                  <td className="px-4 py-3">{order.items.length}</td><td className="px-4 py-3">{formatAmount(order.totalAmount, order.currency)}</td><td className="px-4 py-3">{order.status.replaceAll("_", " ")}</td>
                </tr>)}
                {!purchases.data?.data.length && <tr><td colSpan={6} className="p-8 text-center text-slate-500">No purchase orders recorded.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="rounded-xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-500">{label}</p><div className="mt-2 text-lg font-semibold">{children}</div></div>;
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return <div><dt className="text-slate-500">{label}</dt><dd className="mt-1 font-medium">{value || "—"}</dd></div>;
}
