"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type DiarySaveButtonProps = {
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  isSaving?: boolean;
  className?: string;
  label?: string;
  labelSaving?: string;
};

export function DiarySaveButton({
  onClick,
  disabled,
  isSaving,
  className,
  label = "Save",
  labelSaving = "Saving…",
}: DiarySaveButtonProps) {
  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const ripple = document.createElement("span");
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.position = "absolute";
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.borderRadius = "9999px";
    ripple.style.pointerEvents = "none";
    ripple.style.background = "rgba(255,255,255,0.35)";
    ripple.style.transform = "scale(0)";
    ripple.style.opacity = "0.9";
    ripple.style.transition =
      "transform 450ms ease-out, opacity 700ms ease-out";
    btn.appendChild(ripple);
    requestAnimationFrame(() => {
      ripple.style.transform = "scale(2.5)";
      ripple.style.opacity = "0";
    });
    window.setTimeout(() => ripple.remove(), 750);
  };

  return (
    <Button
      onClick={onClick}
      onMouseDown={handleMouseDown}
      disabled={disabled || isSaving}
      className={cn(
        // Consistent emerald theme across diary pages
        "relative overflow-hidden rounded-full border h-9 px-3 transition-colors",
        isSaving
          ? "bg-emerald-50 border-emerald-300 text-emerald-700"
          : "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400",
        "active:scale-[0.98] focus-visible:ring-emerald-500/40",
        className
      )}
    >
      {isSaving ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {labelSaving}
        </>
      ) : (
        label
      )}
    </Button>
  );
}
