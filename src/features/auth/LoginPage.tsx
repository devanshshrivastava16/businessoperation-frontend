import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowRight, Gem } from 'lucide-react'
import { authApi } from '@/api/authApi'
import { ApiError, enableMocksIfConfigured, toApiError } from '@/api/axiosInstance'
import { useAuthStore } from '@/store/authStore'
import { FormField, Input } from '@/components/ui/primitives'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required').min(8, 'Password must be at least 8 characters'),
})

type LoginValues = z.infer<typeof loginSchema>

const DEMO_ACCOUNTS = 'owner@demo.io · manager@demo.io · warehouse@demo.io · purchasing@demo.io · accountant@demo.io'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setSession = useAuthStore((s) => s.setSession)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: 'owner@demo.io', password: 'demo1234' },
  })

  const onSubmit = async (values: LoginValues) => {
    setSubmitError(null)
    try {
      await enableMocksIfConfigured()
      const session = await authApi.login(values)
      setSession(session)
      toast.success(`Welcome back, ${session.user.name.split(' ')[0]}`)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? '/dashboard', { replace: true })
    } catch (err) {
      const apiErr = toApiError(err)
      if (err instanceof ApiError && err.fieldErrors.length > 0) {
        setSubmitError(err.fieldErrors.map((f) => f.message).join('. '))
      } else {
        setSubmitError(apiErr.message)
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f8f4] text-ink lg:flex-row">
      <section className="flex flex-1 flex-col justify-between bg-[#edf5ee] p-8 sm:p-10 lg:p-16">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d7eddd] text-[#245b3a]">
            <Gem className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-lg font-medium tracking-tight">Luna Ops</span>
        </div>
        <div className="py-12 lg:py-16">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#477057]">Internal Operations Console</p>
          <h1 className="max-w-xl text-4xl font-semibold leading-[1.1] tracking-tight text-[#183425] sm:text-5xl lg:text-7xl">
            Every bracelet, every order, every bin — in one place.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-[#496252]">
            Inventory, fulfillment, purchasing and profit analytics for the Shopify storefront. Shopify stays customer-facing;
            this is where your team runs the business.
          </p>
        </div>
        <p className="text-xs text-[#5c7263]">© 2026 Luna Charms — internal use only</p>
      </section>

      <section className="flex w-full items-center justify-center border-t border-[#e1e9e1] bg-white px-6 py-12 sm:px-10 lg:w-[480px] lg:border-l lg:border-t-0">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold text-[#183425]">Sign in</h2>
          <p className="mt-1 text-sm text-[#5c6e60]">Use your operations account credentials.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
            <FormField label="Email" htmlFor="email" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                invalid={Boolean(errors.email)}
                className="border-[#cbd8cc] bg-white text-[#183425] placeholder:text-[#77877a] focus:border-[#2f7048] focus:ring-2 focus:ring-[#2f7048]/20"
                {...register('email')}
              />
            </FormField>
            <FormField label="Password" htmlFor="password" error={errors.password?.message}>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                invalid={Boolean(errors.password)}
                className="border-[#cbd8cc] bg-white text-[#183425] placeholder:text-[#77877a] focus:border-[#2f7048] focus:ring-2 focus:ring-[#2f7048]/20"
                {...register('password')}
              />
            </FormField>

            {submitError && (
              <p className="rounded-lg bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]" role="alert">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full bg-[#245b3a] px-6 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#19462b] focus-visible:outline-[#245b3a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
              {!isSubmitting && <ArrowRight className="h-4 w-4" aria-hidden />}
            </button>
          </form>

          <p className="mt-8 rounded-lg border border-[#dfe8df] bg-[#f7faf6] p-4 text-center text-xs leading-relaxed text-[#526557]">
            Demo accounts (any password with 8+ characters):
            <br />
            <span className="mt-1 inline-block break-words font-medium text-[#304936]">{DEMO_ACCOUNTS}</span>
          </p>
        </div>
      </section>
    </div>
  )
}
