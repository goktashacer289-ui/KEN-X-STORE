import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Beklenmeyen bir hata oluştu.'
    };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] w-full kenix-navy-canvas text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-3xl bg-[#05102b]/95 border border-blue-500/40 kenix-neon-frame-inner p-7 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-rose-300" />
            </div>
            <h1 className="text-lg font-extrabold text-white">Bağlantı veya İşlem Hatası</h1>
            <p className="text-xs sm:text-sm text-slate-300 break-words">
              Uygulama verileri işlenirken bir hata meydana geldi. Verileriniz korunmaktadır.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold inline-flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Sayfayı Yenile</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
