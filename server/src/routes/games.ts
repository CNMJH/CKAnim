import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/db.js';
import { authenticate } from '../middleware/auth.js';
import { getUploadToken, generateIconKey, getFileUrl, deleteMultipleFiles, extractKeyFromUrl } from '../lib/qiniu.js';

export const gameRoutes: FastifyPluginAsync = async (server) => {
  // 获取所有游戏
  server.get('/games', async (_request, reply) => {
    try {
      const games = await prisma.game.findMany({
        orderBy: { order: 'asc' },
        include: {
          _count: {
            select: {
              categories: true,
              videos: true,
            },
          },
        },
      });

      reply.send({ games });
    } catch (error) {
      server.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get games',
      });
    }
  });

  // 获取单个游戏
  server.get('/games/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const gameId = parseInt(id);

      const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: {
          categories: {
            where: { level: 1 },
            include: {
              children: {
                include: {
                  children: {
                    include: {
                      children: true,
                    },
                  },
                },
              },
            },
          },
          videos: {
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!game) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Game not found',
        });
      }

      reply.send(game);
    } catch (error) {
      server.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get game',
      });
    }
  });

  // 创建游戏
  server.post(
    '/games',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { name, description, icon, order = 0 } = request.body as {
          name: string;
          description?: string;
          icon?: string;
          order?: number;
        };

        if (!name) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Game name is required',
          });
        }

        // 检查是否已存在
        const existing = await prisma.game.findUnique({
          where: { name },
        });

        if (existing) {
          return reply.code(409).send({
            error: 'Conflict',
            message: 'Game already exists',
          });
        }

        const game = await prisma.game.create({
          data: {
            name,
            description,
            icon,
            order,
            published: false,
          },
        });

        reply.code(201).send(game);
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to create game',
        });
      }
    }
  );

  // 更新游戏
  server.put(
    '/games/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const gameId = parseInt(id);
        const { name, description, icon, iconUrl, order, published } = request.body as {
          name?: string;
          description?: string;
          icon?: string;
          iconUrl?: string;
          order?: number;
          published?: boolean;
        };

        // 检查游戏是否存在
        const existing = await prisma.game.findUnique({
          where: { id: gameId },
        });

        if (!existing) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Game not found',
          });
        }

        // 如果改名，检查新名字是否已存在
        if (name && name !== existing.name) {
          const duplicate = await prisma.game.findUnique({
            where: { name },
          });

          if (duplicate) {
            return reply.code(409).send({
              error: 'Conflict',
              message: 'Game name already exists',
            });
          }
        }

        const game = await prisma.game.update({
          where: { id: gameId },
          data: {
            name,
            description,
            icon,
            iconUrl,
            order,
            published,
          },
        });

        reply.send(game);
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to update game',
        });
      }
    }
  );

  // 获取游戏图标上传凭证
  server.post(
    '/games/icon-token',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { filename, gameId } = request.body as {
          filename: string;
          gameId?: number;
        };

        if (!filename) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Filename is required',
          });
        }

        // 生成图标 key
        const key = generateIconKey(filename, 'game', gameId);

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

  // 删除游戏（级联删除所有子级 + 七牛云文件）
  server.delete(
    '/games/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const gameId = parseInt(id);

        // 1. 获取游戏及其所有关联数据
        const game = await prisma.game.findUnique({
          where: { id: gameId },
          include: {
            categories: {
              include: {
                children: {
                  include: {
                    children: {
                      include: {
                        children: true,
                      },
                    },
                  },
                },
              },
            },
            characters: {
              include: {
                actions: {
                  include: {
                    video: true,
                  },
                },
              },
            },
            videos: true,
          },
        });

        if (!game) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Game not found',
          });
        }

        // 2. 收集所有需要删除的七牛云文件 key
        const keysToDelete: string[] = [];

        // 游戏图标
        if (game.iconUrl) {
          keysToDelete.push(extractKeyFromUrl(game.iconUrl));
        }

        // 分类图标
        const collectCategoryIcons = (categories: any[]) => {
          categories.forEach(cat => {
            if (cat.iconUrl) {
              keysToDelete.push(extractKeyFromUrl(cat.iconUrl));
            }
            if (cat.children?.length > 0) {
              collectCategoryIcons(cat.children);
            }
          });
        };
        collectCategoryIcons(game.categories);

        // 角色头像
        game.characters.forEach(char => {
          if (char.avatar) {
            keysToDelete.push(extractKeyFromUrl(char.avatar));
          }
        });

        // 视频和封面图
        game.videos.forEach(video => {
          keysToDelete.push(video.qiniuKey);
          if (video.coverUrl) {
            keysToDelete.push(extractKeyFromUrl(video.coverUrl));
          }
        });

        // 角色动作关联的视频
        game.characters.forEach(char => {
          char.actions.forEach(ca => {
            if (ca.video) {
              keysToDelete.push(ca.video.qiniuKey);
              if (ca.video.coverUrl) {
                keysToDelete.push(extractKeyFromUrl(ca.video.coverUrl));
              }
            }
          });
        });

        server.log.info(`[Delete Game] Collected ${keysToDelete.length} Qiniu files to delete`);

        // 3. 删除数据库记录（级联）
        await prisma.game.delete({
          where: { id: gameId },
        });

        server.log.info(`[Delete Game] Deleted game ${gameId} from database`);

        // 4. 批量删除七牛云文件
        if (keysToDelete.length > 0) {
          try {
            await deleteMultipleFiles(keysToDelete);
            server.log.info(`[Delete Game] Deleted ${keysToDelete.length} Qiniu files`);
          } catch (qiniuErr) {
            server.log.error('[Delete Game] Qiniu delete failed:', qiniuErr);
            // 不抛出错误，数据库已删除
          }
        }

        reply.code(204).send();
      } catch (error) {
        server.log.error('[Delete Game] Error:', error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to delete game',
        });
      }
    }
  );
};
