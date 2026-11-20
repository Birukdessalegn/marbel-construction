"use client";

import { useAuthStore } from "@/features/auth/auth-store";
import type { Role } from "@/types/api";

export function RoleGate({ roles, children, fallback = null }: { roles: Role[]; children: React.ReactNode; fallback?: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  if (!user || !roles.includes(user.role)) return fallback;
  return children;
}
