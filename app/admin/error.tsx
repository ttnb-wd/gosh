'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { CircleAlert } from 'lucide-react'

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
    <div className="min-h-screen flex items-center justify-center bg-canvas p-6 text-ink">
      <div className="max-w-md w-full bg-surface border border-line shadow-soft rounded-xl p-8">
        <div className="text-center">
          <CircleAlert className="mx-auto mb-5 h-6 w-6 text-destructive" aria-hidden="true" />
          <p className="studio-eyebrow justify-center mb-3">GOSH · Studio administration</p>
          <h2 className="studio-display text-ink mb-4">
            A moment of interruption
          </h2>
          <p className="text-secondary mb-2">
            An error occurred in the admin panel.
          </p>
          <p className="text-sm text-muted mb-6">Please try again. If this continues, contact your studio administrator.</p>
          <button
            onClick={reset}
            className="studio-compact-button studio-compact-button--primary w-full"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  )
}
