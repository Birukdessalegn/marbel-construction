"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { PurchaseOrderStatusBadge } from "@/components/procurement/status-badges";
import { fetchOpenPurchaseOrders } from "@/features/procurement/api";
import { formatAmount, formatDate } from "@/features/procurement/format";
import { getApiError } from "@/lib/api";

export default function OpenPurchaseOrdersReportPage() {
  const query = useQuery({ queryKey: ["open-purchase-orders"], queryFn: fetchOpenPurchaseOrders });
  return (
    <>
      <PageHeader title="Open Purchase Orders" description="Ordered and partially received orders that still need follow-up" />
      {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message={getApiError(query.error).message} onRetry={() => query.refetch()} /> : (
        <div className="overflow-hidden rounded-xl border bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60"><tr>{["PO", "Supplier", "Expected date", "Lines", "Total", "Status"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead>
            <tbody>{query.data?.map((order) => <tr key={order.id} className="border-t dark:border-slate-800">
              <td className="px-4 py-3"><Link className="font-semibold underline" href={`/purchase-orders/${order.id}`}>{order.poNumber}</Link></td>
              <td className="px-4 py-3">{order.supplier?.name ?? "—"}</td><td className="px-4 py-3">{formatDate(order.expectedDate)}</td>
              <td className="px-4 py-3">{order.items.length}</td><td className="px-4 py-3">{formatAmount(order.totalAmount, order.currency)}</td>
              <td className="px-4 py-3"><PurchaseOrderStatusBadge status={order.status} /></td>
            </tr>)}
            {!query.data?.length && <tr><td colSpan={6} className="p-10 text-center text-slate-500">There are no open purchase orders.</td></tr>}
            </tbody>
          </table></div>
        </div>
      )}
    </>
  );
}
