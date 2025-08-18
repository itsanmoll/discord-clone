// src/router.ts
import { router } from './trpc.js';
import { authRouter } from './routes/auth.js';
import { userRouter } from './routes/users.js';
import { serverRouter } from './routes/servers.js';

export const appRouter = router({
  auth: authRouter,
  users: userRouter,
  servers: serverRouter,
});

export type AppRouter = typeof appRouter;