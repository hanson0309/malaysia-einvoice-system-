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

// Invoice Sending Types
export interface SendInvoiceData {
  send_method: 'email' | 'whatsapp' | 'both';
  email_subject?: string;
  email_message?: string;
  whatsapp_message?: string;
}

export interface SendInvoiceResponse {
  success: boolean;
  data: {
    sending_id: string;
    email_sent: boolean;
    whatsapp_link?: string;
  };
}

export interface SendingHistoryItem {
  _id: string;
  send_method: 'email' | 'whatsapp' | 'both';
  email_sent: boolean;
  email_sent_at?: string;
  email_status: 'pending' | 'sent' | 'failed';
  email_error_message?: string;
  email_to: string;
  whatsapp_link_generated: boolean;
  whatsapp_link?: string;
  whatsapp_phone: string;
  sent_by: {
    email: string;
  };
  created_at: string;
}

// Invoice API
// Note: invoiceApi.submit() is the legacy MyInvois endpoint (being replaced by IRB system)
export const invoiceApi = {
  getAll: (params?: { limit?: number; page?: number; status?: string; source?: string }) =>
    api.get('/invoices', { params: { limit: 1000, ...params } }),
  getById: (id: string) => api.get(`/invoices/${id}`),
  getNextNumber: () => api.get<{ invoice_number: string }>('/invoices/next-number'),
  create: (data: any) => api.post('/invoices', data),
  submit: (id: string) => api.post(`/invoices/${id}/submit`),
  delete: (id: string) => api.delete(`/invoices/${id}`),
  submitToIRB: (id: string) => api.post<IRBSubmitResponse>(`/irb/submit/${id}`),
  send: (id: string, data: SendInvoiceData) =>
    api.post<SendInvoiceResponse>(`/invoices/${id}/send`, data),
  getSendingHistory: (id: string) =>
    api.get<{ success: boolean; data: SendingHistoryItem[] }>(`/invoices/${id}/sending-history`),
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

// POS Devices API
export interface POSDevice {
  _id: string;
  device_name: string;
  device_type: 'tablet' | 'desktop';
  status: 'pending' | 'active' | 'inactive';
  pairing_code?: string;
  pairing_code_expires_at?: string;
  last_sync?: string;
  created_at: string;
  updated_at: string;
}

export interface GeneratePairingCodeRequest {
  device_name: string;
  device_type: 'tablet' | 'desktop';
}

export interface GeneratePairingCodeResponse {
  device_id: string;
  device_name: string;
  pairing_code: string;
  expires_at: string;
}

export const posDevicesApi = {
  getAll: () => api.get<POSDevice[]>('/pos/devices'),
  generatePairingCode: (data: GeneratePairingCodeRequest) =>
    api.post<GeneratePairingCodeResponse>('/pos/devices', data),
  deactivate: (id: string) => api.delete(`/pos/devices/${id}`),
  permanentDelete: (id: string) => api.delete(`/pos/devices/${id}/permanent`),
};

// POS Transactions API
export interface POSTransaction {
  _id: string;
  transaction_number: string;
  date: string;
  cashier: {
    name: string;
    employee_code: string;
  };
  total_amount: number;
  payment_method: string;
  status: string;
  invoice_id?: string;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  created_at: string;
}

export const posTransactionsApi = {
  getAll: (params?: URLSearchParams) => api.get<POSTransaction[]>(`/pos/transactions${params ? '?' + params.toString() : ''}`),
};

// POS Inventory API
export interface InventoryLog {
  _id: string;
  product_id: string;
  product_name: string;
  transaction_type: 'purchase' | 'sale' | 'adjustment' | 'stocktake';
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reference_number?: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

export const posInventoryApi = {
  getLogs: (params?: URLSearchParams) => api.get<InventoryLog[]>(`/pos/inventory/logs${params ? '?' + params.toString() : ''}`),
  adjust: (data: { product_id: string; quantity_change: number; notes?: string }) =>
    api.post('/pos/inventory/adjust', data),
  restock: (data: { product_id: string; quantity: number; cost_per_unit: number; supplier?: string; notes?: string }) =>
    api.post('/pos/inventory/restock', data),
};

// POS Appointments API
export interface ServiceItem {
  description: string;
  price: number;
}

export interface POSAppointment {
  _id: string;
  customer_id: {
    _id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  appointment_date: string;
  start_time: string;
  end_time: string;
  service_type: string;
  service_items: ServiceItem[];
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
}

export const posAppointmentsApi = {
  getAll: (params?: URLSearchParams) => api.get<POSAppointment[]>(`/pos/appointments${params ? '?' + params.toString() : ''}`),
  create: (data: any) => api.post('/pos/appointments', data),
  update: (id: string, data: any) => api.put(`/pos/appointments/${id}`, data),
  cancel: (id: string) => api.delete(`/pos/appointments/${id}`),
};

// POS Employees API
export interface POSEmployee {
  _id: string;
  employee_code: string;
  email: string;
  role: string;
  active_status: 'active' | 'inactive';
  created_at: string;
}

export const posEmployeesApi = {
  getAll: (params?: URLSearchParams) => api.get<POSEmployee[]>(`/pos/employees${params ? '?' + params.toString() : ''}`),
  pinLogin: (data: { employee_code: string; pin: string }) => api.post('/pos/employees/pin-login', data),
};

// POS Settings API
export interface POSSettings {
  _id?: string;
  tenant_id?: string;
  modules: {
    appointment: boolean;
    inventory: boolean;
    multi_cashier: boolean;
    customer_management: boolean;
  };
  business_type: 'retail' | 'service' | 'both';
  invoice_settings: {
    auto_create_on_payment: boolean;
    default_invoice_type: '01' | '02';
    require_customer_for_invoice: boolean;
  };
  hardware: {
    receipt_printer_enabled: boolean;
    barcode_scanner_enabled: boolean;
    cash_drawer_enabled: boolean;
    label_printer_enabled: boolean;
  };
}

export const posSettingsApi = {
  get: () => api.get<POSSettings>('/pos/settings'),
  update: (data: Partial<POSSettings>) => api.put<POSSettings>('/pos/settings', data),
};

// SQL Connection API
export interface SqlConnectionConfig {
  _id?: string;
  host: string;
  port: number;
  database: string;
  username: string;
  has_password?: boolean;
  invoice_query: string;
  invoice_lines_query?: string;
  column_mapping: {
    invoice: Record<string, string>;
    customer: Record<string, string>;
    lines: Record<string, string>;
  };
  auto_sync_enabled: boolean;
  auto_sync_interval_minutes: number;
  is_active: boolean;
  last_sync_at?: string;
  last_sync_status?: string;
  last_sync_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SqlSyncResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: number;
  message: string;
}

export interface SqlDetectResult {
  success: boolean;
  error?: string;
  tables: string[];
  table_columns: Record<string, string[]>;
  detected: {
    invoice_table: string | null;
    suggested_query: string;
    column_mapping: {
      invoice: Record<string, string>;
      customer: Record<string, string>;
      lines: Record<string, string>;
    };
  };
}

export const sqlConnectionApi = {
  get: () => api.get<{ data: SqlConnectionConfig | null }>('/sql-connection'),
  save: (data: any) => api.post<{ data: SqlConnectionConfig; message: string }>('/sql-connection', data),
  delete: () => api.delete<{ message: string }>('/sql-connection'),
  testNew: (data: { host: string; port: number; database: string; username: string; password: string }) =>
    api.post<{ success: boolean; message: string }>('/sql-connection/test', data),
  testSaved: () =>
    api.post<{ success: boolean; message: string }>('/sql-connection/test-saved'),
  detect: (data: { host: string; port: number; database: string; username: string; password: string }) =>
    api.post<SqlDetectResult>('/sql-connection/detect', data),
  preview: (limit = 5) =>
    api.get<{ success: boolean; data: any[]; count: number; message?: string }>(`/sql-connection/preview?limit=${limit}`),
  sync: (full = false) =>
    api.post<SqlSyncResult>('/sql-connection/sync', { full }),
  resetSync: () =>
    api.post<{ message: string }>('/sql-connection/reset-sync'),
};
