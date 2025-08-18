// src/routes/auth.ts
import { router, publicProcedure, TRPCError } from '../trpc.js';
import { users } from '@workspace/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { nanoid } from 'nanoid';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Input validation schemas
const registerSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const authRouter = router({
  // Register new user
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input, ctx }) => {
      const { username, email, password } = input;

      // Check if user already exists
      const existingUser = await ctx.db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User with this email already exists',
        });
      }

      // Check username availability
      const existingUsername = await ctx.db.query.users.findFirst({
        where: eq(users.username, username),
      });

      if (existingUsername) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Username is already taken',
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const [newUser] = await ctx.db
        .insert(users)
        .values({
          username,
          email,
          password: hashedPassword, // Now we can store the password
        })
        .returning({
          id: users.id,
          username: users.username,
          email: users.email,
          createdAt: users.createdAt,
        });

      // Generate JWT token
      const token = jwt.sign(
        { 
          user: { 
            id: newUser.id, 
            username: newUser.username, 
            email: newUser.email 
          } 
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        user: newUser,
        token,
        message: 'User registered successfully',
      };
    }),

  // Login existing user
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      const { email, password } = input;

      // Find user by email (include password for verification)
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.email, email),
        columns: {
          id: true,
          username: true,
          email: true,
          password: true, // Include password for verification
          avatar: true,
          status: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          user: { 
            id: user.id, 
            username: user.username, 
            email: user.email 
          } 
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        token,
        message: 'Login successful',
      };
    }),

  // Get current user profile
  me: publicProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user) {
        return null;
      }

      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
      });

      return user ? {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        createdAt: user.createdAt,
      } : null;
    }),
});