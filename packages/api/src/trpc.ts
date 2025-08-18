// src/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { db } from '@workspace/db';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Create context type
export interface Context {
  db: typeof db;
  user?: {
    id: number;
    username: string;
    email: string;
  };
}

// Create context function
export const createContext = async ({
  req,
  res,
}: CreateExpressContextOptions): Promise<Context> => {
  // Try to get user from JWT token
  let user: Context['user'];
  
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      user = decoded.user;
    } catch (error) {
      // Token invalid, user remains undefined
    }
  }

  return {
    db,
    user,
  };
};

// Initialize tRPC
const t = initTRPC.context<Context>().create();

// Export reusable router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure (requires authentication)
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    });
  }
  
  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // user is now guaranteed to exist
    },
  });
});

// Helper for creating authenticated context
export const createAuthenticatedContext = (user: NonNullable<Context['user']>): Context => ({
  db,
  user,
});

export { TRPCError };