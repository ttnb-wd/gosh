'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Admin Error
          </h2>
          <p className="text-gray-600 mb-2">
            An error occurred in the admin panel.
          </p>
          {error.message && (
            <p className="text-sm text-gray-500 mb-6 font-mono bg-gray-50 p-3 rounded">
              {error.message}
            </p>
          )}
          <button
            onClick={reset}
            className="bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800 transition-colors w-full"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  )
}
