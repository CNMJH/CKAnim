import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/db.js';
import { authenticate } from '../middleware/auth.js';
import { getUploadToken, generateIconKey, getFileUrl } from '../lib/qiniu.js';

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

      reply.send(games);
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
};
