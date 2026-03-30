import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import dotenv from 'dotenv';
import { writeFileSync, appendFileSync } from 'fs';
import { pipeline } from 'stream/promises';
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
import { publicCarouselRoutes } from './routes/public-carousels';
import { userLibraryRoutes } from './routes/user-library';
import { lotteryRoutes } from './routes/lottery';
import path from 'path';
import fs from 'fs';

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
await server.register(publicCarouselRoutes, { prefix: '/api/carousels' }); // /api/carousels/active（公开）
await server.register(carouselRoutes, { prefix: '/api/admin/carousels' }); // /api/admin/carousels/*（管理员）

// 用户个人参考库路由
await server.register(userLibraryRoutes, { prefix: '/api' });

// 每日抽奖路由
await server.register(lotteryRoutes, { prefix: '/api' });

// 通用上传路由（供前端各页面使用）
server.post('/api/admin/upload', {
  preHandler: [async (request, reply) => {
    // 简单的 JWT 认证
    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return reply.code(401).send({ error: 'Unauthorized', message: '未提供 token' });
      }
      await request.server.jwt.verify(token);
    } catch (error) {
      return reply.code(401).send({ error: 'Unauthorized', message: 'Token 无效' });
    }
  }],
  async handler(request, reply) {
    console.log('===== UPLOAD HANDLER CALLED =====');
    try {
      console.log('Inside try block, calling request.file()...');
      request.server.log.info('Upload request received');
      const data = await request.file();
      console.log('request.file() returned:', data ? 'success' : 'null');
      request.server.log.info('File data received: ' + (data ? 'yes' : 'no'));
      
      if (!data) {
        return reply.code(400).send({ 
          error: 'Bad Request',
          message: '未找到上传文件' 
        });
      }
      
      request.server.log.info('File mimetype: ' + data.mimetype);
      request.server.log.info('File filename: ' + data.filename);
      
      // 验证文件类型
      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedMimes.includes(data.mimetype)) {
        return reply.code(400).send({ 
          error: 'Bad Request',
          message: '只支持图片文件（JPG, PNG, WebP, GIF）' 
        });
      }
      
      // 根据 type 参数决定保存位置
      const uploadType = (request.body as any)?.type || 'carousel';
      request.server.log.info('Upload type: ' + uploadType);
      let uploadDir = '/var/www/ckanim/public/carousel-images';
      let urlBase = 'https://anick.cn/static/carousel-images';
      
      if (uploadType === 'avatar') {
        uploadDir = '/var/www/ckanim/public/avatars';
        urlBase = 'https://anick.cn/static/avatars';
      }
      
      // 生成文件名
      const timestamp = Date.now();
      const ext = path.extname(data.filename);
      const filename = `${timestamp}-${Math.random().toString(36).substring(2, 8)}${ext}`;
      const filePath = path.join(uploadDir, filename);
      request.server.log.info('File path: ' + filePath);
      
      // 确保目录存在
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // 保存文件（使用 toBuffer() 正确处理 stream）
      request.server.log.info('Starting file save with toBuffer()...');
      const buffer = await data.toBuffer();
      request.server.log.info('Buffer size: ' + buffer.length + ' bytes');
      await fs.promises.writeFile(filePath, buffer);
      request.server.log.info('File saved successfully');
      
      // 生成 URL
      const url = `${urlBase}/${filename}`;
      request.server.log.info('Upload complete: ' + url);
      
      return reply.send({ url });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : 'No stack';
      console.error('===== UPLOAD ERROR =====');
      console.error('Message:', errorMessage);
      console.error('Stack:', errorStack);
      console.error('========================');
      return reply.code(500).send({ 
        error: 'Internal Server Error',
        message: `上传失败：${errorMessage}` 
      });
    }
  }
});

appendFileSync('/tmp/server_startup.log', `Server started at ${new Date().toISOString()}\nRoutes: auth, games, categories, videos, tags, actions\n`);

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
