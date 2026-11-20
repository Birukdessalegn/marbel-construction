import type { PurchaseOrderStatus, SupplierStatus } from "@/types/api";

const purchaseOrderStyles: Record<PurchaseOrderStatus, string> = {
  DRAFT: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  ORDERED: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  PARTIALLY_RECEIVED: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  RECEIVED: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300",
  CLOSED: "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  CANCELLED: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
};

export function PurchaseOrderStatusBadge({ status }: { status: PurchaseOrderStatus }) {
  const label = status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${purchaseOrderStyles[status]}`}>{label}</span>;
}

export function SupplierStatusBadge({ status }: { status: SupplierStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${status === "ACTIVE"
      ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
      : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
      {status === "ACTIVE" ? "Active" : "Inactive"}
    </span>
  );
}
