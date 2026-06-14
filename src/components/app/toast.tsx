'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
}

interface ToastInput {
  tone?: ToastTone;
  title: string;
  message?: string;
}

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((input: ToastInput) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const toast: Toast = {
      id,
      tone: input.tone ?? 'info',
      title: input.title,
      message: input.message,
    };
    setToasts((current) => [...current, toast].slice(-4));
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => pushToast, [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Sits above the floating assistant button (bottom-6, h-14) so toasts
          and the FAB never overlap. */}
      <div className="fixed bottom-24 right-4 z-[80] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const pushToast = useContext(ToastContext);
  if (!pushToast) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return pushToast;
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const toneClass = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    error: 'border-red-200 bg-red-50 text-red-950',
    info: 'border-brand-line bg-white text-brand-black',
  }[toast.tone];

  const dotClass = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-brand-navy',
  }[toast.tone];

  return (
    <div className={`rounded-lg border p-3 shadow-[0_16px_40px_rgba(3,5,4,0.16)] ${toneClass}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{toast.title}</p>
          {toast.message && <p className="mt-1 text-xs leading-5 opacity-75">{toast.message}</p>}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded px-1 text-xs font-semibold opacity-60 hover:opacity-100"
          aria-label="Dismiss notification"
        >
          x
        </button>
      </div>
    </div>
  );
}
