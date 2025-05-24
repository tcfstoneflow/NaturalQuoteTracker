import { apiRequest } from './queryClient';

// Dashboard API
export const dashboardApi = {
  getStats: () => fetch('/api/dashboard/stats').then(res => res.json()),
  getRecentQuotes: () => fetch('/api/dashboard/recent-quotes').then(res => res.json()),
  getTopProducts: () => fetch('/api/dashboard/top-products').then(res => res.json()),
  getRecentActivities: () => fetch('/api/dashboard/recent-activities').then(res => res.json()),
};

// Clients API
export const clientsApi = {
  getAll: (search?: string) => {
    const url = search ? `/api/clients?search=${encodeURIComponent(search)}` : '/api/clients';
    return fetch(url).then(res => res.json());
  },
  getById: (id: number) => fetch(`/api/clients/${id}`).then(res => res.json()),
  create: (data: any) => apiRequest('POST', '/api/clients', data).then(res => res.json()),
  update: (id: number, data: any) => apiRequest('PUT', `/api/clients/${id}`, data).then(res => res.json()),
  delete: (id: number) => apiRequest('DELETE', `/api/clients/${id}`),
};

// Products API
export const productsApi = {
  getAll: () => fetch('/api/products').then(res => res.json()),
  getById: (id: number) => fetch(`/api/products/${id}`).then(res => res.json()),
  create: (data: any) => apiRequest('POST', '/api/products', data).then(res => res.json()),
  update: (id: number, data: any) => apiRequest('PUT', `/api/products/${id}`, data).then(res => res.json()),
  delete: (id: number) => apiRequest('DELETE', `/api/products/${id}`),
};

// Quotes API
export const quotesApi = {
  getAll: () => fetch('/api/quotes').then(res => res.json()),
  getById: (id: number) => fetch(`/api/quotes/${id}`).then(res => res.json()),
  create: (data: any) => apiRequest('POST', '/api/quotes', data).then(res => res.json()),
  update: (id: number, data: any) => apiRequest('PUT', `/api/quotes/${id}`, data).then(res => res.json()),
  delete: (id: number) => apiRequest('DELETE', `/api/quotes/${id}`),
  generatePDF: (id: number) => fetch(`/api/quotes/${id}/pdf`).then(res => res.blob()),
  sendEmail: (id: number, additionalMessage?: string) => 
    apiRequest('POST', `/api/quotes/${id}/send`, { additionalMessage }).then(res => res.json()),
};

// AI API
export const aiApi = {
  translateQuery: (naturalQuery: string) => 
    apiRequest('POST', '/api/ai/translate-query', { naturalQuery }).then(res => res.json()),
  executeSQL: (query: string) => 
    apiRequest('POST', '/api/sql/execute', { query }).then(res => res.json()),
};
