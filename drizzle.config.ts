// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

function parseDatabaseUrl(url: string) {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || "5432"),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.slice(1), // Remove leading slash
    };
  } catch (error) {
    console.error("Failed to parse DATABASE_URL:", error);
    return null;
  }
}

export default defineConfig({
  schema: "./src/app/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: (() => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is required");
    }

    const parsed = parseDatabaseUrl(databaseUrl);
    if (!parsed) {
      throw new Error("Invalid DATABASE_URL format");
    }

    // Debug: log the parsed connection details (without password)
    console.log("Connecting to database:", {
      host: parsed.host,
      port: parsed.port,
      user: parsed.user,
      database: parsed.database,
      ssl: process.env.NODE_ENV === "production" ? "enabled" : "disabled",
    });

    return {
      ...parsed,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
    };
  })(),
  verbose: true,
  strict: true,
});
