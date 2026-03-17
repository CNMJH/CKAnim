import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/db.js';
import { authenticate } from '../middleware/auth.js';

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
        const { name, description, icon, order, published } = request.body as {
          name?: string;
          description?: string;
          icon?: string;
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

  // 删除游戏
  server.delete(
    '/games/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const gameId = parseInt(id);

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

        await prisma.game.delete({
          where: { id: gameId },
        });

        reply.code(204).send();
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to delete game',
        });
      }
    }
  );
};
