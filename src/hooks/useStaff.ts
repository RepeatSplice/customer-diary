import { useQuery } from "@tanstack/react-query";

export type StaffMember = {
  id: string;
  fullName: string;
  staffCode: string;
  role: "staff" | "manager";
};

async function fetchStaffMembers(): Promise<StaffMember[]> {
  const response = await fetch("/api/staff-users?public=true");
  if (!response.ok) throw new Error("Failed to fetch staff members");
  const data = await response.json();
  return data.items || [];
}

export function useStaff() {
  const query = useQuery<
    StaffMember[],
    Error,
    StaffMember[],
    readonly ["staff-users", "public"]
  >({
    queryKey: ["staff-users", "public"] as const,
    queryFn: fetchStaffMembers,
    staleTime: 5 * 60 * 1000, // 5 minutes
    // TanStack Query v5: use gcTime instead of cacheTime
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const staffOptions = (query.data ?? []).map((member: StaffMember) => ({
    id: member.id,
    label: `${member.staffCode} - ${member.fullName}`,
    staffCode: member.staffCode,
    fullName: member.fullName,
    role: member.role,
  }));

  return {
    staffMembers: query.data || [],
    staffOptions,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
