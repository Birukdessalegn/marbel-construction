"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { getApiError } from "@/lib/api";
import { createSupplier, fetchSupplier, updateSupplier } from "@/features/procurement/api";
import { supplierFormSchema } from "@/features/procurement/schemas";
import type { SupplierInput } from "@/features/procurement/api";

type SupplierFormValues = z.input<typeof supplierFormSchema>;
type SupplierFormOutput = z.output<typeof supplierFormSchema>;

export function SupplierForm({ supplierId }: { supplierId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const supplierQuery = useQuery({
    queryKey: ["supplier", supplierId],
    queryFn: () => fetchSupplier(supplierId!),
    enabled: !!supplierId
  });
  const form = useForm<SupplierFormValues, unknown, SupplierFormOutput>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: "",
      contactName: "",
      email: "",
      phone: "",
      address: "",
      paymentTerms: "",
      rating: "",
      status: "ACTIVE"
    }
  });

  useEffect(() => {
    if (supplierQuery.data) {
      form.reset({
        name: supplierQuery.data.name,
        contactName: supplierQuery.data.contactName ?? "",
        email: supplierQuery.data.email ?? "",
        phone: supplierQuery.data.phone ?? "",
        address: supplierQuery.data.address ?? "",
        paymentTerms: supplierQuery.data.paymentTerms ?? "",
        rating: supplierQuery.data.rating == null ? "" : Number(supplierQuery.data.rating),
        status: supplierQuery.data.status
      });
    }
  }, [form, supplierQuery.data]);

  async function submit(values: SupplierFormOutput) {
    setError("");
    const payload: SupplierInput = {
      name: values.name,
      contactName: values.contactName || undefined,
      email: values.email || undefined,
      phone: values.phone || undefined,
      address: values.address || undefined,
      paymentTerms: values.paymentTerms || undefined,
      rating: values.rating === "" ? undefined : Number(values.rating),
      status: values.status
    };
    try {
      const supplier = supplierId
        ? await updateSupplier(supplierId, payload)
        : await createSupplier(payload);
      await queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      await queryClient.invalidateQueries({ queryKey: ["supplier", supplier.id] });
      router.push(`/suppliers/${supplier.id}`);
    } catch (submitError) {
      setError(getApiError(submitError).message);
    }
  }

  if (supplierId && supplierQuery.isLoading) return <LoadingState label="Loading supplier..." />;
  if (supplierId && supplierQuery.isError) {
    return <ErrorState message={getApiError(supplierQuery.error).message} onRetry={() => supplierQuery.refetch()} />;
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
      <section className="grid gap-4 rounded-xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2">
        <FormField label="Supplier name" error={form.formState.errors.name?.message}>
          <input className="form-input" {...form.register("name")} />
        </FormField>
        <FormField label="Contact person" error={form.formState.errors.contactName?.message}>
          <input className="form-input" {...form.register("contactName")} />
        </FormField>
        <FormField label="Email" error={form.formState.errors.email?.message}>
          <input type="email" className="form-input" {...form.register("email")} />
        </FormField>
        <FormField label="Phone" error={form.formState.errors.phone?.message}>
          <input className="form-input" {...form.register("phone")} />
        </FormField>
        <FormField label="Payment terms" error={form.formState.errors.paymentTerms?.message}>
          <input className="form-input" placeholder="e.g. Net 30" {...form.register("paymentTerms")} />
        </FormField>
        <FormField label="Internal rating (1–5)" error={form.formState.errors.rating?.message}>
          <input type="number" min="1" max="5" step="0.1" className="form-input" {...form.register("rating")} />
        </FormField>
        <FormField label="Status" error={form.formState.errors.status?.message}>
          <select className="form-input" {...form.register("status")}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </FormField>
        <FormField label="Address" error={form.formState.errors.address?.message}>
          <textarea rows={3} className="form-input" {...form.register("address")} />
        </FormField>
      </section>
      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : supplierId ? "Save supplier" : "Create supplier"}
        </Button>
        <Link href={supplierId ? `/suppliers/${supplierId}` : "/suppliers"}><Button type="button" variant="outline">Cancel</Button></Link>
      </div>
    </form>
  );
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
