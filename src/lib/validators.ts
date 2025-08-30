import { z } from "zod";

export const customerUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  email: z
    .string()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  phone: z.string().optional(),
  accountNo: z.string().optional(),
});

export const productLineSchema = z.object({
  id: z.string().uuid().optional(),
  upc: z.string().optional(),
  name: z.string().min(1),
  qty: z.number().int().positive(),
  unitPrice: z.number().min(0),
});

export const diaryCreateSchema = z.object({
  customerId: z.string().uuid().optional(),
  customerInline: customerUpsertSchema.optional(),
  whatTheyWant: z.string().min(1),
  priority: z.enum(["Low", "Normal", "High", "Urgent"]).default("Normal"),
  dueDate: z
    .string()
    .date()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  isPaid: z.boolean().optional().default(false),
  isOrdered: z.boolean().optional().default(false),
  hasTextedCustomer: z.boolean().optional().default(false),
  products: z.array(productLineSchema).default([]),
  adminNotes: z.string().optional(),
  // Payment fields
  paymentMethod: z.string().optional(),
  amountPaid: z
    .union([
      z
        .string()
        .transform((v) => (v === "" ? undefined : parseFloat(v) || undefined)),
      z.number().min(0),
    ])
    .optional(),
  invoicePO: z.string().optional(),
  paidAt: z
    .string()
    .date()
    .optional()
    .or(z.literal(""))
    .or(z.null())
    .transform((v) => (v === "" ? null : v)),
  // Additional fields
  storeLocation: z.string().optional(),
  tags: z.string().optional(),
  // Order fields
  supplier: z.string().optional(),
  orderNo: z.string().optional(),
  etaDate: z
    .string()
    .date()
    .optional()
    .or(z.literal(""))
    .or(z.null())
    .transform((v) => (v === "" ? null : v)),
  orderStatus: z.string().optional().default("pending"),
  orderNotes: z.string().optional(),
  // Total amount
  total: z
    .union([
      z
        .string()
        .transform((v) => (v === "" ? undefined : parseFloat(v) || undefined)),
      z.number().min(0),
    ])
    .optional(),
});

export const diaryPatchSchema = z.object({
  status: z
    .enum(["Pending", "Ordered", "ReadyForPickup", "Collected", "Cancelled"])
    .optional(),
  priority: z.enum(["Low", "Normal", "High", "Urgent"]).optional(),
  isPaid: z.boolean().optional(),
  isOrdered: z.boolean().optional(),
  hasTextedCustomer: z.boolean().optional(),
  whatTheyWant: z.string().optional(),
  adminNotes: z.string().optional(),
  dueDate: z
    .string()
    .date()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  assignedTo: z.string().uuid().optional(),
  // Payment fields
  paymentMethod: z.string().optional(),
  amountPaid: z
    .union([
      z
        .string()
        .transform((v) => (v === "" ? undefined : parseFloat(v) || undefined)),
      z.number().min(0),
    ])
    .optional(),
  invoicePO: z.string().optional(),
  paidAt: z
    .string()
    .date()
    .optional()
    .or(z.literal(""))
    .or(z.null())
    .transform((v) => (v === "" ? null : v)),
  // Additional fields
  storeLocation: z.string().optional(),
  tags: z.string().optional(),
  // Order fields
  supplier: z.string().optional(),
  orderNo: z.string().optional(),
  etaDate: z
    .string()
    .date()
    .optional()
    .or(z.literal(""))
    .or(z.null())
    .transform((v) => (v === "" ? null : v)),
  orderStatus: z.string().optional(),
  orderNotes: z.string().optional(),
  // Total amount
  total: z
    .union([
      z
        .string()
        .transform((v) => (v === "" ? undefined : parseFloat(v) || undefined)),
      z.number().min(0),
    ])
    .optional(),
  // Archive field
  archivedAt: z
    .string()
    .date()
    .optional()
    .or(z.literal(""))
    .or(z.null())
    .transform((v) => (v === "" ? null : v))
    .nullable(),
});

export const followupCreateSchema = z.object({
  entryType: z.enum(["note", "call", "sms", "email"]).default("note"),
  message: z.string().min(1),
  staffCode: z.string().optional(),
});
