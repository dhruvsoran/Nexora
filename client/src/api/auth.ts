import { api } from './client';
import { User } from './types';

interface AuthResponse {
  user: User;
  accessToken: string;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<{ data: AuthResponse }>('/auth/login', { email, password });
  return data.data;
}

export async function register(name: string, email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<{ data: AuthResponse }>('/auth/register', { name, email, password });
  return data.data;
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<{ data: { user: User } }>('/auth/me');
  return data.data.user;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function updateProfile(input: { name?: string; title?: string; bio?: string; avatar?: string }): Promise<User> {
  const { data } = await api.patch<{ data: { user: User } }>('/auth/me', input);
  return data.data.user;
}