"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

import {
  LayoutGrid,
  FilePlus2,
  Users,
  Download,
  Printer,
  Shield,
  Megaphone,
  Stars,
  LogOut,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  // Debug logging
  console.log("Sidebar - Session status:", status);
  console.log("Sidebar - Session data:", session);

  const isManager = session?.user?.role === "manager";
  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  const navPrimary = [
    { href: "/dashboard", icon: LayoutGrid, label: "Dashboard" },
    { href: "/diaries/new", icon: FilePlus2, label: "New Diary" },
    { href: "/customers", icon: Users, label: "Customers" },
    { href: "/exports", icon: Download, label: "Export" },
    { href: "/print-help", icon: Printer, label: "Print" },
  ];

  const navAdmin = [
    // Link to the page we just built:
    {
      href: "/staff/new",
      icon: Shield,
      label: "Staff Admin",
      managerOnly: true,
    },
  ];

  const navSupport = [
    { href: "/feedback", icon: Megaphone, label: "Feature / Bug Report" },
    { href: "/credits", icon: Stars, label: "Credits" },
  ];

  const isActive = (href: string) => pathname?.startsWith(href);

  // Show loading state while session is loading
  if (isLoading) {
    return (
      <aside className="bg-white border-r p-4 flex flex-col gap-2">
        <div className="text-xl font-semibold mb-2">Customer Diary</div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </aside>
    );
  }

  // Show error state if not authenticated
  if (!isAuthenticated) {
    return (
      <aside className="bg-white border-r p-4 flex flex-col gap-2">
        <div className="text-xl font-semibold mb-2">Customer Diary</div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Not authenticated</div>
        </div>
        <div className="text-xs text-muted-foreground">
          Status: {status} | Session: {JSON.stringify(session)}
        </div>
      </aside>
    );
  }

  return (
    <aside className="bg-white border-r p-4 flex flex-col gap-2">
      <div className="text-xl font-semibold mb-2">Customer Diary</div>

      <nav className="flex-1 flex flex-col gap-1">
        {/* Primary */}
        {navPrimary.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition",
              isActive(n.href) && "bg-muted font-medium"
            )}
          >
            <n.icon className="h-4 w-4" />
            <span>{n.label}</span>
          </Link>
        ))}

        {/* Admin (manager only) */}
        {navAdmin.map((n) =>
          !n.managerOnly || isManager ? (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition",
                isActive(n.href) && "bg-muted font-medium"
              )}
            >
              <n.icon className="h-4 w-4" />
              <span>{n.label}</span>
            </Link>
          ) : null
        )}

        {/* Support */}
        {navSupport.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition",
              isActive(n.href) && "bg-muted font-medium"
            )}
          >
            <n.icon className="h-4 w-4" />
            <span>{n.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer: version + logout */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">v1.0</div>
        <button
          onClick={() => signOut({ callbackUrl: "/sign-in" })}
          className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-md hover:bg-muted transition"
          aria-label="Log out"
        >
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </div>
    </aside>
  );
}
