import { api } from "@/lib/api";
import type { Location, Warehouse } from "@/types/api";

export async function fetchWarehouses() {
  const { data } = await api.get<{ data: Warehouse[] }>("/warehouses", { params: { limit: 100 } });
  return data.data;
}

export async function fetchLocations() {
  const { data } = await api.get<{ data: Location[] }>("/locations", { params: { limit: 100 } });
  return data.data;
}

export async function createWarehouse(payload: Partial<Warehouse>) {
  const { data } = await api.post<Warehouse>("/warehouses", payload);
  return data;
}

export async function createLocation(payload: Partial<Location>) {
  const { data } = await api.post<Location>("/locations", payload);
  return data;
}
