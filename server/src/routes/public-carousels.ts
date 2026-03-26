import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/db';

/**
 * 轮播图公开路由（前台使用）
 * 注册路径：/api/carousels/*
 */
export const publicCarouselRoutes: FastifyPluginAsync = async (server) => {
  /**
   * GET /api/carousels/active
   * 获取当前有效的轮播图（公开访问）
   */
  server.get('/active', {
    async handler(request, reply) {
      try {
        const now = new Date();
        
        // 获取所有激活且未过期的轮播图
        const carousels = await prisma.carousel.findMany({
          where: {
            active: true,
            endTime: { gte: now },
          },
          orderBy: [
            { isDefault: 'desc' }, // 默认轮播图优先
            { order: 'asc' },
            { createdAt: 'desc' },
          ],
        });
        
        return reply.send({ carousels });
      } catch (error: any) {
        request.log.error('获取活跃轮播图失败:', error);
        return reply.code(500).send({ 
          error: 'Internal Server Error',
          message: error.message 
        });
      }
    },
  });
};
