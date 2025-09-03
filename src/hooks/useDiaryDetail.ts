import { useState, useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";

export type Patchable = {
  status?: string;
  priority?: string;
  isPaid?: boolean;
  isOrdered?: boolean;
  hasTextedCustomer?: boolean;
  whatTheyWant?: string;
  adminNotes?: string;
  dueDate?: string | null;
  paymentMethod?: string;
  amountPaid?: string;
  invoicePO?: string;
  paidAt?: string | null;
  storeLocation?: string;
  tags?: string;
  total?: string;
  assignedTo?: string | null;
  supplier?: string;
  orderNo?: string;
  etaDate?: string | null;
  orderStatus?: string;
  orderNotes?: string;
};

export type DiaryData = {
  id: string;
  customerId: string | null;
  createdBy: string;
  assignedTo: string | null;
  createdByCode: string | null;
  whatTheyWant: string;
  status: string;
  priority: string;
  isPaid: boolean;
  isOrdered: boolean;
  hasTextedCustomer: boolean;
  adminNotes: string | null;
  dueDate: string | null;
  paymentMethod: string | null;
  amountPaid: string | null;
  invoicePO: string | null;
  paidAt: string | null;
  storeLocation: string | null;
  tags: string | null;
  supplier: string | null;
  orderNo: string | null;
  etaDate: string | null;
  orderStatus: string | null;
  orderNotes: string | null;
  subtotal: number | null;
  total: string | number | null;
  createdAt: string;
  updatedAt: string | null;
  customer: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    accountNo: string | null;
    createdAt: string | null;
  } | null;
  products: Array<{
    id: string;
    diaryId: string;
    upc: string | null;
    name: string;
    qty: number;
    unitPrice: string | number;
    lineTotal: string | number;
  }>;
  followups: Array<{
    id: string;
    diaryId: string;
    entryType: "note" | "call" | "sms" | "email";
    message: string;
    staffCode?: string | null;
    createdAt: string;
  }>;
  attachments: Array<{
    id: string;
    diaryId: string;
    fileName: string;
    filePath: string | null;
    mimeType?: string | null;
    sizeBytes?: number | null;
    uploadedBy?: string;
    uploadedAt?: string;
  }>;
};

async function fetchDiary(id: string): Promise<DiaryData> {
  const response = await fetch(`/api/diaries/${id}`);
  if (response.status === 401) {
    window.location.href = "/sign-in";
    throw new Error("Unauthorized");
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function updateDiary(id: string, patch: Patchable): Promise<DiaryData> {
  const res = await fetch(`/api/diaries/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });

  if (res.status === 401) {
    toast({
      title: "Session expired",
      description: "Please sign in again",
      variant: "destructive",
      duration: 5000,
    });
    window.location.href = "/sign-in";
    throw new Error("Unauthorized");
  }

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function archiveDiary(id: string): Promise<void> {
  const res = await fetch(`/api/diaries/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      archivedAt: new Date().toISOString().split("T")[0],
    }),
  });
  if (!res.ok) throw new Error("Archive failed");
}

export function useDiaryDetail(id: string) {
  const queryClient = useQueryClient();
  const [isDirty, setIsDirty] = useState(false);
  const [formData, setFormData] = useState<Patchable | null>(null);
  const draftKey = useMemo(() => ["diary-draft", id] as const, [id]);

  // Query for diary data
  const diaryQuery = useQuery({
    queryKey: ["diary", id],
    queryFn: () => fetchDiary(id),
    staleTime: 30000, // 30 seconds
  });

  // Initialize form data when diary data loads
  const initializeForm = useCallback((data: DiaryData) => {
    const initial: Patchable = {
      status: data.status,
      priority: data.priority,
      isPaid: data.isPaid,
      isOrdered: data.isOrdered,
      hasTextedCustomer: data.hasTextedCustomer,
      whatTheyWant: data.whatTheyWant,
      adminNotes: data.adminNotes ?? "",
      dueDate: data.dueDate ?? null,
      paymentMethod: data.paymentMethod ?? "",
      amountPaid: data.amountPaid ?? "",
      invoicePO: data.invoicePO ?? "",
      paidAt: data.paidAt ?? null,
      storeLocation: data.storeLocation ?? "",
      tags: data.tags ?? "",
      total: String(data.total ?? "0"),
      assignedTo: data.assignedTo ?? null,
      supplier: data.supplier ?? "",
      orderNo: data.orderNo ?? "",
      etaDate: data.etaDate ?? null,
      orderStatus: data.orderStatus ?? "pending",
      orderNotes: data.orderNotes ?? "",
    };
    setFormData(initial);
    setIsDirty(false);
  }, []);

  // Prefer persisted draft over server state when available
  useEffect(() => {
    if (diaryQuery.data && !formData) {
      const draft = queryClient.getQueryData<Patchable>(draftKey);
      if (draft) {
        setFormData(draft);
        setIsDirty(true);
      } else {
        initializeForm(diaryQuery.data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diaryQuery.data, formData, id]);

  // Update mutation
  const updateMutation = useMutation({
    mutationKey: ["diary-update", id],
    mutationFn: (patch: Patchable) => updateDiary(id, patch),
    onSuccess: (updatedData) => {
      toast({ title: "Saved", duration: 3000 });
      queryClient.setQueryData(["diary", id], updatedData);
      setIsDirty(false);
      // Clear local draft after successful save
      queryClient.removeQueries({ queryKey: draftKey, exact: true });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Save failed",
        description: message,
        variant: "destructive",
        duration: 15000,
      });
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationKey: ["diary-archive", id],
    mutationFn: () => archiveDiary(id),
    onSuccess: () => {
      toast({
        title: "Diary archived",
        description: "Redirecting to archives...",
      });
      queryClient.invalidateQueries({ queryKey: ["diary", id] });
    },
    onError: () => {
      toast({ title: "Archive failed", variant: "destructive" });
    },
  });

  // Update form field
  const updateField = useCallback(
    <K extends keyof Patchable>(key: K, value: Patchable[K]) => {
      setFormData((prev) => {
        if (!prev) return prev;
        const newData = { ...prev, [key]: value };
        setIsDirty(true);
        // Persist draft to query cache (persisted via persister)
        queryClient.setQueryData(draftKey, newData);
        return newData;
      });
    },
    [queryClient, draftKey]
  );

  // Save changes
  const saveChanges = useCallback(() => {
    if (!formData || !isDirty) return;
    updateMutation.mutate(formData);
  }, [formData, isDirty, updateMutation]);

  // Auto-save with debouncing
  const autoSave = useCallback(() => {
    if (!formData || !isDirty || updateMutation.isPending) return;

    const timer = setTimeout(() => {
      saveChanges();
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timer);
  }, [formData, isDirty, saveChanges, updateMutation.isPending]);

  // Reset form to server state
  const resetForm = useCallback(() => {
    if (diaryQuery.data) {
      initializeForm(diaryQuery.data);
      queryClient.removeQueries({ queryKey: draftKey, exact: true });
    }
  }, [diaryQuery.data, initializeForm, queryClient, draftKey]);

  return {
    // Data
    diary: diaryQuery.data,
    formData,

    // Loading states
    isLoading: diaryQuery.isLoading,
    isSaving: updateMutation.isPending,
    isArchiving: archiveMutation.isPending,

    // Status
    isDirty,
    error: diaryQuery.error,

    // Actions
    updateField,
    saveChanges,
    resetForm,
    initializeForm,
    autoSave,

    // Archive
    archiveDiary: archiveMutation.mutate,

    // Query utilities
    refetch: diaryQuery.refetch,
  };
}
