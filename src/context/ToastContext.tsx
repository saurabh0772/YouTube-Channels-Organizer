import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, Copy } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'copied';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2400);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 inset-x-0 flex flex-col items-center pointer-events-none z-50 space-y-2 px-4">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-lg border text-sm font-medium
              transform transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-3
              ${toast.type === 'copied' ? 'bg-slate-900 text-white border-slate-700 dark:bg-white dark:text-slate-900' : ''}
              ${toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' : ''}
              ${toast.type === 'error' ? 'bg-rose-600 text-white border-rose-500' : ''}
              ${toast.type === 'info' ? 'bg-brand-600 text-white border-brand-500' : ''}
            `}
          >
            {toast.type === 'copied' && <Copy className="w-4 h-4 text-brand-400 dark:text-brand-600 animate-pulse" />}
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-200" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-200" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-blue-200" />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

