"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/role-gate";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { SupplierStatusBadge } from "@/components/procurement/status-badges";
import { deactivateSupplier, fetchSuppliers } from "@/features/procurement/api";
import { getApiError } from "@/lib/api";

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const suppliers = useQuery({
    queryKey: ["suppliers", { search, status, page }],
    queryFn: () => fetchSuppliers({ search: search || undefined, status: status || undefined, page, limit: 20 })
  });
  const deactivate = useMutation({
    mutationFn: deactivateSupplier,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] })
  });

  return (
    <>
      <PageHeader title="Suppliers" description="Manage suppliers and review purchasing performance" actions={
        <RoleGate roles={["ADMIN", "PURCHASE_MANAGER"]}><Link href="/suppliers/new"><Button>New supplier</Button></Link></RoleGate>
      } />
      <div className="mb-4 grid gap-2 rounded-xl border bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[1fr_220px_auto]">
        <input className="form-input" placeholder="Search supplier name" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        <select className="form-input" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
        </select>
        <Button variant="outline" onClick={() => { setSearch(""); setStatus(""); setPage(1); }}>Clear filters</Button>
      </div>
      {deactivate.isError && <p role="alert" className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{getApiError(deactivate.error).message}</p>}
      {suppliers.isLoading ? <LoadingState /> : suppliers.isError ? <ErrorState message={getApiError(suppliers.error).message} onRetry={() => suppliers.refetch()} /> : (
        <div className="overflow-hidden rounded-xl border bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60">
                <tr>{["Supplier", "Contact", "Payment terms", "Rating", "Status", ""].map((heading) => <th className="px-4 py-3" key={heading}>{heading}</th>)}</tr>
              </thead>
              <tbody>
                {suppliers.data?.data.map((supplier) => (
                  <tr key={supplier.id} className="border-b last:border-0 dark:border-slate-800">
                    <td className="px-4 py-3"><Link className="font-semibold underline" href={`/suppliers/${supplier.id}`}>{supplier.name}</Link><p className="text-xs text-slate-500">{supplier.email || supplier.phone || "No contact details"}</p></td>
                    <td className="px-4 py-3">{supplier.contactName || "—"}</td>
                    <td className="px-4 py-3">{supplier.paymentTerms || "—"}</td>
                    <td className="px-4 py-3">{supplier.rating == null ? "—" : `${Number(supplier.rating).toFixed(1)} / 5`}</td>
                    <td className="px-4 py-3"><SupplierStatusBadge status={supplier.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link className="underline" href={`/suppliers/${supplier.id}`}>View</Link>
                        <RoleGate roles={["ADMIN", "PURCHASE_MANAGER"]}>
                          <Link className="underline" href={`/suppliers/${supplier.id}/edit`}>Edit</Link>
                          {supplier.status === "ACTIVE" && <button className="text-red-600 underline disabled:opacity-50" disabled={deactivate.isPending} onClick={() => {
                            if (window.confirm(`Deactivate ${supplier.name}?`)) deactivate.mutate(supplier.id);
                          }}>Deactivate</button>}
                        </RoleGate>
                      </div>
                    </td>
                  </tr>
                ))}
                {!suppliers.data?.data.length && <tr><td colSpan={6} className="p-10 text-center text-sm text-slate-500">No suppliers match this view.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm dark:border-slate-800">
            <span>{suppliers.data?.pagination.total ?? 0} suppliers</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
              <span>{page} / {suppliers.data?.pagination.totalPages || 1}</span>
              <Button size="sm" variant="outline" disabled={page >= (suppliers.data?.pagination.totalPages || 1)} onClick={() => setPage((value) => value + 1)}>Next</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
