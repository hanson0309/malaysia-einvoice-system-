import axios from 'axios';
import type { RegisterData } from '../types/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: RegisterData) => api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
};

// Customer API
export const customerApi = {
  getAll: () => api.get('/customers'),
  getById: (id: string) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
};

// Product API
export const productApi = {
  getAll: () => api.get('/products'),
  getById: (id: string) => api.get(`/products/${id}`),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
};

// Invoice API
// Note: invoiceApi.submit() is the legacy MyInvois endpoint (being replaced by IRB system)
export const invoiceApi = {
  getAll: () => api.get('/invoices'),
  getById: (id: string) => api.get(`/invoices/${id}`),
  getNextNumber: () => api.get<{ invoice_number: string }>('/invoices/next-number'),
  create: (data: any) => api.post('/invoices', data),
  submit: (id: string) => api.post(`/invoices/${id}/submit`),
  delete: (id: string) => api.delete(`/invoices/${id}`),
  submitToIRB: (id: string) => api.post<IRBSubmitResponse>(`/irb/submit/${id}`),
};

// Invoice Template API
export const invoiceTemplateApi = {
  getAll: () => api.get('/invoice-templates'),
  getById: (id: string) => api.get(`/invoice-templates/${id}`),
  create: (data: any) => api.post('/invoice-templates', data),
  update: (id: string, data: any) => api.put(`/invoice-templates/${id}`, data),
  delete: (id: string) => api.delete(`/invoice-templates/${id}`),
};

// IRB API Response Types
export interface IRBSubmitResponse {
  success: boolean;
  submissionId: string;
  timestamp: string;
  message?: string;
  status?: string;
  uuid?: string;
  longId?: string;
}

export interface IRBStatusResponse {
  submissionId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'processing';
  timestamp: string;
  details?: string;
  errorCode?: string;
}

export interface IRBTinLookupResponse {
  success: boolean;
  tin?: string;
  name?: string;
  status?: string;
  message?: string;
}

export interface IRBBatchResult {
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
}

// IRB API
// Endpoints for submitting invoices to the IRB (Inland Revenue Board) government system
export const irbApi = {
  /**
   * Submit an invoice to the IRB government system for e-invoicing compliance
   * @param id - The invoice ID to submit
   * @returns Promise with submission confirmation and tracking ID
   */
  submitInvoice: (id: string) => api.post<IRBSubmitResponse>(`/irb/submit/${id}`),
  submitBatch: (invoiceIds: string[]) => api.post<IRBBatchResult>('/irb/submit-batch', { invoiceIds }),
  /**
   * Check the submission status of an invoice in the IRB system
   * @param id - The invoice ID to check status for
   * @returns Promise with current submission status and details
   */
  getStatus: (id: string) => api.get<IRBStatusResponse>(`/irb/status/${id}`),

  /**
   * Look up a taxpayer's TIN (Tax Identification Number) using their NRIC
   * @param nric - The Malaysian NRIC (National Registration Identity Card) number
   * @returns Promise with TIN and taxpayer information if found
   */
  lookupTin: (nric: string) => api.post<IRBTinLookupResponse>('/irb/tin-lookup', { nric }),
};

// Auto-consolidation API
export interface AutoConsolidateSettings {
  enabled: boolean;
  day: number;
  batchSize: number;
  lastRunAt: string | null;
  lastStatus: string | null;
}

export interface AutoConsolidateRunSummary {
  tenantId: string;
  tenantName: string;
  monthLabel: string;
  totalCandidates: number;
  batches: number;
  batchSize: number;
  succeeded: number;
  failed: number;
  results: Array<{
    success: boolean;
    invoiceId: string;
    invoiceNumber: string;
    uuid?: string;
    status?: string;
    error?: string;
  }>;
  ranAt: string;
  error?: string;
}

export interface JobProgress {
  running: boolean;
  source?: 'manual' | 'auto';
  total?: number;
  batches?: number;
  currentBatch?: number;
  processed?: number;
  succeeded?: number;
  failed?: number;
  startedAt?: string;
  updatedAt?: string;
}

export const autoConsolidateApi = {
  getSettings: () => api.get<AutoConsolidateSettings>('/irb/auto-consolidate/settings'),
  updateSettings: (data: Partial<Pick<AutoConsolidateSettings, 'enabled' | 'day' | 'batchSize'>>) =>
    api.put<AutoConsolidateSettings>('/irb/auto-consolidate/settings', data),
  run: (dryRun = false) =>
    api.post<AutoConsolidateRunSummary>('/irb/auto-consolidate/run', { dryRun }),
  getProgress: () => api.get<JobProgress>('/irb/auto-consolidate/progress'),
};
