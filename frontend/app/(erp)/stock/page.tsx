import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, ClipboardCheck, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/page-header";

const movements = [
  { href: "/stock/receive", title: "Goods Receipt", text: "Receive purchased or quarry stock", icon: ArrowDownToLine },
  { href: "/stock/issue", title: "Goods Issue", text: "Issue stock for production or sale", icon: ArrowUpFromLine },
  { href: "/stock/transfer", title: "Stock Transfer", text: "Move stock between locations", icon: ArrowLeftRight },
  { href: "/stock/adjust", title: "Stock Adjustment", text: "Correct exceptions with a reason", icon: SlidersHorizontal },
  { href: "/stock/count", title: "Physical Count", text: "Record measured on-hand quantity", icon: ClipboardCheck }
];

export default function StockPage() {
  return <>
    <PageHeader title="Stock Movements" description="Create controlled inventory transactions" />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{movements.map(m => <Link key={m.href} href={m.href} className="rounded-xl border bg-white p-5 transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"><m.icon className="h-6 w-6 text-slate-700 dark:text-slate-300" /><h2 className="mt-4 font-semibold">{m.title}</h2><p className="mt-1 text-sm text-slate-500">{m.text}</p></Link>)}</div>
  </>;
}
