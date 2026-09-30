import axios from "axios";
import { API_BASE_URL } from "./endpoints";

export const TOKEN_STORAGE_KEY = "admin_token";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 20000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error("API Error [", error?.config?.url, "]:", error?.response?.data || error.message);
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Something went wrong. Please try again.";

    // Optionally handle 401 unauthorized globally
    if (error?.response?.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.location.href = '/login';
    }

    return Promise.reject(new Error(message));
  }
);
