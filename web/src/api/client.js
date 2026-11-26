const TOKEN_KEY = 'nk_auth_token';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request(path, { method = 'GET', body, token } = {}) {
  const authToken = token ?? getStoredToken();
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) {
      window.dispatchEvent(new CustomEvent('nk:unauthorized'));
    }
    const message = data?.error?.message || `Yêu cầu thất bại (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.code = data?.error?.code;
    throw err;
  }
  return data;
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, token: '' }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, token: '' }),
  changePassword: (payload) => request('/auth/change-password', { method: 'POST', body: payload }),
  getProfile: () => request('/profile'),
  updateProfile: (payload) => request('/profile', { method: 'PUT', body: payload }),

  getFoods: (q = '', category = 'all') => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category && category !== 'all') params.set('category', category);
    return request(`/foods?${params.toString()}`);
  },
  createFood: (payload) => request('/foods', { method: 'POST', body: payload }),
  deleteFood: (id) => request(`/foods/${id}`, { method: 'DELETE' }),

  getMyFoodSubmissions: () => request('/food-submissions/mine'),
  submitFoodForApproval: (payload) => request('/food-submissions', { method: 'POST', body: payload }),
  getAdminFoodSubmissions: (status = 'pending') =>
    request(`/admin/food-submissions?status=${encodeURIComponent(status)}`),
  approveFoodSubmission: (id, payload) =>
    request(`/admin/food-submissions/${id}/approve`, { method: 'POST', body: payload }),
  rejectFoodSubmission: (id, adminNote) =>
    request(`/admin/food-submissions/${id}/reject`, { method: 'POST', body: { adminNote } }),
  getAdminOverview: () => request('/admin/overview'),
  updateAdminFood: (id, payload) => request(`/admin/foods/${id}`, { method: 'PUT', body: payload }),
  deleteAdminFood: (id) => request(`/admin/foods/${id}`, { method: 'DELETE' }),

  getMyExerciseSubmissions: () => request('/exercise-submissions/mine'),
  submitExerciseForApproval: (payload) => request('/exercise-submissions', { method: 'POST', body: payload }),
  getAdminExerciseSubmissions: (status = 'pending') =>
    request(`/admin/exercise-submissions?status=${encodeURIComponent(status)}`),
  approveExerciseSubmission: (id, payload) =>
    request(`/admin/exercise-submissions/${id}/approve`, { method: 'POST', body: payload }),
  rejectExerciseSubmission: (id, adminNote) =>
    request(`/admin/exercise-submissions/${id}/reject`, { method: 'POST', body: { adminNote } }),
  updateAdminExercise: (id, payload) => request(`/admin/exercises/${id}`, { method: 'PUT', body: payload }),
  deleteAdminExercise: (id) => request(`/admin/exercises/${id}`, { method: 'DELETE' }),

  getFoodLogs: (date) => request(`/food-logs?date=${encodeURIComponent(date)}`),
  createFoodLog: (payload) => request('/food-logs', { method: 'POST', body: payload }),
  deleteFoodLog: (id) => request(`/food-logs/${id}`, { method: 'DELETE' }),
  copyFoodDay: (payload) => request('/food-logs/copy-day', { method: 'POST', body: payload }),

  getWaterLogs: (date) => request(`/water-logs?date=${encodeURIComponent(date)}`),
  addWaterLog: (payload) => request('/water-logs', { method: 'POST', body: payload }),
  deleteWaterLog: (id) => request(`/water-logs/${id}`, { method: 'DELETE' }),

  getMealCombos: () => request('/meal-combos'),
  createMealCombo: (payload) => request('/meal-combos', { method: 'POST', body: payload }),
  applyMealCombo: (id, payload) => request(`/meal-combos/${id}/apply`, { method: 'POST', body: payload }),
  deleteMealCombo: (id) => request(`/meal-combos/${id}`, { method: 'DELETE' }),

  getExercises: (q = '', type = '') => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (type) params.set('type', type);
    return request(`/exercises?${params.toString()}`);
  },
  createExercise: (payload) => request('/exercises', { method: 'POST', body: payload }),

  getWorkoutPlans: () => request('/workout-plans'),
  createWorkoutPlan: (payload) => request('/workout-plans', { method: 'POST', body: payload }),
  updateWorkoutPlan: (id, payload) => request(`/workout-plans/${id}`, { method: 'PUT', body: payload }),
  deleteWorkoutPlan: (id) => request(`/workout-plans/${id}`, { method: 'DELETE' }),
  completeWorkoutPlan: (id, date) => request(`/workout-plans/${id}/complete`, { method: 'POST', body: { date } }),

  getWorkoutLogs: (date) => request(`/workout-logs?date=${encodeURIComponent(date)}`),
  createWorkoutLog: (payload) => request('/workout-logs', { method: 'POST', body: payload }),
  deleteWorkoutLog: (id) => request(`/workout-logs/${id}`, { method: 'DELETE' }),

  getWeights: (days = 30) => request(`/tracking/weights?days=${days}`),
  logWeight: (payload) => request('/tracking/weights', { method: 'POST', body: payload }),
  deleteWeight: (id) => request(`/tracking/weights/${id}`, { method: 'DELETE' }),
  getDashboard: (date, days = 7) => request(`/tracking/dashboard?date=${encodeURIComponent(date)}&days=${days}`)
};
