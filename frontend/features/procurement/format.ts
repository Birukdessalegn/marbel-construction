import type { DecimalValue } from "@/types/api";

export function formatAmount(value: DecimalValue | null | undefined, currency = "USD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value ?? 0));
}

export function formatQuantity(value: DecimalValue | null | undefined, maximumFractionDigits = 4) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(Number(value ?? 0));
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

export function formatPercent(value: number | null | undefined) {
  return value == null ? "—" : `${(value * 100).toFixed(1)}%`;
}
