import { realApi, getToken, setToken, request } from './client.js';
import { mockApi, WORK_ZONE, SUPERADMIN_EMAIL } from './mock.js';
import { supabaseApi } from './supabaseApi.js';

export const isSupabase =
  String(import.meta.env.VITE_USE_SUPABASE).toLowerCase() === 'true' &&
  Boolean(import.meta.env.VITE_SUPABASE_URL);

export const isMock = !isSupabase && Boolean(import.meta.env.VITE_MOCK);

export const api = isSupabase ? supabaseApi : isMock ? mockApi : realApi;

export {
  getToken,
  setToken,
  request,
  realApi,
  mockApi,
  supabaseApi,
  WORK_ZONE,
  SUPERADMIN_EMAIL,
};
