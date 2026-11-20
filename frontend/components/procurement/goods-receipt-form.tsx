"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { fetchLocations } from "@/features/warehouses/api";
import { createGoodsReceipt, fetchPurchaseOrder } from "@/features/procurement/api";
import { formatQuantity } from "@/features/procurement/format";
import { goodsReceiptFormSchema } from "@/features/procurement/schemas";
import { getApiError } from "@/lib/api";

type ReceiptFormValues = z.input<typeof goodsReceiptFormSchema>;
type ReceiptFormOutput = z.output<typeof goodsReceiptFormSchema>;

export function GoodsReceiptForm({ purchaseOrderId }: { purchaseOrderId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const order = useQuery({
    queryKey: ["purchase-order", purchaseOrderId],
    queryFn: () => fetchPurchaseOrder(purchaseOrderId)
  });
  const locations = useQuery({ queryKey: ["locations"], queryFn: fetchLocations });

  if (order.isLoading || locations.isLoading) return <LoadingState label="Loading purchase order and locations..." />;
  if (order.isError) return <ErrorState message={getApiError(order.error).message} onRetry={() => order.refetch()} />;
  if (locations.isError) return <ErrorState message={getApiError(locations.error).message} onRetry={() => locations.refetch()} />;
  if (!order.data || !locations.data) return <ErrorState message="Purchase order or location data is unavailable." />;
  if (!["ORDERED", "PARTIALLY_RECEIVED"].includes(order.data.status)) {
    return <ErrorState message="Goods can only be received against an ordered or partially received purchase order." />;
  }
  return <ReceiptEditor order={order.data} locations={locations.data} />;
}

function ReceiptEditor({ order, locations }: { order: Awaited<ReturnType<typeof fetchPurchaseOrder>>; locations: Awaited<ReturnType<typeof fetchLocations>> }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const openLines = order.items.map((line) => ({
    line,
    remaining: Math.max(0, Number(line.quantity) - Number(line.receivedQuantity))
  })).filter((entry) => entry.remaining > 0);
  const form = useForm<ReceiptFormValues, unknown, ReceiptFormOutput>({
    resolver: zodResolver(goodsReceiptFormSchema),
    defaultValues: {
      locationId: "",
      note: "",
      items: openLines.map(({ line, remaining }) => ({
        purchaseOrderItemId: line.id,
        quantity: remaining,
        areaSqm: 0,
        qualityStatus: "AVAILABLE",
        note: ""
      }))
    }
  });
  const fieldArray = useFieldArray({ control: form.control, name: "items" });
  const mutation = useMutation({
    mutationFn: (values: ReceiptFormOutput) => createGoodsReceipt({
      purchaseOrderId: order.id,
      locationId: values.locationId,
      note: values.note || undefined,
      items: values.items.map((line) => ({
        ...line,
        quantity: Number(line.quantity),
        areaSqm: Number(line.areaSqm),
        note: line.note || undefined
      }))
    }),
    onSuccess: async (receipt) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["purchase-order", order.id] }),
        queryClient.invalidateQueries({ queryKey: ["purchase-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["goods-receipts"] }),
        queryClient.invalidateQueries({ queryKey: ["items"] }),
        queryClient.invalidateQueries({ queryKey: ["item"] }),
        queryClient.invalidateQueries({ queryKey: ["item-transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["stock-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["stock-balances"] }),
        queryClient.invalidateQueries({ queryKey: ["supplier-performance"] })
      ]);
      router.push(`/purchase-orders/${order.id}?received=${receipt.id}`);
    }
  });
  const remainingFor = (lineId: string) => openLines.find((entry) => entry.line.id === lineId)?.remaining ?? 0;

  async function submit(values: ReceiptFormOutput) {
    setError("");
    const overReceived = values.items.find((line) => Number(line.quantity) > remainingFor(line.purchaseOrderItemId));
    if (overReceived) {
      setError("A received quantity cannot exceed the remaining quantity on its purchase order line.");
      return;
    }
    try {
      await mutation.mutateAsync(values);
    } catch (submitError) {
      setError(getApiError(submitError).message);
    }
  }

  return (
    <>
      <div className="mb-5 rounded-xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-500">Purchase order</p>
        <p className="mt-1 font-semibold">{order.poNumber} · {order.supplier?.name}</p>
        <p className="mt-1 text-sm text-slate-500">Receive at an active location. Each line can be marked available or quarantined after inspection.</p>
      </div>
      {!openLines.length ? <p className="rounded-xl border bg-white p-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">All purchase order quantities have already been received.</p> : (
        <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
          <section className="rounded-xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <label className="block max-w-lg text-sm"><span className="mb-1.5 block font-medium">Destination location</span>
              <select className="form-input" {...form.register("locationId")}><option value="">Select location</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.warehouse?.name ?? "Warehouse"} · {location.code}{location.name ? ` — ${location.name}` : ""}</option>)}</select>
              {form.formState.errors.locationId?.message && <span className="mt-1 block text-xs text-red-600">{form.formState.errors.locationId.message}</span>}
            </label>
            <label className="mt-4 block text-sm"><span className="mb-1.5 block font-medium">Receipt note</span><textarea rows={2} className="form-input" {...form.register("note")} /></label>
          </section>
          <section className="overflow-hidden rounded-xl border bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b p-5 dark:border-slate-800"><h2 className="font-semibold">Goods received and quality inspection</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60"><tr>{["PO item", "Remaining", "Received qty", "Area (sqm)", "Inspection status", "Line note"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead>
                <tbody>{fieldArray.fields.map((field, index) => {
                  const poLine = openLines.find((entry) => entry.line.id === field.purchaseOrderItemId);
                  return <tr key={field.id} className="border-t dark:border-slate-800">
                    <td className="px-4 py-3"><p className="font-medium">{poLine?.line.item?.name}</p><p className="text-xs text-slate-500">{poLine?.line.item?.sku} · {poLine?.line.unitOfMeasure}</p></td>
                    <td className="px-4 py-3">{formatQuantity(poLine?.remaining)} {poLine?.line.unitOfMeasure}</td>
                    <td className="px-4 py-3"><input type="number" min="0.0001" step="any" max={poLine?.remaining} className="form-input w-32" {...form.register(`items.${index}.quantity`, { valueAsNumber: true })} />{form.formState.errors.items?.[index]?.quantity?.message && <p className="mt-1 text-xs text-red-600">{form.formState.errors.items[index]?.quantity?.message}</p>}</td>
                    <td className="px-4 py-3"><input type="number" min="0" step="any" className="form-input w-32" {...form.register(`items.${index}.areaSqm`, { valueAsNumber: true })} /></td>
                    <td className="px-4 py-3"><select className="form-input" {...form.register(`items.${index}.qualityStatus`)}><option value="AVAILABLE">Available</option><option value="QUARANTINE">Quarantine</option><option value="RESERVED">Reserved</option><option value="SOLD">Sold</option></select></td>
                    <td className="px-4 py-3"><input className="form-input min-w-40" {...form.register(`items.${index}.note`)} /></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          </section>
          {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="flex gap-2"><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Recording receipt..." : "Record goods receipt"}</Button><Link href={`/purchase-orders/${order.id}`}><Button type="button" variant="outline">Cancel</Button></Link></div>
        </form>
      )}
    </>
  );
}
