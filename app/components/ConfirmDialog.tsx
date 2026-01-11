"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

type ConfirmVariant = "danger" | "warning" | "info";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

interface ConfirmDialogContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | undefined>(undefined);

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error("useConfirmDialog must be used within a ConfirmDialogProvider");
  }
  return context;
}

const variantStyles: Record<ConfirmVariant, { button: string; icon: string; iconBg: string }> = {
  danger: {
    button: "bg-danger text-danger-foreground hover:bg-danger/90 shadow-lg shadow-danger/25",
    icon: "text-danger",
    iconBg: "bg-danger/10",
  },
  warning: {
    button: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-lg shadow-warning/25",
    icon: "text-warning",
    iconBg: "bg-warning/10",
  },
  info: {
    button: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/25",
    icon: "text-accent",
    iconBg: "bg-accent/10",
  },
};

const variantIcons: Record<ConfirmVariant, ReactNode> = {
  danger: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  ),
  warning: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  info: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
  ),
};

interface DialogState {
  isOpen: boolean;
  options: ConfirmOptions | null;
  resolve: ((value: boolean) => void) | null;
}

function ConfirmDialogModal({ 
  options, 
  onConfirm, 
  onCancel 
}: { 
  options: ConfirmOptions; 
  onConfirm: () => void; 
  onCancel: () => void;
}) {
  const variant = options.variant || "info";
  const styles = variantStyles[variant];

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onCancel]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />
      
      <div className="relative glass p-6 max-w-md w-full animate-scale-in space-y-4">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${styles.iconBg} flex items-center justify-center ${styles.icon}`}>
            {variantIcons[variant]}
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="confirm-dialog-title" className="text-lg font-semibold text-foreground">
              {options.title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {options.message}
            </p>
          </div>
        </div>
        
        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onCancel}
            className="btn btn-secondary"
          >
            {options.cancelText || "Abbrechen"}
          </button>
          <button
            onClick={onConfirm}
            className={`btn ${styles.button}`}
          >
            {options.confirmText || "Bestätigen"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    options: null,
    resolve: null,
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    dialog.resolve?.(true);
    setDialog({ isOpen: false, options: null, resolve: null });
  }, [dialog.resolve]);

  const handleCancel = useCallback(() => {
    dialog.resolve?.(false);
    setDialog({ isOpen: false, options: null, resolve: null });
  }, [dialog.resolve]);

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      {dialog.isOpen && dialog.options && (
        <ConfirmDialogModal 
          options={dialog.options} 
          onConfirm={handleConfirm} 
          onCancel={handleCancel} 
        />
      )}
    </ConfirmDialogContext.Provider>
  );
}
