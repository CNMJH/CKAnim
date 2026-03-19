import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/db.js';
import { authenticate } from '../middleware/auth.js';

export const characterRoutes: FastifyPluginAsync = async (server) => {
  // ===== 管理员路由（需要认证） =====

  // 获取角色列表（管理员）
  server.get(
    '/characters',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { gameId } = request.query as { gameId?: string };

        const where: any = {};
        if (gameId) {
          where.gameId = parseInt(gameId);
        }

        const characters = await prisma.character.findMany({
          where,
          include: {
            game: {
              select: {
                id: true,
                name: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                level: true,
              },
            },
            actions: {
              include: {
                video: true, // ⭐ 1 对 1 关系
              },
            },
          },
          orderBy: { order: 'asc' },
        });

        reply.send({ characters });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch characters',
        });
      }
    }
  );

  // 获取单个角色（管理员）
  server.get(
    '/characters/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const characterId = parseInt(id);

        const character = await prisma.character.findUnique({
          where: { id: characterId },
          include: {
            game: {
              select: {
                id: true,
                name: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                level: true,
              },
            },
          },
        });

        if (!character) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Character not found',
          });
        }

        reply.send(character);
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch character',
        });
      }
    }
  );

  // 创建角色
  server.post(
    '/characters',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const {
          name,
          categoryId,
          avatar,
          description,
          gameId,
          order = 0,
          published = false,
        } = request.body as {
          name: string;
          categoryId?: number;
          avatar?: string;
          description?: string;
          gameId: number;
          order?: number;
          published?: boolean;
        };

        if (!name || !gameId) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Name and gameId are required',
          });
        }

        const character = await prisma.character.create({
          data: {
            name,
            categoryId,
            avatar,
            description,
            gameId,
            order,
            published,
          },
          include: {
            game: {
              select: {
                id: true,
                name: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                level: true,
              },
            },
          },
        });

        reply.code(201).send(character);
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to create character',
        });
      }
    }
  );

  // 更新角色
  server.put(
    '/characters/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const characterId = parseInt(id);
        const {
          name,
          categoryId,
          avatar,
          description,
          order,
          published,
        } = request.body as {
          name?: string;
          categoryId?: number;
          avatar?: string;
          description?: string;
          order?: number;
          published?: boolean;
        };

        const character = await prisma.character.update({
          where: { id: characterId },
          data: {
            name,
            categoryId,
            avatar,
            description,
            order,
            published,
          },
          include: {
            game: {
              select: {
                id: true,
                name: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                level: true,
              },
            },
          },
        });

        reply.send(character);
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to update character',
        });
      }
    }
  );

  // 删除角色
  server.delete(
    '/characters/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const characterId = parseInt(id);

        await prisma.character.delete({
          where: { id: characterId },
        });

        reply.code(204).send();
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to delete character',
        });
      }
    }
  );
};
