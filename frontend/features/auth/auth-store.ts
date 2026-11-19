"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "@/types/api";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface AuthState {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(persist(
  (set) => ({
    user: null,
    setUser: (user) => set({ user }),
    logout: () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("marbleerp.accessToken");
        localStorage.removeItem("marbleerp.refreshToken");
      }
      set({ user: null });
    }
  }),
  { name: "marbleerp-auth" }
));
