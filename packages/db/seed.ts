import { db } from "./index.js";
import { users, servers, channels, serverMembers, messages } from "./schema.js";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Create demo users
    const [alice] = await db.insert(users).values({
      username: "alice",
      email: "alice@example.com",
      status: "online"
    }).returning();

    const [bob] = await db.insert(users).values({
      username: "bob", 
      email: "bob@example.com",
      status: "online"
    }).returning();

    console.log("👥 Created users:", alice.username, bob.username);

    // Create demo server
    const [server] = await db.insert(servers).values({
      name: "Discord Clone Demo",
      description: "Welcome to our Discord clone!",
      ownerId: alice.id,
      inviteCode: "demo123"
    }).returning();

    console.log("🏠 Created server:", server.name);

    // Add users to server
    await db.insert(serverMembers).values([
      { userId: alice.id, serverId: server.id, role: "owner" },
      { userId: bob.id, serverId: server.id, role: "member" }
    ]);

    // Create demo channels
    const [generalChannel] = await db.insert(channels).values({
      name: "general",
      description: "General chat",
      serverId: server.id,
      position: 0
    }).returning();

    const [randomChannel] = await db.insert(channels).values({
      name: "random", 
      description: "Random discussions",
      serverId: server.id,
      position: 1
    }).returning();

    console.log("📺 Created channels:", generalChannel.name, randomChannel.name);

    // Create demo messages
    await db.insert(messages).values([
      {
        content: "Welcome to the server! 👋",
        userId: alice.id,
        channelId: generalChannel.id
      },
      {
        content: "Thanks! Excited to be here!",
        userId: bob.id, 
        channelId: generalChannel.id
      },
      {
        content: "This is working great! 🚀",
        userId: alice.id,
        channelId: randomChannel.id
      }
    ]);

    console.log("💬 Created demo messages");
    console.log("✅ Seeding completed!");

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
}

// Run seed if this file is executed directly
if (import.meta.main) {
  seed().catch(console.error);
}

export { seed };