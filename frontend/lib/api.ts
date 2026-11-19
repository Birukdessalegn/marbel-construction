import axios, { AxiosError } from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" }
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("marbleerp.accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export function getApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiError | undefined;
    if (data?.code) return data;
  }
  return { code: "NETWORK_ERROR", message: "The server could not be reached." };
}
