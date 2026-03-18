import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/db.js';

export const publicGameRoutes: FastifyPluginAsync = async (server) => {
  // 获取游戏列表（公开）
  server.get('/games', async (_request, reply) => {
    try {
      const games = await prisma.game.findMany({
        where: { published: true },
        orderBy: { order: 'asc' },
      });

      reply.send({ games });
    } catch (error) {
      server.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch games',
      });
    }
  });

  // 获取单个游戏（公开）
  server.get('/games/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const gameId = parseInt(id);

      const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: {
          categories: {
            where: { level: 1 },
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
        message: 'Failed to fetch game',
      });
    }
  });
};
