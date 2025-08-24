import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const globalForDb = globalThis as unknown as {
  __dbPool?: Pool;
  __dbClient?: ReturnType<typeof drizzle>;
};

export const pool: Pool =
  globalForDb.__dbPool ??
  new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false, // Allow self-signed certificates
    },
  });
export const db = globalForDb.__dbClient ?? drizzle(pool);

if (!globalForDb.__dbPool) globalForDb.__dbPool = pool;
if (!globalForDb.__dbClient) globalForDb.__dbClient = db;

export type DbClient = typeof db;
