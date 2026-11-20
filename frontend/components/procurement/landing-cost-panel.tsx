"use client";

import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { RoleGate } from "@/components/role-gate";
import { Button } from "@/components/ui/button";
import { createLandingCost, fetchLandingCosts } from "@/features/procurement/api";
import { formatAmount } from "@/features/procurement/format";
import { landingCostFormSchema } from "@/features/procurement/schemas";
import { getApiError } from "@/lib/api";
import type { PurchaseOrder } from "@/types/api";

type FormValues = z.input<typeof landingCostFormSchema>;
type FormOutput = z.output<typeof landingCostFormSchema>;

export function LandingCostPanel({ order }: { order: PurchaseOrder }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState("");
  const costs = useQuery({
    queryKey: ["landing-costs", order.id],
    queryFn: () => fetchLandingCosts(order.id)
  });
  const form = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(landingCostFormSchema),
    defaultValues: {
      category: "FREIGHT",
      description: "",
      amount: 0,
      currency: order.currency,
      allocationBasis: "ITEM_VALUE",
      allocations: order.items.map((line) => ({ purchaseOrderItemId: line.id, amount: 0 }))
    }
  });
  const allocationFields = useFieldArray({ control: form.control, name: "allocations" });
  const basis = form.watch("allocationBasis");
  const amount = Number(form.watch("amount")) || 0;
  const allocated = (form.watch("allocations") ?? []).reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
  const mutation = useMutation({
    mutationFn: (payload: FormOutput) => createLandingCost(order.id, {
      category: payload.category,
      description: payload.description || undefined,
      amount: Number(payload.amount),
      currency: order.currency,
      allocationBasis: payload.allocationBasis,
      ...(payload.allocationBasis === "MANUAL" ? { allocations: payload.allocations } : {})
    }),
    onSuccess: async () => {
      form.reset({
        category: "FREIGHT",
        description: "",
        amount: 0,
        currency: order.currency,
        allocationBasis: "ITEM_VALUE",
        allocations: order.items.map((line) => ({ purchaseOrderItemId: line.id, amount: 0 }))
      });
      await queryClient.invalidateQueries({ queryKey: ["landing-costs", order.id] });
      await queryClient.invalidateQueries({ queryKey: ["purchase-order", order.id] });
      await queryClient.invalidateQueries({ queryKey: ["purchase-history"] });
    }
  });

  async function submit(values: FormOutput) {
    setFormError("");
    if (values.allocationBasis === "MANUAL" && Number(Number(allocated).toFixed(2)) !== Number(Number(values.amount).toFixed(2))) {
      setFormError("Manual allocations must add up to the landing cost amount.");
      return;
    }
    try {
      await mutation.mutateAsync(values);
    } catch (error) {
      setFormError(getApiError(error).message);
    }
  }

  const itemName = new Map(order.items.map((line) => [line.id, `${line.item?.sku ?? "Item"} — ${line.item?.name ?? ""}`]));

  return (
    <section id="landing-costs" className="overflow-hidden rounded-xl border bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b p-5 dark:border-slate-800"><h2 className="font-semibold">Landing costs</h2><p className="text-sm text-slate-500">Allocate inbound freight, customs, and handling costs to PO lines.</p></div>
      {costs.isLoading ? <p className="p-5 text-sm text-slate-500">Loading landing costs…</p> : costs.isError ? <p role="alert" className="p-5 text-sm text-red-600">{getApiError(costs.error).message}</p> : (
        <div className="divide-y dark:divide-slate-800">
          {costs.data?.map((cost) => (
            <div className="p-4" key={cost.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><p className="font-medium">{cost.category} {cost.description ? `· ${cost.description}` : ""}</p><p className="text-xs text-slate-500">Allocated by {cost.allocationBasis.replaceAll("_", " ").toLowerCase()}</p></div>
                <p className="font-semibold">{formatAmount(cost.amount, cost.currency)}</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {cost.allocations.map((allocation) => <span key={allocation.id}>{itemName.get(allocation.purchaseOrderItemId) ?? "PO line"}: {formatAmount(allocation.amount, cost.currency)}</span>)}
              </div>
            </div>
          ))}
          {!costs.data?.length && <p className="p-5 text-sm text-slate-500">No landing costs recorded.</p>}
        </div>
      )}
      <RoleGate roles={["ADMIN", "PURCHASE_MANAGER"]}>
        <details className="border-t p-5 dark:border-slate-800">
          <summary className="cursor-pointer text-sm font-semibold">Add landing cost</summary>
          <form onSubmit={form.handleSubmit(submit)} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Cost category"><select className="form-input" {...form.register("category")}><option value="FREIGHT">Freight</option><option value="CUSTOMS">Customs</option><option value="HANDLING">Handling</option><option value="OTHER">Other</option></select></Field>
            <Field label="Amount"><input type="number" min="0.01" step="0.01" className="form-input" {...form.register("amount", { valueAsNumber: true })} /></Field>
            <Field label="Description"><input className="form-input" {...form.register("description")} /></Field>
            <Field label="Currency"><input className="form-input" value={order.currency} readOnly /></Field>
            <Field label="Allocation basis"><select className="form-input" {...form.register("allocationBasis")}><option value="ITEM_VALUE">Item value</option><option value="QUANTITY">Quantity</option><option value="WEIGHT">Weight</option><option value="MANUAL">Manual</option></select></Field>
            {basis === "MANUAL" && <div className="sm:col-span-2">
              <div className="overflow-x-auto rounded-md border dark:border-slate-800">
                <table className="w-full text-left text-sm"><thead className="bg-slate-50 dark:bg-slate-800/60"><tr><th className="px-3 py-2">PO item</th><th className="px-3 py-2">Allocated amount</th></tr></thead>
                  <tbody>{allocationFields.fields.map((field, index) => <tr key={field.id} className="border-t dark:border-slate-800">
                    <td className="px-3 py-2">{itemName.get(field.purchaseOrderItemId) ?? "PO item"}</td>
                    <td className="px-3 py-2"><input type="number" min="0" step="0.01" className="form-input w-40" {...form.register(`allocations.${index}.amount`, { valueAsNumber: true })} /></td>
                  </tr>)}</tbody>
                </table>
              </div>
              <p className={`mt-2 text-xs ${Number(allocated.toFixed(2)) === Number(amount.toFixed(2)) ? "text-green-700" : "text-amber-700"}`}>Allocated {formatAmount(allocated, order.currency)} of {formatAmount(amount, order.currency)}</p>
            </div>}
            {(formError || mutation.isError) && <p role="alert" className="sm:col-span-2 text-sm text-red-600">{formError || getApiError(mutation.error).message}</p>}
            <div className="sm:col-span-2"><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save landing cost"}</Button></div>
          </form>
        </details>
      </RoleGate>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1.5 block font-medium">{label}</span>{children}</label>;
}
