'use client'

import React, { Component, ReactNode } from 'react'
import * as Sentry from '@sentry/nextjs'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="p-4 bg-destructive-soft border border-destructive rounded-lg">
          <h3 className="text-destructive font-semibold mb-2">
            Something went wrong
          </h3>
          <p className="text-destructive text-sm">
            Please try refreshing the page or contact support if the problem persists.
          </p>
        </div>
      )
    }

    return this.props.children
  }
}
