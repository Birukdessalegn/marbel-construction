"use client";

import { useAuthStore } from "@/features/auth/auth-store";
import type { Role } from "@/types/api";

export function RoleGate({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  if (!user || !roles.includes(user.role)) return null;
  return children;
}
