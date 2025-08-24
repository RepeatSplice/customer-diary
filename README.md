# Customer Diary

A modern, internal tool for tracking customer diaries and orders—built with **Next.js 15**, **TypeScript**, **Tailwind CSS**, **shadcn/ui**, **Framer Motion**, **Supabase** (Postgres + Storage), and **Drizzle ORM**.

> **Note**  
> This project is **not affiliated with, endorsed by, or approved by Burnsco**.  
> It was created by **Ben (Krona Digital)** for personal/staff use. Any references to Burnsco are purely contextual.

---

## ✨ Features

- **Diaries**: create, track, and update customer diaries (status, priority, flags, due dates, totals)
- **Attachments**: image/PDF drag-drop uploads (Supabase Storage), inline preview & remove
- **Products**: line items with qty/price/discount/tax and auto totals
- **Follow-ups**: timeline (note/call/sms/email), with manager-only rules
- **Dashboard**: stat cards (Active/Overdue/Completed), grid, filters & search
- **Customers**: full-width table with search, sorting, and safe delete UX
- **Staff Admin (manager-only)**: add staff/managers, list below
- **Feedback**: in-app feature/bug board with **voting**, **manager-only comments**, pin & status
- **Auth**: NextAuth with role-based UI (staff / manager)
- **UI/UX**: green-themed, rounded-xl, soft shadows, subtle motion

---

## 🧱 Tech Stack

- **Framework**: Next.js 15 (App Router, RSC where applicable)
- **UI**: Tailwind CSS 4, shadcn/ui, Lucide Icons, Framer Motion
- **Data**: Supabase (Postgres, Storage), Drizzle ORM & drizzle-kit
- **Auth**: NextAuth (Credentials)
- **Forms**: React Hook Form + Zod
- **State/Data**: SWR for client fetching

---

## 🚀 Getting Started

### 1) Environment

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ATTACHMENTS_BUCKET=Attachments

# Database (Postgres via Supabase)
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require

# NextAuth
NEXTAUTH_SECRET=replace_me
NEXTAUTH_URL=http://localhost:3000
