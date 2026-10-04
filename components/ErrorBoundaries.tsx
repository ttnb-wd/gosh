'use client'
import devLog from "@/lib/dev-log";

import React, { Component, ReactNode } from 'react'
import * as Sentry from '@sentry/nextjs'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  context?: string
}

interface State {
  hasError: boolean
  error?: Error
}

// Base Error Boundary
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
      tags: {
        errorBoundary: this.props.context || 'unknown',
      },
    })
    devLog.error(`Error in ${this.props.context || 'component'}:`, error, errorInfo)
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

// Page-level Error Boundary with full-page fallback
export class PageErrorBoundary extends Component<Props, State> {
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
      tags: {
        errorBoundary: 'page',
        page: this.props.context || 'unknown',
      },
    })
    devLog.error(`Page error in ${this.props.context || 'page'}:`, error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full">
            <div className="bg-surface rounded-xl border-2 border-line shadow-soft p-8 text-center">
              {/* Icon */}
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-destructive to-destructive shadow-soft">
                <AlertTriangle className="h-10 w-10 text-on-brand" />
              </div>

              {/* Title */}
              <h1 className="mb-3 text-2xl font-semibold text-ink">
                Oops! Something Went Wrong
              </h1>

              {/* Divider */}
              <div className="mx-auto mb-4 flex items-center justify-center gap-2">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-accent" />
                <div className="h-1.5 w-1.5 rotate-45 bg-brand" />
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-accent" />
              </div>

              {/* Message */}
              <p className="mb-6 text-sm text-secondary leading-relaxed">
                We encountered an unexpected error. Our team has been notified and we&apos;re working to fix it.
              </p>

              {/* Error details (only in development) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 rounded-xl bg-destructive-soft border border-destructive p-4 text-left">
                  <p className="text-xs font-mono text-destructive break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex items-center justify-center gap-2 w-full rounded-full bg-brand px-6 py-3 text-sm font-semibold text-on-brand shadow-soft hover:bg-brand transition"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh Page
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center gap-2 w-full rounded-full border-2 border-line bg-surface px-6 py-3 text-sm font-semibold text-ink hover:bg-accent-soft transition"
                >
                  <Home className="h-4 w-4" />
                  Go to Homepage
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Component-level Error Boundary with inline fallback
export class ComponentErrorBoundary extends Component<Props, State> {
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
      tags: {
        errorBoundary: 'component',
        component: this.props.context || 'unknown',
      },
    })
    devLog.error(`Component error in ${this.props.context || 'component'}:`, error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="rounded-xl border-2 border-line bg-accent-soft p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand">
            <AlertTriangle className="h-6 w-6 text-ink" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-ink">
            Component Error
          </h3>
          <p className="mb-4 text-sm text-secondary">
            This section couldn&apos;t load properly.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <p className="mb-4 text-xs font-mono text-destructive break-all">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleRetry}
            className="rounded-full bg-brand px-6 py-2 text-sm font-bold text-on-brand hover:bg-brand transition"
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// Form Error Boundary with minimal fallback
export class FormErrorBoundary extends Component<Props, State> {
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
      tags: {
        errorBoundary: 'form',
        form: this.props.context || 'unknown',
      },
    })
    devLog.error(`Form error in ${this.props.context || 'form'}:`, error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="rounded-xl border border-destructive bg-destructive-soft p-4">
          <p className="text-sm font-semibold text-destructive">
            ⚠️ Form Error
          </p>
          <p className="mt-1 text-xs text-destructive">
            Unable to load this form. Please refresh the page.
          </p>
        </div>
      )
    }

    return this.props.children
  }
}
