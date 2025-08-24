import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/app/db/schema";

const globalForDb = globalThis as unknown as {
  __pg?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__pg ??
  postgres(process.env.DATABASE_URL!, {
    ssl: {
      rejectUnauthorized: false, // Allow self-signed certificates
    },
    prepare: false, // per Supabase doc for pooler
    max: 10,
  });

globalForDb.__pg = client;

export const sqlClient = client; // <-- add this export
export const db = drizzle(client, { schema });
export type DB = typeof db;
export { schema };
