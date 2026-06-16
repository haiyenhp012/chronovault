import { createContext, useContext, useState, useCallback } from "react";

const ToastCtx = createContext(null);

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((toast) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, ...toast }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, toast.duration ?? 6000);
  }, []);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const api = {
    success: (title, body) => push({ kind: "success", title, body }),
    error: (title, body) => push({ kind: "error", title, body }),
    info: (title, body) => push({ kind: "info", title, body }),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex w-full max-w-sm flex-col gap-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => remove(t.id)}
            className={`pointer-events-auto cursor-pointer rounded-xl border p-4 shadow-glow backdrop-blur-md transition-all animate-fade-up ${
              t.kind === "success"
                ? "border-emerald-400/30 bg-emerald-500/10"
                : t.kind === "error"
                ? "border-rose-400/30 bg-rose-500/10"
                : "border-chrono-400/30 bg-chrono-500/10"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full text-xs font-bold ${
                  t.kind === "success"
                    ? "bg-emerald-400 text-emerald-950"
                    : t.kind === "error"
                    ? "bg-rose-400 text-rose-950"
                    : "bg-chrono-400 text-ink-950"
                }`}
              >
                {t.kind === "success" ? "✓" : t.kind === "error" ? "!" : "i"}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{t.title}</p>
                {t.body && (
                  <p className="mt-0.5 break-words text-xs text-slate-300">{t.body}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
