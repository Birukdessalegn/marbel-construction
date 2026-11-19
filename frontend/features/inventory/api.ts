import { api } from "@/lib/api";
import type { Item, Pagination, StockBalance, StockTransaction } from "@/types/api";

export interface ItemListResponse {
  data: Item[];
  pagination: Pagination;
}

export async function fetchItems(params: Record<string, string | number | undefined>) {
  const { data } = await api.get<ItemListResponse>("/items", { params });
  return data;
}

export async function fetchItem(id: string) {
  const { data } = await api.get<Item>(`/items/${id}`);
  return data;
}

export async function createItem(payload: Partial<Item>) {
  const { data } = await api.post<Item>("/items", payload);
  return data;
}

export async function updateItem(id: string, payload: Partial<Item>) {
  const { data } = await api.patch<Item>(`/items/${id}`, payload);
  return data;
}

export async function fetchTraceability(id: string) {
  const { data } = await api.get<Item>(`/items/${id}/traceability`);
  return data;
}

export async function fetchStockBalances(itemId: string) {
  const { data } = await api.get<StockBalance[]>(`/stock/balances/${itemId}`);
  return data;
}

export async function fetchTransactions(params: Record<string, string | number | undefined>) {
  const { data } = await api.get<{ data: StockTransaction[] }>("/stock/transactions", { params });
  return data;
}
