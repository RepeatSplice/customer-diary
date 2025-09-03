"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "./use-toast";

function cn(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

export type ToasterProps = {
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  gap?: number;
  closeOnAction?: boolean;
};

export default function Toaster({
  position = "top-right",
  gap = 10,
  closeOnAction = true,
}: ToasterProps) {
  const { toasts, dismiss } = useToast();

  const posClass =
    position === "top-right"
      ? "top-4 right-4 items-end"
      : position === "top-left"
      ? "top-4 left-4 items-start"
      : position === "bottom-right"
      ? "bottom-4 right-4 items-end"
      : "bottom-4 left-4 items-start";

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={cn("fixed z-[9999] flex flex-col p-2", posClass)}
      style={{ gap }}
    >
      <AnimatePresence initial={false}>
        {toasts
          .filter((t) => !t.dismissed)
          .map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 32,
                opacity: { duration: 0.15 },
              }}
              role={t.variant === "destructive" ? "alert" : "status"}
              className={cn(
                "pointer-events-auto w-[360px] max-w-[90vw] rounded-xl border shadow-md backdrop-blur bg-white relative",
                t.variant === "destructive" && "border-red-300/60 bg-red-50"
              )}
            >
              <div className="flex gap-3 p-3 items-center">
                <div className="flex-shrink-0">
                  {t.variant === "destructive" ? (
                    <AlertTriangle
                      className="h-5 w-5 text-red-600"
                      aria-hidden
                    />
                  ) : (
                    <CheckCircle2
                      className="h-5 w-5 text-emerald-600"
                      aria-hidden
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1 text-center">
                  {t.title && (
                    <div className="font-medium text-left">{t.title}</div>
                  )}
                  {t.description && (
                    <div className="text-sm text-muted-foreground">
                      {t.description}
                    </div>
                  )}

                  {t.action && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          t.action?.onClick?.();
                          if (closeOnAction) dismiss(t.id);
                        }}
                        className={cn(
                          "inline-flex h-8 items-center rounded-md border px-3 text-sm",
                          t.variant === "destructive"
                            ? "border-red-300 text-red-700 hover:bg-red-100/60"
                            : "border-gray-300 text-gray-700 hover:bg-gray-100"
                        )}
                      >
                        {t.action.label}
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  aria-label="Close"
                  className={cn(
                    "rounded-md p-2 hover:bg-black/5 pointer-events-auto relative z-20 cursor-pointer select-none min-w-[32px] min-h-[32px] flex items-center justify-center border border-transparent hover:border-gray-300",
                    t.variant === "destructive" &&
                      "hover:bg-red-100/60 hover:border-red-300"
                  )}
                  style={{
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
                  }}
                  onClick={(e) => {
                    console.log("Close button clicked", t.id); // Debug log
                    e.preventDefault();
                    e.stopPropagation();
                    dismiss(t.id);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent focus issues
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation(); // Prevent touch event issues
                  }}
                >
                  <X className="h-4 w-4 pointer-events-none" />
                </button>
              </div>
            </motion.div>
          ))}
      </AnimatePresence>
    </div>
  );
}
