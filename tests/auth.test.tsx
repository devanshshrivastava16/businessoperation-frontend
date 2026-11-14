import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/routes/guards'
import { useAuthStore } from '@/store/authStore'
import { enableMocksIfConfigured } from '@/api/axiosInstance'
import { authApi } from '@/api/authApi'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

describe('protected routes', () => {
  it('redirects unauthenticated users to /login', () => {
    useAuthStore.setState({ accessToken: null, user: null, status: 'unauthenticated' })
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>login-page-marker</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>dashboard-marker</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.queryByText('dashboard-marker')).not.toBeInTheDocument()
    expect(screen.getByText('login-page-marker')).toBeInTheDocument()
  })

  it('renders protected content for authenticated users', () => {
    useAuthStore.setState({
      accessToken: 'test-token',
      user: { id: 'u1', name: 'Test', email: 't@t.io', role: 'OWNER' },
      status: 'authenticated',
    })
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>login-page-marker</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>dashboard-marker</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('dashboard-marker')).toBeInTheDocument()
  })
})

describe('login form validation', () => {
  const schema = z.object({
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    password: z.string().min(1, 'Password is required').min(8, 'Password must be at least 8 characters'),
  })

  function TestForm() {
    const {
      register,
      handleSubmit,
      formState: { errors },
    } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })
    return (
      <form onSubmit={handleSubmit(() => undefined)}>
        <input aria-label="Email" {...register('email')} />
        <p>{errors.email?.message}</p>
        <input aria-label="Password" type="password" {...register('password')} />
        <p>{errors.password?.message}</p>
        <button type="submit">Submit</button>
      </form>
    )
  }

  it('shows field-level validation errors for empty and invalid input', async () => {
    const user = userEvent.setup()
    render(<TestForm />)
    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.type(screen.getByLabelText('Password'), 'short')
    await user.click(screen.getByRole('button', { name: 'Submit' }))
    await waitFor(() => {
      expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
    })
  })
})

describe('mock API: auth flow', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null, status: 'idle' })
  })

  it('logs in a seeded demo user and rejects unknown users', async () => {
    await enableMocksIfConfigured()

    const session = await authApi.login({ email: 'owner@demo.io', password: 'whatever123' })
    expect(session.accessToken).toContain('mock-access')
    expect(session.user.role).toBe('OWNER')

    await expect(authApi.login({ email: 'nobody@nowhere.io', password: 'whatever123' })).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    })
  }, 15_000)
})
