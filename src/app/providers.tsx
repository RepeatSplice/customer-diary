"use client";

import { useMemo, useState } from "react";
import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/ui/use-toast";
import Toaster from "@/components/ui/toaster";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Reasonable defaults for dashboard-like apps
            staleTime: 60 * 1000,
            gcTime: 24 * 60 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  const persister = useMemo(
    () =>
      createSyncStoragePersister({
        storage:
          typeof window !== "undefined" ? window.localStorage : undefined,
        key: "customer-diary-query-cache",
        throttleTime: 500,
        serialize: (clientState) => JSON.stringify(clientState),
        deserialize: (cachedString) => {
          try {
            return JSON.parse(cachedString);
          } catch {
            return undefined as unknown as string;
          }
        },
      }),
    []
  );

  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 7 * 24 * 60 * 60 * 1000, // persist up to 7 days
          buster: "v1",
        }}
      >
        <ToastProvider>
          {children}
          <Toaster position="top-right" />
        </ToastProvider>
      </PersistQueryClientProvider>
    </SessionProvider>
  );
}
