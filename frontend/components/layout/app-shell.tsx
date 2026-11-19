"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Blocks, Boxes, Building2, ChartNoAxesCombined, LayoutDashboard, Moon, ReceiptText, Sun, Menu, X, LogOut } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/inventory", label: "Overview", icon: LayoutDashboard },
  { href: "/inventory/items", label: "Items", icon: Boxes },
  { href: "/stock", label: "Stock Movements", icon: ReceiptText },
  { href: "/warehouses", label: "Warehouses", icon: Building2 },
  { href: "/reports/traceability", label: "Traceability", icon: ChartNoAxesCombined }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!localStorage.getItem("marbleerp.accessToken") && !user) router.replace("/login");
    }
  }, [router, user]);

  function signOut() { logout(); router.replace("/login"); }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 border-r bg-white p-4 transition-transform dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-14 items-center justify-between px-2">
          <Link href="/inventory" className="flex items-center gap-2 font-bold"><Blocks className="h-6 w-6" /> MarbleERP</Link>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation"><X className="h-5 w-5" /></button>
        </div>
        <nav className="mt-4 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium ${active ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}><Icon className="h-4 w-4" /> {item.label}</Link>;
          })}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></Button>
          <div className="hidden text-sm text-slate-500 lg:block">{user ? `${user.name} · ${user.role.replaceAll("_", " ")}` : "MarbleERP"}</div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</Button>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out"><LogOut className="h-4 w-4" /></Button>
          </div>
        </header>
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
