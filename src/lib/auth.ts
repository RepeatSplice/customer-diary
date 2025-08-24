import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  if (!session.user?.id)
    throw Object.assign(new Error("No user id"), { status: 400 });

  return session as {
    user: {
      id: string;
      name?: string;
      role: "staff" | "manager";
      staffCode: string;
    };
  };
}

export function assertManager(role: string) {
  if (role !== "manager")
    throw Object.assign(new Error("Forbidden"), { status: 403 });
}

// Client-side redirect function for unauthorized access
export function redirectToSignIn() {
  if (typeof window !== "undefined") {
    window.location.href = "/sign-in";
  }
}

// Utility function to handle auth errors in API routes
export function handleAuthError(error: unknown) {
  if (error instanceof Error && "status" in error) {
    const status = (error as Error & { status: number }).status;
    if (status === 401) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }
    if (status === 403) {
      return NextResponse.json(
        { error: "Forbidden - Insufficient permissions" },
        { status: 403 }
      );
    }
  }

  // Generic error
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
