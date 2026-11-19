"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWarehouses, fetchLocations, createWarehouse, createLocation } from "@/features/warehouses/api";
import { PageHeader } from "@/components/page-header";
import { RoleGate } from "@/components/role-gate";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { getApiError } from "@/lib/api";

export default function WarehousesPage() {
  const queryClient = useQueryClient();
  const warehouses = useQuery({ queryKey: ["warehouses"], queryFn: fetchWarehouses });
  const locations = useQuery({ queryKey: ["locations"], queryFn: fetchLocations });
  const [warehouseOpen, setWarehouseOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [warehouseCode, setWarehouseCode] = useState("");
  const [warehouseName, setWarehouseName] = useState("");
  const [locationWarehouse, setLocationWarehouse] = useState("");
  const [locationCode, setLocationCode] = useState("");
  const warehouseMutation = useMutation({ mutationFn: () => createWarehouse({ code: warehouseCode, name: warehouseName }), onSuccess: () => { setWarehouseOpen(false); setWarehouseCode(""); setWarehouseName(""); queryClient.invalidateQueries({ queryKey: ["warehouses"] }); } });
  const locationMutation = useMutation({ mutationFn: () => createLocation({ warehouseId: locationWarehouse, code: locationCode }), onSuccess: () => { setLocationOpen(false); setLocationCode(""); queryClient.invalidateQueries({ queryKey: ["locations"] }); } });

  return <>
    <PageHeader title="Warehouses & Locations" description="Manage yards, fabrication areas and bin/rack locations" actions={<><RoleGate roles={["ADMIN","WAREHOUSE_MANAGER"]}><Button onClick={() => setWarehouseOpen(v => !v)}>New warehouse</Button><Button variant="outline" onClick={() => setLocationOpen(v => !v)}>New location</Button></RoleGate></>} />
    {warehouseOpen && <div className="mb-4 grid gap-3 rounded-xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-3"><input className="form-input" placeholder="Warehouse code" value={warehouseCode} onChange={e => setWarehouseCode(e.target.value)} /><input className="form-input" placeholder="Warehouse name" value={warehouseName} onChange={e => setWarehouseName(e.target.value)} /><Button onClick={() => warehouseMutation.mutate()} disabled={warehouseMutation.isPending}>Create warehouse</Button>{warehouseMutation.isError && <p className="text-sm text-red-600 sm:col-span-3">{getApiError(warehouseMutation.error).message}</p>}</div>}
    {locationOpen && <div className="mb-4 grid gap-3 rounded-xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-3"><select className="form-input" value={locationWarehouse} onChange={e => setLocationWarehouse(e.target.value)}><option value="">Select warehouse</option>{warehouses.data?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select><input className="form-input" placeholder="Bin/rack code" value={locationCode} onChange={e => setLocationCode(e.target.value)} /><Button onClick={() => locationMutation.mutate()} disabled={locationMutation.isPending}>Create location</Button>{locationMutation.isError && <p className="text-sm text-red-600 sm:col-span-3">{getApiError(locationMutation.error).message}</p>}</div>}
    {warehouses.isLoading || locations.isLoading ? <LoadingState /> : warehouses.isError || locations.isError ? <ErrorState message="Warehouse or location data could not be loaded." /> : (
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-4 font-semibold">Warehouses</h2><div className="space-y-2">{warehouses.data?.map(w => <div key={w.id} className="rounded-md border p-3 text-sm dark:border-slate-800"><p className="font-semibold">{w.code} — {w.name}</p><p className="mt-1 text-slate-500">{w.address || "No address"}</p></div>)}</div></section>
        <section className="rounded-xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-4 font-semibold">Locations</h2><div className="space-y-2">{locations.data?.map(l => <div key={l.id} className="flex items-center justify-between rounded-md border p-3 text-sm dark:border-slate-800"><div><p className="font-semibold">{l.code}</p><p className="text-xs text-slate-500">{l.name || "Unnamed location"}</p></div><span className="text-xs text-slate-500">{l.status}</span></div>)}</div></section>
      </div>
    )}
  </>;
}
