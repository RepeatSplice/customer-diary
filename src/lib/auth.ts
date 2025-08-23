import { getServerSession } from "next-auth";
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
