"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/role-gate";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { PurchaseOrderStatusBadge } from "@/components/procurement/status-badges";
import { LandingCostPanel } from "@/components/procurement/landing-cost-panel";
import { PurchaseInvoicePanel } from "@/components/procurement/purchase-invoice-panel";
import { approvePurchaseOrder, cancelPurchaseOrder, closePurchaseOrder, fetchPurchaseOrder } from "@/features/procurement/api";
import { formatAmount, formatDate, formatQuantity } from "@/features/procurement/format";
import { getApiError } from "@/lib/api";

export default function PurchaseOrderDetailPage() {
  const { purchaseOrderId } = useParams<{ purchaseOrderId: string }>();
  const queryClient = useQueryClient();
  const order = useQuery({ queryKey: ["purchase-order", purchaseOrderId], queryFn: () => fetchPurchaseOrder(purchaseOrderId) });
  const action = useMutation({
    mutationFn: (type: "approve" | "cancel" | "close") => {
      if (type === "approve") return approvePurchaseOrder(purchaseOrderId);
      if (type === "cancel") return cancelPurchaseOrder(purchaseOrderId);
      return closePurchaseOrder(purchaseOrderId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["purchase-order", purchaseOrderId] });
      await queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["open-purchase-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["purchase-history"] });
    }
  });

  if (order.isLoading) return <LoadingState label="Loading purchase order..." />;
  if (order.isError || !order.data) return <ErrorState message={getApiError(order.error).message} onRetry={() => order.refetch()} />;
  const purchaseOrder = order.data;
  const firstReceiptDate = purchaseOrder.goodsReceipts?.reduce<string | null>((earliest, receipt) => !earliest || receipt.receivedAt < earliest ? receipt.receivedAt : earliest, null);
  const lastReceiptDate = purchaseOrder.goodsReceipts?.reduce<string | null>((latest, receipt) => !latest || receipt.receivedAt > latest ? receipt.receivedAt : latest, null);

  return (
    <>
      <PageHeader title={purchaseOrder.poNumber} description={`${purchaseOrder.supplier?.name ?? "Supplier"} · Ordered ${formatDate(purchaseOrder.orderDate)}`} actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/purchase-orders"><Button variant="outline">All orders</Button></Link>
          {["ORDERED", "PARTIALLY_RECEIVED"].includes(purchaseOrder.status) && <RoleGate roles={["ADMIN", "WAREHOUSE_MANAGER"]}><Link href={`/purchase-orders/${purchaseOrder.id}/receive`}><Button>Receive goods</Button></Link></RoleGate>}
          {purchaseOrder.status === "DRAFT" && <RoleGate roles={["ADMIN", "PURCHASE_MANAGER"]}><Button disabled={action.isPending} onClick={() => action.mutate("approve")}>Approve</Button><Button variant="destructive" disabled={action.isPending} onClick={() => {
            if (window.confirm(`Cancel ${purchaseOrder.poNumber}?`)) action.mutate("cancel");
          }}>Cancel</Button></RoleGate>}
          {purchaseOrder.status === "ORDERED" && <RoleGate roles={["ADMIN", "PURCHASE_MANAGER"]}><Button variant="destructive" disabled={action.isPending} onClick={() => {
            if (window.confirm(`Cancel ${purchaseOrder.poNumber}?`)) action.mutate("cancel");
          }}>Cancel order</Button></RoleGate>}
          {purchaseOrder.status === "RECEIVED" && <RoleGate roles={["ADMIN", "PURCHASE_MANAGER"]}><Button disabled={action.isPending} onClick={() => action.mutate("close")}>Close order</Button></RoleGate>}
        </div>
      } />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div><p className="text-sm text-slate-500">Current status</p><div className="mt-2"><PurchaseOrderStatusBadge status={purchaseOrder.status} /></div></div>
        <div className="text-right"><p className="text-sm text-slate-500">Order total</p><p className="text-2xl font-bold">{formatAmount(purchaseOrder.totalAmount, purchaseOrder.currency)}</p></div>
      </div>
      {action.isError && <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{getApiError(action.error).message}</p>}

      <section className="mb-6 rounded-xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 font-semibold">Order timeline</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Timeline label="Draft created" date={purchaseOrder.createdAt} />
          {purchaseOrder.approvedAt && <Timeline label="Approved / ordered" date={purchaseOrder.approvedAt} />}
          {firstReceiptDate && <Timeline label="First goods received" date={firstReceiptDate} />}
          {lastReceiptDate && lastReceiptDate !== firstReceiptDate && <Timeline label="Latest receipt" date={lastReceiptDate} />}
          {purchaseOrder.status === "CLOSED" && <Timeline label="Closed" date={purchaseOrder.updatedAt} />}
          {purchaseOrder.expectedDate && <Timeline label="Expected delivery" date={purchaseOrder.expectedDate} />}
        </div>
      </section>

      <section className="mb-6 overflow-hidden rounded-xl border bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b p-5 dark:border-slate-800"><h2 className="font-semibold">Ordered items</h2></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/60"><tr>{["Item", "Ordered", "Received", "Unit price", "Allocated costs", "Landed unit cost", "Line total"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead>
          <tbody>{purchaseOrder.items.map((line) => <tr key={line.id} className="border-t dark:border-slate-800">
            <td className="px-4 py-3"><Link className="font-medium underline" href={`/inventory/items/${line.itemId}`}>{line.item?.name ?? line.itemId}</Link><p className="text-xs text-slate-500">{line.item?.sku}</p></td>
            <td className="px-4 py-3">{formatQuantity(line.quantity)} {line.unitOfMeasure}</td><td className="px-4 py-3">{formatQuantity(line.receivedQuantity)} {line.unitOfMeasure}</td>
            <td className="px-4 py-3">{formatAmount(line.unitPrice, purchaseOrder.currency)}</td><td className="px-4 py-3">{formatAmount(line.allocatedLandingCost, purchaseOrder.currency)}</td>
            <td className="px-4 py-3">{formatAmount(line.landedUnitCost ?? line.unitPrice, purchaseOrder.currency)}</td>
            <td className="px-4 py-3 font-medium">{formatAmount(Number(line.quantity) * Number(line.unitPrice), purchaseOrder.currency)}</td>
          </tr>)}</tbody>
        </table></div>
      </section>

      <section className="mb-6 overflow-hidden rounded-xl border bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b p-5 dark:border-slate-800"><h2 className="font-semibold">Goods receipts · Inventory trace</h2><p className="text-sm text-slate-500">Each receipt posts stock to its destination location.</p></div>
        <div className="divide-y dark:divide-slate-800">
          {purchaseOrder.goodsReceipts?.map((receipt) => <div key={receipt.id} className="p-5">
            <div className="flex flex-wrap justify-between gap-2"><div><p className="font-semibold">{receipt.grnNumber}</p><p className="text-sm text-slate-500">{formatDate(receipt.receivedAt)} · {receipt.location?.warehouse?.name} / {receipt.location?.code}</p></div><Link className="text-sm underline" href="/goods-receipts">All receipts</Link></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {receipt.items.map((receiptLine) => <div key={receiptLine.id} className="rounded-md border p-3 text-sm dark:border-slate-800">
                <p className="font-medium"><Link className="underline" href={`/inventory/items/${receiptLine.purchaseOrderItem?.itemId}`}>{receiptLine.purchaseOrderItem?.item?.name ?? "Inventory item"}</Link></p>
                <p className="mt-1 text-slate-500">{formatQuantity(receiptLine.quantity)} units · {receiptLine.qualityStatus} · Stock transaction {receiptLine.stockTransaction?.transactionNo ?? "—"}</p>
              </div>)}
            </div>
          </div>)}
          {!purchaseOrder.goodsReceipts?.length && <p className="p-5 text-sm text-slate-500">No goods receipts yet.</p>}
        </div>
      </section>
      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <LandingCostPanel order={purchaseOrder} />
        <PurchaseInvoicePanel order={purchaseOrder} />
      </div>
    </>
  );
}

function Timeline({ label, date }: { label: string; date: string }) {
  return <div className="rounded-md border p-3 dark:border-slate-800"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-medium">{formatDate(date)}</p></div>;
}
