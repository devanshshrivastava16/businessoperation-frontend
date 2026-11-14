import { Link } from 'react-router-dom'
import { SearchX } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
      <SearchX className="h-12 w-12 text-shade-30" aria-hidden />
      <h1 className="text-5xl font-semibold tracking-tight display-thin">404</h1>
      <p className="text-shade-50">This page does not exist in the operations console.</p>
      <Link
        to="/dashboard"
        className="rounded-full bg-ink px-6 py-2.5 text-[15px] font-medium text-white hover:bg-shade-70"
      >
        Back to dashboard
      </Link>
    </div>
  )
}
