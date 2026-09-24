import { apiClient } from './client';

export function listExpenses(vehicleId, page = 1) {
  return apiClient.get(`/api/v1/vehicles/${vehicleId}/expenses`, { params: { page, page_size: 20 } }).then((res) => res.data);
}

export function getExpenseSummary(vehicleId) {
  return apiClient.get(`/api/v1/vehicles/${vehicleId}/expenses/summary`).then((res) => res.data);
}

export function createExpense(vehicleId, payload) {
  return apiClient.post(`/api/v1/vehicles/${vehicleId}/expenses`, payload).then((res) => res.data);
}

export function updateExpense(expenseId, payload) {
  return apiClient.put(`/api/v1/expenses/${expenseId}`, payload).then((res) => res.data);
}

export function deleteExpense(expenseId) {
  return apiClient.delete(`/api/v1/expenses/${expenseId}`);
}
