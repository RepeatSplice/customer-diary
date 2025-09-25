"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RefreshButton({ className }: { className?: string }) {
  return (
    <Button
      onClick={() => window.location.reload()}
      variant="outline"
      size="lg"
      className={cn(
        "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:scale-105 transition-all duration-300 shadow-sm",
        className
      )}
    >
      <RefreshCw className="h-4 w-4 mr-2" />
      Refresh
    </Button>
  );
}
