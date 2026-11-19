"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { createItem } from "@/features/inventory/api";
import { api, getApiError } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

interface ItemFormValues {
  sku: string;
  name: string;
  type: "BLOCK"|"SLAB"|"TILE"|"CUT_TO_SIZE"|"RESIDUAL"|"CONSUMABLE";
  uniqueBlockId?: string;
  uniqueSlabId?: string;
  quarryOrigin?: string;
  color?: string;
  veinPattern?: string;
  qualityGrade?: string;
  finish?: string;
  thicknessMm?: number;
  lengthMm?: number;
  widthMm?: number;
  weightKg?: number;
  areaSqm?: number;
  recoveryPercent?: number;
  qualityStatus: "AVAILABLE"|"QUARANTINE"|"RESERVED"|"SOLD";
  parentId?: string;
}

export default function NewItemPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const form = useForm<ItemFormValues>({ defaultValues: { type: "BLOCK", qualityStatus: "AVAILABLE" } });
  const type = form.watch("type");

  async function submit(values: ItemFormValues) {
    setError("");
    try {
      const clean = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== "" && !Number.isNaN(v)));
      const item = await createItem(clean);
      for (const file of files) {
        const body = new FormData();
        body.append("photo", file);
        await api.post(`/items/${item.id}/photos`, body, { headers: { "Content-Type": "multipart/form-data" } });
      }
      router.push(`/inventory/items/${item.id}`);
    } catch (error) { setError(getApiError(error).message); }
  }

  return <>
    <PageHeader title="Create inventory item" description="Define marble identification, attributes and traceability" actions={<Link href="/inventory/items"><Button variant="outline">Cancel</Button></Link>} />
    <form onSubmit={form.handleSubmit(submit)} className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 font-semibold">Identification</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SKU"><input className="form-input" {...form.register("sku")} /></Field>
          <Field label="Name"><input className="form-input" {...form.register("name")} /></Field>
          <Field label="Item type"><select className="form-input" {...form.register("type")}>{["BLOCK","SLAB","TILE","CUT_TO_SIZE","RESIDUAL","CONSUMABLE"].map(v => <option key={v}>{v}</option>)}</select></Field>
          <Field label="Quality status"><select className="form-input" {...form.register("qualityStatus")}>{["AVAILABLE","QUARANTINE","RESERVED","SOLD"].map(v => <option key={v}>{v}</option>)}</select></Field>
          {type === "BLOCK" && <Field label="Unique block ID"><input className="form-input" {...form.register("uniqueBlockId")} /></Field>}
          {type === "SLAB" && <Field label="Unique slab ID"><input className="form-input" {...form.register("uniqueSlabId")} /></Field>}
          {["SLAB","TILE","CUT_TO_SIZE","RESIDUAL"].includes(type) && <Field label="Parent item ID"><input className="form-input" placeholder="Optional UUID" {...form.register("parentId")} /></Field>}
        </div>
      </section>
      <section className="rounded-xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 font-semibold">Marble properties</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quarry origin"><input className="form-input" {...form.register("quarryOrigin")} /></Field><Field label="Color"><input className="form-input" {...form.register("color")} /></Field>
          <Field label="Vein pattern"><input className="form-input" {...form.register("veinPattern")} /></Field><Field label="Quality grade"><input className="form-input" placeholder="A, B, C..." {...form.register("qualityGrade")} /></Field>
          {type !== "CONSUMABLE" && <><Field label="Finish"><input className="form-input" {...form.register("finish")} /></Field><Field label="Thickness (mm)"><input type="number" className="form-input" {...form.register("thicknessMm")} /></Field><Field label="Length (mm)"><input type="number" className="form-input" {...form.register("lengthMm")} /></Field><Field label="Width (mm)"><input type="number" className="form-input" {...form.register("widthMm")} /></Field></>}
          {type === "BLOCK" && <Field label="Weight (kg)"><input type="number" className="form-input" {...form.register("weightKg")} /></Field>}
          {type === "SLAB" && <Field label="Recovery (%)"><input type="number" className="form-input" {...form.register("recoveryPercent")} /></Field>}
          <Field label="Area (sqm)"><input type="number" className="form-input" {...form.register("areaSqm")} /></Field>
        </div>
      </section>
      <section className="rounded-xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900 xl:col-span-2">
        <h2 className="mb-4 font-semibold">Photos</h2>
        <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => setFiles(Array.from(e.target.files || []))} className="block w-full text-sm" />
      </section>
      {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 xl:col-span-2">{error}</p>}
      <div className="xl:col-span-2"><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Creating..." : "Create item"}</Button></div>
    </form>
  </>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1.5 block font-medium">{label}</span>{children}</label>;
}
