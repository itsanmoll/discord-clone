import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

// Create SQLite database connection
const sqlite = new Database("./dev.db");

// Enable WAL mode for better performance and concurrent access
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Create drizzle instance with schema
export const db = drizzle(sqlite, { 
  schema,
  logger: process.env.NODE_ENV === "development"
});

// Export all schema and types
export * from "./schema.js";
export * from "./types.js";

// Export raw sqlite instance for advanced queries
export { sqlite };

// Graceful shutdown
const cleanup = () => {
  console.log("Closing database connection...");
  sqlite.close();
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);