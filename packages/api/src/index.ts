// src/index.ts
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './router.js';
import { createContext } from './trpc.js';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));

app.use(express.json());

// tRPC middleware
app.use(
  '/api/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Socket.io for real-time features
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join user to their rooms (servers/channels)
  socket.on('join-server', (serverId: string) => {
    socket.join(`server-${serverId}`);
    console.log(`User ${socket.id} joined server ${serverId}`);
  });

  socket.on('leave-server', (serverId: string) => {
    socket.leave(`server-${serverId}`);
    console.log(`User ${socket.id} left server ${serverId}`);
  });

  socket.on('join-channel', (channelId: string) => {
    socket.join(`channel-${channelId}`);
    console.log(`User ${socket.id} joined channel ${channelId}`);
  });

  socket.on('leave-channel', (channelId: string) => {
    socket.leave(`channel-${channelId}`);
    console.log(`User ${socket.id} left channel ${channelId}`);
  });

  // Handle real-time messaging
  socket.on('send-message', (data: {
    channelId: string;
    content: string;
    userId: number;
    username: string;
  }) => {
    // Broadcast message to all users in the channel
    socket.to(`channel-${data.channelId}`).emit('new-message', {
      id: Date.now(), // Temporary ID, should be from database
      content: data.content,
      userId: data.userId,
      username: data.username,
      channelId: data.channelId,
      createdAt: new Date().toISOString(),
    });
  });

  // Handle user status updates
  socket.on('status-update', (data: {
    userId: number;
    status: 'online' | 'offline' | 'away' | 'busy';
  }) => {
    // Broadcast status update to all connected clients
    socket.broadcast.emit('user-status-update', data);
  });

  // Handle typing indicators
  socket.on('typing-start', (data: {
    channelId: string;
    userId: number;
    username: string;
  }) => {
    socket.to(`channel-${data.channelId}`).emit('user-typing', {
      userId: data.userId,
      username: data.username,
      channelId: data.channelId,
    });
  });

  socket.on('typing-stop', (data: {
    channelId: string;
    userId: number;
  }) => {
    socket.to(`channel-${data.channelId}`).emit('user-stopped-typing', {
      userId: data.userId,
      channelId: data.channelId,
    });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 tRPC API available at http://localhost:${PORT}/api/trpc`);
  console.log(`🔌 Socket.IO ready for real-time connections`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { io };