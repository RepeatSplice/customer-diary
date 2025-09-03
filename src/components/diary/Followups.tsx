"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquareText,
  Phone,
  Mail,
  MessageCircle,
  Pin,
  Edit3,
  Trash2,
  X,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiarySaveButton } from "@/components/diary/SaveButton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import {
  Card,
  CardTitle,
  CardDescription,
  CardContent,
  CardHeader,
} from "../ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const iconFor = (type: string) => {
  switch (type) {
    case "call":
      return <Phone className="h-4 w-4" />;
    case "sms":
      return <MessageCircle className="h-4 w-4" />;
    case "email":
      return <Mail className="h-4 w-4" />;
    default:
      return <MessageSquareText className="h-4 w-4" />;
  }
};

type StaffMember = {
  id: string;
  fullName: string;
  staffCode: string;
  role: "staff" | "manager";
};

type Follow = {
  id: string;
  entryType: "note" | "call" | "sms" | "email";
  message: string;
  staffCode?: string | null;
  createdAt: string;
};

export function Followups({
  diaryId,
  initial,
}: {
  diaryId: string;
  initial: Follow[];
}) {
  const [items, setItems] = useState<Follow[]>(
    [...initial].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  );
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Draft persistence for composer
  const draftKey = useMemo(
    () => ["followups-draft", diaryId] as const,
    [diaryId]
  );
  const initFromDraft = useRef(false);

  // Staff data
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);

  // compose state (right column)
  const [text, setText] = useState("");
  const [type, setType] = useState<Follow["entryType"]>("note");
  const [staff, setStaff] = useState<string>("none");
  const [nextAction, setNextAction] = useState<Date | undefined>(undefined);

  // edit state (inline per-item)
  const [editing, setEditing] = useState<{
    id: string;
    message: string;
    entryType: Follow["entryType"];
    staffCode?: string | null;
  } | null>(null);

  // delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Initialize from persisted draft
  useEffect(() => {
    if (initFromDraft.current) return;
    const draft = queryClient.getQueryData<{
      text: string;
      type: Follow["entryType"];
      staff: string;
    }>(draftKey);
    if (draft) {
      setText(draft.text || "");
      setType(draft.type || "note");
      setStaff(draft.staff || "none");
    }
    initFromDraft.current = true;
  }, [draftKey, queryClient]);

  // Fetch staff members on component mount
  useEffect(() => {
    async function fetchStaff() {
      try {
        const res = await fetch("/api/staff-users?public=true");
        if (res.ok) {
          const data = await res.json();
          setStaffMembers(data.items || []);
        } else {
          console.error("Failed to fetch staff members");
        }
      } catch (error) {
        console.error("Error fetching staff:", error);
      } finally {
        setIsLoadingStaff(false);
      }
    }

    fetchStaff();
  }, []);

  const ordered = useMemo(() => {
    const pinnedArr = items.filter((i) => pinned.has(i.id));
    const rest = items.filter((i) => !pinned.has(i.id));
    return [...pinnedArr, ...rest];
  }, [items, pinned]);

  // --- TanStack Query Mutations ---
  const addMutation = useMutation({
    mutationKey: ["followups-add", diaryId],
    mutationFn: async (data: {
      entryType: Follow["entryType"];
      message: string;
      staffCode?: string;
    }) => {
      const res = await fetch(`/api/diaries/${diaryId}/followups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return (await res.json()) as Follow;
    },
    onSuccess: (newFollow) => {
      setItems((prev) =>
        [newFollow, ...prev].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
      setText("");
      setNextAction(undefined);
      setType("note");
      setStaff("none");

      // Clear draft after successful add
      queryClient.removeQueries({ queryKey: draftKey });

      // Optimistically update diary cache and invalidate
      queryClient.setQueryData(["diary", diaryId], (old: unknown) => {
        if (!old || typeof old !== "object") return old;
        const current = old as { followups?: Follow[] } & Record<
          string,
          unknown
        >;
        const updated = [newFollow, ...(current.followups || [])];
        return { ...current, followups: updated };
      });
      queryClient.invalidateQueries({ queryKey: ["diary", diaryId] });

      // SMS special handling
      if (newFollow.entryType === "sms") {
        updateDiaryField({ hasTextedCustomer: true });
      }

      toast({ title: "Follow-up added" });
    },
    onError: () => {
      toast({ title: "Failed to add follow-up", variant: "destructive" });
    },
  });

  const updateDiaryField = async (data: Record<string, unknown>) => {
    try {
      await fetch(`/api/diaries/${diaryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error("Failed to update diary field:", error);
    }
  };

  async function add() {
    if (!text.trim()) return;
    addMutation.mutate({
      entryType: type,
      message: text.trim(),
      staffCode: staff === "none" ? undefined : staff,
    });
  }

  const editMutation = useMutation({
    mutationKey: ["followups-edit", diaryId],
    mutationFn: async (data: {
      id: string;
      message: string;
      entryType: Follow["entryType"];
      staffCode?: string | null;
    }) => {
      const res = await fetch(`/api/diaries/${diaryId}/followups`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: data.id,
          message: data.message.trim(),
          entryType: data.entryType,
          staffCode: data.staffCode,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return data;
    },
    onSuccess: ({ id, message, entryType, staffCode }) => {
      setItems((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, message, entryType, staffCode } : f
        )
      );
      setEditing(null);

      // Update diary cache
      queryClient.setQueryData(["diary", diaryId], (old: unknown) => {
        if (!old || typeof old !== "object") return old;
        const current = old as { followups?: Follow[] } & Record<
          string,
          unknown
        >;
        const updated = (current.followups || []).map((f) =>
          f.id === id ? { ...f, message, entryType, staffCode } : f
        );
        return { ...current, followups: updated };
      });
      queryClient.invalidateQueries({ queryKey: ["diary", diaryId] });

      toast({ title: "Follow-up updated" });
    },
    onError: () => {
      toast({ title: "Failed to update follow-up", variant: "destructive" });
    },
  });

  async function saveEdit() {
    if (!editing) return;
    const { id, message, entryType, staffCode } = editing;
    editMutation.mutate({ id, message, entryType, staffCode });
  }

  const deleteMutation = useMutation({
    mutationKey: ["followups-delete", diaryId],
    mutationFn: async (id: string) => {
      const res = await fetch(
        `/api/diaries/${diaryId}/followups?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error(await res.text());
      return id;
    },
    onMutate: async (id: string) => {
      // Optimistic update
      const previousItems = items;
      setItems((prev) => prev.filter((f) => f.id !== id));
      return { previousItems };
    },
    onSuccess: (id: string) => {
      // Update diary cache
      queryClient.setQueryData(["diary", diaryId], (old: unknown) => {
        if (!old || typeof old !== "object") return old;
        const current = old as { followups?: Follow[] } & Record<
          string,
          unknown
        >;
        const filtered = (current.followups || []).filter((f) => f.id !== id);
        return { ...current, followups: filtered };
      });
      queryClient.invalidateQueries({ queryKey: ["diary", diaryId] });

      toast({ title: "Follow-up deleted" });
    },
    onError: (error, id, context) => {
      // Revert optimistic update
      if (context?.previousItems) {
        setItems(context.previousItems);
      }
      toast({ title: "Failed to delete", variant: "destructive" });
    },
  });

  async function deleteNow() {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    deleteMutation.mutate(id);
  }

  function togglePin(id: string) {
    setPinned((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // --- UI helpers ---
  const isEditing = (id: string) => editing?.id === id;

  // Persist draft when form changes
  useEffect(() => {
    if (!initFromDraft.current) return;
    queryClient.setQueryData(draftKey, { text, type, staff });
  }, [text, type, staff, draftKey, queryClient]);

  return (
    <div className="grid md:grid-cols-[1fr_360px] gap-6">
      {/* timeline */}
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {ordered.map((f) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="p-3 border rounded-xl bg-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {iconFor(f.entryType)}
                  <span className="capitalize">{f.entryType}</span>
                  <span>•</span>
                  <span>{new Date(f.createdAt).toLocaleString()}</span>
                  {f.staffCode && (
                    <>
                      <span>•</span>
                      <span>{f.staffCode}</span>
                    </>
                  )}
                  {pinned.has(f.id) && (
                    <>
                      <span>•</span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                        pinned
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => togglePin(f.id)}
                    title={pinned.has(f.id) ? "Unpin" : "Pin"}
                  >
                    <Pin
                      className={`h-4 w-4 ${
                        pinned.has(f.id)
                          ? "fill-emerald-500 text-emerald-600"
                          : ""
                      }`}
                    />
                  </Button>

                  {!isEditing(f.id) ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        setEditing({
                          id: f.id,
                          message: f.message,
                          entryType: f.entryType,
                          staffCode: f.staffCode ?? undefined,
                        })
                      }
                      title="Edit"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  ) : null}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setDeleteId(f.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* body */}
              {!isEditing(f.id) ? (
                <div className="mt-1 whitespace-pre-wrap">{f.message}</div>
              ) : (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={editing?.entryType || "note"}
                        onValueChange={(v: Follow["entryType"]) =>
                          setEditing((e) => (e ? { ...e, entryType: v } : e))
                        }
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="note">Note</SelectItem>
                          <SelectItem value="call">Call</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Staff</Label>
                      <Select
                        value={editing?.staffCode ?? "none"}
                        onValueChange={(value) =>
                          setEditing((e) =>
                            e
                              ? {
                                  ...e,
                                  staffCode:
                                    value === "none" ? undefined : value,
                                }
                              : e
                          )
                        }
                        disabled={isLoadingStaff}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select staff" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            No staff assigned
                          </SelectItem>
                          {staffMembers.map((member) => (
                            <SelectItem
                              key={member.id}
                              value={member.staffCode}
                            >
                              {member.staffCode} - {member.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Message</Label>
                    <Textarea
                      rows={4}
                      value={editing?.message || ""}
                      onChange={(e) =>
                        setEditing((s) =>
                          s ? { ...s, message: e.target.value } : s
                        )
                      }
                    />
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(null)}
                      className="gap-1"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                    <DiarySaveButton
                      onClick={saveEdit}
                      className="h-9 px-3 text-sm"
                      label="Save"
                      isSaving={editMutation.isPending}
                      disabled={editMutation.isPending}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* composer */}
      <Card className="rounded-2xl border shadow-sm">
        <CardHeader>
          <CardTitle>Add Follow-up</CardTitle>
          <CardDescription>
            Add a new follow-up to the customer diary.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold pb-2">Type</Label>
              <Select
                value={type}
                onValueChange={(v: string) => setType(v as Follow["entryType"])}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-sm font-semibold pb-2">Staff</Label>
              <Select
                value={staff}
                onValueChange={setStaff}
                disabled={isLoadingStaff}
              >
                <SelectTrigger className="h-10">
                  <SelectValue
                    placeholder={
                      isLoadingStaff
                        ? "Loading staff..."
                        : "Select staff member"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No staff assigned</SelectItem>
                  {staffMembers.map((member) => (
                    <SelectItem key={member.id} value={member.staffCode}>
                      {member.staffCode} - {member.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold pb-2">Message</Label>
            <Textarea
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-sm font-semibold pb-2">
              Next action / due date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !nextAction && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {nextAction ? (
                    format(nextAction, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={nextAction}
                  onSelect={setNextAction}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex justify-end">
            <DiarySaveButton
              onClick={add}
              label="Add follow-up"
              isSaving={addMutation.isPending}
              disabled={addMutation.isPending || !text.trim()}
            />
          </div>
        </CardContent>
      </Card>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete follow-up?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={deleteNow}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
