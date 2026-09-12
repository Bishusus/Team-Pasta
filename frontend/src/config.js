// Controls the base URL for the FastAPI backend.
// In development, Vite proxies /api to the local FastAPI server.
// Set VITE_API_BASE_URL to a deployed API URL when running elsewhere.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";