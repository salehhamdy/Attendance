import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Confetti } from './Confetti.jsx';

const ToastContext = createContext({
  showToast: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
  celebrate: () => {},
  triggerConfetti: () => {},
});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confettiActive, setConfettiActive] = useState(false);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const triggerConfetti = useCallback((duration = 3500) => {
    setConfettiActive(true);
    setTimeout(() => setConfettiActive(false), duration);
  }, []);

  const showToast = useCallback(
    (message, type = 'info', options = {}) => {
      const id = Date.now() + Math.random().toString(36).slice(2, 7);
      const newToast = {
        id,
        message,
        type, // 'info' | 'success' | 'error' | 'celebrate'
        title: options.title || '',
      };

      setToasts((prev) => [...prev, newToast]);

      if (type === 'celebrate') {
        triggerConfetti(options.confettiDuration || 3500);
      }

      const duration = options.duration || 4000;
      setTimeout(() => {
        removeToast(id);
      }, duration);

      return id;
    },
    [removeToast, triggerConfetti]
  );

  const success = useCallback((msg, opts) => showToast(msg, 'success', opts), [showToast]);
  const error = useCallback((msg, opts) => showToast(msg, 'error', opts), [showToast]);
  const info = useCallback((msg, opts) => showToast(msg, 'info', opts), [showToast]);
  const celebrate = useCallback((msg, opts) => showToast(msg, 'celebrate', opts), [showToast]);

  const value = useMemo(
    () => ({
      showToast,
      success,
      error,
      info,
      celebrate,
      triggerConfetti,
      toasts,
      removeToast,
    }),
    [showToast, success, error, info, celebrate, triggerConfetti, toasts, removeToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Confetti active={confettiActive} onComplete={() => setConfettiActive(false)} />
      {toasts.length > 0 && (
        <div className="toast-container" aria-live="polite" data-testid="toast-container">
          {toasts.map((t) => {
            const icon =
              t.type === 'celebrate'
                ? '🎉'
                : t.type === 'success'
                  ? '✅'
                  : t.type === 'error'
                    ? '⚠️'
                    : 'ℹ️';
            return (
              <div
                key={t.id}
                role={t.type === 'error' ? 'alert' : 'status'}
                className={`toast-item toast-${t.type}`}
                onClick={() => removeToast(t.id)}
              >
                <span className="toast-icon">{icon}</span>
                <div className="toast-content">
                  {t.title && <strong className="toast-title">{t.title}</strong>}
                  <span className="toast-message">{t.message}</span>
                </div>
                <button
                  type="button"
                  className="toast-close"
                  aria-label="Close notification"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeToast(t.id);
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  return (
    ctx || {
      showToast: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
      celebrate: () => {},
      triggerConfetti: () => {},
    }
  );
}

export default ToastProvider;
