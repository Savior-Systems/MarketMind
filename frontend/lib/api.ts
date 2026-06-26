import { useAuthStore } from './stores/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async function request(path: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().token;
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (options.body && !(options.body instanceof URLSearchParams) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Request failed with status ${res.status}`);
  }

  if (res.status === 204) {
    return null;
  }

  return res.json();
}

export async function login(email: string, password: string) {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);

  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || 'Login failed');
  }
  return res.json();
}

export async function register(email: string, password: string) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe() {
  return request('/auth/me');
}

export async function getBrands() {
  return request('/brands/');
}

export async function createBrand(brandData: {
  name: string;
  voice_description: string;
  tone: string;
  target_audience: string;
  keywords: string[];
}) {
  return request('/brands/', {
    method: 'POST',
    body: JSON.stringify(brandData),
  });
}

export async function deleteBrand(brandId: number) {
  return request(`/brands/${brandId}`, {
    method: 'DELETE',
  });
}

export async function getContent(params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return request(`/content/${query}`);
}

export async function generateContent(
  platform: string,
  topic: string,
  brandId: number,
  tone?: string,
  variations?: number
) {
  return request('/agents/content/generate', {
    method: 'POST',
    body: JSON.stringify({
      platform,
      topic,
      brand_profile_id: brandId,
      tone_override: tone || null,
      num_variations: variations ?? 3,
    }),
  });
}

export async function scheduleContent(contentId: number, timezone?: string) {
  return request(`/agents/content/${contentId}/schedule`, {
    method: 'POST',
    body: JSON.stringify({
      user_timezone: timezone || 'UTC',
    }),
  });
}

export async function getAnalytics(brandId: number, dateRange?: string) {
  return request('/agents/analytics/generate', {
    method: 'POST',
    body: JSON.stringify({
      brand_profile_id: brandId,
      date_range: dateRange || '7d',
    }),
  });
}

export async function getAgentRuns(params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return request(`/agents/runs${query}`);
}

export async function getPublicMetrics() {
  const res = await fetch(`${API_URL}/public/metrics`);
  if (!res.ok) {
    throw new Error('Failed to fetch public metrics');
  }
  return res.json();
}

export async function getTaskStatus(taskId: string) {
  return request(`/agents/task/${taskId}`);
}

export async function getSavings(brandId: number) {
  return request(`/analytics/savings?brand_profile_id=${brandId}`);
}
