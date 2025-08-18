// src/routes/servers.ts
import { router, protectedProcedure, TRPCError } from '../trpc.js';
import { servers, serverMembers, channels, users } from '@workspace/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { nanoid } from 'nanoid';

export const serverRouter = router({
  // Create a new server
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      icon: z.string().url().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Create server
      const [newServer] = await ctx.db
        .insert(servers)
        .values({
          name: input.name,
          description: input.description,
          icon: input.icon,
          ownerId: ctx.user.id,
          inviteCode: nanoid(8),
        })
        .returning();

      // Add creator as owner member
      await ctx.db
        .insert(serverMembers)
        .values({
          userId: ctx.user.id,
          serverId: newServer.id,
          role: 'owner',
        });

      // Create default channels
      await ctx.db
        .insert(channels)
        .values([
          {
            name: 'general',
            description: 'General discussion',
            serverId: newServer.id,
            position: 0,
          },
          {
            name: 'random',
            description: 'Random chat',
            serverId: newServer.id,
            position: 1,
          },
        ]);

      return {
        server: newServer,
        message: 'Server created successfully',
      };
    }),

  // Get user's servers
  getUserServers: protectedProcedure
    .query(async ({ ctx }) => {
      const userServers = await ctx.db.query.serverMembers.findMany({
        where: eq(serverMembers.userId, ctx.user.id),
        with: {
          server: {
            columns: {
              id: true,
              name: true,
              description: true,
              icon: true,
              inviteCode: true,
              createdAt: true,
            },
          },
        },
      });

      return userServers.map(membership => ({
        ...membership.server,
        memberRole: membership.role,
        joinedAt: membership.joinedAt,
      }));
    }),

  // Get server details with channels and members
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      // Check if user is member of this server
      const membership = await ctx.db.query.serverMembers.findFirst({
        where: and(
          eq(serverMembers.serverId, input.id),
          eq(serverMembers.userId, ctx.user.id)
        ),
      });

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not a member of this server',
        });
      }

      // Get server with channels and members
      const server = await ctx.db.query.servers.findFirst({
        where: eq(servers.id, input.id),
        with: {
          channels: {
            orderBy: (channels, { asc }) => [asc(channels.position)],
          },
          members: {
            with: {
              user: {
                columns: {
                  id: true,
                  username: true,
                  avatar: true,
                  status: true,
                },
              },
            },
          },
        },
      });

      if (!server) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Server not found',
        });
      }

      return {
        ...server,
        userRole: membership.role,
      };
    }),

  // Join server by invite code
  join: protectedProcedure
    .input(z.object({ inviteCode: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Find server by invite code
      const server = await ctx.db.query.servers.findFirst({
        where: eq(servers.inviteCode, input.inviteCode),
      });

      if (!server) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invalid invite code',
        });
      }

      // Check if user is already a member
      const existingMembership = await ctx.db.query.serverMembers.findFirst({
        where: and(
          eq(serverMembers.serverId, server.id),
          eq(serverMembers.userId, ctx.user.id)
        ),
      });

      if (existingMembership) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'You are already a member of this server',
        });
      }

      // Add user to server
      await ctx.db
        .insert(serverMembers)
        .values({
          userId: ctx.user.id,
          serverId: server.id,
          role: 'member',
        });

      return {
        server,
        message: `Successfully joined ${server.name}`,
      };
    }),

  // Leave server
  leave: protectedProcedure
    .input(z.object({ serverId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Check if user is member
      const membership = await ctx.db.query.serverMembers.findFirst({
        where: and(
          eq(serverMembers.serverId, input.serverId),
          eq(serverMembers.userId, ctx.user.id)
        ),
      });

      if (!membership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'You are not a member of this server',
        });
      }

      // Owners cannot leave their own server
      if (membership.role === 'owner') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Server owners cannot leave their own server',
        });
      }

      // Remove membership
      await ctx.db
        .delete(serverMembers)
        .where(and(
          eq(serverMembers.serverId, input.serverId),
          eq(serverMembers.userId, ctx.user.id)
        ));

      return {
        message: 'Successfully left the server',
      };
    }),

  // Update server (owner/admin only)
  update: protectedProcedure
    .input(z.object({
      serverId: z.number(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      icon: z.string().url().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if user has permission to update
      const membership = await ctx.db.query.serverMembers.findFirst({
        where: and(
          eq(serverMembers.serverId, input.serverId),
          eq(serverMembers.userId, ctx.user.id)
        ),
      });

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this server',
        });
      }

      // Update server
      const [updatedServer] = await ctx.db
        .update(servers)
        .set({
          name: input.name,
          description: input.description,
          icon: input.icon,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(servers.id, input.serverId))
        .returning();

      return {
        server: updatedServer,
        message: 'Server updated successfully',
      };
    }),
});