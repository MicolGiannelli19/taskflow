import axios from "axios";
import { getAuthToken } from "./clerkToken";

const instance = axios.create({
  // TODO: this should be set somewhere in a a config
  baseURL: "http://localhost:8000/api",
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
