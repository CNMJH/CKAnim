import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import dotenv from 'dotenv';
import { authRoutes } from './routes/auth.js';
import { gameRoutes } from './routes/games.js';
import { categoryRoutes } from './routes/categories.js';
import { videoRoutes } from './routes/videos.js';

dotenv.config();

const server = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});

// 注册插件
await server.register(cors, {
  origin: true,
  credentials: true,
});

await server.register(jwt, {
  secret: process.env.JWT_SECRET || 'default-secret',
  sign: {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
});

await server.register(multipart, {
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB 限制
  },
});

// 注册路由
await server.register(authRoutes, { prefix: '/api/admin' });
await server.register(gameRoutes, { prefix: '/api/admin' });
await server.register(categoryRoutes, { prefix: '/api/admin' });
await server.register(videoRoutes, { prefix: '/api/admin' });

// 健康检查
server.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// 启动服务器
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3002');
    const host = '0.0.0.0';
    
    await server.listen({ port, host });
    console.log(`🚀 Server running at http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
