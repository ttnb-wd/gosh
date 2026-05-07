'use client'

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
    console.error(`Error in ${this.props.context || 'component'}:`, error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-semibold mb-2">
            Something went wrong
          </h3>
          <p className="text-red-600 text-sm">
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
    console.error(`Page error in ${this.props.context || 'page'}:`, error, errorInfo)
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
        <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-50 flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-3xl border-2 border-yellow-200 shadow-2xl p-8 text-center">
              {/* Icon */}
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-red-500 shadow-lg">
                <AlertTriangle className="h-10 w-10 text-white" />
              </div>

              {/* Title */}
              <h1 className="mb-3 text-2xl font-black text-black">
                Oops! Something Went Wrong
              </h1>

              {/* Divider */}
              <div className="mx-auto mb-4 flex items-center justify-center gap-2">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-yellow-400" />
                <div className="h-1.5 w-1.5 rotate-45 bg-yellow-400" />
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-yellow-400" />
              </div>

              {/* Message */}
              <p className="mb-6 text-sm text-zinc-600 leading-relaxed">
                We encountered an unexpected error. Our team has been notified and we&apos;re working to fix it.
              </p>

              {/* Error details (only in development) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 p-4 text-left">
                  <p className="text-xs font-mono text-red-800 break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex items-center justify-center gap-2 w-full rounded-full bg-yellow-400 px-6 py-3 text-sm font-black text-black shadow-lg hover:bg-yellow-300 transition"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh Page
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center gap-2 w-full rounded-full border-2 border-yellow-400 bg-white px-6 py-3 text-sm font-black text-black hover:bg-yellow-50 transition"
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
    console.error(`Component error in ${this.props.context || 'component'}:`, error, errorInfo)
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
        <div className="rounded-2xl border-2 border-yellow-200 bg-yellow-50 p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400">
            <AlertTriangle className="h-6 w-6 text-black" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-black">
            Component Error
          </h3>
          <p className="mb-4 text-sm text-zinc-600">
            This section couldn&apos;t load properly.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <p className="mb-4 text-xs font-mono text-red-600 break-all">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleRetry}
            className="rounded-full bg-yellow-400 px-6 py-2 text-sm font-bold text-black hover:bg-yellow-300 transition"
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
    console.error(`Form error in ${this.props.context || 'form'}:`, error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">
            ⚠️ Form Error
          </p>
          <p className="mt-1 text-xs text-red-600">
            Unable to load this form. Please refresh the page.
          </p>
        </div>
      )
    }

    return this.props.children
  }
}
