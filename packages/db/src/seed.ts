import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

// Clear existing data
await db.delete(schema.messages);
await db.delete(schema.channels);
await db.delete(schema.serverMembers);
await db.delete(schema.servers);
await db.delete(schema.friendships);
await db.delete(schema.users);

async function main() {
  // Insert sample users
  const insertedUsers = await db
    .insert(schema.users)
    .values([
      { username: "anmol", email: "anmol@example.com" },
      { username: "john", email: "john@example.com" },
    ])
    .returning();

  const [user1, user2] = insertedUsers;
  if (!user1 || !user2) throw new Error("Failed to insert users");

  // Insert a server
  const insertedServers = await db
    .insert(schema.servers)
    .values({
      name: "Test Server",
      ownerId: user1.id,
    })
    .returning();

  const server = insertedServers[0];
  if (!server) throw new Error("Failed to insert server");

  // Insert a channel
  const insertedChannels = await db
    .insert(schema.channels)
    .values({
      name: "general",
      type: "text",
      serverId: server.id,
    })
    .returning();

  const channel = insertedChannels[0];
  if (!channel) throw new Error("Failed to insert channel");

  // Insert some messages
  await db.insert(schema.messages).values([
    { content: "Hello world!", authorId: user1.id, channelId: channel.id },
    { content: "Hi Anmol!", authorId: user2.id, channelId: channel.id },
  ]);

  console.log("✅ Seed data inserted successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
