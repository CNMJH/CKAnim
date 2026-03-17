import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/db.js';
import { authenticate } from '../middleware/auth.js';
import {
  getUploadToken,
  generateFileKey,
  getFileUrl,
  deleteFile,
} from '../lib/qiniu.js';

export const videoRoutes: FastifyPluginAsync = async (server) => {
  // 获取视频列表
  server.get('/videos', async (request, reply) => {
    try {
      const { gameId, published, page = 1, limit = 20 } =
        request.query as unknown as {
          gameId?: string;
          published?: boolean;
          page?: number;
          limit?: number;
        };

      const where: any = {};
      if (gameId) {
        where.gameId = parseInt(gameId);
      }
      if (published !== undefined) {
        where.published = published;
      }

      const [videos, total] = await Promise.all([
        prisma.video.findMany({
          where,
          orderBy: { order: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            game: {
              select: {
                id: true,
                name: true,
              },
            },
            categories: {
              select: {
                id: true,
                name: true,
                level: true,
              },
            },
            tags: {
              select: {
                id: true,
                name: true,
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

  // 搜索视频（支持按标签搜索）
  server.get('/videos/search', async (request, reply) => {
    try {
      const { q, page = 1, limit = 20 } = request.query as unknown as {
        q?: string;
        page?: number;
        limit?: number;
      };

      const where: any = {
        published: true, // 只搜索已发布的视频
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

  // 获取单个视频
  server.get('/videos/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const videoId = parseInt(id);

      const video = await prisma.video.findUnique({
        where: { id: videoId },
        include: {
          game: true,
          categories: true,
        },
      });

      if (!video) {
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

  // 获取七牛云上传凭证（支持分类路径）
  server.post(
    '/videos/upload-token',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { filename, gameId, categoryIds = [] } = request.body as {
          filename: string;
          gameId?: number;
          categoryIds?: number[];
        };

        if (!filename) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Filename is required',
          });
        }

        // 获取分类信息（用于生成文件夹路径）
        let categoryPath = '';
        if (categoryIds.length > 0) {
          const categories = await prisma.gameCategory.findMany({
            where: { id: { in: categoryIds } },
            orderBy: { level: 'asc' },
          });
          
          // 取最高层级的分类作为文件夹路径
          const maxLevelCategory = categories.reduce((max, cat) => 
            cat.level > (max?.level || 0) ? cat : max, null);
          
          if (maxLevelCategory) {
            // 构建完整分类路径（从根到当前层级）
            const pathParts = [];
            let current = maxLevelCategory;
            
            // 向上追溯父分类，构建完整路径
            while (current) {
              pathParts.unshift(current.name);
              if (current.parentId) {
                current = await prisma.gameCategory.findUnique({
                  where: { id: current.parentId },
                });
              } else {
                break;
              }
            }
            
            categoryPath = pathParts.join('/');
          }
        }

        // 生成文件 key（带分类路径）
        const key = generateFileKey(filename, gameId, categoryPath);

        // 生成上传凭证
        const token = getUploadToken(key);

        reply.send({
          token,
          key,
          url: getFileUrl(key),
        });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to generate upload token',
        });
      }
    }
  );

  // 创建视频记录（上传完成后调用）
  server.post(
    '/videos',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const {
          title,
          description,
          gameId,
          qiniuKey,
          qiniuUrl,
          duration,
          thumbnail,
          categoryIds = [],
          tagIds = [],
          order = 0,
        } = request.body as {
          title: string;
          description?: string;
          gameId: number;
          qiniuKey: string;
          qiniuUrl: string;
          duration?: number;
          thumbnail?: string;
          categoryIds?: number[];
          tagIds?: number[];
          order?: number;
        };

        if (!title || !gameId || !qiniuKey || !qiniuUrl) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Title, gameId, qiniuKey, and qiniuUrl are required',
          });
        }

        // 验证游戏
        const game = await prisma.game.findUnique({
          where: { id: gameId },
        });

        if (!game) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Game not found',
          });
        }

        // 创建视频
        const video = await prisma.video.create({
          data: {
            title,
            description,
            gameId,
            qiniuKey,
            qiniuUrl,
            duration,
            thumbnail,
            order,
            published: false,
            categories: categoryIds.length
              ? {
                  connect: categoryIds.map((id) => ({ id })),
                }
              : undefined,
            tags: tagIds.length
              ? {
                  connect: tagIds.map((id) => ({ id })),
                }
              : undefined,
          },
          include: {
            categories: true,
            tags: true,
          },
        });

        reply.code(201).send(video);
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to create video',
        });
      }
    }
  );

  // 更新视频
  server.put(
    '/videos/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const videoId = parseInt(id);
        const {
          title,
          description,
          duration,
          thumbnail,
          order,
          published,
          categoryIds,
          tagIds,
        } = request.body as {
          title?: string;
          description?: string;
          duration?: number;
          thumbnail?: string;
          order?: number;
          published?: boolean;
          categoryIds?: number[];
          tagIds?: number[];
        };

        // 检查视频是否存在
        const existing = await prisma.video.findUnique({
          where: { id: videoId },
        });

        if (!existing) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Video not found',
          });
        }

        // 更新视频
        const video = await prisma.video.update({
          where: { id: videoId },
          data: {
            title,
            description,
            duration,
            thumbnail,
            order,
            published,
            categories: categoryIds
              ? {
                  set: categoryIds.map((id) => ({ id })),
                }
              : undefined,
            tags: tagIds
              ? {
                  set: tagIds.map((id) => ({ id })),
                }
              : undefined,
          },
          include: {
            categories: true,
            tags: true,
          },
        });

        reply.send(video);
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to update video',
        });
      }
    }
  );

  // 删除视频
  server.delete(
    '/videos/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const videoId = parseInt(id);

        // 检查视频是否存在
        const existing = await prisma.video.findUnique({
          where: { id: videoId },
        });

        if (!existing) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Video not found',
          });
        }

        // 删除七牛云文件
        try {
          await deleteFile(existing.qiniuKey);
          server.log.info(`Deleted qiniu file: ${existing.qiniuKey}`);
        } catch (error) {
          server.log.warn(`Failed to delete qiniu file: ${existing.qiniuKey}`);
        }

        // 删除数据库记录
        await prisma.video.delete({
          where: { id: videoId },
        });

        reply.code(204).send();
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to delete video',
        });
      }
    }
  );
};
