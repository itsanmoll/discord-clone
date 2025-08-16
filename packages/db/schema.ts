import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const servers = sqliteTable("servers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const channels = sqliteTable("channels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  serverId: integer("server_id")
    .notNull()
    .references(() => servers.id, { onDelete: "cascade" }),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  content: text("content").notNull(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  channelId: integer("channel_id")
    .notNull()
    .references(() => channels.id, { onDelete: "cascade" })
    .indexed(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});
