import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Unexpected application error',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0E0E10] text-white flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-[#17171B] border border-[#C89D3C]/30 rounded-xl p-8 text-center">
            <h1 className="text-xl font-bold text-[#D4AF37] mb-3">
              عاصمة الشبكات | ASEMA NETWORKS
            </h1>
            <p className="text-sm text-neutral-300 mb-6">
              حدث خطأ غير متوقع أثناء معالجة البيانات. يمكنك إعادة تحميل الصفحة للمتابعة.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-[#C89D3C] text-[#0E0E10] font-semibold text-sm rounded-lg hover:bg-[#D4AF37] transition-colors cursor-pointer"
            >
              إعادة التحميل / Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
