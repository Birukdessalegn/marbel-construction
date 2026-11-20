"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { StatusBadge } from "@/components/status-badge";
import { fetchGoodsReceipt } from "@/features/procurement/api";
import { formatDate, formatQuantity } from "@/features/procurement/format";
import { getApiError } from "@/lib/api";

export default function GoodsReceiptDetailPage() {
  const { goodsReceiptId } = useParams<{ goodsReceiptId: string }>();
  const receipt = useQuery({ queryKey: ["goods-receipt", goodsReceiptId], queryFn: () => fetchGoodsReceipt(goodsReceiptId) });
  if (receipt.isLoading) return <LoadingState label="Loading goods receipt..." />;
  if (receipt.isError || !receipt.data) return <ErrorState message={getApiError(receipt.error).message} onRetry={() => receipt.refetch()} />;
  const data = receipt.data;

  return (
    <>
      <PageHeader title={data.grnNumber} description={`Received ${formatDate(data.receivedAt)} by ${data.receivedBy?.name ?? "warehouse staff"}`} actions={<div className="flex gap-3"><Link className="text-sm underline" href={`/purchase-orders/${data.purchaseOrderId}`}>View purchase order</Link><Link className="text-sm underline" href={`/purchase-orders/${data.purchaseOrderId}#landing-costs`}>Add cost to PO</Link></div>} />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Metric label="Purchase order">{data.purchaseOrder?.poNumber ?? "—"}</Metric>
        <Metric label="Supplier">{data.purchaseOrder?.supplier?.name ?? "—"}</Metric>
        <Metric label="Destination">{data.location?.warehouse?.name} · {data.location?.code}</Metric>
      </div>
      <section className="overflow-hidden rounded-xl border bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b p-5 dark:border-slate-800"><h2 className="font-semibold">Received lines and stock transactions</h2></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/60"><tr>{["Item", "Quantity", "Area", "Inspection", "Inventory transaction"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead>
          <tbody>{data.items.map((line) => <tr key={line.id} className="border-t dark:border-slate-800">
            <td className="px-4 py-3"><Link className="font-medium underline" href={`/inventory/items/${line.purchaseOrderItem?.itemId}`}>{line.purchaseOrderItem?.item?.name ?? "Inventory item"}</Link><p className="text-xs text-slate-500">{line.purchaseOrderItem?.item?.sku}</p></td>
            <td className="px-4 py-3">{formatQuantity(line.quantity)} {line.purchaseOrderItem?.unitOfMeasure}</td><td className="px-4 py-3">{formatQuantity(line.areaSqm)} sqm</td>
            <td className="px-4 py-3"><StatusBadge status={line.qualityStatus} /></td>
            <td className="px-4 py-3">{line.stockTransaction?.transactionNo ?? "—"}</td>
          </tr>)}
          {!data.items.length && <tr><td colSpan={5} className="p-8 text-center text-slate-500">This receipt contains no lines.</td></tr>}
          </tbody>
        </table></div>
      </section>
      {data.note && <p className="mt-4 rounded-lg border bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900"><strong>Receipt note:</strong> {data.note}</p>}
    </>
  );
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="rounded-xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 font-semibold">{children}</p></div>;
}
