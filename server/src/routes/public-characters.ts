import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/db.js';

export const publicCharacterRoutes: FastifyPluginAsync = async (server) => {
  // 获取游戏的角色列表（公开 API）
  server.get('/characters', async (request, reply) => {
    try {
      const { gameId, categoryId, search } = request.query as {
        gameId?: string;
        categoryId?: string;
        search?: string;
      };

      const where: any = { published: true };

      if (gameId) {
        where.gameId = parseInt(gameId);
      }

      if (categoryId) {
        where.categoryId = parseInt(categoryId);
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
          category: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
          actions: {
            where: { published: true },
            include: {
              video: { // ⭐ 1 对 1 关系
                where: { published: true },
                select: {
                  id: true,
                  qiniuUrl: true,
                  coverUrl: true,
                  duration: true,
                  title: true,
                },
              },
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
              video: { // ⭐ 1 对 1 关系
                where: { published: true },
                select: {
                  id: true,
                  qiniuUrl: true,
                  coverUrl: true,
                  duration: true,
                  title: true,
                },
              },
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
  });

  // 获取角色的动作列表（带视频）
  server.get('/characters/:id/actions', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const characterId = parseInt(id);

      // ⭐ 设置响应头禁止缓存
      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      reply.header('Pragma', 'no-cache');
      reply.header('Expires', '0');

      const character = await prisma.character.findUnique({
        where: { id: characterId },
        include: {
          actions: {
            where: { published: true },
            include: {
              video: { // ⭐ 1 对 1 关系
                where: { published: true },
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
        actions: character.actions.map((action: any) => ({
          id: action.id,
          name: action.name,
          code: action.code,
          description: action.description,
          order: action.order,
          video: action.video, // ⭐ 1 对 1 关系
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
      const { characterId } = request.query as { characterId?: string };

      const where: any = { published: true };
      if (characterId) {
        where.characterId = parseInt(characterId);
      }

      const actions = await prisma.action.findMany({
        where,
        include: {
          character: {
            select: {
              id: true,
              name: true,
            },
          },
        },
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

      // 获取所有有分类的角色，包含分类信息
      const characters = await prisma.character.findMany({
        where,
        select: { 
          category: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
        },
      });

      // 提取不重复的分类
      const categories = characters
        .filter(c => c.category !== null)
        .map(c => c.category!);

      // 去重
      const uniqueCategories = categories.filter(
        (cat, index, self) => index === self.findIndex(c => c.id === cat.id)
      );

      reply.send({ categories: uniqueCategories });
    } catch (error) {
      server.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch character categories',
      });
    }
  });
};
