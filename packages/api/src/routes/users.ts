// src/routes/users.ts
import { router, protectedProcedure, TRPCError } from '../trpc.js';
import { users } from '@workspace/db/schema';
import { eq, like } from 'drizzle-orm';
import { z } from 'zod';

export const userRouter = router({
  // Get user profile by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.id),
        columns: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          status: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      return user;
    }),

  // Search users by username
  search: protectedProcedure
    .input(z.object({ 
      query: z.string().min(1),
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ input, ctx }) => {
      const users_result = await ctx.db.query.users.findMany({
        where: like(users.username, `%${input.query}%`),
        limit: input.limit,
        columns: {
          id: true,
          username: true,
          avatar: true,
          status: true,
        },
      });

      return users_result;
    }),

  // Update user profile
  updateProfile: protectedProcedure
    .input(z.object({
      username: z.string().min(3).max(20).optional(),
      avatar: z.string().url().optional(),
      status: z.enum(['online', 'offline', 'away', 'busy']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if username is already taken (if updating username)
      if (input.username) {
        const existingUser = await ctx.db.query.users.findFirst({
          where: eq(users.username, input.username),
        });

        if (existingUser && existingUser.id !== ctx.user.id) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Username is already taken',
          });
        }
      }

      // Update user
      const [updatedUser] = await ctx.db
        .update(users)
        .set({
          ...input,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, ctx.user.id))
        .returning({
          id: users.id,
          username: users.username,
          email: users.email,
          avatar: users.avatar,
          status: users.status,
          updatedAt: users.updatedAt,
        });

      return {
        user: updatedUser,
        message: 'Profile updated successfully',
      };
    }),

  // Update user status
  updateStatus: protectedProcedure
    .input(z.object({
      status: z.enum(['online', 'offline', 'away', 'busy']),
    }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .update(users)
        .set({ 
          status: input.status,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, ctx.user.id));

      return {
        message: 'Status updated successfully',
        status: input.status,
      };
    }),

  // Get all users (admin functionality)
  getAll: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      const allUsers = await ctx.db.query.users.findMany({
        limit: input.limit,
        offset: input.offset,
        columns: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          status: true,
          createdAt: true,
        },
      });

      return allUsers;
    }),
});