import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import dotenv from 'dotenv';
import { writeFileSync } from 'fs';
import { authRoutes } from './routes/auth';
import { gameRoutes } from './routes/games';
import { categoryRoutes } from './routes/categories';
import { videoRoutes } from './routes/videos';
import { tagRoutes } from './routes/tags';
import { publicVideoRoutes } from './routes/public-videos';
import { publicCharacterRoutes } from './routes/public-characters';
import { publicGameRoutes } from './routes/public-games';
import { characterRoutes } from './routes/characters';
import { actionRoutes } from './routes/actions';
import { settingsRoutes } from './routes/settings';
import { userRoutes } from './routes/users';
import { vipRoutes } from './routes/vip';
import { favoriteRoutes } from './routes/favorites';
import { databaseRoutes } from './routes/database';
import { carouselRoutes } from './routes/carousels';

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
// 公开路由（前台网站使用）
await server.register(publicGameRoutes, { prefix: '/api' });
await server.register(publicVideoRoutes, { prefix: '/api' });
await server.register(publicCharacterRoutes, { prefix: '/api' });

// 管理员路由（需要认证）
await server.register(userRoutes, { prefix: '/api' });
await server.register(vipRoutes, { prefix: '/api' });
await server.register(favoriteRoutes, { prefix: '/api' });
await server.register(authRoutes, { prefix: '/api/admin' });
await server.register(gameRoutes, { prefix: '/api/admin' });
await server.register(categoryRoutes, { prefix: '/api/admin' });
await server.register(videoRoutes, { prefix: '/api/admin' });
await server.register(tagRoutes, { prefix: '/api/admin' });
await server.register(characterRoutes, { prefix: '/api/admin' });
await server.register(actionRoutes, { prefix: '/api/admin' });
await server.register(settingsRoutes, { prefix: '/api' });
await server.register(databaseRoutes, { prefix: '/api/admin' });

// 轮播图路由：公开 + 管理员
await server.register(carouselRoutes, { prefix: '/api' }); // /api/carousels/active（公开）
await server.register(carouselRoutes, { prefix: '/api/admin' }); // /api/admin/carousels/*（管理员）

writeFileSync('/tmp/server_startup.log', `Server started at ${new Date().toISOString()}\nRoutes: auth, games, categories, videos, tags, actions\n`, { append: true });

console.log('✅ All routes registered, including tags!');

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
