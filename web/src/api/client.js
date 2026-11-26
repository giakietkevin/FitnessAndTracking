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

  getFoodLogs: (date) => request(`/food-logs?date=${encodeURIComponent(date)}`),
  createFoodLog: (payload) => request('/food-logs', { method: 'POST', body: payload }),
  deleteFoodLog: (id) => request(`/food-logs/${id}`, { method: 'DELETE' }),

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
