"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, getApiError } from "@/lib/api";
import { useAuthStore } from "@/features/auth/auth-store";
import { Button } from "@/components/ui/button";
import { Blocks } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const [error, setError] = useState("");
  const form = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });

  async function submit(values: z.infer<typeof loginSchema>) {
    setError("");
    try {
      const { data } = await api.post("/auth/login", values);
      localStorage.setItem("marbleerp.accessToken", data.accessToken);
      localStorage.setItem("marbleerp.refreshToken", data.refreshToken);
      setUser(data.user);
      router.replace("/inventory");
    } catch (error) {
      setError(getApiError(error).message);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,_#e2e8f0,_#f8fafc_55%,_#e5e7eb)] px-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-xl border bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950">
            <Blocks className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">MarbleERP</h1>
            <p className="text-sm text-slate-500">Inventory operations</p>
          </div>
        </div>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Email</label>
            <input className="h-10 w-full rounded-md border bg-transparent px-3 outline-none focus:ring-2 focus:ring-slate-400" type="email" {...form.register("email")} />
            {form.formState.errors.email && <p className="mt-1 text-xs text-red-600">{form.formState.errors.email.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Password</label>
            <input className="h-10 w-full rounded-md border bg-transparent px-3 outline-none focus:ring-2 focus:ring-slate-400" type="password" {...form.register("password")} />
            {form.formState.errors.password && <p className="mt-1 text-xs text-red-600">{form.formState.errors.password.message}</p>}
          </div>
          {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </main>
  );
}
