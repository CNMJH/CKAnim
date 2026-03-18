import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/db.js';
import { authenticate } from '../middleware/auth.js';
import { getUploadToken, generateIconKey, getFileUrl } from '../lib/qiniu.js';

export const categoryRoutes: FastifyPluginAsync = async (server) => {
  // 获取游戏的分类树
  server.get('/games/:gameId/categories', async (request, reply) => {
    try {
      const { gameId } = request.params as { gameId: string };
      const id = parseInt(gameId);

      // 检查游戏是否存在
      const game = await prisma.game.findUnique({
        where: { id },
      });

      if (!game) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Game not found',
        });
      }

      // 获取一级分类
      const categories = await prisma.gameCategory.findMany({
        where: { gameId: id, level: 1 },
        orderBy: { order: 'asc' },
        include: {
          children: {
            orderBy: { order: 'asc' },
            include: {
              children: {
                orderBy: { order: 'asc' },
                include: {
                  children: {
                    orderBy: { order: 'asc' },
                    include: {
                      children: {
                        orderBy: { order: 'asc' },
                        include: {
                          children: {
                            orderBy: { order: 'asc' },
                            include: {
                              children: {
                                orderBy: { order: 'asc' },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      reply.send(categories);
    } catch (error) {
      server.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get categories',
      });
    }
  });

  // 创建分类
  server.post(
    '/categories',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { name, level, parentId, gameId, order = 0, iconUrl } = request.body as {
          name: string;
          level: number;
          parentId?: number;
          gameId?: number;
          order?: number;
          iconUrl?: string;
        };

        if (!name || !level) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Name and level are required',
          });
        }

        if (level < 1 || level > 7) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Level must be between 1 and 7',
          });
        }

        // 一级分类必须关联游戏
        if (level === 1 && !gameId) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Level 1 category must have gameId',
          });
        }

        // 二级及以上分类必须有父分类
        if (level > 1 && !parentId) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Category level > 1 must have parentId',
          });
        }

        // 验证父分类
        if (parentId) {
          const parent = await prisma.gameCategory.findUnique({
            where: { id: parentId },
          });

          if (!parent) {
            return reply.code(404).send({
              error: 'Not Found',
              message: 'Parent category not found',
            });
          }

          // 父分类层级必须比当前分类小 1
          if (parent.level !== level - 1) {
            return reply.code(400).send({
              error: 'Bad Request',
              message: 'Parent category level mismatch',
            });
          }
        }

        // 验证游戏
        if (gameId) {
          const game = await prisma.game.findUnique({
            where: { id: gameId },
          });

          if (!game) {
            return reply.code(404).send({
              error: 'Not Found',
              message: 'Game not found',
            });
          }
        }

        const category = await prisma.gameCategory.create({
          data: {
            name,
            level,
            parentId,
            gameId,
            order,
            iconUrl,
          },
        });

        reply.code(201).send(category);
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to create category',
        });
      }
    }
  );

  // 更新分类
  server.put(
    '/categories/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const categoryId = parseInt(id);
        const { name, order, iconUrl } = request.body as {
          name?: string;
          order?: number;
          iconUrl?: string;
        };

        // 检查分类是否存在
        const existing = await prisma.gameCategory.findUnique({
          where: { id: categoryId },
        });

        if (!existing) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Category not found',
          });
        }

        const category = await prisma.gameCategory.update({
          where: { id: categoryId },
          data: {
            name,
            order,
            iconUrl,
          },
        });

        reply.send(category);
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to update category',
        });
      }
    }
  );

  // 删除分类
  server.delete(
    '/categories/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const categoryId = parseInt(id);

        // 检查分类是否存在
        const existing = await prisma.gameCategory.findUnique({
          where: { id: categoryId },
          include: {
            children: true,
            videos: true,
          },
        });

        if (!existing) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Category not found',
          });
        }

        // 检查是否有子分类
        if (existing.children.length > 0) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Cannot delete category with children',
          });
        }

        // 检查是否有关联视频
        if (existing.videos.length > 0) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Cannot delete category with videos',
          });
        }

        await prisma.gameCategory.delete({
          where: { id: categoryId },
        });

        reply.code(204).send();
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to delete category',
        });
      }
    }
  );

  // 调整分类顺序
  server.put(
    '/categories/reorder',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { categoryId, newOrder } = request.body as {
          categoryId: number;
          newOrder: number;
        };

        if (!categoryId || newOrder === undefined) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'categoryId and newOrder are required',
          });
        }

        await prisma.gameCategory.update({
          where: { id: categoryId },
          data: { order: newOrder },
        });

        reply.send({ message: 'Order updated' });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to reorder category',
        });
      }
    }
  );

  // 获取分类图标上传凭证
  server.post(
    '/categories/icon-token',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { filename, categoryId } = request.body as {
          filename: string;
          categoryId?: number;
        };

        if (!filename) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Filename is required',
          });
        }

        // 生成图标 key
        const key = generateIconKey(filename, 'category', categoryId);

        // 获取上传凭证
        const token = getUploadToken(key);

        // 生成访问 URL
        const url = getFileUrl(key);

        reply.send({
          token,
          key,
          url,
        });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to get upload token',
        });
      }
    }
  );
};
