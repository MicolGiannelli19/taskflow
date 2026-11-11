import axios from "axios";
import { getAuthToken } from "./clerkToken";

// The API's origin, fixed at build time. vite.config.ts hands the same value to
// the CSP's connect-src, so the two can't drift apart. Local default otherwise.
const apiUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");

const instance = axios.create({
  baseURL: `${apiUrl}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Async on purpose: Clerk hands back a short-lived token and refreshes it when
// it's close to expiring, so the header is resolved per request.
instance.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Clerk owns the session, so there is nothing local to clear — a 401 means
    // the token was rejected and the user needs to sign in again.
    if (error.response?.status === 401) {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default instance;
