import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import * as schema from "./schema";

// User types
export type User = InferSelectModel<typeof schema.users>;
export type NewUser = InferInsertModel<typeof schema.users>;

// Server types
export type Server = InferSelectModel<typeof schema.servers>;
export type NewServer = InferInsertModel<typeof schema.servers>;

// Server member types
export type ServerMember = InferSelectModel<typeof schema.serverMembers>;
export type NewServerMember = InferInsertModel<typeof schema.serverMembers>;

// Channel types
export type Channel = InferSelectModel<typeof schema.channels>;
export type NewChannel = InferInsertModel<typeof schema.channels>;

// Message types
export type Message = InferSelectModel<typeof schema.messages>;
export type NewMessage = InferInsertModel<typeof schema.messages>;

// Friendship types
export type Friendship = InferSelectModel<typeof schema.friendships>;
export type NewFriendship = InferInsertModel<typeof schema.friendships>;

// Direct message types
export type DirectMessage = InferSelectModel<typeof schema.directMessages>;
export type NewDirectMessage = InferInsertModel<typeof schema.directMessages>;

// Session types
export type Session = InferSelectModel<typeof schema.sessions>;
export type NewSession = InferInsertModel<typeof schema.sessions>;

// Extended types with relations
export type ServerWithChannels = Server & {
  channels: Channel[];
  members: (ServerMember & { user: User })[];
};

export type MessageWithUser = Message & {
  user: User;
};

export type ChannelWithMessages = Channel & {
  messages: MessageWithUser[];
};