"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { GoodsReceiptForm } from "@/components/procurement/goods-receipt-form";
import { RoleGate } from "@/components/role-gate";

export default function ReceivePurchaseOrderPage() {
  const { purchaseOrderId } = useParams<{ purchaseOrderId: string }>();
  return (
    <>
      <PageHeader title="Receive goods" description="Record a partial or complete delivery against a purchase order" />
      <RoleGate roles={["ADMIN", "WAREHOUSE_MANAGER"]} fallback={<p className="text-sm text-slate-500">Recording goods receipts is available to administrators and warehouse managers.</p>}><GoodsReceiptForm purchaseOrderId={purchaseOrderId} /></RoleGate>
    </>
  );
}
