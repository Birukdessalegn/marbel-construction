import { api } from "@/lib/api";

export async function stockMovement(type: "receive" | "issue" | "transfer" | "adjust" | "count", payload: Record<string, unknown>) {
  const { data } = await api.post(`/stock/${type}`, payload);
  return data;
}
