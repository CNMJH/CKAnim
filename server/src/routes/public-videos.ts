import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/db.js';

export const publicVideoRoutes: FastifyPluginAsync = async (server) => {
  // 获取视频列表（公开，只显示已发布）
  server.get('/videos', async (request, reply) => {
    try {
      const { gameId, page = 1, limit = 20 } = request.query as unknown as {
        gameId?: string;
        page?: number;
        limit?: number;
      };

      const where: any = {
        published: true,
      };

      if (gameId) {
        where.gameId = parseInt(gameId);
      }

      const [videos, total] = await Promise.all([
        prisma.video.findMany({
          where,
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
          include: {
            game: {
              select: {
                id: true,
                name: true,
                icon: true,
              },
            },
            categories: {
              select: {
                id: true,
                name: true,
                level: true,
              },
            },
          },
        }),
        prisma.video.count({ where }),
      ]);

      reply.send({
        videos,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      server.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get videos',
      });
    }
  });

  // 搜索视频（公开，支持按标签搜索）
  server.get('/videos/search', async (request, reply) => {
    try {
      const { q, page = 1, limit = 20 } = request.query as unknown as {
        q?: string;
        page?: number;
        limit?: number;
      };

      const where: any = {
        published: true,
      };

      // 如果有搜索关键词，搜索标题或标签
      if (q && q.trim()) {
        const searchQuery = q.trim();
        where.OR = [
          {
            title: {
              contains: searchQuery,
            },
          },
          {
            tags: {
              some: {
                name: {
                  contains: searchQuery,
                },
              },
            },
          },
        ];
      }

      const [videos, total] = await Promise.all([
        prisma.video.findMany({
          where,
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
          include: {
            game: {
              select: {
                id: true,
                name: true,
                icon: true,
              },
            },
            categories: {
              select: {
                id: true,
                name: true,
                level: true,
              },
            },
            // 注意：搜索结果中不包含 tags（前端不展示）
          },
        }),
        prisma.video.count({ where }),
      ]);

      reply.send({
        videos,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      server.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to search videos',
      });
    }
  });

  // 获取单个视频（公开）
  server.get('/videos/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const videoId = parseInt(id);

      const video = await prisma.video.findUnique({
        where: { id: videoId },
        include: {
          game: {
            select: {
              id: true,
              name: true,
              icon: true,
            },
          },
          categories: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
        },
      });

      if (!video) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Video not found',
        });
      }

      // 只返回已发布的视频
      if (!video.published) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Video not found',
        });
      }

      reply.send(video);
    } catch (error) {
      server.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get video',
      });
    }
  });
};
