
import { pgTable, text, timestamp, boolean, integer, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'

// Helper for generating IDs
const id = () => text('id').primaryKey().$defaultFn(() => createId())
const timestamps = {
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}

// PostgreSQL Enums (better than text constraints)
export const roleEnum = pgEnum('role', ['owner', 'admin', 'moderator', 'member'])
export const channelTypeEnum = pgEnum('channel_type', ['text', 'voice'])
export const friendshipStatusEnum = pgEnum('friendship_status', ['pending', 'accepted', 'blocked'])

//
// USERS TABLE
//
export const users = pgTable('users', {
  id: id(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  avatar: text('avatar'),
  ...timestamps,
})

//
// SERVERS TABLE  
//
export const servers = pgTable('servers', {
  id: id(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  inviteCode: text('invite_code').notNull().unique().$defaultFn(() => createId()),
  ownerId: text('owner_id').notNull(),
  ...timestamps,
})

//
// SERVER MEMBERS TABLE (Junction table)
//
export const serverMembers = pgTable('server_members', {
  id: id(),
  userId: text('user_id').notNull(),
  serverId: text('server_id').notNull(),
  role: roleEnum('role').notNull().default('member'),
  nickname: text('nickname'),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
})

//
// CHANNELS TABLE
//
export const channels = pgTable('channels', {
  id: id(),
  serverId: text('server_id').notNull(),
  name: text('name').notNull(),
  topic: text('topic'),
  type: channelTypeEnum('type').notNull().default('text'),
  position: integer('position').notNull().default(0),
  ...timestamps,
})

//
// MESSAGES TABLE
//
export const messages = pgTable('messages', {
  id: id(),
  channelId: text('channel_id').notNull(),
  authorId: text('author_id').notNull(),
  content: text('content').notNull(),
  edited: boolean('edited').notNull().default(false),
  ...timestamps,
})

//
// FRIENDSHIPS TABLE
//
export const friendships = pgTable('friendships', {
  id: id(),
  fromUserId: text('from_user_id').notNull(),
  toUserId: text('to_user_id').notNull(),
  status: friendshipStatusEnum('status').notNull().default('pending'),
  ...timestamps,
})

//
// RELATIONS (Drizzle's powerful relational queries)
//

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  messages: many(messages),
  serverMembers: many(serverMembers),
  sentFriendRequests: many(friendships, { relationName: 'sender' }),
  receivedFriendRequests: many(friendships, { relationName: 'receiver' }),
}))

// Server relations
export const serversRelations = relations(servers, ({ many, one}) => ({
  members: many(serverMembers),
  channels: many(channels),
  owner: one(users, {
    fields: [servers.ownerId],
    references: [users.id],
    }),

}))

// ServerMember relations
export const serverMembersRelations = relations(serverMembers, ({ one }) => ({
  user: one(users, {
    fields: [serverMembers.userId],
    references: [users.id],
  }),
  server: one(servers, {
    fields: [serverMembers.serverId], 
    references: [servers.id],
  }),
}))

// Channel relations
export const channelsRelations = relations(channels, ({ one, many }) => ({
  server: one(servers, {
    fields: [channels.serverId],
    references: [servers.id],
  }),
  messages: many(messages),
}))

// Message relations
export const messagesRelations = relations(messages, ({ one }) => ({
  author: one(users, {
    fields: [messages.authorId],
    references: [users.id],
  }),
  channel: one(channels, {
    fields: [messages.channelId],
    references: [channels.id],
  }),
}))

// Friendship relations
export const friendshipsRelations = relations(friendships, ({ one }) => ({
  sender: one(users, {
    fields: [friendships.fromUserId],
    references: [users.id],
    relationName: 'sender',
  }),
  receiver: one(users, {
    fields: [friendships.toUserId],
    references: [users.id],
    relationName: 'receiver',
  }),
}))

// Export schema for drizzle-kit
export const schema = {
  users,
  servers, 
  serverMembers,
  channels,
  messages,
  friendships,
  usersRelations,
  serversRelations,
  serverMembersRelations,
  channelsRelations,
  messagesRelations,
  friendshipsRelations,
}