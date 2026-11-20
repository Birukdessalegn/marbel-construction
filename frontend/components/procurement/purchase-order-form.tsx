"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { getApiError } from "@/lib/api";
import { fetchItems } from "@/features/inventory/api";
import { createPurchaseOrder, fetchSuppliers } from "@/features/procurement/api";
import type { PurchaseOrderInput } from "@/features/procurement/api";
import { formatAmount } from "@/features/procurement/format";
import { purchaseOrderFormSchema } from "@/features/procurement/schemas";
import { useQuery } from "@tanstack/react-query";

type PurchaseOrderFormValues = z.input<typeof purchaseOrderFormSchema>;
type PurchaseOrderFormOutput = z.output<typeof purchaseOrderFormSchema>;

export function PurchaseOrderForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const suppliers = useQuery({
    queryKey: ["suppliers", { status: "ACTIVE", page: 1 }],
    queryFn: () => fetchSuppliers({ status: "ACTIVE", page: 1, limit: 100 })
  });
  const items = useQuery({
    queryKey: ["items", { active: true, page: 1 }],
    queryFn: () => fetchItems({ page: 1, limit: 100 })
  });
  const form = useForm<PurchaseOrderFormValues, unknown, PurchaseOrderFormOutput>({
    resolver: zodResolver(purchaseOrderFormSchema),
    defaultValues: {
      supplierId: "",
      orderDate: new Date().toISOString().slice(0, 10),
      expectedDate: "",
      currency: "USD",
      notes: "",
      items: [{ itemId: "", quantity: 1, unitOfMeasure: "unit", unitPrice: 0 }]
    }
  });
  const lines = useFieldArray({ control: form.control, name: "items" });
  const watchedLines = form.watch("items");
  const watchedCurrency = form.watch("currency");
  const currency = watchedCurrency?.length === 3 ? watchedCurrency.toUpperCase() : "USD";
  const total = watchedLines?.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0), 0) ?? 0;

  async function submit(values: PurchaseOrderFormOutput) {
    setError("");
    const payload: PurchaseOrderInput = {
      supplierId: values.supplierId,
      orderDate: values.orderDate,
      expectedDate: values.expectedDate || undefined,
      currency: values.currency.toUpperCase(),
      notes: values.notes || undefined,
      items: values.items.map((line) => ({
        itemId: line.itemId,
        quantity: Number(line.quantity),
        unitOfMeasure: line.unitOfMeasure,
        unitPrice: Number(line.unitPrice)
      }))
    };
    try {
      const order = await createPurchaseOrder(payload);
      router.push(`/purchase-orders/${order.id}`);
    } catch (submitError) {
      setError(getApiError(submitError).message);
    }
  }

  if (suppliers.isLoading || items.isLoading) return <LoadingState label="Loading suppliers and inventory..." />;
  if (suppliers.isError) return <ErrorState message={getApiError(suppliers.error).message} onRetry={() => suppliers.refetch()} />;
  if (items.isError) return <ErrorState message={getApiError(items.error).message} onRetry={() => items.refetch()} />;

  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
      <section className="grid gap-4 rounded-xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-3">
        <FormField label="Supplier" error={form.formState.errors.supplierId?.message}>
          <select className="form-input" {...form.register("supplierId")}>
            <option value="">Select supplier</option>
            {suppliers.data?.data.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select>
        </FormField>
        <FormField label="Order date" error={form.formState.errors.orderDate?.message}>
          <input type="date" className="form-input" {...form.register("orderDate")} />
        </FormField>
        <FormField label="Expected delivery" error={form.formState.errors.expectedDate?.message}>
          <input type="date" className="form-input" {...form.register("expectedDate")} />
        </FormField>
        <FormField label="Currency" error={form.formState.errors.currency?.message}>
          <input maxLength={3} className="form-input uppercase" {...form.register("currency")} />
        </FormField>
        <FormField label="Notes" error={form.formState.errors.notes?.message}>
          <input className="form-input" {...form.register("notes")} />
        </FormField>
      </section>

      <section className="overflow-hidden rounded-xl border bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b p-5 dark:border-slate-800">
          <div><h2 className="font-semibold">Order items</h2><p className="text-sm text-slate-500">Choose inventory catalog items and enter purchase quantities and prices.</p></div>
          <Button type="button" variant="outline" onClick={() => lines.append({ itemId: "", quantity: 1, unitOfMeasure: "unit", unitPrice: 0 })}>Add line</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60"><tr>{["Inventory item", "Quantity", "Unit", "Unit price", ""].map((heading) => <th className="px-4 py-3" key={heading}>{heading}</th>)}</tr></thead>
            <tbody>
              {lines.fields.map((field, index) => (
                <tr key={field.id} className="border-t dark:border-slate-800">
                  <td className="px-4 py-3">
                    <select className="form-input min-w-64" {...form.register(`items.${index}.itemId`)}>
                      <option value="">Select item</option>
                      {items.data?.data.map((item) => <option key={item.id} value={item.id}>{item.sku} — {item.name}</option>)}
                    </select>
                    {form.formState.errors.items?.[index]?.itemId?.message && <p className="mt-1 text-xs text-red-600">{form.formState.errors.items[index]?.itemId?.message}</p>}
                  </td>
                  <td className="px-4 py-3"><input type="number" min="0.0001" step="any" className="form-input w-32" {...form.register(`items.${index}.quantity`, { valueAsNumber: true })} />{form.formState.errors.items?.[index]?.quantity?.message && <p className="mt-1 text-xs text-red-600">{form.formState.errors.items[index]?.quantity?.message}</p>}</td>
                  <td className="px-4 py-3"><input className="form-input w-28" {...form.register(`items.${index}.unitOfMeasure`)} /></td>
                  <td className="px-4 py-3"><input type="number" min="0" step="any" className="form-input w-36" {...form.register(`items.${index}.unitPrice`, { valueAsNumber: true })} /></td>
                  <td className="px-4 py-3"><Button type="button" variant="ghost" size="sm" disabled={lines.fields.length === 1} onClick={() => lines.remove(index)}>Remove</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {form.formState.errors.items?.message && <p className="px-5 pb-3 text-sm text-red-600">{form.formState.errors.items.message}</p>}
        <div className="flex justify-end border-t p-5 text-lg font-semibold dark:border-slate-800">Estimated total: {formatAmount(total, currency)}</div>
      </section>
      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Creating..." : "Save draft PO"}</Button>
        <Link href="/purchase-orders"><Button type="button" variant="outline">Cancel</Button></Link>
      </div>
    </form>
  );
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1.5 block font-medium">{label}</span>{children}{error && <span className="mt-1 block text-xs text-red-600">{error}</span>}</label>;
}
