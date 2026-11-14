import type { AuthResponse, RegisterResponse, User } from '@/types/api'
import { get, post } from './helpers'

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export const authApi = {
  login: (body: LoginRequest) => post<LoginRequest, AuthResponse>('/auth/login', body),
  register: (body: RegisterRequest) => post<RegisterRequest, RegisterResponse>('/auth/register', body),
  refresh: (refreshToken: string) =>
    post<{ refreshToken: string }, { accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken }),
  logout: () => post<void, void>('/auth/logout'),
  me: () => get<User>('/auth/me'),
}
