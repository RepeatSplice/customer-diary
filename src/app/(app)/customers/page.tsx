import CustomersList from "@/components/customers/CustomersList";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function CustomersPage() {
  // Ensure user is authenticated before accessing customers
  try {
    await requireSession();
  } catch {
    // Redirect to sign-in if not authenticated
    redirect("/sign-in");
  }

  return <CustomersList />;
}
