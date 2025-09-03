"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useIsMutating } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiarySaveButton } from "@/components/diary/SaveButton";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { HeaderBar } from "@/components/diary/detail/HeaderBar";
import { SummaryTab } from "@/components/diary/tabs/SummaryTab";
import { ProductsTab } from "@/components/diary/tabs/ProductsTab";
import { OrderTab } from "@/components/diary/tabs/OrderTab";
import { FollowupsTab } from "@/components/diary/tabs/FollowupsTab";
import { AttachmentsTab } from "@/components/diary/tabs/AttachmentsTab";
import { useDiaryDetail } from "@/hooks/useDiaryDetail";
import { useAuth } from "@/hooks/use-mobile";

interface DiaryDetailPageProps {
  id: string;
}

export default function DiaryDetailPage({ id }: DiaryDetailPageProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("summary");
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const pendingNavRef = useRef<null | (() => void)>(null);

  // Track all diary-related mutations (main form + attachments + followups + products)
  const uploadCount = useIsMutating({
    mutationKey: ["attachments-upload", id],
  });
  const removeCount = useIsMutating({
    mutationKey: ["attachments-remove", id],
  });
  const addFollowupCount = useIsMutating({
    mutationKey: ["followups-add", id],
  });
  const editFollowupCount = useIsMutating({
    mutationKey: ["followups-edit", id],
  });
  const deleteFollowupCount = useIsMutating({
    mutationKey: ["followups-delete", id],
  });
  const productsCount = useIsMutating({ mutationKey: ["diary-products", id] });

  const isMutatingAttachments = uploadCount > 0 || removeCount > 0;
  const isMutatingFollowups =
    addFollowupCount > 0 || editFollowupCount > 0 || deleteFollowupCount > 0;
  const isMutatingProducts = productsCount > 0;

  const {
    diary,
    formData,
    isLoading,
    isSaving,
    isArchiving,
    isDirty,
    error,
    updateField,
    saveChanges,
    archiveDiary,
    autoSave,
  } = useDiaryDetail(id);

  // Global saving state includes all diary mutations
  const isGloballySaving =
    isSaving ||
    isMutatingAttachments ||
    isMutatingFollowups ||
    isMutatingProducts;

  // Form initialization handled inside useDiaryDetail (draft takes precedence)

  // Auto-save effect
  useEffect(() => {
    if (isDirty && formData) {
      return autoSave();
    }
  }, [isDirty, formData, autoSave]);

  // Unsaved changes guard - browser refresh/close
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [isDirty]);

  // Unsaved changes guard - browser back/forward
  useEffect(() => {
    const onPop = () => {
      if (!isDirty) return;
      history.pushState(null, "", location.href);
      setShowLeaveConfirm(true);
      pendingNavRef.current = () => history.back();
    };

    history.pushState(null, "", location.href);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [isDirty]);

  const handleBack = () => {
    if (isDirty) {
      setShowLeaveConfirm(true);
      pendingNavRef.current = () => router.back();
    } else {
      router.back();
    }
  };

  const handleTabChange = async (value: string) => {
    // Auto-save when switching tabs if there are unsaved changes
    if (isDirty && !isGloballySaving) {
      await saveChanges();
    }
    setActiveTab(value);
  };

  const handleArchive = async () => {
    try {
      await archiveDiary();
      setTimeout(() => router.push("/archives"), 1000);
    } catch {
      // Error is handled by the mutation
    }
  };

  // Loading states
  if (isAuthLoading) {
    return <div className="px-6 py-10">Checking authentication…</div>;
  }

  if (!isAuthenticated) {
    return null; // useAuth hook will handle redirect
  }

  if (isLoading) {
    return <div className="px-6 py-10">Loading…</div>;
  }

  if (error) {
    return (
      <div className="px-6 py-10">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-red-600 mb-2">
            Error Loading Diary
          </h2>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : "Unknown error occurred"}
          </p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (!diary || !formData) {
    return <div className="px-6 py-10">No diary found</div>;
  }

  // Per-tab status card (not sticky) - shows global saving state
  const StatusCard = () => (
    <Card className="mt-4">
      <CardContent className="px-6 py-3 flex items-center justify-between bg-white">
        <div className="text-sm flex items-center gap-2">
          {isGloballySaving ? (
            <span className="inline-flex items-center h-9 rounded-full px-3 text-sm bg-amber-50 text-amber-700 border border-amber-300">
              <AlertCircle className="mr-1.5 h-4 w-4" /> Saving…
            </span>
          ) : isDirty ? (
            <span className="inline-flex items-center h-9 rounded-full px-3 text-sm bg-amber-50 text-amber-700 border border-amber-300">
              <AlertCircle className="mr-1.5 h-4 w-4" /> Unsaved changes
            </span>
          ) : (
            <span className="inline-flex items-center h-9 rounded-full px-3 text-sm bg-emerald-100 text-emerald-800 border border-emerald-300">
              All changes saved
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleBack}>
            Back
          </Button>
          <DiarySaveButton
            onClick={saveChanges}
            disabled={!isDirty}
            isSaving={isGloballySaving}
          />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full px-6 pb-24">
      <HeaderBar
        id={id}
        customerName={diary.customer?.name}
        customerEmail={diary.customer?.email}
        customerPhone={diary.customer?.phone}
        customerAccountNo={diary.customer?.accountNo}
        status={formData.status}
        priority={formData.priority}
        onBack={handleBack}
        onSave={saveChanges}
        onArchive={handleArchive}
        isArchiving={isArchiving}
        isSaving={isGloballySaving}
        isDirty={isDirty}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-4">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="order">Order Details</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
          <TabsTrigger value="files">Attachments</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <SummaryTab
            diary={diary}
            formData={formData}
            updateField={updateField}
          />
          <StatusCard />
        </TabsContent>

        <TabsContent value="products">
          <ProductsTab diaryId={id} products={diary.products || []} />
          <StatusCard />
        </TabsContent>

        <TabsContent value="order">
          <OrderTab formData={formData} updateField={updateField} />
          <StatusCard />
        </TabsContent>

        <TabsContent value="followups">
          <FollowupsTab diaryId={id} followups={diary.followups || []} />
          <StatusCard />
        </TabsContent>

        <TabsContent value="files">
          <AttachmentsTab diaryId={id} attachments={diary.attachments || []} />
          <StatusCard />
        </TabsContent>
      </Tabs>

      {/* Confirmation dialogs */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have changes that have not been saved. If you leave now, they
              will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 rounded-xl"
              onClick={() => {
                setShowLeaveConfirm(false);
                const go = pendingNavRef.current;
                pendingNavRef.current = null;
                if (go) go();
              }}
            >
              Leave without saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
