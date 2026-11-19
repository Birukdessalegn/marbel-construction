"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { fetchItems } from "@/features/inventory/api";
import { fetchLocations } from "@/features/warehouses/api";
import { stockMovement } from "@/features/stock/api";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getApiError } from "@/lib/api";

export default function StockMovementPage() {
  const params = useParams<{ type: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = params.type as "receive"|"issue"|"transfer"|"adjust"|"count";
  const [error, setError] = useState("");
  const items = useQuery({ queryKey: ["movement-items"], queryFn: () => fetchItems({ limit: 100 }) });
  const locations = useQuery({ queryKey: ["movement-locations"], queryFn: fetchLocations });
  const form = useForm({ defaultValues: { itemId: searchParams.get("itemId") || "", locationId: "", fromLocationId: "", toLocationId: "", quantity: 1, areaSqm: 0, qualityStatus: "AVAILABLE", referenceId: "", note: "" } });

  const title = type === "count" ? "Physical stock count" : type === "adjust" ? "Stock adjustment" : `${type.charAt(0).toUpperCase()}${type.slice(1)} stock`;

  async function submit(values: Record<string, unknown>) {
    setError("");
    try {
      await stockMovement(type, values);
      router.push("/stock");
    } catch (error) { setError(getApiError(error).message); }
  }

  return <>
    <PageHeader title={title} description="Stock updates are recorded as immutable transactions" />
    <form onSubmit={form.handleSubmit(submit)} className="grid gap-4 rounded-xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2">
      <label className="text-sm"><span className="mb-1.5 block font-medium">Item</span><select className="form-input" {...form.register("itemId")}><option value="">Select item</option>{items.data?.data.map(item => <option value={item.id} key={item.id}>{item.sku} — {item.name}</option>)}</select></label>
      {(type === "receive" || type === "issue" || type === "adjust" || type === "count") && <label className="text-sm"><span className="mb-1.5 block font-medium">{type === "receive" ? "Destination location" : "Location"}</span><select className="form-input" {...form.register("locationId")}><option value="">Select location</option>{locations.data?.map(location => <option value={location.id} key={location.id}>{location.warehouse?.name || "Warehouse"} · {location.code}</option>)}</select></label>}
      {type === "transfer" && <><label className="text-sm"><span className="mb-1.5 block font-medium">Source location</span><select className="form-input" {...form.register("fromLocationId")}><option value="">Select source</option>{locations.data?.map(location => <option value={location.id} key={location.id}>{location.warehouse?.name || "Warehouse"} · {location.code}</option>)}</select></label><label className="text-sm"><span className="mb-1.5 block font-medium">Destination location</span><select className="form-input" {...form.register("toLocationId")}><option value="">Select destination</option>{locations.data?.map(location => <option value={location.id} key={location.id}>{location.warehouse?.name || "Warehouse"} · {location.code}</option>)}</select></label></>}
      <label className="text-sm"><span className="mb-1.5 block font-medium">{type === "adjust" ? "Signed quantity" : type === "count" ? "Measured quantity" : "Quantity"}</span><input type="number" step="0.001" className="form-input" {...form.register("quantity")} /></label>
      <label className="text-sm"><span className="mb-1.5 block font-medium">Area (sqm)</span><input type="number" step="0.01" className="form-input" {...form.register("areaSqm")} /></label>
      <label className="text-sm"><span className="mb-1.5 block font-medium">Quality status</span><select className="form-input" {...form.register("qualityStatus")}>{["AVAILABLE","QUARANTINE","RESERVED","SOLD"].map(v => <option key={v}>{v}</option>)}</select></label>
      <label className="text-sm"><span className="mb-1.5 block font-medium">Reference ID</span><input className="form-input" {...form.register("referenceId")} /></label>
      <label className="text-sm sm:col-span-2"><span className="mb-1.5 block font-medium">Reason / note</span><textarea className="min-h-24 w-full rounded-md border bg-transparent p-3 outline-none" {...form.register("note")} /></label>
      {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2"><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Recording..." : "Record transaction"}</Button></div>
    </form>
  </>;
}
