import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { router } from '@/routes/router'
import '@/index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found')

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          borderRadius: '9999px',
          background: '#000000',
          color: '#ffffff',
          fontSize: '14px',
        },
        success: { iconTheme: { primary: '#c1fbd4', secondary: '#000000' } },
        error: { iconTheme: { primary: '#fee2e2', secondary: '#000000' } },
      }}
    />
  </StrictMode>,
)
