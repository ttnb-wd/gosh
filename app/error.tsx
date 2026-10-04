'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function Error({
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
      <div className="max-w-md w-full bg-surface border border-line shadow-soft rounded-xl p-8 text-center">
        <p className="studio-eyebrow justify-center mb-3">GOSH · Perfume Studio</p>
        <h2 className="studio-display text-ink mb-4">
          A moment of interruption
        </h2>
        <p className="text-secondary mb-6">
          The studio couldn’t load this page. Please try again.
        </p>
        <button
          onClick={reset}
          className="studio-compact-button studio-compact-button--primary"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
