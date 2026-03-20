// Empty string = relative URL, routes through Vite proxy → localhost:3001 in dev
// Set VITE_API_BASE_URL in production deployment env vars
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
