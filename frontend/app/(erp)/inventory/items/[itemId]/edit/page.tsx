"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { fetchItem, updateItem } from "@/features/inventory/api";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { getApiError } from "@/lib/api";

export default function EditItemPage() {
  const params = useParams<{ itemId: string }>();
  const router = useRouter();
  const [error, setError] = useState("");
  const item = useQuery({ queryKey: ["item", params.itemId], queryFn: () => fetchItem(params.itemId) });
  const form = useForm<Record<string, unknown>>();

  useEffect(() => {
    if (item.data) form.reset({
      name: item.data.name,
      qualityGrade: item.data.qualityGrade || "",
      finish: item.data.finish || "",
      quarryOrigin: item.data.quarryOrigin || "",
      qualityStatus: item.data.qualityStatus,
      thicknessMm: item.data.thicknessMm || "",
      lengthMm: item.data.lengthMm || "",
      widthMm: item.data.widthMm || "",
      weightKg: item.data.weightKg || "",
      areaSqm: item.data.areaSqm || "",
      recoveryPercent: item.data.recoveryPercent || ""
    });
  }, [item.data, form]);

  if (item.isLoading) return <LoadingState />;
  if (item.isError) return <ErrorState message={getApiError(item.error).message} />;

  async function submit(values: Record<string, unknown>) {
    setError("");
    try {
      await updateItem(params.itemId, values);
      router.push(`/inventory/items/${params.itemId}`);
    } catch (error) { setError(getApiError(error).message); }
  }

  return <>
    <PageHeader title="Edit inventory item" actions={<Link href={`/inventory/items/${params.itemId}`}><Button variant="outline">Cancel</Button></Link>} />
    <form onSubmit={form.handleSubmit(submit)} className="grid gap-4 rounded-xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2">
      {[
        ["name","Name"],["qualityGrade","Quality grade"],["finish","Finish"],["quarryOrigin","Quarry origin"],["thicknessMm","Thickness (mm)"],["lengthMm","Length (mm)"],["widthMm","Width (mm)"],["weightKg","Weight (kg)"],["areaSqm","Area (sqm)"],["recoveryPercent","Recovery (%)"]
      ].map(([name,label]) => <label key={name} className="text-sm"><span className="mb-1.5 block font-medium">{label}</span><input type={["thicknessMm","lengthMm","widthMm","weightKg","areaSqm","recoveryPercent"].includes(name) ? "number" : "text"} className="form-input" {...form.register(name)} /></label>)}
      <label className="text-sm"><span className="mb-1.5 block font-medium">Quality status</span><select className="form-input" {...form.register("qualityStatus")}>{["AVAILABLE","QUARANTINE","RESERVED","SOLD"].map(v => <option key={v}>{v}</option>)}</select></label>
      {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2"><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving..." : "Save changes"}</Button></div>
    </form>
  </>;
}
