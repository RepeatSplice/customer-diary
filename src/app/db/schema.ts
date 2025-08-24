// src/db/schema.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  numeric,
  integer,
  date,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------- Enums ----------
export const role_t = pgEnum("role_t", ["staff", "manager"]);
export const status_t = pgEnum("status_t", [
  "Pending",
  "Ordered",
  "ReadyForPickup",
  "Collected",
  "Cancelled",
]);
export const priority_t = pgEnum("priority_t", [
  "Low",
  "Normal",
  "High",
  "Urgent",
]);
export const followup_type = pgEnum("followup_type_t", [
  "note",
  "call",
  "sms",
  "email",
]);

// ---------- Tables ----------
export const staffUsers = pgTable(
  "staff_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    staffCode: text("staff_code").notNull().unique(),
    fullName: text("full_name").notNull(),
    role: role_t("role").notNull().default("staff"),
    pinHash: text("pin_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    codeIdx: index("idx_staff_users_code").on(t.staffCode),
  })
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    accountNo: text("account_no"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    nameIdx: index("idx_customers_name").on(t.name),
    phoneIdx: index("idx_customers_phone").on(t.phone),
    emailIdx: index("idx_customers_email").on(t.email),
    acctIdx: index("idx_customers_account").on(t.accountNo),
  })
);

export const customerDiary = pgTable(
  "customer_diary",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    createdBy: uuid("created_by").references(() => staffUsers.id, {
      onDelete: "set null",
    }),
    assignedTo: uuid("assigned_to").references(() => staffUsers.id, {
      onDelete: "set null",
    }),

    createdByCode: text("created_by_code"), // 3-letter code (denormalized)

    whatTheyWant: text("what_they_want").notNull(),

    status: status_t("status").notNull().default("Pending"),
    priority: priority_t("priority").notNull().default("Normal"),

    isPaid: boolean("is_paid").notNull().default(false),
    isOrdered: boolean("is_ordered").notNull().default(false),
    hasTextedCustomer: boolean("has_texted_customer").notNull().default(false),

    adminNotes: text("admin_notes"),
    dueDate: date("due_date"),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),

    // Payment fields
    paymentMethod: text("payment_method"),
    amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).default(
      "0"
    ),
    invoicePO: text("invoice_po"),
    paidAt: date("paid_at"),

    // Additional fields
    storeLocation: text("store_location"),
    tags: text("tags"),

    subtotal: numeric("subtotal", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    statusIdx: index("idx_diary_status").on(t.status),
    priorityIdx: index("idx_diary_priority").on(t.priority),
    createdAtIdx: index("idx_diary_created_at").on(t.createdAt),
    lastViewedIdx: index("idx_diary_last_viewed_at").on(t.lastViewedAt),
    archivedAtIdx: index("idx_diary_archived_at").on(t.archivedAt),
  })
);

export const diaryProducts = pgTable(
  "diary_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    diaryId: uuid("diary_id")
      .notNull()
      .references(() => customerDiary.id, { onDelete: "cascade" }),
    upc: text("upc"),
    name: text("name").notNull(),
    qty: integer("qty").notNull(), // trigger will enforce > 0
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    lineTotal: numeric("line_total", { precision: 12, scale: 2 })
      .notNull()
      .default("0"), // set by trigger
  },
  (t) => ({
    diaryIdx: index("idx_products_diary_id").on(t.diaryId),
  })
);

export const diaryFollowups = pgTable(
  "diary_followups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    diaryId: uuid("diary_id")
      .notNull()
      .references(() => customerDiary.id, { onDelete: "cascade" }),
    entryType: followup_type("entry_type").notNull().default("note"),
    message: text("message").notNull(),
    staffCode: text("staff_code").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    diaryIdx: index("idx_followups_diary_id").on(t.diaryId),
  })
);

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    diaryId: uuid("diary_id")
      .notNull()
      .references(() => customerDiary.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    filePath: text("file_path").notNull(),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    uploadedBy: text("uploaded_by").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    diaryIdx: index("idx_attachments_diary_id").on(t.diaryId),
  })
);

// ---------- Enums (feedback) ----------
export const feedback_type_t = pgEnum("feedback_type_t", ["feature", "bug"]);
export const feedback_severity_t = pgEnum("feedback_severity_t", [
  "low",
  "normal",
  "high",
]);
export const feedback_status_t = pgEnum("feedback_status_t", [
  "Open",
  "Planned",
  "InProgress",
  "Done",
  "Declined",
]);

// ---------- Tables (feedback) ----------
export const feedbackItems = pgTable(
  "feedback_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => staffUsers.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    details: text("details").notNull(),

    kind: feedback_type_t("kind").notNull().default("feature"),
    severity: feedback_severity_t("severity").notNull().default("normal"),
    status: feedback_status_t("status").notNull().default("Open"),

    pinned: boolean("pinned").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    createdIdx: index("idx_feedback_created_at").on(t.createdAt),
    statusIdx: index("idx_feedback_status").on(t.status),
    pinnedIdx: index("idx_feedback_pinned").on(t.pinned),
  })
);

export const feedbackVotes = pgTable(
  "feedback_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => feedbackItems.id, { onDelete: "cascade" }),
    voterId: uuid("voter_id")
      .notNull()
      .references(() => staffUsers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uq: index("uq_feedback_vote_item_voter").on(t.itemId, t.voterId),
  })
);

export const feedbackComments = pgTable(
  "feedback_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => feedbackItems.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => staffUsers.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    itemIdx: index("idx_feedback_comments_item").on(t.itemId),
    createdIdx: index("idx_feedback_comments_created").on(t.createdAt),
  })
);

// ---------- Relations ----------
export const feedbackRelations = relations(feedbackItems, ({ one, many }) => ({
  creator: one(staffUsers, {
    fields: [feedbackItems.createdBy],
    references: [staffUsers.id],
  }),
  votes: many(feedbackVotes),
  comments: many(feedbackComments),
}));

// ---------- Relations (with inverse staff relations) ----------
export const customersRelations = relations(customers, ({ many }) => ({
  diaries: many(customerDiary),
}));

export const diaryRelations = relations(customerDiary, ({ one, many }) => ({
  customer: one(customers, {
    fields: [customerDiary.customerId],
    references: [customers.id],
  }),
  createdByUser: one(staffUsers, {
    fields: [customerDiary.createdBy],
    references: [staffUsers.id],
    relationName: "createdBy",
  }),
  assignedToUser: one(staffUsers, {
    fields: [customerDiary.assignedTo],
    references: [staffUsers.id],
    relationName: "assignedTo",
  }),
  products: many(diaryProducts),
  followups: many(diaryFollowups),
  files: many(attachments),
}));

export const staffUsersRelations = relations(staffUsers, ({ many }) => ({
  diariesCreated: many(customerDiary, { relationName: "createdBy" }),
  diariesAssigned: many(customerDiary, { relationName: "assignedTo" }),
}));
