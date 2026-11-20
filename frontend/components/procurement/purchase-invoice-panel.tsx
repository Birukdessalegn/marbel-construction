"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { RoleGate } from "@/components/role-gate";
import { Button } from "@/components/ui/button";
import { createPurchaseInvoice, voidPurchaseInvoice } from "@/features/procurement/api";
import { formatAmount, formatDate } from "@/features/procurement/format";
import { purchaseInvoiceFormSchema } from "@/features/procurement/schemas";
import { getApiError } from "@/lib/api";
import type { PurchaseOrder } from "@/types/api";

type InvoiceFormValues = z.input<typeof purchaseInvoiceFormSchema>;
type InvoiceFormOutput = z.output<typeof purchaseInvoiceFormSchema>;

export function PurchaseInvoicePanel({ order }: { order: PurchaseOrder }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const form = useForm<InvoiceFormValues, unknown, InvoiceFormOutput>({
    resolver: zodResolver(purchaseInvoiceFormSchema),
    defaultValues: {
      invoiceNumber: "",
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: "",
      currency: order.currency,
      totalAmount: 0,
      notes: ""
    }
  });
  const create = useMutation({
    mutationFn: (values: InvoiceFormOutput) => createPurchaseInvoice({
      supplierId: order.supplierId,
      purchaseOrderId: order.id,
      invoiceNumber: values.invoiceNumber,
      invoiceDate: values.invoiceDate,
      dueDate: values.dueDate || undefined,
      currency: order.currency,
      totalAmount: Number(values.totalAmount),
      notes: values.notes || undefined
    }),
    onSuccess: async () => {
      form.reset({
        invoiceNumber: "",
        invoiceDate: new Date().toISOString().slice(0, 10),
        dueDate: "",
        currency: order.currency,
        totalAmount: 0,
        notes: ""
      });
      await queryClient.invalidateQueries({ queryKey: ["purchase-order", order.id] });
      await queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
      await queryClient.invalidateQueries({ queryKey: ["purchase-history"] });
    }
  });
  const voidInvoice = useMutation({
    mutationFn: voidPurchaseInvoice,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchase-order", order.id] })
  });

  async function submit(values: InvoiceFormOutput) {
    setError("");
    try {
      await create.mutateAsync(values);
    } catch (submitError) {
      setError(getApiError(submitError).message);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b p-5 dark:border-slate-800"><h2 className="font-semibold">Supplier invoices</h2><p className="text-sm text-slate-500">Record and track bills associated with this purchase order.</p></div>
      <div className="divide-y dark:divide-slate-800">
        {order.invoices?.map((invoice) => <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div><p className="font-medium">{invoice.invoiceNumber} <span className={`ml-2 text-xs ${invoice.status === "VOID" ? "text-red-600" : "text-green-700"}`}>{invoice.status}</span></p><p className="text-xs text-slate-500">Invoice date {formatDate(invoice.invoiceDate)} · Due {formatDate(invoice.dueDate)}</p></div>
          <div className="flex items-center gap-3"><span className="font-semibold">{formatAmount(invoice.totalAmount, invoice.currency)}</span>
            {invoice.status === "RECORDED" && <RoleGate roles={["ADMIN", "PURCHASE_MANAGER"]}><Button size="sm" variant="outline" disabled={voidInvoice.isPending} onClick={() => {
              if (window.confirm(`Void invoice ${invoice.invoiceNumber}?`)) voidInvoice.mutate(invoice.id);
            }}>Void</Button></RoleGate>}
          </div>
        </div>)}
        {!order.invoices?.length && <p className="p-5 text-sm text-slate-500">No invoices recorded.</p>}
      </div>
      {voidInvoice.isError && <p role="alert" className="border-t px-5 py-3 text-sm text-red-600 dark:border-slate-800">{getApiError(voidInvoice.error).message}</p>}
      <RoleGate roles={["ADMIN", "PURCHASE_MANAGER"]}>
        <details className="border-t p-5 dark:border-slate-800">
          <summary className="cursor-pointer text-sm font-semibold">Record invoice</summary>
          <form onSubmit={form.handleSubmit(submit)} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Invoice number"><input className="form-input" {...form.register("invoiceNumber")} /></Field>
            <Field label="Invoice date"><input type="date" className="form-input" {...form.register("invoiceDate")} /></Field>
            <Field label="Due date"><input type="date" className="form-input" {...form.register("dueDate")} /></Field>
            <Field label="Invoice total"><input type="number" min="0.01" step="0.01" className="form-input" {...form.register("totalAmount", { valueAsNumber: true })} /></Field>
            <Field label="Currency"><input value={order.currency} readOnly className="form-input" /></Field>
            <Field label="Notes"><input className="form-input" {...form.register("notes")} /></Field>
            {(error || create.isError) && <p role="alert" className="sm:col-span-2 text-sm text-red-600">{error || getApiError(create.error).message}</p>}
            <div className="sm:col-span-2"><Button type="submit" disabled={create.isPending}>{create.isPending ? "Saving..." : "Save invoice"}</Button></div>
          </form>
        </details>
      </RoleGate>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1.5 block font-medium">{label}</span>{children}</label>;
}
