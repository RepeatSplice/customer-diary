"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

import {
  LayoutGrid,
  FilePlus2,
  Users,
  Shield,
  Megaphone,
  Stars,
  LogOut,
  Archive,
  User,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [timeUntilLogout, setTimeUntilLogout] = useState(30 * 60); // 30 minutes in seconds

  const isManager = session?.user?.role === "manager";
  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  // Auto logout functionality
  useEffect(() => {
    if (!isAuthenticated) return;

    let inactivityTimer: NodeJS.Timeout;
    let countdownTimer: NodeJS.Timeout;

    const resetTimers = () => {
      clearTimeout(inactivityTimer);
      clearInterval(countdownTimer);

      // Reset countdown
      setTimeUntilLogout(30 * 60);

      // Set inactivity timer (30 minutes)
      inactivityTimer = setTimeout(() => {
        signOut({ callbackUrl: "/sign-in" });
      }, 30 * 60 * 1000);

      // Start countdown timer
      countdownTimer = setInterval(() => {
        setTimeUntilLogout((prev) => {
          if (prev <= 1) {
            signOut({ callbackUrl: "/sign-in" });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    // Reset timers on user activity
    const handleActivity = () => resetTimers();

    // Listen for user activity
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("scroll", handleActivity);

    // Initial timer setup
    resetTimers();

    return () => {
      clearTimeout(inactivityTimer);
      clearInterval(countdownTimer);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("scroll", handleActivity);
    };
  }, [isAuthenticated]);

  const navPrimary = [
    { href: "/dashboard", icon: LayoutGrid, label: "Dashboard" },
    { href: "/diaries/new", icon: FilePlus2, label: "New Diary" },
    { href: "/customers", icon: Users, label: "Customers" },
    { href: "/archives", icon: Archive, label: "Archives" },
  ];

  const navAdmin = [
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
      <aside className="bg-white border-r border-gray-200 p-6 flex flex-col gap-4 min-w-[280px]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
            <LayoutGrid className="h-5 w-5 text-emerald-700" />
          </div>
          <div className="text-xl font-semibold text-gray-900">
            Customer Diary
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      </aside>
    );
  }

  // Show error state if not authenticated
  if (!isAuthenticated) {
    return (
      <aside className="bg-white border-r border-gray-200 p-6 flex flex-col gap-4 min-w-[280px]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
            <LayoutGrid className="h-5 w-5 text-emerald-700" />
          </div>
          <div className="text-xl font-semibold text-gray-900">
            Customer Diary
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-gray-500">Not authenticated</div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="bg-white border-r border-gray-200 p-6 flex flex-col gap-6 min-w-[280px]">
      {/* Header with logo and app name */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
          <LayoutGrid className="h-5 w-5 text-emerald-700" />
        </div>
        <div className="text-xl font-semibold text-gray-900">
          Customer Diary
        </div>
      </div>

      {/* User info section */}
      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
            <User className="h-4 w-4 text-emerald-700" />
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {session?.user?.name || "User"}
            </div>
            <div className="text-xs text-emerald-700 font-medium">
              Logged in as: {session?.user?.staffCode || "Staff"}
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-6">
        {/* Primary Navigation */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
            Main Navigation
          </h3>
          <div className="space-y-1">
            {navPrimary.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 group hover:scale-105 hover:shadow-md",
                  isActive(n.href)
                    ? "bg-emerald-100 text-emerald-900 border border-emerald-200 shadow-sm"
                    : "text-gray-700 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-200"
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    isActive(n.href)
                      ? "bg-emerald-200 text-emerald-900"
                      : "bg-gray-100 text-gray-600 group-hover:bg-emerald-100 group-hover:text-emerald-700"
                  )}
                >
                  <n.icon className="h-4 w-4" />
                </div>
                <span className="font-medium">{n.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Admin Navigation (manager only) */}
        {isManager && navAdmin.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
              Administration
            </h3>
            <div className="space-y-1">
              {navAdmin.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                    isActive(n.href)
                      ? "bg-emerald-100 text-emerald-900 border border-emerald-200 shadow-sm"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <div
                    className={cn(
                      "p-1.5 rounded-lg transition-all duration-300 group-hover:scale-110",
                      isActive(n.href)
                        ? "bg-emerald-200 text-emerald-900 shadow-sm"
                        : "bg-gray-100 text-gray-600 group-hover:bg-emerald-100 group-hover:text-emerald-700 group-hover:shadow-md"
                    )}
                  >
                    <n.icon className="h-4 w-4" />
                  </div>
                  <span className="font-medium">{n.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Support Navigation */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
            Support & Info
          </h3>
          <div className="space-y-1">
            {navSupport.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                  isActive(n.href)
                    ? "bg-emerald-100 text-emerald-900 border border-emerald-200 shadow-sm"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    isActive(n.href)
                      ? "bg-emerald-200 text-emerald-900"
                      : "bg-gray-100 text-gray-600 group-hover:bg-emerald-100 group-hover:text-emerald-700"
                  )}
                >
                  <n.icon className="h-4 w-4" />
                </div>
                <span className="font-medium">{n.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Footer: version + logout */}
      <div className="border-t border-gray-200 pt-4 space-y-3">
        <div className="text-xs text-gray-500 text-center">Version 2.2.0</div>

        {/* Auto logout countdown */}
        {timeUntilLogout < 5 * 60 && (
          <div className="text-xs text-amber-600 text-center bg-amber-50 p-2 rounded-lg border border-amber-200">
            Auto logout in {Math.floor(timeUntilLogout / 60)}:
            {(timeUntilLogout % 60).toString().padStart(2, "0")}
          </div>
        )}

        <button
          onClick={() => signOut({ callbackUrl: "/sign-in" })}
          className="w-full inline-flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 hover:scale-105 transition-all duration-300 shadow-md hover:shadow-lg"
          aria-label="Log out"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
