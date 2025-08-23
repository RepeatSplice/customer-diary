// src/app/(app)/staff/new/page.tsx
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import StaffAdminPage from "./ui/StaffAdminPage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AddUserPage() {
  const session = await requireSession().catch(() => null);
  if (!session) redirect("/sign-in");

  const role = session.user.role;
  if (role !== "manager") redirect("/dashboard");

  return <StaffAdminPage />;
}
