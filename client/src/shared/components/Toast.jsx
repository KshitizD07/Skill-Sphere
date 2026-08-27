import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

// Individual toast item
function ToastItem({ toast, onRemove }) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef(null);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  }, [toast.id, onRemove]);

  useEffect(() => {
    timerRef.current = setTimeout(dismiss, toast.duration ?? 3500);
    return () => clearTimeout(timerRef.current);
  }, [dismiss, toast.duration]);

  const configs = {
    success: { icon: <CheckCircle size={18} />,   classes: "bg-surface border-l-4 border-l-secondary-bright text-secondary-bright" },
    error:   { icon: <XCircle size={18} />,       classes: "bg-surface border-l-4 border-l-error text-error" },
    warning: { icon: <AlertTriangle size={18} />, classes: "bg-surface border-l-4 border-l-[#f59e0b] text-[#f59e0b]" },
    info:    { icon: <Info size={18} />,           classes: "bg-surface border-l-4 border-l-primary text-primary" },
  };
  const cfg = configs[toast.type] ?? configs.info;

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        transform: exiting ? "translateX(110%)" : "translateX(0)",
        opacity: exiting ? 0 : 1,
        transition: "transform 0.3s ease, opacity 0.3s ease",
      }}
      className={`flex items-start gap-3 px-4 py-3 rounded-sm shadow-2xl border border-outline-var/20 min-w-[260px] max-w-sm pointer-events-auto ${cfg.classes}`}
    >
      <span className="mt-0.5 shrink-0">{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="font-syne font-bold text-xs uppercase tracking-wide text-text-primary mb-0.5">{toast.title}</p>
        )}
        <p className="text-xs font-outfit leading-snug text-text-muted">{toast.message}</p>
      </div>
      <button onClick={dismiss} className="shrink-0 mt-0.5 text-outline hover:text-text-primary transition-colors" aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}

// Toast container rendered into a portal
export function ToastContainer({ toasts, removeToast }) {
  if (!toasts.length) return null;
  return createPortal(
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none" aria-label="Notifications">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={removeToast} />
      ))}
    </div>,
    document.body
  );
}

// useToast hook — no Provider needed, works in any component
let _counter = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((type, message, options = {}) => {
    const id = ++_counter;
    setToasts((prev) => [...prev, { id, type, message, ...options }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((msg, opts) => toast("success", msg, opts), [toast]);
  const error   = useCallback((msg, opts) => toast("error",   msg, opts), [toast]);
  const warning = useCallback((msg, opts) => toast("warning", msg, opts), [toast]);
  const info    = useCallback((msg, opts) => toast("info",    msg, opts), [toast]);

  return useMemo(() => ({
    toasts,
    removeToast,
    success,
    error,
    warning,
    info,
  }), [toasts, removeToast, success, error, warning, info]);
}
