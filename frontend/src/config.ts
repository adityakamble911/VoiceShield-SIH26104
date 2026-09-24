/**
 * config.ts
 *
 * Central place for environment-dependent settings.
 *
 * API_BASE_URL:
 *   - In local dev, defaults to the local FastAPI backend on port 8000.
 *   - In production (Netlify, etc.), set VITE_API_BASE_URL in the host's
 *     environment variables to your live backend URL (e.g. your Render
 *     service: https://voiceshield-backend.onrender.com).
 *   - Do NOT include a trailing slash.
 */
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ||
  'http://127.0.0.1:8000';
