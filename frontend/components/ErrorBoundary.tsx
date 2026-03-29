"use client";

import React, { Component, type ReactNode } from "react";
import { trackEvent } from "@/components/GoogleAnalytics";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // GA'ya hata gönder
    trackEvent("exception", {
      description: `${error.name}: ${error.message}`,
      fatal: false,
    });

    // Console'a detaylı log
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">😔</div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Bir Hata Oluştu
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Üzgünüz, beklenmedik bir hata meydana geldi. Lütfen sayfayı yenileyin.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-500 transition-colors"
            >
              🔄 Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
