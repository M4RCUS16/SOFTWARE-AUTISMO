import axios from "axios";

import { tokenStorage } from "@/utils/token-storage";

const API_BASE_URL =
  (typeof window !== "undefined" && window.API_BASE_URL) ||
  (typeof process !== "undefined" && process.env && process.env.API_BASE_URL) ||
  "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL
});

api.defaults.headers.common.Accept = "application/json";

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refresh = tokenStorage.getRefresh();
        if (!refresh) {
          throw new Error("Token de atualizacao ausente");
        }

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh/`, { refresh });
        const newAccess = data.access;
        tokenStorage.setAccess(newAccess);
        tokenStorage.setRefresh(data.refresh || refresh);
        api.defaults.headers.common.Authorization = `Bearer ${newAccess}`;
        processQueue(null, newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        tokenStorage.clearAll();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
