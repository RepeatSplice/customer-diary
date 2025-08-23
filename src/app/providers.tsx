"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/ui/use-toast";
import Toaster from "@/components/ui/toaster";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <ToastProvider>
        {children}
        <Toaster position="top-right" />
      </ToastProvider>
    </SessionProvider>
  );
}
