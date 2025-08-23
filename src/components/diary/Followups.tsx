"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquareText,
  Phone,
  Mail,
  MessageCircle,
  Pin,
  Edit3,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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

  // compose state (right column)
  const [text, setText] = useState("");
  const [type, setType] = useState<Follow["entryType"]>("note");
  const [staff, setStaff] = useState<string>(""); // wire later
  const [nextAction, setNextAction] = useState<string>("");

  // edit state (inline per-item)
  const [editing, setEditing] = useState<{
    id: string;
    message: string;
    entryType: Follow["entryType"];
    staffCode?: string | null;
  } | null>(null);

  // delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const ordered = useMemo(() => {
    const pinnedArr = items.filter((i) => pinned.has(i.id));
    const rest = items.filter((i) => !pinned.has(i.id));
    return [...pinnedArr, ...rest];
  }, [items, pinned]);

  // --- API calls ---
  async function add() {
    if (!text.trim()) return;
    const res = await fetch(`/api/diaries/${diaryId}/followups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entryType: type,
        message: text.trim(),
        staffCode: staff || undefined,
      }),
    });
    if (res.ok) {
      const f: Follow = await res.json();
      setItems((prev) =>
        [f, ...prev].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
      setText("");
      setNextAction("");
      setType("note");
      // rule: if SMS, flip Texted flag
      if (type === "sms") {
        await fetch(`/api/diaries/${diaryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hasTextedCustomer: true }),
        });
      }
      toast({ title: "Follow-up added", duration: 15000 });
    } else {
      toast({
        title: "Failed to add follow-up",
        variant: "destructive",
        duration: 15000,
      });
    }
  }

  async function saveEdit() {
    if (!editing) return;
    const { id, message, entryType, staffCode } = editing;

    const res = await fetch(`/api/diaries/${diaryId}/followups`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        message: message.trim(),
        entryType,
        staffCode,
      }),
    });

    if (res.ok) {
      setItems((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, message, entryType, staffCode } : f
        )
      );
      setEditing(null);
      toast({ title: "Follow-up updated", duration: 15000 });
    } else {
      toast({
        title: "Failed to update follow-up",
        variant: "destructive",
        duration: 15000,
      });
    }
  }

  async function deleteNow() {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);

    // optimistic
    const prev = items;
    setItems((p) => p.filter((f) => f.id !== id));
    try {
      const res = await fetch(
        `/api/diaries/${diaryId}/followups?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("delete failed");
      toast({ title: "Follow-up deleted", duration: 15000 });
    } catch {
      // revert
      setItems(prev);
      toast({
        title: "Failed to delete",
        variant: "destructive",
        duration: 15000,
      });
    }
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
                      <Input
                        className="h-9 text-xs"
                        value={editing?.staffCode ?? ""}
                        onChange={(e) =>
                          setEditing((s) =>
                            s ? { ...s, staffCode: e.target.value } : s
                          )
                        }
                      />
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
                    <Button
                      size="sm"
                      onClick={saveEdit}
                      className="bg-green-600 hover:bg-green-700 text-white gap-1"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Save
                    </Button>
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
              <Input
                placeholder="Select staff (UI only now)"
                value={staff}
                onChange={(e) => setStaff(e.target.value)}
              />
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
            <Input
              placeholder="UI only for now"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={add}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Add follow-up
            </Button>
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
