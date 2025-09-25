"use client";

import { motion } from "framer-motion";
// import Link from "next/link";
import RefreshButton from "@/components/RefreshButton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

// react-icons (brand + generic)
import {
  SiNextdotjs,
  SiTailwindcss,
  SiFramer,
  SiSupabase,
  SiPostgresql,
  SiTypescript,
  SiRadixui,
  SiEslint,
  SiFigma,
} from "react-icons/si";
import {
  FiBox,
  FiDatabase,
  FiShield,
  FiBarChart2,
  FiRefreshCw,
  FiCalendar,
  FiSliders,
  FiLock,
  FiZap,
  FiFeather,
  FiExternalLink,
} from "react-icons/fi";
import { FaReact } from "react-icons/fa";

type TechItem = {
  name: string;
  icon: React.ReactNode;
  blurb: string;
  href?: string;
};

// Small helper – a single tech card
function TechCard({ item }: { item: TechItem }) {
  return (
    <Card className="rounded-2xl border shadow-sm hover:shadow-md transition">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-xl bg-emerald-50 text-emerald-700 p-2">
            {item.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <div className="font-medium">{item.name}</div>
              {item.href && (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
                  title="Open site"
                >
                  <FiExternalLink />
                </a>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{item.blurb}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CreditsPage() {
  // Groups of tech (kept concise + recognizable icons)
  const coreStack: TechItem[] = [
    {
      name: "Next.js 15 + Turbopack",
      icon: <SiNextdotjs size={18} />,
      blurb: "App Router, RSC, fast dev with Turbopack.",
      href: "https://nextjs.org/",
    },
    {
      name: "React 19",
      icon: <FaReact size={18} />,
      blurb: "Modern React features, concurrent UI.",
      href: "https://react.dev/",
    },
    {
      name: "TypeScript",
      icon: <SiTypescript size={18} />,
      blurb: "Types for safer, scalable code.",
      href: "https://www.typescriptlang.org/",
    },
    {
      name: "Tailwind CSS",
      icon: <SiTailwindcss size={18} />,
      blurb: "Utility-first styling, our green theme.",
      href: "https://tailwindcss.com/",
    },
  ];

  const uiUx: TechItem[] = [
    {
      name: "shadcn/ui",
      icon: <FiBox size={18} />,
      blurb: "Composable UI primitives on top of Radix.",
      href: "https://ui.shadcn.com/",
    },
    {
      name: "Radix UI",
      icon: <SiRadixui size={18} />,
      blurb: "Accessible, unstyled primitives.",
      href: "https://www.radix-ui.com/",
    },
    {
      name: "Framer Motion",
      icon: <SiFramer size={18} />,
      blurb: "Subtle fades & slide-ups.",
      href: "https://www.framer.com/motion/",
    },
    {
      name: "Icons",
      icon: <FiFeather size={18} />,
      blurb: "react-icons across this page; lucide elsewhere.",
      href: "https://react-icons.github.io/react-icons/",
    },
    {
      name: "Figma",
      icon: <SiFigma size={18} />,
      blurb: "Wireframes & component references.",
      href: "https://www.figma.com/",
    },
  ];

  const dataAuth: TechItem[] = [
    {
      name: "Supabase (Storage + Postgres)",
      icon: <SiSupabase size={18} />,
      blurb: "Uploads, signed URLs, managed Postgres.",
      href: "https://supabase.com/",
    },
    {
      name: "PostgreSQL",
      icon: <SiPostgresql size={18} />,
      blurb: "Reliable relational database.",
      href: "https://www.postgresql.org/",
    },
    {
      name: "Drizzle ORM + Kit",
      icon: <FiDatabase size={18} />,
      blurb: "Typed schema, safe queries, migrations.",
      href: "https://orm.drizzle.team/",
    },
    {
      name: "NextAuth",
      icon: <FiShield size={18} />,
      blurb: "Session auth with role-based access.",
      href: "https://next-auth.js.org/",
    },
  ];

  const toolingEtc: TechItem[] = [
    {
      name: "Recharts",
      icon: <FiBarChart2 size={18} />,
      blurb: "Charts for dashboards.",
      href: "https://recharts.org/",
    },
    {
      name: "SWR",
      icon: <FiRefreshCw size={18} />,
      blurb: "Stale-while-revalidate data fetching.",
      href: "https://swr.vercel.app/",
    },
    {
      name: "date-fns",
      icon: <FiCalendar size={18} />,
      blurb: "Friendly date utils.",
      href: "https://date-fns.org/",
    },
    {
      name: "Embla Carousel",
      icon: <FiSliders size={18} />,
      blurb: "Lightweight carousels.",
      href: "https://www.embla-carousel.com/",
    },
    {
      name: "bcryptjs",
      icon: <FiLock size={18} />,
      blurb: "PIN hashing server-side.",
      href: "https://github.com/dcodeIO/bcrypt.js",
    },
    {
      name: "Linting & Dev",
      icon: <SiEslint size={18} />,
      blurb: "ESLint, Turbopack, TypeScript ergonomics.",
      href: "https://eslint.org/",
    },
    {
      name: "Performance",
      icon: <FiZap size={18} />,
      blurb: "RSC + caching + suspense patterns.",
    },
  ];

  const section = {
    hidden: { opacity: 0, y: 6 },
    show: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pb-12 max-w-[1400px] mx-auto bg-white min-h-screen">
      <motion.div initial="hidden" animate="show" variants={section}>
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
              Credits
            </h1>
            <p className="text-gray-600 mt-1">
              Technologies and acknowledgements
            </p>
          </div>
          <RefreshButton />
        </div>

        {/* Built With */}
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Built With</CardTitle>
            <CardDescription>
              Technologies, libraries, and tools that power{" "}
              <span className="font-medium text-foreground">
                Customer Diary
              </span>
              .
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Core stack */}
            <section>
              <h2 className="mb-3 text-sm font-semibold text-foreground/90">
                Core Stack
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {coreStack.map((item) => (
                  <TechCard key={item.name} item={item} />
                ))}
              </div>
            </section>

            {/* UI / UX */}
            <section>
              <h2 className="mb-3 text-sm font-semibold text-foreground/90">
                UI / UX
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {uiUx.map((item) => (
                  <TechCard key={item.name} item={item} />
                ))}
              </div>
            </section>

            {/* Data / Auth */}
            <section>
              <h2 className="mb-3 text-sm font-semibold text-foreground/90">
                Data &amp; Auth
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {dataAuth.map((item) => (
                  <TechCard key={item.name} item={item} />
                ))}
              </div>
            </section>

            {/* Tooling & more */}
            <section>
              <h2 className="mb-3 text-sm font-semibold text-foreground/90">
                Tooling &amp; More
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {toolingEtc.map((item) => (
                  <TechCard key={item.name} item={item} />
                ))}
              </div>
            </section>
          </CardContent>
        </Card>

        {/* Attribution */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Attribution</CardTitle>
              <CardDescription>Project authors & thanks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                <span className="font-medium">Customer Diary</span> was created
                by <span className="font-medium">Ben</span> and{" "}
                <span className="font-medium">Krona Digital</span>, with support
                from Krona Digital staff members.
              </p>
              <p>
                Design ideation & references were prepared in{" "}
                <span className="font-medium">Figma</span>. UI components are
                built with <span className="font-medium">shadcn/ui</span> and{" "}
                <span className="font-medium">Radix UI</span>, and animated with{" "}
                <span className="font-medium">Framer Motion</span>.
              </p>
              <p className="text-muted-foreground">
                Version: <code>0.1.0</code>
              </p>
            </CardContent>
          </Card>

          {/* Legal & Disclaimers */}
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">
                Legal &amp; Disclaimers
              </CardTitle>
              <CardDescription>
                Copyright, trademarks, and usage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  © {new Date().getFullYear()} Ben &amp; Krona Digital. All
                  rights reserved for application code, branding, and content in
                  this repository unless otherwise stated.
                </li>
                <li>
                  All third-party trademarks, logos, and brand names are the
                  property of their respective owners. Their inclusion is for
                  identification and descriptive purposes only; no endorsement
                  is implied.
                </li>
                <li>
                  This project uses open-source software. Please refer to each
                  project’s repository and LICENSE for exact terms and
                  attributions.
                </li>
                <li className="font-medium">
                  Not affiliated with or endorsed by{" "}
                  <span className="underline decoration-emerald-300/80 underline-offset-2">
                    Burnsco
                  </span>
                  . Ben is a day-to-day staff member at Burnsco; this tool is
                  for personal/operational use by him and{" "}
                  <span className="font-medium">is not Burnsco-approved</span>.
                  Built independently and{" "}
                  <span className="font-medium">not on company time</span>.
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Helpful links */}
        <Card className="mt-6 rounded-2xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Helpful Links</CardTitle>
            <CardDescription>
              Docs & resources you might revisit
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Project README / Docs", href: "#" },
              { name: "Design (Figma)", href: "https://www.figma.com/" },
              { name: "Issue / Feature Requests", href: "/feedback" },
              { name: "Supabase Dashboard", href: "https://app.supabase.com/" },
              {
                name: "Drizzle Studio / Migrations",
                href: "https://orm.drizzle.team/",
              },
              { name: "NextAuth Docs", href: "https://next-auth.js.org/" },
            ].map((l) => (
              <a
                key={l.name}
                href={l.href}
                className="rounded-xl border p-3 text-sm hover:bg-muted transition flex items-center justify-between"
                target={l.href.startsWith("http") ? "_blank" : undefined}
                rel={l.href.startsWith("http") ? "noreferrer" : undefined}
              >
                <span>{l.name}</span>
                <FiExternalLink className="opacity-70" />
              </a>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
