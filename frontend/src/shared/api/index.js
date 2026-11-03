import { realApi, getToken, setToken, request } from './client.js';
import { mockApi, WORK_ZONE } from './mock.js';

export const isMock = Boolean(import.meta.env.VITE_MOCK);
export const api = isMock ? mockApi : realApi;

export { getToken, setToken, request, realApi, mockApi, WORK_ZONE };

