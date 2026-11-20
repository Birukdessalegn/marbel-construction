import { PageHeader } from "@/components/page-header";
import { RoleGate } from "@/components/role-gate";
import { SupplierForm } from "@/components/procurement/supplier-form";

export default function NewSupplierPage() {
  return (
    <>
      <PageHeader title="New supplier" description="Add a supplier to your purchasing directory" />
      <RoleGate roles={["ADMIN", "PURCHASE_MANAGER"]} fallback={<p className="text-sm text-slate-500">Supplier creation is available to administrators and purchase managers.</p>}><SupplierForm /></RoleGate>
    </>
  );
}
