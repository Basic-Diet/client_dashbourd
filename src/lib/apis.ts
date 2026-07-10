import axios from "axios";
import Cookies from "js-cookie";
import { toast } from "sonner";
import { parseApiError } from "./apiErrors";

declare module "axios" {
  interface AxiosRequestConfig {
    skipAuthRedirect?: boolean;
  }
}

const api = axios.create({
  baseURL: import.meta.env?.VITE_BACKEND_URL || "",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Accept-Language": "ar",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = Cookies.get("dashboardToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      const headers = config.headers as
        | (Record<string, unknown> & { delete?: (header: string) => void })
        | undefined;
      if (typeof headers?.delete === "function") {
        headers.delete("Content-Type");
      } else if (headers) {
        delete headers["Content-Type"];
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const parsedError = parseApiError(error);
    const message = parsedError.message;

    if (parsedError.status === 401 && !error.config?.skipAuthRedirect) {
      Cookies.remove("dashboardToken");
      window.location.href = "/";
    }

    if (parsedError.status === 403) {
      toast.error(message || "ليس لديك صلاحية للوصول إلى هذا الإجراء");
    }

    (error as Error & { normalizedMessage?: string }).normalizedMessage =
      message;
    console.error("API Error:", message);
    return Promise.reject(error);
  }
);

export default api;
