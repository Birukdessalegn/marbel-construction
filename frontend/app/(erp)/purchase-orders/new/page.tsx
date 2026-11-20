import { PageHeader } from "@/components/page-header";
import { RoleGate } from "@/components/role-gate";
import { PurchaseOrderForm } from "@/components/procurement/purchase-order-form";

export default function NewPurchaseOrderPage() {
  return (
    <>
      <PageHeader title="Create purchase order" description="Build a draft order from existing inventory catalog items" />
      <RoleGate roles={["ADMIN", "PURCHASE_MANAGER"]} fallback={<p className="text-sm text-slate-500">Purchase order creation is available to administrators and purchase managers.</p>}><PurchaseOrderForm /></RoleGate>
    </>
  );
}
