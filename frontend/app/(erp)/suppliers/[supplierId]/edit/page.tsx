import { PageHeader } from "@/components/page-header";
import { RoleGate } from "@/components/role-gate";
import { SupplierForm } from "@/components/procurement/supplier-form";

export default async function EditSupplierPage({ params }: { params: Promise<{ supplierId: string }> }) {
  const { supplierId } = await params;
  return (
    <>
      <PageHeader title="Edit supplier" description="Update supplier contact and payment details" />
      <RoleGate roles={["ADMIN", "PURCHASE_MANAGER"]} fallback={<p className="text-sm text-slate-500">Supplier editing is available to administrators and purchase managers.</p>}><SupplierForm supplierId={supplierId} /></RoleGate>
    </>
  );
}
