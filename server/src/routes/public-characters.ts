import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/db.js';

export const publicCharacterRoutes: FastifyPluginAsync = async (server) => {
  // 获取游戏的角色列表（公开 API）
  server.get('/characters', async (request, reply) => {
    try {
      const { gameId, role, search } = request.query as {
        gameId?: string;
        role?: string;
        search?: string;
      };

      const where: any = { published: true };

      if (gameId) {
        where.gameId = parseInt(gameId);
      }

      if (role) {
        where.role = role;
      }

      if (search) {
        where.name = { contains: search };
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
  });

  // 获取角色详情（包含动作列表）
  server.get('/characters/:id', async (request, reply) => {
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
          actions: {
            where: { published: true },
            include: {
              action: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  description: true,
                },
              },
              video: {
                select: {
                  id: true,
                  qiniuUrl: true,
                  coverUrl: true,
                  duration: true,
                  title: true,
                },
              },
            },
            orderBy: { order: 'asc' },
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
  });

  // 获取角色的动作列表（带视频）
  server.get('/characters/:id/actions', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const characterId = parseInt(id);

      const character = await prisma.character.findUnique({
        where: { id: characterId },
        include: {
          actions: {
            where: { published: true },
            include: {
              action: true,
              video: {
                select: {
                  id: true,
                  qiniuUrl: true,
                  coverUrl: true,
                  duration: true,
                  title: true,
                },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!character) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Character not found',
        });
      }

      reply.send({
        characterId: character.id,
        characterName: character.name,
        actions: character.actions.map((ca: any) => ({
          id: ca.id,
          actionId: ca.actionId,
          name: ca.action.name,
          code: ca.action.code,
          description: ca.action.description,
          video: ca.video,
          videoUrl: ca.videoUrl,
          order: ca.order,
        })),
      });
    } catch (error) {
      server.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch actions',
      });
    }
  });

  // 获取动作列表（公开 API）
  server.get('/actions', async (request, reply) => {
    try {
      const actions = await prisma.action.findMany({
        where: { published: true },
        orderBy: { order: 'asc' },
      });

      reply.send({ actions });
    } catch (error) {
      server.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch actions',
      });
    }
  });

  // 获取角色分类列表（公开 API）
  server.get('/character-roles', async (request, reply) => {
    try {
      const { gameId } = request.query as { gameId?: string };

      const where: any = { published: true };
      if (gameId) {
        where.gameId = parseInt(gameId);
      }

      // 获取所有不重复的角色分类
      const characters = await prisma.character.findMany({
        where,
        select: { role: true },
        distinct: ['role'],
      });

      // 提取角色分类并过滤空值
      const roles = characters
        .map(c => c.role)
        .filter(Boolean)
        .sort();

      reply.send({ roles });
    } catch (error) {
      server.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch character roles',
      });
    }
  });
};
