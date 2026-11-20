"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { fetchGoodsReceipts } from "@/features/procurement/api";
import { formatDate, formatQuantity } from "@/features/procurement/format";
import { getApiError } from "@/lib/api";

export default function GoodsReceiptsPage() {
  const [page, setPage] = useState(1);
  const receipts = useQuery({
    queryKey: ["goods-receipts", page],
    queryFn: () => fetchGoodsReceipts({ page, limit: 20 })
  });

  return (
    <>
      <PageHeader title="Goods Receipts" description="Deliveries posted to inventory from purchase orders" />
      {receipts.isLoading ? <LoadingState /> : receipts.isError ? <ErrorState message={getApiError(receipts.error).message} onRetry={() => receipts.refetch()} /> : (
        <div className="overflow-hidden rounded-xl border bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60"><tr>{["GRN", "Purchase order", "Received", "Destination", "Lines", "Received quantity", ""].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead>
            <tbody>{receipts.data?.data.map((receipt) => <tr key={receipt.id} className="border-t dark:border-slate-800">
              <td className="px-4 py-3"><Link className="font-semibold underline" href={`/goods-receipts/${receipt.id}`}>{receipt.grnNumber}</Link></td>
              <td className="px-4 py-3"><Link className="underline" href={`/purchase-orders/${receipt.purchaseOrderId}`}>{receipt.purchaseOrder?.poNumber ?? "View PO"}</Link></td>
              <td className="px-4 py-3">{formatDate(receipt.receivedAt)}</td>
              <td className="px-4 py-3">{receipt.location?.warehouse?.name} · {receipt.location?.code}</td>
              <td className="px-4 py-3">{receipt.items.length}</td>
              <td className="px-4 py-3">{formatQuantity(receipt.items.reduce((sum, line) => sum + Number(line.quantity), 0))}</td>
              <td className="px-4 py-3"><Link className="underline" href={`/goods-receipts/${receipt.id}`}>Details</Link></td>
            </tr>)}
            {!receipts.data?.data.length && <tr><td colSpan={7} className="p-10 text-center text-slate-500">No goods receipts recorded.</td></tr>}
            </tbody>
          </table></div>
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm dark:border-slate-800">
            <span>{receipts.data?.pagination.total ?? 0} goods receipts</span><div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
              <span>{page} / {receipts.data?.pagination.totalPages || 1}</span>
              <Button size="sm" variant="outline" disabled={page >= (receipts.data?.pagination.totalPages || 1)} onClick={() => setPage((value) => value + 1)}>Next</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
