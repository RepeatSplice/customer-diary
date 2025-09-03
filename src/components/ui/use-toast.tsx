"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type ToastVariant = "default" | "destructive";

export type ToastOptions = {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number; // ms, default 10000 (10 seconds)
  id?: string; // optional custom id
  action?: { label: string; onClick: () => void };
};

export type ToastItem = Required<Pick<ToastOptions, "id">> &
  Omit<ToastOptions, "id"> & {
    createdAt: number;
    dismissed?: boolean;
  };

type ToastAPI = {
  toasts: ToastItem[];
  add: (opts: ToastOptions) => string;
  dismiss: (id?: string) => void; // dismiss one or all if id omitted
  remove: (id: string) => void; // hard-remove (after exit animation)
  clear: () => void;
};

const ToastContext = createContext<ToastAPI | null>(null);

// --------- global delegate so `toast(...)` works without the hook ----------
let _apiRef: ToastAPI | null = null;
function setToastApi(api: ToastAPI | null) {
  _apiRef = api;
}

/** Global toast function (works anywhere on the client as long as the provider is mounted) */
export function toast(opts: ToastOptions): string {
  if (!_apiRef) {
    // Provider not mounted yet; do nothing but keep types clean
    return "";
  }
  return _apiRef.add(opts);
}

export function useToast() {
  const api = useContext(ToastContext);
  if (!api) {
    // Fallback: provider not mounted
    return {
      toast: (opts: ToastOptions) => {
        void opts;
        return "";
      },
      dismiss: (id?: string) => {
        void id;
      },
      remove: (id: string) => {
        void id;
      },
      clear: () => {
        /* no-op */
      },
      toasts: [] as ToastItem[],
    };
  }
  return {
    toast: api.add,
    dismiss: api.dismiss,
    remove: api.remove,
    clear: api.clear,
    toasts: api.toasts,
  };
}

/** Provider that stores and manages the toast queue */
export function ToastProvider({
  children,
  max = 6,
}: {
  children: React.ReactNode;
  max?: number;
}) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, number>()); // setTimeout ids (browser)

  // start auto-dismiss timers
  useEffect(() => {
    const map = timers.current; // snapshot the ref value

    for (const t of toasts) {
      if (t.dismissed) continue;
      if (map.has(t.id)) continue;

      const duration = t.duration ?? 2500;
      const timer = window.setTimeout(() => {
        setToasts((prev) =>
          prev.map((x) => (x.id === t.id ? { ...x, dismissed: true } : x))
        );
      }, duration);

      map.set(t.id, timer);
    }

    return () => {
      map.forEach((tid) => window.clearTimeout(tid));
      map.clear();
    };
  }, [toasts]);

  const api = useMemo<ToastAPI>(() => {
    const add: ToastAPI["add"] = (opts) => {
      const id = opts.id ?? crypto.randomUUID();
      setToasts((prev) => {
        const defaultDuration =
          opts.duration ?? (opts.variant === "destructive" ? 5000 : 2500);
        // Cap excessive durations so toasts clear in a timely manner
        const computedDuration = Math.min(defaultDuration, 6000);
        const next: ToastItem = {
          id,
          title: opts.title,
          description: opts.description,
          variant: opts.variant ?? "default",
          duration: computedDuration,
          action: opts.action,
          createdAt: Date.now(),
        };
        const merged = [next, ...prev.filter((p) => p.id !== id)];
        return merged.slice(0, max);
      });
      return id;
    };

    const dismiss: ToastAPI["dismiss"] = (id) => {
      // remove one or all
      setToasts((prev) => (id ? prev.filter((t) => t.id !== id) : []));
      if (id) {
        const timer = timers.current.get(id);
        if (timer) {
          window.clearTimeout(timer);
          timers.current.delete(id);
        }
      } else {
        timers.current.forEach((tid) => window.clearTimeout(tid));
        timers.current.clear();
      }
    };

    const remove: ToastAPI["remove"] = (id) => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      const timer = timers.current.get(id);
      if (timer) {
        window.clearTimeout(timer);
        timers.current.delete(id);
      }
    };

    const clear: ToastAPI["clear"] = () => {
      setToasts([]);
      timers.current.forEach((tid) => window.clearTimeout(tid));
      timers.current.clear();
    };

    return { toasts, add, dismiss, remove, clear };
  }, [toasts, max]);

  // expose API to the module-level `toast(...)`
  useEffect(() => {
    setToastApi(api);
    return () => setToastApi(null);
  }, [api]);

  return <ToastContext.Provider value={api}>{children}</ToastContext.Provider>;
}
