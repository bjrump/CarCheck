"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Check, CircleAlert, Info, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";

type ToastType = "success" | "error" | "warning" | "info";
type Toast = { id: string; message: string; type: ToastType };
type ToastApi = Record<ToastType, (message: string) => void>;
const ToastContext = createContext<ToastApi | null>(null);

export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error("ToastProvider fehlt");
  return toast;
}

function ToastItem({
  toast,
  remove,
}: {
  toast: Toast;
  remove: (id: string) => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(
      () => remove(toast.id),
      toast.type === "error" ? 7000 : 4000,
    );
    return () => window.clearTimeout(timer);
  }, [remove, toast.id, toast.type]);
  const Icon =
    toast.type === "success"
      ? Check
      : toast.type === "info"
        ? Info
        : CircleAlert;
  return (
    <div
      className="toast-item"
      role={toast.type === "error" ? "alert" : "status"}
    >
      <Icon
        size={16}
        className={
          toast.type === "error"
            ? "text-overdue"
            : toast.type === "success"
              ? "text-current"
              : "text-muted-foreground"
        }
      />
      <p className="flex-1">{toast.message}</p>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Meldung schließen"
        onClick={() => remove(toast.id)}
      >
        <X />
      </Button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = useCallback((message: string, type: ToastType) => {
    setToasts((current) => [
      ...current.slice(-2),
      { id: crypto.randomUUID(), message, type },
    ]);
  }, []);
  const remove = useCallback(
    (id: string) =>
      setToasts((current) => current.filter((toast) => toast.id !== id)),
    [],
  );
  const api = useMemo(
    () => ({
      success: (message: string) => add(message, "success"),
      error: (message: string) => add(message, "error"),
      warning: (message: string) => add(message, "warning"),
      info: (message: string) => add(message, "info"),
    }),
    [add],
  );
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} remove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
